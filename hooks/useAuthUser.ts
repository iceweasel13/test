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
  refetchUser: () => Promise<Users | null>; // Return type added for clarity
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
      setError(""); // Token yoksa hata mesajını temizle, kullanıcı giriş yapmamış demektir
      setIsLoading(false);
      setUser(null);
      return null; // Return null if no token
    }

    try {
      // Endpoint'i /api/user/refresh olarak değiştirdik
      const response = await fetch("/api/user/refresh", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Eğer token geçerli değilse veya sunucudan başka bir hata dönerse
        throw new Error(
          responseData.error ||
            `Sunucudan hata (${response.status})`
        );
      }

      setUser(responseData as Users);
      return responseData as Users; // Return the fetched user data
    } catch (err: any) {
      console.error("Kullanıcı verisi çekme hatası:", err);
      setError(
        err.message || "Kullanıcı verileri çekilemedi."
      );
      setUser(null);
      return null; // Return null on error
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
    refetchUser: fetchUserData, // `refetchUser` artık `WorkspaceUserData` fonksiyonumuz.
  };
};
