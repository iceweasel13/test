"use client";

import { useAuthUser } from "@/hooks/useAuthUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, isLoading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Redirect authenticated users to their dashboard
      router.push(`/dashboard/${user.wallet_address}`);
    }
  }, [user, isLoading, router]);

  // If loading or user is authenticated (and being redirected), show nothing or a loading indicator
  if (isLoading || user) {
    return <p>Loading...</p>;
  }

  // Render the default page for unauthenticated users
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center  sm:px-5 md:px-8 lg:px-16 overflow-auto">
      <p>anasayfa</p>
    </main>
  );
}
