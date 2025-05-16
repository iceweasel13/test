// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { Users } from "@/lib/types"; // Users tip tanımınız
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";

// Supabase client'ı import etme yöntemi:
// 1. Eğer "@/lib/supabase.ts" içinde yapılandırılmış bir client export ediyorsanız:
import { supabase } from "@/lib/supabase"; // Bu satır, client'ınızın adının "supabase" olduğunu varsayar.
// 2. VEYA, her istekte yeni bir client oluşturmak için (özellikle Edge fonksiyonlarında):
// import { createClient } from "@supabase/supabase-js";
// Bu durumda aşağıdaki process.env değişkenlerine ihtiyacınız olacak:
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// `import { userInfo } from "os";` satırı kaldırıldı, çünkü bu API route'u için gereksizdi.

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    "KRİTİK HATA: JWT_SECRET ortam değişkeni ayarlanmamış. API güvenli değil."
  );
  // Üretim ortamında, bu durumda uygulamanın başlamasını engellemek daha iyi olabilir.
  // throw new Error('JWT_SECRET ortam değişkeni ayarlanmamış.');
}

// --- Yardımcı Fonksiyon: Sui imza doğrulama ---
async function verifySuiSignatureHelper(
  address: string, // İmzalayanın Sui adresi
  messageString: string, // İmzalanan orijinal metin mesajı
  signatureString: string // İmza (genellikle base64 formatında)
): Promise<boolean> {
  try {
    // Mesajın, istemci tarafında imzalanmadan önceki haliyle birebir aynı şekilde Uint8Array'e çevrilmesi gerekir.
    const messageBytes = new TextEncoder().encode(
      messageString
    );

    // Sui SDK kullanarak kişisel mesaj imzasını doğrula.
    // Bu fonksiyon, doğrulama başarısız olursa bir hata fırlatacaktır.
    await verifyPersonalMessageSignature(
      messageBytes,
      signatureString,
      {
        address: address,
      }
    );

    return true; // İmza geçerli
  } catch (error) {
    console.error("Sui imza doğrulama başarısız:", error);
    return false; // İmza geçersiz veya doğrulama sırasında bir hata oluştu
  }
}

