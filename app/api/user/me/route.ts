import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { createClient as createSupabaseClient } from "../../../../lib/supabase/client";
import type { Users } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedTokenPayload extends JwtPayload {
  sub: string;
  userId?: string;
  address?: string;
}

export async function GET(req: NextRequest) {
  const requestId = `req_me_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  console.log(
    `\n[${requestId}] ========== API /api/user/me GET İSTEĞİ BAŞLADI ==========`
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
    // 3. Authorization Header ve Token
    console.log(
      `[${requestId}] Adım 2: Authorization header kontrol ediliyor.`
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(
        `[${requestId}] UYARI: Authorization başlığı eksik veya hatalı.`
      );
      return NextResponse.json(
        {
          error:
            "Yetkilendirme başlığı eksik veya 'Bearer ' formatı yanlış.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.warn(
        `[${requestId}] UYARI: Token bulunamadı.`
      );
      return NextResponse.json(
        { error: "Token bulunamadı." },
        { status: 401 }
      );
    }
    console.log(`[${requestId}] Token alındı.`);

    // 4. Token Doğrulama
    console.log(
      `[${requestId}] Adım 3: JWT token doğrulanıyor.`
    );
    let decodedPayload: DecodedTokenPayload;
    try {
      decodedPayload = jwt.verify(
        token,
        JWT_SECRET
      ) as DecodedTokenPayload;
      console.log(
        `[${requestId}] JWT doğrulandı:`,
        decodedPayload
      );
    } catch (error: unknown) {
      const e = error as Error;
      console.error(
        `[${requestId}] HATA: Token doğrulama başarısız.`,
        e
      );
      if (e instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          {
            error:
              "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.",
          },
          { status: 401 }
        );
      }
      if (e instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
          {
            error:
              "Geçersiz token. Lütfen tekrar giriş yapın.",
          },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: "Token doğrulanamadı." },
        { status: 401 }
      );
    }

    // 5. Kullanıcı ID’si
    console.log(
      `[${requestId}] Adım 4: Kullanıcı ID’si alınıyor.`
    );
    const userIdFromToken = decodedPayload.sub;
    if (!userIdFromToken) {
      console.error(
        `[${requestId}] HATA: Token’da 'sub' eksik.`,
        decodedPayload
      );
      return NextResponse.json(
        {
          error:
            "Token içinde kullanıcı kimliği tanımlanamadı.",
        },
        { status: 400 }
      );
    }
    console.log(
      `[${requestId}] Kullanıcı ID: ${userIdFromToken}`
    );

    // 6. Supabase’den Kullanıcı Bilgileri
    const selectFields =
      "id,wallet_address,score,daily_clicks,daily_clicks_available,purchased_clicks,purchased_clicks_used,referrer_wallet_address,referral_bonus_score,last_active_at,created_at";
    console.log(
      `[${requestId}] Adım 5: Kullanıcı bilgileri çekiliyor.`
    );
    const { data: userFromDb, error: dbError } =
      await supabase
        .from("users")
        .select(selectFields)
        .eq("id", userIdFromToken)
        .single();

    if (dbError) {
      console.error(
        `[${requestId}] HATA: Kullanıcı çekme hatası.`,
        dbError
      );
      if (dbError.code === "PGRST116") {
        return NextResponse.json(
          {
            error: `ID'si ${userIdFromToken} olan kullanıcı bulunamadı.`,
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error: "Veritabanı hatası.",
          details: dbError.message,
        },
        { status: 500 }
      );
    }

    if (!userFromDb) {
      console.warn(
        `[${requestId}] UYARI: Kullanıcı bulunamadı.`
      );
      return NextResponse.json(
        { error: "Kullanıcı veritabanında bulunamadı." },
        { status: 404 }
      );
    }
    console.log(
      `[${requestId}] Kullanıcı verisi çekildi:`,
      userFromDb
    );

    // 7. Yanıt Kullanıcı Objesi
    console.log(
      `[{requestId}] Adım 6: Yanıt objesi hazırlanıyor.`
    );
    const responseUser: Users = {
      id: userFromDb.id,
      wallet_address: userFromDb.wallet_address,
      score: userFromDb.score ?? 0,
      daily_clicks: userFromDb.daily_clicks ?? 100,
      daily_clicks_available:
        userFromDb.daily_clicks_available ?? 100,
      purchased_clicks: userFromDb.purchased_clicks ?? 0,
      purchased_clicks_used:
        userFromDb.purchased_clicks_used ?? 0,
      referrer_wallet_address:
        userFromDb.referrer_wallet_address ?? null,
      referral_bonus_score:
        userFromDb.referral_bonus_score ?? 0,
      last_active_at: userFromDb.last_active_at,
      created_at: userFromDb.created_at,
    };
    console.log(
      `[${requestId}] Yanıt objesi:`,
      responseUser
    );

    // 8. Yanıt
    console.log(
      `[${requestId}] Adım 7: Kullanıcı bilgileri dönülüyor.`
    );
    console.log(
      `[${requestId}] ========== API /api/user/me GET TAMAMLANDI ==========`
    );
    return NextResponse.json(responseUser, { status: 200 });
  } catch (e: unknown) {
    const error = e as Error;
    console.error(`[${requestId}] GENEL HATA:`, error);
    return NextResponse.json(
      { error: "Sunucu hatası.", details: error.message },
      { status: 500 }
    );
  }
}
