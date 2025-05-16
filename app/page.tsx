"use client";
import ClickProgress from "@/components/ClickProgress";
import FishImage from "@/components/Fish";

export default function Home() {
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
