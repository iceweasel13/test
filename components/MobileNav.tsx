// components/MobileNav.tsx
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MenuIcon } from "lucide-react"; // Or any other hamburger icon you prefer
import ShopDialog from "./ShopDialog";
import { ReferralDialog } from "./ReferFriend";
import Leaderboard from "./Leaderboard";
import Image from "next/image";
export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden border-1 border-base-blue bg-dark-blue hover:bg-navy-blue"
        >
          <MenuIcon className="h-6 w-6 text-base-white" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[250px] sm:w-[300px] border-l-2 border-base-blue bg-dark-blue text-base-white"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base-white border-b border-base-blue pb-3">
            <div className="m-0">
              <Image
                className="stroke-navy-blue scale-75"
                height={40}
                width={200}
                alt=""
                src={"/logos.png"}
              />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Main navigation and actions
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-4 py-4 px-4">
          {/* Shop Button */}
          <ShopDialog />
          {/* ShopDialog already includes a button and handles its own dialog */}
          {/* Leaderboard Button */}
          <Leaderboard />{" "}
          {/* Leaderboard already includes a button and handles its own dialog */}
          {/* Refer a Friend Button */}
          <ReferralDialog />{" "}
          {/* ReferralDialog already includes a button and handles its own dialog */}
          {/* Connect Button (adjust styling for full width if needed) */}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
