import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useClickStore } from "@/lib/stores/clickStore";

export function AuthController() {
  useWalletAuth();
  useClickStore();
  return null; // This component only runs the effects
}
