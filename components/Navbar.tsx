"use client";

import React from "react";

import ShopDialog from "./ShopDialog";
import { ConnectButton } from "@mysten/dapp-kit";
import StarBar from "./StarBar";

const Navbar = () => {
  return (
    <div className="flex justify-between items-center bg-transparent text-white p-8 md:px-12 px-8">
      {/* Sol: Point */}
      <div className="flex items-center  bg-blue-200 rounded-full p-2">
        <StarBar />
      </div>

      {/* Sağ: Shop + Connect */}
      <div className="flex items-center md:gap-4 gap-2 ">
        {/* Shop */}
        <ShopDialog />

        {/* Connect Button */}

        <ConnectButton />
      </div>
    </div>
  );
};

export default Navbar;
