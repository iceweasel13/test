/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { Users } from "@/lib/types";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { createClient as createSupabaseClient } from "@/lib/supabase";

const JWT_SECRET = process.env.JWT_SECRET;

// Sui İmza Doğrulama
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

  if (!address || !messageString || !signatureString) {
    console.error(
      `[${requestId}] verifySuiSignatureHelper: Eksik parametreler!`
    );
    return false;
  }

  try {
    const messageBytes = new TextEncoder().encode(
      messageString
    );
    console.log(
      `[${requestId}] verifySuiSignatureHelper: Mesaj byte dizisine çevrildi.`
    );

    await verifyPersonalMessageSignature(
      messageBytes,
      signatureString,
      { address }
    );
    console.log(
      `[${requestId}] verifySuiSignatureHelper: İmza doğrulama BAŞARILI.`
    );
    return true;
  } catch (error: any) {
    console.error(
      `[${requestId}] verifySuiSignatureHelper: İmza doğrulama BAŞARISIZ!`,
      {
        name: error.name,
        message: error.message,
        details: error.toString(),
      }
    );
    return false;
  }
}

export async function POST(req: NextRequest) {
  const requestId = `req_wallet_${Date.now()}_${Math.random()
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
      `[${requestId}] KRİTİK HATA: JWT_SECRET eksik.`
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

  // 2. Supabase Client
  console.log(
    `[${requestId}] Supabase client oluşturuluyor.`
  );
  const supabase = createSupabaseClient();
  console.log(
    `[${requestId}] Supabase client oluşturuldu.`
  );

  try {
    // 3. İstek Body’si ve URL Parametreleri
    console.log(
      `[${requestId}] Adım 2: İstek body’si ve URL parametreleri parse ediliyor.`
    );
    let requestPayload: {
      wallet_address: string;
      message: string;
      signature: string;
      referrer_wallet_address?: string;
    };
    try {
      requestPayload = await req.json();
      console.log(
        `[${requestId}] İstek body’si parse edildi:`,
        requestPayload
      );
    } catch (parseError: any) {
      console.error(
        `[${requestId}] HATA: İstek body’si parse edilemedi.`,
        parseError
      );
      return NextResponse.json(
        {
          error: "Geçersiz JSON verisi.",
          details: parseError.message,
        },
        { status: 400 }
      );
    }

    const walletAddress =
      requestPayload.wallet_address?.toLowerCase();
    const message = requestPayload.message;
    const signature = requestPayload.signature;
    const referrerWalletAddress =
      requestPayload.referrer_wallet_address?.toLowerCase() ||
      req.nextUrl.searchParams.get("ref")?.toLowerCase();

    // 4. Parametre Kontrolü
    console.log(
      `[${requestId}] Adım 3: Parametreler kontrol ediliyor.`
    );
    if (!walletAddress || !message || !signature) {
      console.error(
        `[${requestId}] HATA: Zorunlu parametreler eksik.`
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
      `[${requestId}] Parametreler tam. Referans: ${
        referrerWalletAddress || "Yok"
      }`
    );

    // 5. Sui İmza Doğrulama
    console.log(
      `[${requestId}] Adım 4: Sui imzası doğrulanıyor.`
    );
    const isValidSignature =
      await verifySuiSignatureHelperWithLogging(
        walletAddress,
        message,
        signature,
        requestId
      );
    if (!isValidSignature) {
      console.warn(
        `[${requestId}] UYARI: İmza doğrulama başarısız.`
      );
      return NextResponse.json(
        { error: "Geçersiz imza." },
        { status: 401 }
      );
    }
    console.log(`[${requestId}] İmza doğrulandı.`);

    // 6. Supabase İşlemleri
    console.log(
      `[${requestId}] Adım 5: Supabase işlemleri başlıyor.`
    );
    let finalUser: Partial<Users> | null = null;
    const nowISO = new Date().toISOString();

    // 6a. Mevcut Kullanıcı Kontrolü
    const selectFields =
      "id,wallet_address,score,daily_clicks,daily_clicks_available,purchased_clicks,purchased_clicks_used,referrer_wallet_address,referral_bonus_score,last_active_at,created_at";
    console.log(
      `[${requestId}] Adım 5a: Kullanıcı çekiliyor.`
    );
    const { data: existingUser, error: userFetchError } =
      await supabase
        .from("users")
        .select(selectFields)
        .eq("wallet_address", walletAddress)
        .single();

    if (
      userFetchError &&
      userFetchError.code !== "PGRST116"
    ) {
      console.error(
        `[${requestId}] HATA: Kullanıcı çekme hatası.`,
        userFetchError
      );
      return NextResponse.json(
        {
          error: "Veritabanı hatası.",
          details: userFetchError.message,
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      // 6b. Mevcut Kullanıcı: last_active_at güncelle
      console.log(
        `[${requestId}] Adım 5b: Kullanıcı mevcut. Güncelleniyor.`
      );
      const { data: updatedUser, error: updateError } =
        await supabase
          .from("users")
          .update({ last_active_at: nowISO })
          .eq("wallet_address", walletAddress)
          .select(selectFields)
          .single();

      if (updateError) {
        console.warn(
          `[${requestId}] UYARI: last_active_at güncellenemedi.`,
          updateError
        );
        finalUser = existingUser;
      } else {
        finalUser = updatedUser;
        console.log(
          `[${requestId}] Kullanıcı güncellendi.`,
          updatedUser
        );
      }
    } else {
      // 6c. Yeni Kullanıcı
      console.log(
        `[${requestId}] Adım 5c: Yeni kullanıcı oluşturuluyor.`
      );
      const newUserPayload: Omit<
        Users,
        "id" | "created_at"
      > & {
        last_active_at: string;
        created_at: string;
      } = {
        wallet_address: walletAddress,
        score: 0,
        daily_clicks: 100,
        daily_clicks_available: 100,
        purchased_clicks: 0,
        purchased_clicks_used: 0,
        referrer_wallet_address:
          referrerWalletAddress &&
          referrerWalletAddress !== walletAddress
            ? referrerWalletAddress
            : null,
        referral_bonus_score: 0,
        last_active_at: nowISO,
        created_at: nowISO,
      };
      console.log(
        `[${requestId}] Yeni kullanıcı payload:`,
        newUserPayload
      );

      const { data: newUser, error: insertError } =
        await supabase
          .from("users")
          .insert(newUserPayload)
          .select(selectFields)
          .single();

      if (insertError || !newUser) {
        console.error(
          `[${requestId}] HATA: Yeni kullanıcı oluşturma başarısız.`,
          insertError
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
        `[${requestId}] Yeni kullanıcı oluşturuldu:`,
        newUser
      );
    }

    // 7. Kullanıcı Verisi Kontrolü
    console.log(
      `[${requestId}] Adım 6: Kullanıcı verisi kontrol ediliyor.`
    );
    if (
      !finalUser ||
      !finalUser.id ||
      !finalUser.wallet_address
    ) {
      console.error(
        `[${requestId}] HATA: Kullanıcı verisi eksik.`,
        finalUser
      );
      return NextResponse.json(
        { error: "Kullanıcı verisi işlenemedi." },
        { status: 500 }
      );
    }
    console.log(`[${requestId}] Kullanıcı verisi geçerli.`);

    // 8. Yanıt Kullanıcı Objesi
    console.log(
      `[${requestId}] Adım 7: Yanıt objesi hazırlanıyor.`
    );
    const responseUser: Users = {
      id: finalUser.id!,
      wallet_address: finalUser.wallet_address!,
      score: finalUser.score ?? 0,
      daily_clicks: finalUser.daily_clicks ?? 100,
      daily_clicks_available:
        finalUser.daily_clicks_available ?? 100,
      purchased_clicks: finalUser.purchased_clicks ?? 0,
      purchased_clicks_used:
        finalUser.purchased_clicks_used ?? 0,
      referrer_wallet_address:
        finalUser.referrer_wallet_address ?? null,
      referral_bonus_score:
        finalUser.referral_bonus_score ?? 0,
      last_active_at: finalUser.last_active_at || nowISO,
      created_at: finalUser.created_at || nowISO,
    };
    console.log(
      `[${requestId}] Yanıt objesi:`,
      responseUser
    );

    // 9. JWT Oluşturma
    console.log(
      `[${requestId}] Adım 8: JWT oluşturuluyor.`
    );
    const tokenPayload = {
      sub: responseUser.id,
      iat: Math.floor(Date.now() / 1000),
      userId: responseUser.id,
      address: responseUser.wallet_address,
    };
    let token: string;
    try {
      token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: "24h",
      });
      console.log(`[${requestId}] JWT oluşturuldu.`);
    } catch (jwtSignError: any) {
      console.error(
        `[${requestId}] HATA: JWT oluşturma hatası.`,
        jwtSignError
      );
      return NextResponse.json(
        {
          error: "Token oluşturma hatası.",
          details: jwtSignError.message,
        },
        { status: 500 }
      );
    }

    // 10. Yanıt
    console.log(
      `[${requestId}] Adım 9: Başarılı yanıt dönülüyor.`
    );
    console.log(
      `[${requestId}] ========== API /api/auth/wallet POST TAMAMLANDI ==========`
    );
    return NextResponse.json({ token, user: responseUser });
  } catch (e: any) {
    console.error(`[${requestId}] GENEL HATA:`, e);
    return NextResponse.json(
      { error: "Sunucu hatası.", details: e.message },
      { status: 500 }
    );
  }
}
