import { createClient as createSupabaseClient } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest
): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const walletAddressFromQuery = searchParams.get(
    "wallet_address"
  );

  if (!walletAddressFromQuery) {
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

  const supabase = createSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Veritabanı bağlantı hatası.", count: 0 },
      { status: 503 }
    );
  }

  // 1. Referans sayısını al
  const { count, error: countError } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("referrer_wallet_address", walletAddressFromQuery);

  if (countError) {
    return NextResponse.json(
      {
        error: "Veritabanı sorgu hatası.",
        details: countError.message,
        code: "E013_API",
        count: 0,
      },
      { status: 500 }
    );
  }

  // 2. referral_bonus_score'u al
  const { data, error: bonusError } = await supabase
    .from("users")
    .select("referral_bonus_score")
    .eq("wallet_address", walletAddressFromQuery)
    .single(); // tek kullanıcı döneceği için

  if (bonusError) {
    return NextResponse.json(
      {
        error: "Bonus skoru alınamadı.",
        details: bonusError.message,
        code: "E014_API",
        count,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    count: count ?? 0,
    referral_bonus_score: data?.referral_bonus_score ?? 0,
  });
}
