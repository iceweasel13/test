// iceweasel13/test/test-24b40a4dbbc3f1e37c35aff99120bf0010cecfa8/components/StarBar.tsx
"use client";

import { useClickStore } from "@/lib/stores/clickStore";
// Skeleton bileşenini import edin
import Image from "next/image";
import React from "react";
import { Skeleton } from "./ui/skeleton";
import { useAuthUser } from "@/hooks/useAuthUser";

/**
 * Kullanıcının puanını (score + bekleyen tıklamalar) yıldız simgesiyle gösteren bir çubuk bileşeni.
 * Yükleme, hata veya kullanıcı verisi eksikse uygun UI gösterir.
 *
 * @returns TSX.Element - Yıldız çubuğu bileşeni
 */
const StarBar = () => {
  const { user, pendingClicks } = useClickStore();
  const { isLoading } = useAuthUser();
  /**
   * Yükleme durumunda skeleton UI gösterir.
   */
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center space-x-2  rounded-full  text-xl md:text-2xl font-extrabold text-base-white ">
        <Image
          alt={""}
          height={40}
          width={40}
          src={"/star.png"}
        />
        <Skeleton
          id="point"
          className="w-20 h-7 pb-1  "
        ></Skeleton>
      </div>
    );
  }
  /**
   * Kullanıcının toplam puanını (score + bekleyen tıklamalar) formatlar.
   */
  const displayScore: number =
    (user?.score ?? 0) + pendingClicks;

  // Kullanıcı yüklendi ve mevcutsa puanı göster
  return (
    <div className="flex items-center justify-center space-x-2  rounded-full  text-xl md:text-2xl font-extrabold text-base-white ">
      <Image
        alt={""}
        height={40}
        width={40}
        src={"/star.png"}
      />
      <p
        id="point"
        className="text-2xl md:text-4xl font-extrabold text-base-white pb-1  "
      >
        {displayScore}
      </p>
    </div>
  );
};

export default StarBar;
