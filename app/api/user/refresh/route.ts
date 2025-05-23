// app/api/user/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { createClient as createSupabaseClient } from "@/lib/supabase";
import type { Users } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET;

interface DecodedTokenPayload extends JwtPayload {
  sub: string;
  userId?: string;
  address?: string;
}

export async function GET(req: NextRequest) {
  const requestId = `req_refresh_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  console.log(
    `\n[${requestId}] ========== API /api/user/refresh GET İSTEĞİ BAŞLADI ==========` // Loglama eklendi
  );

  // 1. JWT_SECRET Kontrolü
  if (!JWT_SECRET) {
    console.error(
      `[${requestId}] KRİTİK HATA: JWT_SECRET eksik.`
    ); // Loglama eklendi
    return NextResponse.json(
      {
        error:
          "Sunucu yapılandırma hatası: JWT_SECRET eksik.",
      },
      { status: 500 }
    );
  }

  // 2. Supabase Client
  const supabase = createSupabaseClient();

  try {
    // 3. Authorization Header ve Token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn(
        `[${requestId}] UYARI: Authorization başlığı eksik veya hatalı.`
      ); // Loglama eklendi
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
      ); // Loglama eklendi
      return NextResponse.json(
        { error: "Token bulunamadı." },
        { status: 401 }
      );
    }

    // 4. Token Doğrulama
    let decodedPayload: DecodedTokenPayload;
    try {
      decodedPayload = jwt.verify(
        token,
        JWT_SECRET
      ) as DecodedTokenPayload;
      console.log(`[${requestId}] JWT doğrulandı.`); // Loglama eklendi
    } catch (error: unknown) {
      const e = error as Error;
      console.error(
        `[${requestId}] HATA: Token doğrulama başarısız.`,
        e
      ); // Loglama eklendi
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
    const userIdFromToken = decodedPayload.sub;
    if (!userIdFromToken) {
      console.error(
        `[${requestId}] HATA: Token’da 'sub' eksik.`,
        decodedPayload
      ); // Loglama eklendi
      return NextResponse.json(
        {
          error:
            "Token içinde kullanıcı kimliği tanımlanamadı.",
        },
        { status: 400 }
      );
    }

    // 6. Supabase’den Kullanıcı Bilgileri
    const selectFields =
      "id,wallet_address,score,daily_clicks,daily_clicks_available,purchased_clicks,purchased_clicks_used,referrer_wallet_address,referral_bonus_score,last_active_at,created_at";
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
      ); // Loglama eklendi
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
      ); // Loglama eklendi
      return NextResponse.json(
        { error: "Kullanıcı veritabanında bulunamadı." },
        { status: 404 }
      );
    }

    // 7. Yanıt Kullanıcı Objesi
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

    // 8. Yanıt
    console.log(
      `[${requestId}] Kullanıcı bilgileri başarıyla yenilendi.`
    ); // Loglama eklendi
    return NextResponse.json(responseUser, { status: 200 });
  } catch (e: unknown) {
    const error = e as Error;
    console.error(`[${requestId}] GENEL HATA:`, error); // Loglama eklendi
    return NextResponse.json(
      { error: "Sunucu hatası.", details: error.message },
      { status: 500 }
    );
  }
}
