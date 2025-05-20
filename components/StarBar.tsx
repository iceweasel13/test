"use client";

import { useClickStore } from "@/lib/stores/clickStore";
import { useAuthUser } from "@/hooks/useAuthUser";
import { formatAndDivideNumber } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { FaStar } from "react-icons/fa";
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
      <div className="bg-blue-200 hover:bg-blue-300 rounded-full  p-4.5 flex items-center space-x-2 w-22 h-5 md:w-26 md:h-6">
        <Skeleton className="w-5 h-5 md:w-6 md:h-6 rounded-full" />
        <Skeleton className="w-12 h-6 md:w-14 md:h-7" />
      </div>
    );
  }

  /**
   * Kullanıcının toplam puanını (score + bekleyen tıklamalar) formatlar.
   */
  const displayScore: string = formatAndDivideNumber(
    (user?.score ?? 0) + pendingClicks
  );

  return (
    <div className="flex items-center justify-center space-x-2 w-22 h-5 md:w-26 md:h-6 bg-blue-200 hover:bg-blue-300 rounded-full p-4.5">
      <FaStar className="text-yellow-400 w-5 h-5 md:w-6 md:h-6" />
      <p className="text-sm md:text-lg font-semibold text-white truncate">
        {displayScore}
      </p>
    </div>
  );
};

export default StarBar;
