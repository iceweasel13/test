// components/Navbar.tsx
"use client";

import React from "react";

import ShopDialog from "./ShopDialog";
import { ConnectButton } from "@mysten/dapp-kit";

import { ReferralDialog } from "./ReferFriend";
import Leaderboard from "./Leaderboard";
import { MobileNav } from "./MobileNav"; // Import the new MobileNav

import StarBar from "./StarBar";

const Navbar = () => {
  return (
    <div className="flex justify-between items-start md:items-center bg-transparent text-white p-8 md:px-12 px-8">
      {/* Sol: Point */}
      <div className="flex md:flex-row sm:items-start gap-2 md:gap-4 rounded-full p-2 ">
        <StarBar />
      </div>

      {/* Sağ: Shop + Connect */}
      <div className="flex items-center md:gap-4 gap-2 ">
        {/* Desktop buttons (hidden on mobile) */}
        <div className="hidden md:flex items-center md:gap-4 pb-2">
          <Leaderboard />
          <ShopDialog />
          <ReferralDialog />
        </div>

        {/* Mobile Navigation (shown on mobile, hidden on desktop) */}
        <div className="flex flex-col gap-2 justify-end-safe items-end ">
          <div className="flex ">
            <ConnectButton />
          </div>
          <div>
            <MobileNav />
          </div>
        </div>
      </div>
    </div>
  );
};
export default Navbar;
