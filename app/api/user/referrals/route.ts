// app/api/user/referrals/route.ts
import { createClient as createSupabaseClient } from "@/lib/supabase";
// Users tipine burada ihtiyacımız olmayabilir, sadece wallet_address kullanacağız.
// import { Users } from "../../../../lib/types"; // Bu yol muhtemelen yanlış, @/lib/types gibi olmalı

import { NextRequest, NextResponse } from "next/server"; // Next.js importları

export async function GET(
  req: NextRequest
): Promise<NextResponse> {
  // 1. Query parametresinden wallet_address'i al
  const { searchParams } = new URL(req.url);
  const walletAddressFromQuery = searchParams.get(
    "wallet_address"
  );

  const requestId = `api_ref_count_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  console.log(
    `[${requestId}] API /api/user/referrals GET isteği başladı. Query wallet_address: ${walletAddressFromQuery}`
  );

  // 2. wallet_address parametresi var mı diye kontrol et
  if (!walletAddressFromQuery) {
    console.warn(
      `[${requestId}] Eksik parametre: wallet_address. Hata Kodu: E003`
    );
    // ERROR_CODES.E003'ü doğrudan kullanmak yerine mesajını yazabilirsin
    return NextResponse.json(
      {
        error:
          "wallet_address query parametresi gereklidir.",
        code: "E003_API",
        count: 0,
      },
      { status: 400 }
    );
  }

  console.log(
    `[${requestId}] Supabase'den referans sayısı sorgulanıyor, referrer_wallet_address:`,
    walletAddressFromQuery
  );

  // 3. Supabase client'ı oluştur
  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error(
      `[${requestId}] Supabase client oluşturulamadı.`
    );
    return NextResponse.json(
      { error: "Veritabanı bağlantı hatası.", count: 0 },
      { status: 503 }
    ); // 503 Service Unavailable
  }

  // 4. Supabase sorgusunu yap
  const { count, error } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true }) // Sadece sayım için "id" veya herhangi bir sütun yeterli
    .eq("referrer_wallet_address", walletAddressFromQuery);

  if (error) {
    console.error(
      `[${requestId}] Supabase referral sorgusunda hata (Adres: ${walletAddressFromQuery}). Hata Kodu: E013`,
      error
    );
    return NextResponse.json(
      {
        error: "Veritabanı sorgu hatası.",
        details: error.message,
        code: "E013_API",
        count: 0,
      },
      { status: 500 }
    );
  }

  // 5. Sonucu JSON olarak dön
  console.log(
    `[${requestId}] Referans sayısı başarıyla çekildi: ${
      count ?? 0
    } (Adres: ${walletAddressFromQuery})`
  );
  return NextResponse.json({ count: count ?? 0 });
}
