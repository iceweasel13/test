// app/api/user/purchaseClicks/route.ts

import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/lib/supabase"; // 1. createSupabaseClient doğru çalışıyor mu?

// const supabase = createSupabaseClient(); // 2. BU SATIR GLOBAL SCOPE'TA OLMAMALI!

export async function POST(req: Request) {
  // Request tipi NextRequest olmalıydı ama Request de çalışabilir.
  // Her istek için yeni bir Supabase client oluşturmak daha iyi bir pratiktir,
  // özellikle serverless ortamlarda bağlantı yönetimi için.
  // Ancak global scope'ta bir kere oluşturup kullanmak da küçük uygulamalarda sorun yaratmayabilir.
  // Asıl sorun, eğer createSupabaseClient() hata verirse ne olacağı.
  const supabase = createSupabaseClient(); // 3. Her istekte client oluşturmak daha güvenli olabilir.

  // Eğer createSupabaseClient null dönebiliyorsa veya hata fırlatabiliyorsa, burada kontrol et.
  if (!supabase) {
    console.error(
      "[API ERROR] Supabase client could not be initialized."
    );
    return NextResponse.json(
      {
        error: "Database connection error",
        details: "Supabase client failed to initialize.",
      },
      { status: 503 }
    ); // Service Unavailable
  }

  const requestId = `req_purchase_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 7)}`;
  console.log(
    `[${requestId}] API /api/user/purchaseClicks POST isteği başladı.`
  );

  try {
    const body = await req.json();
    console.log(
      `[${requestId}] İstek body'si alındı:`,
      body
    );
    const { wallet_address, purchased_clicks } = body;

    // ... (parametre kontrollerin iyi görünüyor) ...
    // const purchasedClicksNum = parseInt(purchased_clicks); // Değişken adı frontend'den gelen purchased_clicks ile karışmasın diye.
    // Frontend'den sayı olarak geliyorsa parseInt'e gerek yok. Ama string geliyorsa şart.
    // MintEvent'ten gelen clicks '1000' (string) olduğu için frontend'de parseInt yapılmıştı.
    // Bu yüzden backend'e sayı olarak geliyor olmalı.
    const clicksToUpdate = Number(purchased_clicks); // Number() ile daha esnek tip dönüşümü

    if (
      !wallet_address ||
      typeof clicksToUpdate !== "number" ||
      isNaN(clicksToUpdate)
    ) {
      console.error(
        `[${requestId}] Eksik veya geçersiz parametreler: wallet_address='${wallet_address}', purchased_clicks='${purchased_clicks}' (parsed as ${clicksToUpdate})`
      );
      return NextResponse.json(
        {
          error: "Eksik veya geçersiz parametreler.",
          details:
            "wallet_address (string) ve purchased_clicks (geçerli bir sayı) gereklidir.",
        },
        { status: 400 }
      );
    }

    if (clicksToUpdate <= 0) {
      // Pozitif olmalı kontrolü
      console.error(
        `[${requestId}] Geçersiz purchased_clicks değeri: ${clicksToUpdate}. Pozitif olmalı.`
      );
      return NextResponse.json(
        {
          error: "Geçersiz purchased_clicks değeri.",
          details:
            "Satın alınan click sayısı pozitif bir değer olmalıdır.",
        },
        { status: 400 }
      );
    }

    console.log(
      `[${requestId}] Veritabanından kullanıcı aranıyor: ${wallet_address}`
    );
    const { data: userData, error: fetchError } =
      await supabase
        .from("users")
        .select("purchased_clicks") // Sadece gerekli alanı seçmek iyi bir pratik.
        .eq("wallet_address", wallet_address as string) // wallet_address tipini string'e zorla
        .single();

    if (fetchError) {
      // Sadece fetchError'a bakmak yeterli, .single() kayıt bulamazsa error döner (PGRST116)
      console.error(
        `[${requestId}] Kullanıcı bulunamadı veya veritabanı okuma hatası (Adres: ${wallet_address}):`,
        fetchError
      );
      // PGRST116 "Row to be returned was not found" anlamına gelir, bu bir "User not found" durumudur.
      const status =
        fetchError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        {
          error:
            status === 404
              ? "Kullanıcı bulunamadı."
              : "Veritabanı okuma hatası.",
          details: fetchError.message,
        },
        { status }
      );
    }
    // .single() kullandığımız için, eğer fetchError yoksa userData kesinlikle null değildir.
    // Ama yine de bir kontrol eklenebilir (paranoyak mod).
    if (!userData) {
      console.error(
        `[${requestId}] Kullanıcı verisi fetchError olmamasına rağmen null döndü (Adres: ${wallet_address}). Bu beklenmedik bir durum.`
      );
      return NextResponse.json(
        {
          error:
            "Kullanıcı verisi alınamadı (beklenmedik durum).",
        },
        { status: 404 }
      );
    }

    console.log(
      `[${requestId}] Mevcut kullanıcı verisi (Supabase'den):`,
      userData
    );

    const currentPurchasedClicks =
      userData.purchased_clicks || 0;
    const newTotalPurchasedClicks =
      currentPurchasedClicks + clicksToUpdate;

    console.log(
      `[${requestId}] Clickler güncelleniyor: Mevcut=${currentPurchasedClicks}, Eklenen=${clicksToUpdate}, Yeni Toplam=${newTotalPurchasedClicks} (Adres: ${wallet_address})`
    );

    const { error: updateError } = await supabase
      .from("users")
      .update({ purchased_clicks: newTotalPurchasedClicks }) // Sadece purchased_clicks'i güncelle
      .eq("wallet_address", wallet_address as string);

    if (updateError) {
      console.error(
        `[${requestId}] Veritabanı güncelleme hatası (Adres: ${wallet_address}):`,
        updateError
      );
      return NextResponse.json(
        {
          error: "Veritabanı güncelleme hatası.",
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    console.log(
      `[${requestId}] Satın alınan clickler başarıyla güncellendi (Adres: ${wallet_address}, Yeni Toplam: ${newTotalPurchasedClicks})`
    );
    return NextResponse.json(
      {
        success: true,
        newPurchasedClicks: newTotalPurchasedClicks,
        message: "Clickler başarıyla güncellendi.",
      },
      { status: 200 }
    );
  } catch (err: any) {
    // BU BLOK MUHTEMELEN ÇALIŞIYOR
    console.error(
      `[${requestId}] API /api/user/purchaseClicks İÇİNDE BEKLENMEDİK SUNUCU HATASI:`,
      err, // Hata objesinin tamamını logla
      "Hata Mesajı:",
      err.message,
      "Hata Stack:",
      err.stack
    );
    return NextResponse.json(
      {
        error: "Sunucuda genel bir hata oluştu.",
        details: err.message || "Bilinmeyen sunucu hatası.",
      },
      { status: 500 }
    );
  }
}
