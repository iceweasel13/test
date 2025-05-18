"use client";

import Image from "next/image";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react"; // useCallback eklendi
import { motion } from "framer-motion";
import { useClickStore } from "@/lib/stores/clickStore"; // Store yolu doğru varsayılıyor
import { useAuthUser } from "@/hooks/useAuthUser"; // Hook yolu doğru varsayılıyor

const FishClicker = () => {
  const [scale, setScale] = useState(1);
  const [plusOnes, setPlusOnes] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const [bubbles, setBubbles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const shrinkInterval = useRef<NodeJS.Timeout | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // ID'ler için ayrı sayaçlar kullanmak daha güvenli olabilir,
  // ancak şimdilik tek sayaç ve key'lerde ön ek kullanalım.
  const animationIdRef = useRef(0);
  const lastClickTimeRef = useRef(0); // Debouncing için

  const {
    incrementClick, // Zustand store'dan gelen fonksiyon
    syncClicks, // Zustand store'dan gelen fonksiyon
    lastClickTimestamp, // Zustand store'dan gelen state (15 saniye kuralı için)
    setUser, // Zustand store'a kullanıcıyı set etmek için
  } = useClickStore();

  const {
    user,
    isLoading: authIsLoading,
    error: authError,
  } = useAuthUser(); // Auth hook'u

  // Blub sesi için Audio nesnesini client-side'da oluştur
  const blubSoundRef = useRef<HTMLAudioElement | null>(
    null
  );

  useEffect(() => {
    // Audio nesnesini sadece client tarafında oluştur
    blubSoundRef.current = new Audio("/sounds/blub.mp3");
    // Sesi ön yükleme (opsiyonel ama iyi bir pratik)
    blubSoundRef.current.load();
  }, []); // Boş bağımlılık dizisi, sadece component mount olduğunda çalışır

  // Kullanıcı verilerini store’a senkronize et
  // Bu useEffect, useClickStore'un user state'ini günceller.
  // useClickStore'un bu user'ı nasıl kullandığına bağlı olarak bu mantık store içine de taşınabilir.
  useEffect(() => {
    setUser(user); // useClickStore içindeki setUser user objesini veya null/undefined almalı
    if (user) {
      console.log(
        "[FishClicker] Kullanıcı bilgisi clickStore'a set edildi:",
        {
          wallet_address: user.wallet_address,
          score: user.score,
          daily_clicks_available:
            user.daily_clicks_available,
          purchased_clicks: user.purchased_clicks, // Bu, kalan satın alınmış haklar mı yoksa toplam mı? Store'un bunu nasıl işlediği önemli.
          purchased_clicks_used: user.purchased_clicks_used,
        }
      );
    } else if (authIsLoading) {
      console.log(
        "[FishClicker] Auth kullanıcısı yükleniyor..."
      );
    } else if (authError) {
      console.log(
        "[FishClicker] Auth kullanıcısı yüklenirken hata:",
        authError
      );
    } else {
      console.log(
        "[FishClicker] Auth kullanıcısı yok (logout olmuş olabilir)."
      );
    }
  }, [user, authIsLoading, authError, setUser]);

  // Tıklama işlemleri
  const handleInteractionStart = useCallback(
    (
      clientX: number,
      clientY: number,
      isTrusted: boolean
    ) => {
      if (!isTrusted) {
        console.warn(
          "[FishClicker] Güvenilir olmayan tıklama olayı tespit edildi."
        );
        return;
      }

      if (authIsLoading) {
        console.warn(
          "[FishClicker] Tıklama reddedildi: Kullanıcı kimliği doğrulanıyor."
        );
        return;
      }
      if (authError || !user || !user.wallet_address) {
        console.warn(
          "[FishClicker] Tıklama reddedildi: Geçerli kullanıcı yok veya auth hatası.",
          { user, authError }
        );
        alert(
          "Lütfen cüzdanınızı bağlayın veya giriş yapın."
        );
        return;
      }

      const now = Date.now();
      if (now - lastClickTimeRef.current < 100) {
        // 100ms debounce
        console.warn(
          "[FishClicker] Çok hızlı tıklama engellendi."
        );
        return;
      }
      lastClickTimeRef.current = now;

      // Zustand store üzerinden tıklama izni ve işlemi
      // incrementClick fonksiyonu, tıklama hakkı varsa true dönmeli ve store'u güncellemeli
      if (!incrementClick()) {
        console.warn(
          "[FishClicker] Tıklama reddedildi: Store tarafından limit aşıldı veya izin verilmedi."
        );
        alert(
          "Tıklama hakkınız bitti! Daha fazla tıklama için mağazadan satın alabilirsiniz."
        );
        return;
      }

      // Görsel ve ses efektleri
      const boundingBox =
        containerRef.current?.getBoundingClientRect();
      if (!boundingBox) return;

      const x = clientX - boundingBox.left;
      const y = clientY - boundingBox.top;
      const currentId = animationIdRef.current++;

      setPlusOnes((prev) => [
        ...prev,
        { id: currentId, x, y },
      ]);
      setBubbles((prev) => [
        ...prev,
        { id: currentId, x, y },
      ]);

      if (blubSoundRef.current) {
        blubSoundRef.current.currentTime = 0; // Sesi başa sar
        blubSoundRef.current
          .play()
          .catch((err) =>
            console.error(
              "[FishClicker] Ses oynatma hatası:",
              err
            )
          );
      }

      setScale((prev) => Math.min(prev + 0.1, 1.5)); // Maksimum scale'i biraz düşürdüm, 3 çok büyük olabilir

      if (shrinkInterval.current) {
        clearInterval(shrinkInterval.current);
        shrinkInterval.current = null;
      }
    },
    [authIsLoading, authError, user, incrementClick] // setUser'ı bağımlılıklardan çıkardım, çünkü tıklama anında değişmemeli.
    // lastClickTimeRef.current store'da değil, component içinde yönetiliyor.
  );

  const handleInteractionEnd = useCallback(() => {
    if (shrinkInterval.current) return;

    shrinkInterval.current = setInterval(() => {
      setScale((prev) => {
        if (prev <= 1.01) {
          if (shrinkInterval.current) {
            clearInterval(shrinkInterval.current);
            shrinkInterval.current = null;
          }
          return 1;
        }
        return prev - 0.05;
      });
    }, 100);
  }, []);

  // Event listener'ları yönetmek için useEffect
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      handleInteractionStart(
        e.clientX,
        e.clientY,
        e.isTrusted
      );
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleInteractionStart(
          e.touches[0].clientX,
          e.touches[0].clientY,
          e.isTrusted
        );
      }
    };

    // Non-passive event listener'lar ekle
    currentContainer.addEventListener(
      "mousedown",
      onMouseDown,
      { passive: false }
    );
    currentContainer.addEventListener(
      "touchstart",
      onTouchStart,
      { passive: false }
    );
    currentContainer.addEventListener(
      "mouseup",
      handleInteractionEnd
    );
    currentContainer.addEventListener(
      "touchend",
      handleInteractionEnd
    );
    currentContainer.addEventListener(
      "mouseleave",
      handleInteractionEnd
    ); // Fare dışarı çıktığında da küçülsün

    // Sürüklemeyi engelle (resim için ayrıca draggable={false} var)
    const preventDrag = (e: DragEvent) =>
      e.preventDefault();
    currentContainer.addEventListener(
      "dragstart",
      preventDrag
    );

    return () => {
      currentContainer.removeEventListener(
        "mousedown",
        onMouseDown
      );
      currentContainer.removeEventListener(
        "touchstart",
        onTouchStart
      );
      currentContainer.removeEventListener(
        "mouseup",
        handleInteractionEnd
      );
      currentContainer.removeEventListener(
        "touchend",
        handleInteractionEnd
      );
      currentContainer.removeEventListener(
        "mouseleave",
        handleInteractionEnd
      );
      currentContainer.removeEventListener(
        "dragstart",
        preventDrag
      );
      if (shrinkInterval.current) {
        // Component unmount olurken interval'ı temizle
        clearInterval(shrinkInterval.current);
      }
    };
  }, [handleInteractionStart, handleInteractionEnd]); // Bağımlılıkları ekledik

  // 15 saniyelik periyodik senkronizasyon (Zustand store'daki lastClickTimestamp'a göre)
  useEffect(() => {
    let syncTimer: NodeJS.Timeout;

    const checkAndSync = () => {
      // lastClickTimestamp store'dan geliyor ve Date.now() ile karşılaştırılıyor.
      // Eğer store'da lastClickTimestamp null veya 0 ise (henüz tıklama yoksa) sync çalışmaz.
      if (
        lastClickTimestamp &&
        Date.now() - lastClickTimestamp > 15000
      ) {
        console.log(
          "[FishClicker] 15 saniye inaktivite sonrası senkronizasyon tetikleniyor..."
        );
        syncClicks(); // Bu fonksiyonun store'da lastClickTimestamp'ı sıfırlaması/güncellemesi gerekir.
      }
    };

    // Hemen kontrol etme, belirli aralıklarla kontrol et.
    // Örneğin her 5 saniyede bir kontrol et, eğer 15 saniye geçmişse sync et.
    // Ya da daha iyisi, tıklama olduğunda (lastClickTimestamp güncellendiğinde) 15 saniyelik bir timeout başlatmak.
    // Mevcut haliyle her saniye kontrol ediyor, bu da gereksiz olabilir.
    // Şimdilik kullanıcının istediği gibi (her saniye kontrol) bırakıyorum, ama iyileştirilebilir.

    if (user) {
      // Sadece kullanıcı varsa senkronizasyon timer'ını başlat
      syncTimer = setInterval(checkAndSync, 5000); // Kontrol aralığını 5 saniyeye çıkardım
    }

    return () => {
      if (syncTimer) clearInterval(syncTimer);
    };
  }, [lastClickTimestamp, syncClicks, user]); // user eklendi, kullanıcı yoksa timer başlamasın.

  // Component unmount olurken kalan tıklamaları senkronize etme denemesi (isteğe bağlı)
  useEffect(() => {
    return () => {
      // Eğer `useClickStore` içinde `clicksThisSession` gibi birikmiş tıklama sayısı varsa
      // ve bu sayı 0'dan büyükse, çıkarken senkronize etmeyi deneyebilirsin.
      // const { clicksThisSession } = useClickStore.getState(); // Anlık state'i al
      // if (clicksThisSession > 0) {
      //   console.log("[FishClicker] Component unmount olurken senkronizasyon denemesi...");
      //   syncClicks();
      // }
    };
  }, [syncClicks]); // syncClicks değişmeyeceği için bu useEffect bir kere çalışır ve cleanup'ı ayarlar.

  const removePlusOne = (id: number) => {
    setPlusOnes((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  const removeBubble = (id: number) => {
    setBubbles((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block mx-auto select-none cursor-pointer items-center justify-center"
      style={{
        userSelect: "none", // CSS ile de seçimi engelle
        touchAction: "manipulation", // Mobil'de çift tıklama zoom'unu vs. engelle
        WebkitUserSelect: "none", // Safari için
        MozUserSelect: "none", // Firefox için
        msUserSelect: "none", // IE için
      }}
    >
      {/* +1 Animasyonları */}
      {plusOnes.map((plusOne) => (
        <motion.div
          key={`plus-${plusOne.id}`} // Benzersiz key
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: -50, opacity: 0, scale: 1.3 }} // Biraz daha yukarı ve büyük
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={() =>
            removePlusOne(plusOne.id)
          }
          className="absolute text-xl md:text-2xl font-bold text-yellow-300 pointer-events-none z-20" // z-index artırıldı, renk değişti
          style={{
            top: plusOne.y,
            left: plusOne.x,
            transform: "translate(-50%, -100%)", // Tıklanan noktanın biraz daha yukarısından başlasın
            textShadow: "0px 0px 5px rgba(0,0,0,0.5)",
          }}
        >
          +1
        </motion.div>
      ))}

      {/* Baloncuk Animasyonları */}
      {bubbles.map((bubble) => (
        <motion.div
          key={`bubble-${bubble.id}`} // Benzersiz key
          initial={{ scale: 0.1, opacity: 0.7 }}
          animate={{ scale: 1.8, opacity: 0 }} // Daha belirgin bir büyüme
          transition={{ duration: 0.5, ease: "easeOut" }}
          onAnimationComplete={() =>
            removeBubble(bubble.id)
          }
          className="absolute rounded-full bg-blue-400/40 pointer-events-none"
          style={{
            top: bubble.y,
            left: bubble.x,
            width: Math.random() * 20 + 15, // Rastgele boyut (15-35px)
            height: Math.random() * 20 + 15, // Rastgele boyut
            transform: "translate(-50%, -50%)",
            zIndex: 5, // Artı birlerin arkasında kalması için düşürdüm, veya plusOnes'dan yüksek yapın (tercihe bağlı)
            // Eğer baloncukların önde olması isteniyorsa zIndex: 25 gibi bir değer verilebilir.
            // Şimdilik artı birlerin arkasında kalacak şekilde ayarladım (z-5).
            // Kullanıcının isteğine göre bu z-index'i (plusOnes z-20 ise) z-25 yapalım.
          }}
        />
      ))}

      <Image
        src="/fish.png" // Bu dosyanın public klasöründe olduğundan emin ol
        alt="Fish"
        width={200}
        height={200}
        draggable={false}
        className="z-10 select-none pointer-events-none pl-3 relative" // Balık tıklama efektlerinin üzerinde olmalı
        priority // Önemli bir resimse, öncelikli yükle
        style={{
          transform: `scale(${scale})`,
          transition: "transform 0.05s linear", // Daha hızlı tepki
        }}
      />
    </div>
  );
};

export default FishClicker;
