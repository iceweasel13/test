"use client";

import React from "react";

import ShopDialog from "./ShopDialog";
import { ConnectButton } from "@mysten/dapp-kit";
import StarBar from "./StarBar";
import { ReferralDialog } from "./ReferFriend";
import Leaderboard from "./Leaderboard";

const Navbar = () => {
  return (
    <div className="flex justify-between items-center bg-transparent text-white p-8 md:px-12 px-12">
      {/* Sol: Point */}
      <div className="flex  md:flex-row items-center gap-2 md:gap-4  rounded-full p-2">
        <StarBar />
      </div>

      {/* Sağ: Shop + Connect */}
      <div className="flex items-center md:gap-4 gap-2 ">
        {/* Shop */}
        <Leaderboard />
        <ShopDialog />

        <ReferralDialog />
        {/* Connect Button */}

        <ConnectButton />
      </div>
    </div>
  );
};

export default Navbar;
