import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Users } from "@/lib/types";

type AuthState = {
  user: Users | null;
  token: string | null;
  setAuth: (user: Users, token: string) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    {
      name: "auth-storage", // localStorage key
    }
  )
);
