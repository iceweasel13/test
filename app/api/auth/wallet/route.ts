// app/api/auth/wallet/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { Users } from "@/lib/types"; // Users tip tanımınız
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
// Supabase client'ı lib/supabase.ts'den import etmek yerine, her istek için Route Handler içinde oluşturacağız.
// import { supabase } from "@/lib/supabase"; // Bu satırı kaldırıyoruz veya yorumluyoruz.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

// --- Detaylı Loglama ile Sui İmza Doğrulama ---
async function verifySuiSignatureHelperWithLogging(
  address: string,
  messageString: string,
  signatureString: string,
  requestId: string
): Promise<boolean> {
  console.log(
    `[${requestId}] verifySuiSignatureHelper: Başladı. Adres: ${address}`
  );
  console.log(
    `[${requestId}] verifySuiSignatureHelper: Doğrulanacak Mesaj: "${messageString}"`
  );
  console.log(
    `[${requestId}] verifySuiSignatureHelper: Doğrulanacak İmza: "${signatureString}"`
  );

  if (!address || !messageString || !signatureString) {
    console.error(
      `[${requestId}] verifySuiSignatureHelper: Eksik parametreler! Adres, mesaj veya imza boş.`
    );
    return false;
  }

  try {
    const messageBytes = new TextEncoder().encode(
      messageString
    );
    console.log(
      `[${requestId}] verifySuiSignatureHelper: Mesaj başarıyla byte dizisine çevrildi.`
    );

    await verifyPersonalMessageSignature(
      messageBytes,
      signatureString,
      {
        address: address,
      }
    );

    console.log(
      `[${requestId}] verifySuiSignatureHelper: Sui SDK ile imza doğrulama BAŞARILI.`
    );
    return true;
  } catch (error: any) {
    console.error(
      `[${requestId}] verifySuiSignatureHelper: Sui SDK ile imza doğrulama BAŞARISIZ! Hata:`,
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        details: error,
      }
    );
    return false;
  }
}

