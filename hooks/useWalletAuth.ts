/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  useCurrentAccount,
  useSignPersonalMessage,
  useDisconnectWallet,
  useAutoConnectWallet,
} from "@mysten/dapp-kit";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export function useWalletAuth() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const account = useCurrentAccount();
  const autoConnectionStatus = useAutoConnectWallet();
  const { mutate: signPersonalMessage } =
    useSignPersonalMessage();
  const { mutate: disconnect } = useDisconnectWallet();
  const { user, token, setAuth, clearAuth } =
    useAuthStore();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loginError, setLoginError] = useState<
    string | null
  >(null);

  // Token expiry kontrolü
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(
          atob(token.split(".")[1])
        );
        if (payload.exp * 1000 < Date.now()) {
          clearAuth();
          setLoginError(
            "Session expired, please log in again."
          );
        }
      } catch {
        clearAuth();
        setLoginError(
          "Invalid token, please log in again."
        );
      }
    }
  }, [token, clearAuth]);

  // İlk yükleme tamamlanana kadar clearAuth'u engelle
  useEffect(() => {
    if (autoConnectionStatus === "attempted") {
      setIsInitialLoad(false);
    }
  }, [autoConnectionStatus]);

  // Otomatik login (token varsa ve cüzdan bağlıysa)
  useEffect(() => {
    const tryAutoLogin = async () => {
      if (
        token &&
        account &&
        autoConnectionStatus === "attempted"
      ) {
        try {
          const res = await fetch("/api/auth/verify", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const { user } = await res.json();
            setAuth(user, token);
            setLoginError(null);
          } else {
            clearAuth();
            setLoginError(
              "Invalid session, please log in again."
            );
          }
        } catch {
          clearAuth();
          setLoginError(
            "Failed to verify session, please log in again."
          );
        }
      }
    };

    if (!isInitialLoad) {
      tryAutoLogin();
    }
  }, [
    account,
    token,
    autoConnectionStatus,
    isInitialLoad,
    setAuth,
    clearAuth,
  ]);

  // Otomatik imza ve login (cüzdan bağlandığında)
  useEffect(() => {
    const triggerAutoLogin = async () => {
      if (
        account &&
        autoConnectionStatus === "attempted" &&
        !token &&
        !user
      ) {
        try {
          await login();
          setLoginError(null);
        } catch (err) {
          setLoginError(
            "Failed to sign in automatically, please try manually."
          );
        }
      }
    };

    if (!isInitialLoad) {
      triggerAutoLogin();
    }
  }, [
    account,
    autoConnectionStatus,
    token,
    user,
    isInitialLoad,
  ]);

  // Wallet disconnect kontrolü
  useEffect(() => {
    if (
      !isInitialLoad &&
      account === null &&
      autoConnectionStatus === "attempted"
    ) {
      clearAuth();
      setLoginError(
        "Wallet disconnected, please log in again."
      );
    }
  }, [
    account,
    autoConnectionStatus,
    isInitialLoad,
    clearAuth,
  ]);

  // Login fonksiyonu
  const login = async () => {
    if (!account?.address) {
      setLoginError(
        "No wallet connected, please connect a wallet."
      );
      return Promise.reject(
        new Error(
          "No wallet connected, please connect a wallet."
        )
      );
    }
    const timestamp = Date.now();
    const message = `Login to the app at ${timestamp}`;

    // URL'den 'ref' parametresini al
    const refValue = searchParams
      ? searchParams.get("ref")?.toLowerCase()
      : null;
    console.log(
      "Frontend: Çekilen ref parametresi:",
      refValue
    );

    return new Promise<void>((resolve, reject) => {
      signPersonalMessage(
        { message: new TextEncoder().encode(message) },
        {
          onSuccess: async (result) => {
            const signature = result.signature;
            try {
              const res = await fetch("/api/auth/wallet", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  wallet_address: account.address,
                  message,
                  signature,
                  referrer_wallet_address: refValue,
                }),
              });

              if (!res.ok) {
                // hata yönetimi
                const errorData = await res
                  .json()
                  .catch(() => ({
                    message:
                      "Authentication failed with status: " +
                      res.status,
                  }));
                clearAuth();
                setLoginError(
                  errorData.message ||
                    "Authentication failed."
                );
                reject(new Error(errorData.message));
                return;
              }

              const { user, token } = await res.json();
              setAuth(user, token);

              // ✅ Başarılı login sonrası yönlendirme:
              router.replace(
                `/dashboard/${account.address}`
              );

              resolve();
            } catch (err) {
              clearAuth();
              setLoginError(
                "Login failed. Please try again."
              );
              reject(err);
            }
          },
          onError: (err) => {
            clearAuth();
            setLoginError(
              "Signature failed, please try again."
            );
            reject(err);
          },
        }
      );
    });
  };

  // Logout fonksiyonu
  const logout = () => {
    clearAuth();
    disconnect();
    localStorage.removeItem("your-game-wallet-connection");
    setLoginError(null);
  };

  // Hata ayıklama
  useEffect(() => {
    console.log(
      "Auto Connection Status:",
      autoConnectionStatus
    );
    console.log("Account:", account);
    console.log("Token:", token);
    console.log("Is Initial Load:", isInitialLoad);
    console.log("Login Error:", loginError);
  }, [
    autoConnectionStatus,
    account,
    token,
    isInitialLoad,
    loginError,
  ]);

  return {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    autoConnectionStatus,
    loginError,
  };
}
