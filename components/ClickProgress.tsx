"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useClickStore } from "@/lib/stores/clickStore";
import { useAuthUser } from "@/hooks/useAuthUser";
import React from "react";
import { ERROR_CODES } from "../lib/errorCodes";

/**
 * Kullanıcının tıklama ilerlemesini gösteren bir ilerleme çubuğu bileşeni.
 * Günlük ve satın alınmış tıklama haklarını, kullanılan tıklamaları ve bekleyen tıklamaları gösterir.
 *
 * @returns TSX.Element - Tıklama ilerleme çubuğu bileşeni
 */
const ClickProgress = () => {
  const { user, pendingClicks } = useClickStore();
  const { isLoading, error } = useAuthUser();

  /**
   * Kullanılan ve toplam tıklama sayılarını hesaplar.
   */
  const usedClicks: number =
    (user?.purchased_clicks_used ?? 0) +
    ((user?.daily_clicks ?? 0) -
      (user?.daily_clicks_available ?? 0)) +
    pendingClicks;
  const totalClicks: number =
    (user?.daily_clicks ?? 0) +
    (user?.purchased_clicks ?? 0);

  /**
   * İlerleme yüzdesini hesaplar.
   */
  const percentage: number =
    totalClicks > 0
      ? Math.min((usedClicks / totalClicks) * 100, 100)
      : 0;

  /**
   * Yükleme durumunda skeleton UI gösterir.
   */
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto px-4">
        <Skeleton className="h-8 md:h-12 w-full bg-blue-200 rounded-full" />
      </div>
    );
  }

  /**
   * Hata durumunda hata mesajını gösterir.
   */
  if (error) {
    console.log(`Hata Kodu: E007 - ${ERROR_CODES.E007}`);
    return (
      <div className="w-full max-w-md mx-auto px-4 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  /**
   * Kullanıcı verisi yoksa varsayılan bir UI gösterir.
   */
  if (!user) {
    console.log(`Hata Kodu: E009 - ${ERROR_CODES.E009}`);
    return <p></p>;
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="relative">
        <Progress
          value={percentage}
          className="h-10 md:h-12 w-full bg-navy-blue rounded-full border-2 border-base-blue"
        />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm md:text-xl font-semibold text-base-white">
          {usedClicks}/{totalClicks}
        </span>
      </div>
    </div>
  );
};

export default ClickProgress;
