/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAuthUser.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/stores/authStore"; // Zustand store
import type { Users } from "@/lib/types";

interface UseAuthUserReturn {
  user: Users | null;
  isLoading: boolean;
  error: string | null;
  refetchUser: () => void;
}

export const useAuthUser = (): UseAuthUserReturn => {
  const [user, setUser] = useState<Users | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore(); // Token'ı store'dan al

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!token) {
      setError("");
      setIsLoading(false);
      setUser(null);
      return;
    }

    try {
      const response = await fetch("/api/user/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `Sunucudan hata (${response.status})`
        );
      }

      setUser(responseData as Users);
    } catch (err: any) {
      console.error("Kullanıcı verisi çekme hatası:", err);
      setError(
        err.message || "Kullanıcı verileri çekilemedi."
      );
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    user,
    isLoading,
    error,
    refetchUser: fetchUserData,
  };
};
