import { create } from "zustand";
import { Users } from "@/lib/types";

interface ClickStore {
  user: Users | null;
  pendingClicks: number;
  lastClickTimestamp: number;
  isSyncing: boolean;
  setUser: (user: Users | null) => void;
  incrementClick: () => boolean;
  syncClicks: () => Promise<void>;
}

export const useClickStore = create<ClickStore>(
  (set, get) => ({
    user: null,
    pendingClicks: 0,
    lastClickTimestamp: 0,
    isSyncing: false,

    setUser: (user) => set({ user }),

    incrementClick: () => {
      const { user, pendingClicks } = get();
      if (!user) {
        console.warn(
          "[ClickStore] incrementClick: Kullanıcı yok."
        );
        return false;
      }

      // Toplam tıklama limiti
      const availableDailyClicks =
        user.daily_clicks_available || 0;
      const availablePurchasedClicks =
        (user.purchased_clicks || 0) -
        (user.purchased_clicks_used || 0);
      const totalAvailableClicks =
        availableDailyClicks + availablePurchasedClicks;

      if (pendingClicks >= totalAvailableClicks) {
        console.warn(
          "[ClickStore] incrementClick: Tıklama limiti aşıldı.",
          {
            pendingClicks,
            totalAvailableClicks,
            availableDailyClicks,
            availablePurchasedClicks,
          }
        );
        return false;
      }

      // Saniyede 10 tıklama sınırı (50ms)
      const now = Date.now();
      const timeSinceLastClick =
        now - get().lastClickTimestamp;
      if (timeSinceLastClick < 50) {
        console.warn(
          "[ClickStore] incrementClick: Çok hızlı tıklama.",
          { timeSinceLastClick }
        );
        return false;
      }

      set({
        pendingClicks: pendingClicks + 1,
        lastClickTimestamp: now,
      });
      console.log("[ClickStore] Tıklama eklendi:", {
        pendingClicks: pendingClicks + 1,
      });
      return true;
    },

    syncClicks: async () => {
      const { user, pendingClicks, isSyncing } = get();
      if (!user || pendingClicks === 0 || isSyncing) {
        console.log(
          "[ClickStore] syncClicks: Senkronizasyon atlandı.",
          {
            user: !!user,
            pendingClicks,
            isSyncing,
          }
        );
        return;
      }

      set({ isSyncing: true });
      try {
        // Safe localStorage access and JSON parsing
        let token = "";
        try {
          if (
            typeof window !== "undefined" &&
            window.localStorage
          ) {
            const authStorage =
              localStorage.getItem("auth-storage");
            if (authStorage) {
              const parsed = JSON.parse(authStorage);
              token = parsed.state?.token || "";
            }
          }
        } catch (error) {
          console.error(
            "[ClickStore] syncClicks: localStorage erişim veya JSON parse hatası.",
            error
          );
          throw new Error(
            "Depolama erişimi engellendi veya geçersiz veri"
          );
        }

        if (!token) {
          console.error(
            "[ClickStore] syncClicks: JWT token bulunamadı."
          );
          throw new Error("Kimlik doğrulama token’ı eksik");
        }

        const response = await fetch("/api/user/click", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clickCount: pendingClicks,
            timestamp: Date.now(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            "[ClickStore] syncClicks: Backend hatası.",
            errorData
          );
          throw new Error(
            errorData.error || "Senkronizasyon hatası"
          );
        }

        const data = await response.json();
        console.log(
          "[ClickStore] syncClicks: Başarılı.",
          data
        );

        // Kullanıcı verilerini güncelle
        set({
          user: data.user,
          pendingClicks: 0,
          isSyncing: false,
        });
      } catch (error) {
        console.error(
          "[ClickStore] syncClicks: Hata.",
          error
        );
        set({ isSyncing: false });
      }
    },
  })
);
