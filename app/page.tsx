"use client";
import ClickProgress from "@/components/ClickProgress";
import FishImage from "@/components/Fish";
import { useWalletAuth } from "@/lib/useWalletAuth";
import { Link } from "lucide-react";

export default function Home() {
  const { login, logout, isAuthenticated, user } =
    useWalletAuth();
  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user?.wallet_address}</span>
        <Link href={"test"}>test</Link>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }
  return (
    <button onClick={login}>Login with Sui Wallet</button>
  );
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center  sm:px-5 md:px-8 lg:px-16 overflow-auto">
      {/* FishImage için ortalayıcı konteyner */}
      <div className="flex-grow flex items-center justify-center ">
        <FishImage />
      </div>

      {/* ClickProgress için alt sabit konteyner */}
      <div className="pb-48  w-full max-w-md px-4">
        <ClickProgress />
      </div>
    </main>
  );
}