export async function POST(req: NextRequest) {
  if (!JWT_SECRET) {
    // JWT_SECRET eksikse, isteği hemen reddet
    return NextResponse.json(
      { error: "Sunucu yapılandırma hatası." },
      { status: 500 }
    );
  }

  try {
    const {
      wallet_address,
      message,
      signature,
    }: {
      wallet_address: string;
      message: string;
      signature: string;
    } = await req.json();

    if (!wallet_address || !message || !signature) {
      return NextResponse.json(
        {
          error:
            "Eksik parametre: wallet_address, message, veya signature",
        },
        { status: 400 }
      );
    }

    // 1. Sui imzasını doğrula
    const isValidSignature = await verifySuiSignatureHelper(
      wallet_address,
      message,
      signature
    );

    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Geçersiz imza" },
        { status: 401 } // Yetkisiz
      );
    }

    // Supabase client'ını burada kullanın.
    // Eğer her istekte yeni client oluşturuyorsanız:
    // const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Eğer "@/lib/supabase" içinde tanımlı static bir client kullanıyorsanız, zaten import edilmiş "supabase" değişkeni kullanılacaktır.

    let finalUser: Partial<Users> | null = null; // Users tipinize göre güncellendi (Partial, çünkü tüm alanlar hemen dolu olmayabilir)
    const nowISO = new Date().toISOString();

    // 2. Supabase'den kullanıcıyı çek veya oluştur
    const { data: existingUser, error: userFetchError } =
      await supabase
        .from("users")
        .select(
          "id, wallet_address, last_active, created_at, clicks, score, max_clicks"
        ) // Users tipinizdeki tüm alanları seçmeye çalışın
        .eq("wallet_address", wallet_address)
        .single();

    if (
      userFetchError &&
      userFetchError.code !== "PGRST116"
    ) {
      // PGRST116: "single row not found" (tek satır bulunamadı) hatası dışındaki hatalar
      console.error(
        "Supabase kullanıcı çekme hatası:",
        userFetchError
      );
      return NextResponse.json(
        {
          error: "Veritabanı hatası: Kullanıcı bulunamadı",
        },
        { status: 500 }
      );
    }

    if (existingUser) {
      // Kullanıcı mevcut, last_active güncelle
      const { data: updatedUser, error: updateError } =
        await supabase
          .from("users")
          .update({ last_active: nowISO })
          .eq("wallet_address", wallet_address)
          .select(
            "id, wallet_address, last_active, created_at, clicks, score, max_clicks"
          ) // Güncellenmiş kullanıcı verisini de seç
          .single();

      if (updateError) {
        console.warn(
          "last_active güncelleme başarısız (kritik değil):",
          updateError
        );
        finalUser = existingUser; // Güncelleme başarısız olursa, önceden çekilen veriyi kullan
      } else {
        finalUser = updatedUser;
      }
    } else if (
      userFetchError &&
      userFetchError.code === "PGRST116"
    ) {
      // Kullanıcı mevcut değil (PGRST116 hatası), yeni kullanıcı oluştur
      const newUserPayload = {
        wallet_address: wallet_address,
        last_active: nowISO,
        // Users tipinizdeki diğer alanlar için varsayılan değerler (eğer null olamıyorlarsa)
        clicks: 0,
        score: 0,
        max_clicks: 0, // Ya da uygulamanız için mantıklı bir başlangıç değeri
        // created_at alanı genellikle veritabanı tarafından otomatik olarak `now()` ile atanır
      };
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
          "Yeni kullanıcı oluşturma başarısız:",
          insertError
        );
        return NextResponse.json(
          { error: "Yeni kullanıcı oluşturulamadı" },
          { status: 500 }
        );
      }
      finalUser = newUser;
    } else {
      // Bu duruma normalde gelinmemeli. userFetchError var ama PGRST116 değil VE existingUser da yok.
      // Yukarıdaki `userFetchError && userFetchError.code !== "PGRST116"` kontrolü bu durumu yakalamalıydı.
      // Güvenlik amacıyla bir log ve hata mesajı ekleyelim.
      console.error(
        "Kullanıcı işleme sırasında beklenmedik durum:",
        userFetchError
      );
      return NextResponse.json(
        {
          error:
            "Kullanıcı işlenirken beklenmedik bir hata oluştu.",
        },
        { status: 500 }
      );
    }

    // finalUser'ın ve temel alanlarının (id, wallet_address) varlığını kontrol et.
    if (
      !finalUser ||
      !finalUser.id ||
      !finalUser.wallet_address
    ) {
      console.error(
        "Son kullanıcı verisi eksik veya null:",
        finalUser
      );
      return NextResponse.json(
        { error: "Kullanıcı verisi işlenemedi." },
        { status: 500 }
      );
    }

    // Token ve response için kullanıcı bilgilerini hazırla (Users tipine uygun)
    // finalUser'daki olası null değerler için varsayılanlar atanır.
    const responseUser: Users = {
      id: finalUser.id,
      wallet_address: finalUser.wallet_address,
      last_active: finalUser.last_active || nowISO,
      created_at: finalUser.created_at || nowISO, // Eğer DB'den gelmezse (örn. insert sonrası hemen dönmezse)
      clicks: finalUser.clicks ?? 0,
      score: finalUser.score ?? 0,
      max_clicks: finalUser.max_clicks ?? 0,
    };

    // 3. JWT oluştur
    const tokenPayload = {
      sub: responseUser.id, // Subject (kullanıcı ID'si - standart JWT claim'i)
      iat: Math.floor(Date.now() / 1000), // Issued at (oluşturulma zamanı - standart JWT claim'i)
      // Özel (custom) claim'ler
      userId: responseUser.id, // İsterseniz sadece 'sub' kullanabilirsiniz
      address: responseUser.wallet_address,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: "24h", // Token geçerlilik süresi
    });

    // 4. Token ve kullanıcı bilgisi ile response dön
    return NextResponse.json({
      token,
      user: responseUser, // Users tipinize uygun kullanıcı bilgileri
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("Login API genel hatası:", e);
    if (e instanceof SyntaxError) {
      // JSON.parse() kaynaklı syntax hataları için özel mesaj
      return NextResponse.json(
        {
          error: "Geçersiz JSON verisi",
          details: e.message,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: "Giriş sırasında dahili sunucu hatası",
        details: e.message,
      },
      { status: 500 }
    );
  }
}
