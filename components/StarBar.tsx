"use client";

import { useClickStore } from "@/lib/stores/clickStore";
import { useAuthUser } from "@/hooks/useAuthUser";

import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import React from "react";

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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center space-x-2  rounded-full  text-xl md:text-2xl font-extrabold text-base-white ">
        <Image
          alt={""}
          height={40}
          width={40}
          src={"/star.png"}
        />

        <Skeleton className="w-20 h-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="">
        <Image
          className="stroke-navy-blue scale-75"
          height={40}
          width={200}
          alt=""
          src={"/logos.png"}
        />
      </div>
    );
  }
  /**
   * Kullanıcının toplam puanını (score + bekleyen tıklamalar) formatlar.
   */
  const displayScore: number =
    (user?.score ?? 0) + pendingClicks;

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
