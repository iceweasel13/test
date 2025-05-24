"use client";

import ClickProgress from "@/components/ClickProgress";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import FishImage from "@/components/Fish";

interface DashboardPageProps {
  params: {
    wallet_address: string;
  };
}

export default function DashboardPage({
  params,
}: DashboardPageProps) {
  const { user, isLoading, error } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/"); // Redirect to the default page if not authenticated
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <p>Loading user data...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (!user) {
    return null; // Or a loading spinner while redirecting
  }

  // Check if the authenticated user's wallet address matches the URL parameter
  if (
    user.wallet_address.toLowerCase() !==
    params.wallet_address.toLowerCase()
  ) {
    return (
      <p>You are not authorized to view this dashboard.</p>
    );
  }

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
