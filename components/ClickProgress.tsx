"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useClickStore } from "@/lib/stores/clickStore";
import { useAuthUser } from "@/hooks/useAuthUser";
import React from "react";

const ClickProgress = () => {
  const { user, pendingClicks } = useClickStore();
  const { isLoading, error } = useAuthUser();

  // Kullanılan ve toplam click'ler
  const usedClicks =
    (user?.purchased_clicks_used ?? 0) +
    ((user?.daily_clicks ?? 0) -
      (user?.daily_clicks_available ?? 0)) +
    pendingClicks;
  const totalClicks =
    (user?.daily_clicks ?? 0) +
    (user?.purchased_clicks ?? 0);

  // Yüzde hesaplama (güvenli)
  const percentage =
    totalClicks > 0
      ? Math.min((usedClicks / totalClicks) * 100, 100)
      : 0;

  // Yükleme durumu
  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto px-4">
        <Skeleton className="h-8 md:h-12 w-full bg-blue-200 rounded-full" />
      </div>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="w-full max-w-md mx-auto px-4 text-center text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  // Kullanıcı verisi yoksa
  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto px-4 text-center text-gray-500">
        <p>0/0</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto px-4">
      <div className="relative">
        <Progress
          value={percentage}
          className="h-8 md:h-12 w-full bg-blue-200 rounded-full"
        />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm md:text-xl font-semibold text-white">
          {usedClicks}/{totalClicks}
        </span>
      </div>
    </div>
  );
};

export default ClickProgress;
