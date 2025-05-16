"use client";

import { useAuthUser } from "@/hooks/useAuthUser";
import { formatAndDivideNumber } from "@/lib/utils"; // formatAndDivideNumber fonksiyonunun yolu
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  FaStar,
  FaExclamationCircle,
} from "react-icons/fa";
import React from "react";

const StarBar = () => {
  const { user, isLoading, error } = useAuthUser();

  // Yükleme durumu
  if (isLoading) {
    return (
      <>
        <Skeleton className="w-5 h-5 md:w-6 md:h-6 rounded-full" />{" "}
        {/* Yıldız için */}
        <Skeleton className="w-12 h-6 md:w-14 md:h-7 justify-center items-center" />{" "}
        {/* Puan için */}
      </>
    );
  }

  // Hata durumu
  if (error) {
    return (
      <div className="w-full max-w-xs">
        <Alert
          variant="destructive"
          className="flex items-center space-x-2"
        >
          <FaExclamationCircle className="w-4 h-4" />
          <AlertDescription className="text-sm md:text-base">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Kullanıcı verisi yoksa
  if (!user) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm md:text-base">
        <FaExclamationCircle className="w-4 h-4 md:w-5 md:h-5" />
        <p>Please log in to view your score.</p>
      </div>
    );
  }

  // Puan formatlama
  const displayScore = formatAndDivideNumber(
    user.score ?? 0
  );

  return (
    <div className="flex items-center justify-center space-x-2 w-16 h-5 md:w-18 md:h-6">
      <FaStar className="text-yellow-400 w-5 h-5 md:w-6 md:h-6" />
      <p className="text-sm md:text-lg font-semibold text-white truncate">
        {displayScore}
      </p>
    </div>
  );
};

export default StarBar;
