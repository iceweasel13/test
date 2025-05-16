import { useWalletAuth } from "@/lib/useWalletAuth";

export function AuthController() {
  useWalletAuth();
  return null; // This component only runs the effects
}
