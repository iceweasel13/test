import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createClient as createSupabaseClient } from "@/lib/supabase";
import { Users } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "";

export async function POST(req: NextRequest) {
  const requestId = `req_click_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  console.log(
    `[${requestId}] ========== API /api/user/click POST BAŞLADI ==========`
  );

  // 1. JWT_SECRET Kontrolü
  if (!JWT_SECRET) {
    console.error(
      `[${requestId}] KRİTİK HATA: JWT_SECRET eksik.`
    );
    return NextResponse.json(
      { error: "Sunucu yapılandırma hatası" },
      { status: 500 }
    );
  }

  // 2. Authorization Header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error(
      `[${requestId}] HATA: Geçersiz veya eksik Authorization header.`
    );
    return NextResponse.json(
      { error: "Yetkisiz istek" },
      { status: 401 }
    );
  }
  const token = authHeader.replace("Bearer ", "");

  // 3. JWT Doğrulama
  let decoded: { sub: string; address: string };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      address: string;
    };
    console.log(
      `[${requestId}] JWT doğrulandı:`,
      decoded.sub
    );
  } catch (error) {
    console.error(
      `[${requestId}] HATA: Geçersiz JWT token.`,
      error
    );
    return NextResponse.json(
      { error: "Geçersiz token" },
      { status: 401 }
    );
  }

  // 4. İstek Body’si
  let payload: { clickCount: number; timestamp: number };
  try {
    payload = await req.json();
    console.log(`[${requestId}] İstek body’si:`, payload);
  } catch (error) {
    console.error(
      `[${requestId}] HATA: Geçersiz JSON.`,
      error
    );
    return NextResponse.json(
      { error: "Geçersiz istek verisi" },
      { status: 400 }
    );
  }

  const { clickCount, timestamp } = payload;
  if (
    !Number.isInteger(clickCount) ||
    clickCount <= 0 ||
    !Number.isInteger(timestamp)
  ) {
    console.error(
      `[${requestId}] HATA: Geçersiz clickCount veya timestamp.`,
      { clickCount, timestamp }
    );
    return NextResponse.json(
      { error: "Geçersiz clickCount veya timestamp" },
      { status: 400 }
    );
  }

  // 5. Zaman Damgası Kontrolü (Anti-cheat: ±5 saniye tolerans)
  const serverTime = Date.now();
  const timeDiff = Math.abs(serverTime - timestamp);
  if (timeDiff > 5000) {
    console.error(
      `[${requestId}] HATA: Geçersiz zaman damgası.`,
      { serverTime, timestamp, timeDiff }
    );
    return NextResponse.json(
      { error: "Geçersiz zaman damgası" },
      { status: 400 }
    );
  }

  // 6. Tıklama Sınırlaması (Anti-cheat: 15 saniyede max 150 tıklama)
  if (clickCount > 350) {
    console.error(
      `[${requestId}] HATA: Aşırı tıklama sayısı.`,
      { clickCount }
    );
    return NextResponse.json(
      { error: "Geçersiz tıklama sayısı" },
      { status: 400 }
    );
  }

  // 7. Supabase Client
  const supabase = createSupabaseClient();

  // 8. Kullanıcıyı Çek
  const { data: user, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", decoded.address)
    .single();

  if (fetchError || !user) {
    console.error(
      `[${requestId}] HATA: Kullanıcı bulunamadı.`,
      fetchError
    );
    return NextResponse.json(
      { error: "Kullanıcı bulunamadı" },
      { status: 404 }
    );
  }
  console.log(
    `[${requestId}] Kullanıcı bulundu:`,
    user.wallet_address
  );

  // 9. Tıklama Limit Kontrolü
  const availableDailyClicks =
    user.daily_clicks_available || 0;
  const availablePurchasedClicks =
    (user.purchased_clicks || 0) -
    (user.purchased_clicks_used || 0);
  const totalAvailableClicks =
    availableDailyClicks + availablePurchasedClicks;

  if (clickCount > totalAvailableClicks) {
    console.error(
      `[${requestId}] HATA: Yetersiz tıklama hakkı.`,
      {
        clickCount,
        availableDailyClicks,
        availablePurchasedClicks,
      }
    );
    return NextResponse.json(
      { error: "Yetersiz tıklama hakkı" },
      { status: 400 }
    );
  }

  // 10. Tıklama Dağılımı (Önce daily, sonra purchased)
  const dailyClicksUsed = Math.min(
    clickCount,
    availableDailyClicks
  );
  const purchasedClicksUsed = clickCount - dailyClicksUsed;

  // 11. Puan ve Bonus Hesaplama
  const scoreIncrease = clickCount;
  const referralBonus = Math.floor(scoreIncrease * 0.05); // %5 bonus

  // 12. Kullanıcı Güncelleme
  const updates: Partial<Users> = {
    score: (user.score || 0) + scoreIncrease,
    daily_clicks_available:
      availableDailyClicks - dailyClicksUsed,
    purchased_clicks_used:
      (user.purchased_clicks_used || 0) +
      purchasedClicksUsed,
    last_active_at: new Date().toISOString(),
  };

  const { data: updatedUser, error: updateError } =
    await supabase
      .from("users")
      .update(updates)
      .eq("wallet_address", decoded.address)
      .select("*")
      .single();

  if (updateError || !updatedUser) {
    console.error(
      `[${requestId}] HATA: Kullanıcı güncellenemedi.`,
      updateError
    );
    return NextResponse.json(
      { error: "Kullanıcı güncellenemedi" },
      { status: 500 }
    );
  }
  console.log(
    `[${requestId}] Kullanıcı güncellendi:`,
    updatedUser
  );

  // 13. Referans Bonusu (varsa)
  if (user.referrer_wallet_address && referralBonus > 0) {
    const { error: referralError } = await supabase
      .from("users")
      .update({
        referral_bonus_score:
          (user.referral_bonus_score || 0) + referralBonus,
        last_active_at: new Date().toISOString(),
      })
      .eq("wallet_address", user.referrer_wallet_address);

    if (referralError) {
      console.error(
        `[${requestId}] UYARI: Referans bonusu eklenemedi.`,
        referralError
      );
      // Hata kritik değil, devam edebilir
    } else {
      console.log(
        `[${requestId}] Referans bonusu eklendi:`,
        {
          referrer: user.referrer_wallet_address,
          bonus: referralBonus,
        }
      );
    }
  }

  // 14. Yanıt
  console.log(
    `[${requestId}] ========== API /api/user/click POST TAMAMLANDI ==========`
  );
  return NextResponse.json({
    success: true,
    user: updatedUser,
    clickCount,
    referralBonus,
  });
}
