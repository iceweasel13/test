"use client";

import ClickProgress from "@/components/ClickProgress";
import FishImage from "@/components/Fish";
import { User } from "@supabase/supabase-js";

interface DashboardClientProps {
  wallet_address: string;
  user: User;
}

export default function DashboardClient({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  wallet_address,
  user,
}: DashboardClientProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center sm:px-5 md:px-8 lg:px-16 overflow-auto">
      <div className="flex-grow flex items-center justify-center">
        <FishImage />
      </div>
      <div className="pb-48 w-full max-w-md px-4">
        <ClickProgress />
      </div>
      <p className="mt-4">Hoş geldin, {user.email}</p>
    </main>
  );
}