export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  console.log(
    `\n[${requestId}] ========== API /api/auth/wallet POST İSTEĞİ BAŞLADI ==========`
  );

  // 1. JWT_SECRET Kontrolü
  console.log(
    `[${requestId}] Adım 1: JWT_SECRET kontrol ediliyor.`
  );
  if (!JWT_SECRET) {
    console.error(
      `[${requestId}] KRİTİK HATA: JWT_SECRET ortam değişkeni ayarlanmamış.`
    );
    return NextResponse.json(
      {
        error:
          "Sunucu yapılandırma hatası: JWT_SECRET eksik.",
      },
      { status: 500 }
    );
  }
  console.log(`[${requestId}] JWT_SECRET mevcut.`);

  // Supabase Client'ını Oluşturma (yeni yöntemle)
  console.log(
    `[${requestId}] Supabase client oluşturuluyor (@supabase/ssr createServerClient ile).`
  );
  const cookieStore = cookies();
  const supabase = createServerClient(
    // Generic tipini Users olarak belirtmeye gerek yok, veritabanı şemanızdan çıkarım yapacaktır.
    // Eğer spesifik bir beklentiniz varsa belirtebilirsiniz.
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) =>
                cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn(
              `[${requestId}] Supabase client: setAll cookie metodu Server Component içinden çağrıldı, middleware varsa sorun değil.`
            );
          }
        },
      },
    }
  );
  console.log(
    `[${requestId}] Supabase client başarıyla oluşturuldu.`
  );

  try {
    // 2. İstek Body'sini Parse Etme
    console.log(
      `[${requestId}] Adım 2: İstek body'si JSON olarak parse ediliyor.`
    );
    let requestPayload: {
      wallet_address: string;
      message: string;
      signature: string;
    };
    try {
      requestPayload = await req.json();
      console.log(
        `[${requestId}] İstek body'si başarıyla parse edildi:`,
        requestPayload
      );
    } catch (parseError: any) {
      console.error(
        `[${requestId}] HATA: İstek body'si JSON olarak parse edilemedi.`,
        {
          name: parseError.name,
          message: parseError.message,
          stack: parseError.stack,
        }
      );
      return NextResponse.json(
        {
          error: "Geçersiz JSON verisi.",
          details: parseError.message,
        },
        { status: 400 }
      );
    }

    const { wallet_address, message, signature } =
      requestPayload;

    // 3. Gelen Parametrelerin Kontrolü
    console.log(
      `[${requestId}] Adım 3: Gelen parametreler kontrol ediliyor.`
    );
    if (!wallet_address || !message || !signature) {
      console.error(
        `[${requestId}] HATA: Eksik parametreler. Cüzdan Adresi: ${wallet_address}, Mesaj: ${message}, İmza: ${signature}`
      );
      return NextResponse.json(
        {
          error:
            "Eksik parametre: wallet_address, message, veya signature.",
        },
        { status: 400 }
      );
    }
    console.log(
      `[${requestId}] Gelen parametreler tam: Cüzdan Adresi: ${wallet_address}`
    );

    // 4. Sui İmzasını Doğrulama
    console.log(
      `[${requestId}] Adım 4: Sui imzası doğrulanıyor.`
    );
    const isValidSignature =
      await verifySuiSignatureHelperWithLogging(
        wallet_address,
        message,
        signature,
        requestId
      );

    if (!isValidSignature) {
      console.warn(
        `[${requestId}] UYARI: İmza doğrulama başarısız oldu. Adres: ${wallet_address}`
      );
      return NextResponse.json(
        { error: "Geçersiz imza." },
        { status: 401 }
      );
    }
    console.log(
      `[${requestId}] İmza başarıyla doğrulandı.`
    );

    // 5. Supabase İşlemleri
    console.log(
      `[${requestId}] Adım 5: Supabase kullanıcı işlemleri başlıyor.`
    );
    let finalUser: Partial<Users> | null = null;
    const nowISO = new Date().toISOString();
    console.log(
      `[${requestId}] Şu anki zaman (ISO): ${nowISO}`
    );

    // 5a. Mevcut Kullanıcıyı Çekme Denemesi
    console.log(
      `[${requestId}] Adım 5a: Supabase'den mevcut kullanıcı çekiliyor. Cüzdan Adresi: ${wallet_address}`
    );
    const { data: existingUser, error: userFetchError } =
      await supabase
        .from("users")
        .select(
          "id, wallet_address, last_active, created_at, clicks, score, max_clicks"
        )
        .eq("wallet_address", wallet_address)
        .single();

    if (userFetchError) {
      console.log(
        `[${requestId}] Supabase kullanıcı çekme denemesi sonucu hata:`,
        {
          code: userFetchError.code,
          message: userFetchError.message,
          details: userFetchError.details,
          hint: userFetchError.hint,
        }
      );
    } else {
      console.log(
        `[${requestId}] Supabase kullanıcı çekme denemesi sonucu veri:`,
        existingUser
      );
    }

    if (
      userFetchError &&
      userFetchError.code !== "PGRST116"
    ) {
      console.error(
        `[${requestId}] HATA: Supabase'den kullanıcı çekilirken 'PGRST116' dışında bir hata oluştu.`,
        userFetchError
      );
      return NextResponse.json(
        {
          error:
            "Veritabanı hatası: Kullanıcı verisi çekilemedi.",
          details: userFetchError.message,
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      console.log(
        `[${requestId}] Adım 5b: Kullanıcı mevcut. ID: ${existingUser.id}. last_active güncelleniyor.`
      );
      const { data: updatedUser, error: updateError } =
        await supabase
          .from("users")
          .update({ last_active: nowISO })
          .eq("wallet_address", wallet_address)
          .select(
            "id, wallet_address, last_active, created_at, clicks, score, max_clicks"
          )
          .single();

      if (updateError) {
        console.warn(
          `[${requestId}] UYARI: Kullanıcının (ID: ${existingUser.id}) last_active alanı güncellenemedi (kritik değil). Hata:`,
          updateError
        );
        finalUser = existingUser;
      } else {
        finalUser = updatedUser;
        console.log(
          `[${requestId}] Kullanıcının (ID: ${existingUser.id}) last_active alanı başarıyla güncellendi. Güncel kullanıcı:`,
          updatedUser
        );
      }
    } else if (
      userFetchError &&
      userFetchError.code === "PGRST116"
    ) {
      console.log(
        `[${requestId}] Adım 5c: Kullanıcı mevcut değil (PGRST116). Yeni kullanıcı oluşturuluyor. Cüzdan Adresi: ${wallet_address}`
      );
      const newUserPayload = {
        wallet_address: wallet_address,
        last_active: nowISO,
        clicks: 0,
        score: 0,
        max_clicks: 0, // veya uygulamanız için mantıklı bir başlangıç değeri
      };
      console.log(
        `[${requestId}] Yeni kullanıcı için payload:`,
        newUserPayload
      );

      const { data: newUser, error: insertError } =
        await supabase
          .from("users")
          .insert(newUserPayload)
          .select(
            "id, wallet_address, last_active, created_at, clicks, score, max_clicks"
          )
          .single();

      if (insertError || !newUser) {
        console.error(
          `[${requestId}] HATA: Yeni kullanıcı oluşturma başarısız. Hata:`,
          insertError,
          "Dönen kullanıcı:",
          newUser
        );
        return NextResponse.json(
          {
            error: "Yeni kullanıcı oluşturulamadı.",
            details: insertError?.message,
          },
          { status: 500 }
        );
      }
      finalUser = newUser;
      console.log(
        `[${requestId}] Yeni kullanıcı başarıyla oluşturuldu:`,
        newUser
      );
    } else {
      console.error(
        `[${requestId}] HATA: Kullanıcı işleme sırasında beklenmedik bir durum oluştu. userFetchError:`,
        userFetchError,
        `existingUser:`,
        existingUser
      );
      return NextResponse.json(
        {
          error:
            "Kullanıcı işlenirken beklenmedik bir sunucu hatası oluştu.",
        },
        { status: 500 }
      );
    }

    // 6. Son Kullanıcı Verisi Kontrolü
    console.log(
      `[${requestId}] Adım 6: Son kullanıcı verisi (finalUser) kontrol ediliyor.`
    );
    if (
      !finalUser ||
      !finalUser.id ||
      !finalUser.wallet_address
    ) {
      console.error(
        `[${requestId}] HATA: Son kullanıcı verisi (finalUser) eksik veya null. finalUser:`,
        finalUser
      );
      return NextResponse.json(
        {
          error: "Kullanıcı verisi işlenemedi veya eksik.",
        },
        { status: 500 }
      );
    }
    console.log(
      `[${requestId}] Son kullanıcı verisi geçerli. Kullanıcı ID: ${finalUser.id}`
    );

    // 7. Yanıt İçin Kullanıcı Objesi Hazırlama
    console.log(
      `[${requestId}] Adım 7: Yanıt için kullanıcı objesi (responseUser) hazırlanıyor.`
    );
    const responseUser: Users = {
      id: finalUser.id,
      wallet_address: finalUser.wallet_address,
      last_active: finalUser.last_active || nowISO,
      created_at: finalUser.created_at || nowISO,
      clicks: finalUser.clicks ?? 0,
      score: finalUser.score ?? 0,
      max_clicks: finalUser.max_clicks ?? 0,
    };
    console.log(
      `[${requestId}] Yanıt kullanıcı objesi (responseUser):`,
      responseUser
    );

    // 8. JWT Oluşturma
    console.log(
      `[${requestId}] Adım 8: JWT token oluşturuluyor.`
    );
    const tokenPayload = {
      sub: responseUser.id,
      iat: Math.floor(Date.now() / 1000),
      userId: responseUser.id,
      address: responseUser.wallet_address,
    };
    console.log(
      `[${requestId}] JWT payload:`,
      tokenPayload
    );

    let token: string;
    try {
      token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: "24h",
      });
      console.log(
        `[${requestId}] JWT token başarıyla oluşturuldu.`
      );
    } catch (jwtSignError: any) {
      console.error(
        `[${requestId}] HATA: JWT token oluşturulurken hata. JWT_SECRET: ${
          JWT_SECRET
            ? "Mevcut (uzunluk: " + JWT_SECRET.length + ")"
            : "Eksik!"
        }`,
        {
          name: jwtSignError.name,
          message: jwtSignError.message,
          stack: jwtSignError.stack,
        }
      );
      return NextResponse.json(
        {
          error: "Token oluşturma sırasında sunucu hatası.",
          details: jwtSignError.message,
        },
        { status: 500 }
      );
    }

    // 9. Başarılı Yanıt Dönme
    console.log(
      `[${requestId}] Adım 9: Başarılı yanıt (token ve kullanıcı bilgisi) dönülüyor.`
    );
    console.log(
      `[${requestId}] ========== API /api/auth/wallet POST İSTEĞİ BAŞARIYLA TAMAMLANDI ==========`
    );
    return NextResponse.json({
      token,
      user: responseUser,
    });
  } catch (e: any) {
    console.error(
      `[${requestId}] !!!!! API /api/auth/wallet GENEL HATA YAKALANDI !!!!!`,
      {
        name: e.name,
        message: e.message,
        stack: e.stack,
        details: e,
      }
    );
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: "Geçersiz JSON verisi (genel catch).",
          details: e.message,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error:
          "Giriş işlemi sırasında beklenmedik bir dahili sunucu hatası oluştu.",
        details: e.message,
      },
      { status: 500 }
    );
  }
}
