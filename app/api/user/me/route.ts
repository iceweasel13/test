// app/api/user/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt, { JwtPayload } from "jsonwebtoken";
import { supabase } from "@/lib/supabase"; // Supabase client'ınızın doğru import edildiğinden emin olun
import type { Users } from "@/lib/types"; // Users tip tanımınız

const JWT_SECRET = process.env.JWT_SECRET;

// Token'dan decode edilecek payload'ın arayüzü
interface DecodedTokenPayload extends JwtPayload {
  sub: string; // Kullanıcı ID'si (subject)
  userId?: string; // Token'da bu da bulunuyordu
  address?: string; // Token'da cüzdan adresi de bulunuyordu
  // Token'a eklediğiniz diğer özel alanlar varsa burada tanımlanabilir
}

export async function GET(req: NextRequest) {
  if (!JWT_SECRET) {
    console.error(
      "KRİTİK HATA: JWT_SECRET ortam değişkeni ayarlanmamış."
    );
    return NextResponse.json(
      { error: "Sunucu yapılandırma hatası." },
      { status: 500 }
    );
  }

  try {
    // 1. Authorization header'ından token'ı al
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error:
            "Yetkilendirme başlığı eksik veya 'Bearer ' token formatı yanlış.",
        },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Token bulunamadı." },
        { status: 401 }
      );
    }

    // 2. Token'ı doğrula ve payload'ı al
    let decodedPayload: DecodedTokenPayload;
    try {
      // jwt.verify senkron bir fonksiyondur, await gerekmez.
      decodedPayload = jwt.verify(
        token,
        JWT_SECRET
      ) as DecodedTokenPayload;
    } catch (error: any) {
      console.error(
        "Token doğrulama hatası:",
        error.name,
        error.message
      );
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
          {
            error:
              "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.",
          },
          { status: 401 }
        );
      }
      if (error instanceof jwt.JsonWebTokenError) {
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

    // Token payload'ından kullanıcı ID'sini al. 'sub' standart olduğu için onu kullanalım.
    const userIdFromToken = decodedPayload.sub;

    if (!userIdFromToken) {
      console.error(
        "Token payload'ında 'sub' (kullanıcı ID) alanı bulunamadı.",
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

    // 3. Supabase'den kullanıcı bilgilerini ID'ye göre çek
    // Users tipinizdeki tüm alanları (özellikle score) seçtiğinizden emin olun.
    const { data: userFromDb, error: dbError } =
      await supabase
        .from("users") // Tablo adınızın 'users' olduğundan emin olun
        .select(
          "id, wallet_address, last_active, created_at, clicks, score, max_clicks"
        ) // Frontend'de ihtiyaç duyulan tüm alanlar
        .eq("id", userIdFromToken) // Token'dan alınan ID ile eşleştir
        .single(); // Kullanıcının tek olması beklenir

    if (dbError) {
      console.error(
        `Supabase kullanıcı çekme hatası (ID: ${userIdFromToken}):`,
        dbError
      );
      if (dbError.code === "PGRST116") {
        // Kullanıcı bulunamadı (PostgREST error code)
        return NextResponse.json(
          {
            error: `ID'si ${userIdFromToken} olan kullanıcı bulunamadı.`,
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error:
            "Veritabanından kullanıcı bilgileri çekilemedi.",
        },
        { status: 500 }
      );
    }

    if (!userFromDb) {
      // Bu durum genellikle dbError.code === 'PGRST116' ile yakalanır, ama ek bir kontrol.
      console.warn(
        `Veritabanında ID'si ${userIdFromToken} olan kullanıcı bulunamadı (token geçerli olabilir).`
      );
      return NextResponse.json(
        { error: "Kullanıcı veritabanında bulunamadı." },
        { status: 404 }
      );
    }

    // Users tipine uygun ve frontend'in beklediği yapıda response objesi oluştur.
    // Null olabilecek değerler için varsayılanlar ata.
    const responseUser: Users = {
      id: userFromDb.id,
      wallet_address: userFromDb.wallet_address, // DB'den gelen cüzdan adresini kullan
      last_active: userFromDb.last_active,
      created_at: userFromDb.created_at,
      clicks: userFromDb.clicks ?? 0,
      score: userFromDb.score ?? 0, // StarBar için bu alanın doğru olması çok önemli
      max_clicks: userFromDb.max_clicks ?? 100, // Varsayılan max_clicks, eğer DB'de null ise
    };

    // 4. Kullanıcı bilgilerini döndür
    return NextResponse.json(responseUser, { status: 200 });
  } catch (e: any) {
    console.error(
      "Kullanıcı bilgileri API (/api/user/me) genel hatası:",
      e
    );
    return NextResponse.json(
      {
        error: "Dahili sunucu hatası.",
        details: e.message,
      },
      { status: 500 }
    );
  }
}
