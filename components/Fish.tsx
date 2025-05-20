"use client";

import Image from "next/image";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { useClickStore } from "@/lib/stores/clickStore";
import { useAuthUser } from "@/hooks/useAuthUser";
import { ERROR_CODES } from "../lib/errorCodes";

/**
 * Balık tıklama oyunu bileşeni. Kullanıcı balığa tıkladığında puan kazanır ve görsel/ses efektleri tetiklenir.
 * Zustand store ve auth hook ile kullanıcı verilerini yönetir.
 *
 * @returns TSX.Element - Balık tıklama oyunu bileşeni
 */
const FishClicker = () => {
  const [scale, setScale] = useState<number>(1);
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
  const animationIdRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);
  const blubSoundRef = useRef<HTMLAudioElement | null>(
    null
  );

  const {
    incrementClick,
    syncClicks,
    lastClickTimestamp,
    setUser,
  } = useClickStore();
  const {
    user,
    isLoading: authIsLoading,
    error: authError,
  } = useAuthUser();

  /**
   * Blub sesini client tarafında yükler.
   */
  useEffect(() => {
    blubSoundRef.current = new Audio("/sounds/blub.mp3");
    blubSoundRef.current.load();
  }, []);

  /**
   * Kullanıcı verilerini Zustand store'a senkronize eder.
   */
  useEffect(() => {
    setUser(user);
    if (authError) {
      console.log(`Hata Kodu: E007 - ${ERROR_CODES.E007}`);
    }
  }, [user, authIsLoading, authError, setUser]);

  /**
   * Tıklama işlemini yönetir, görsel ve ses efektlerini tetikler.
   *
   * @param clientX - Tıklama konumu (X koordinatı)
   * @param clientY - Tıklama konumu (Y koordinatı)
   * @param isTrusted - Etkinliğin güvenilir olup olmadığını belirtir
   */
  const handleInteractionStart = useCallback(
    (
      clientX: number,
      clientY: number,
      isTrusted: boolean
    ) => {
      if (!isTrusted) {
        console.log(
          `Hata Kodu: E001 - ${ERROR_CODES.E001}`
        );
        return;
      }

      if (authIsLoading) {
        console.log(
          `Hata Kodu: E002 - ${ERROR_CODES.E002}`
        );
        return;
      }

      if (authError || !user || !user.wallet_address) {
        console.log(
          `Hata Kodu: E003 - ${ERROR_CODES.E003}`
        );
        alert(
          "Lütfen cüzdanınızı bağlayın veya giriş yapın."
        );
        return;
      }

      const now = Date.now();
      if (now - lastClickTimeRef.current < 100) {
        console.log(
          `Hata Kodu: E004 - ${ERROR_CODES.E004}`
        );
        return;
      }
      lastClickTimeRef.current = now;

      if (!incrementClick()) {
        console.log(
          `Hata Kodu: E005 - ${ERROR_CODES.E005}`
        );
        alert(
          "Tıklama hakkınız bitti! Daha fazla tıklama için mağazadan satın alabilirsiniz."
        );
        return;
      }

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
        blubSoundRef.current.currentTime = 0;
        blubSoundRef.current.play().catch(() => {
          console.log(
            `Hata Kodu: E006 - ${ERROR_CODES.E006}`
          );
        });
      }

      setScale((prev) => Math.min(prev + 0.1, 3));
      if (shrinkInterval.current) {
        clearInterval(shrinkInterval.current);
        shrinkInterval.current = null;
      }
    },
    [authIsLoading, authError, user, incrementClick]
  );

  /**
   * Tıklama sona erdiğinde balığın boyutunu kademeli olarak küçültür.
   */
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

  /**
   * Tıklama ve dokunma olaylarını dinler, sürüklemeyi engeller.
   */
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
    );
    currentContainer.addEventListener(
      "dragstart",
      (e: DragEvent) => e.preventDefault()
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
        (e: DragEvent) => e.preventDefault()
      );
      if (shrinkInterval.current) {
        clearInterval(shrinkInterval.current);
      }
    };
  }, [handleInteractionStart, handleInteractionEnd]);

  /**
   * 15 saniyelik inaktivite sonrası tıklama verilerini senkronize eder.
   */
  useEffect(() => {
    let syncTimer: NodeJS.Timeout;

    const checkAndSync = () => {
      if (
        lastClickTimestamp &&
        Date.now() - lastClickTimestamp > 15000
      ) {
        syncClicks();
      }
    };

    if (user) {
      syncTimer = setInterval(checkAndSync, 5000);
    }

    return () => {
      if (syncTimer) clearInterval(syncTimer);
    };
  }, [lastClickTimestamp, syncClicks, user]);

  /**
   * Component unmount olduğunda kalan tıklamaları senkronize eder.
   */
  useEffect(() => {
    return () => {
      syncClicks();
    };
  }, [syncClicks]);

  /**
   * Belirtilen +1 animasyonunu kaldırır.
   *
   * @param id - Kaldırılacak animasyonun kimliği
   */
  const removePlusOne = (id: number) => {
    setPlusOnes((prev) =>
      prev.filter((item) => item.id !== id)
    );
  };

  /**
   * Belirtilen baloncuk animasyonunu kaldırır.
   *
   * @param id - Kaldırılacak baloncuğun kimliği
   */
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
        userSelect: "none",
        touchAction: "manipulation",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
    >
      {plusOnes.map((plusOne) => (
        <motion.div
          key={`plus-${plusOne.id}`}
          initial={{ y: 0, opacity: 1, scale: 1 }}
          animate={{ y: -50, opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          onAnimationComplete={() =>
            removePlusOne(plusOne.id)
          }
          className="absolute text-xl md:text-2xl font-bold text-yellow-300 pointer-events-none z-20"
          style={{
            top: plusOne.y,
            left: plusOne.x,
            transform: "translate(-50%, -100%)",
            textShadow: "0px 0px 5px rgba(0,0,0,0.5)",
          }}
        >
          +1
        </motion.div>
      ))}

      {bubbles.map((bubble) => (
        <motion.div
          key={`bubble-${bubble.id}`}
          initial={{ scale: 0.1, opacity: 0.7 }}
          animate={{ scale: 1.8, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onAnimationComplete={() =>
            removeBubble(bubble.id)
          }
          className="absolute rounded-full bg-blue-400/40 pointer-events-none z-30"
          style={{
            top: bubble.y,
            left: bubble.x,
            width: Math.random() * 20 + 15,
            height: Math.random() * 20 + 15,
            transform: "translate(-50%, -50%)",
            zIndex: 5,
          }}
        />
      ))}

      <Image
        src="/fish.png"
        alt="Fish"
        width={200}
        height={200}
        draggable={false}
        className="z-10 select-none pointer-events-none pl-3 relative"
        priority
        style={{
          transform: `scale(${scale})`,
          transition: "transform 0.05s linear",
        }}
      />
    </div>
  );
};

export default FishClicker;
