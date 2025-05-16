import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatAndDivideNumber } from "@/lib/utils"; // formatAndDivideNumber fonksiyonunun yolu
import Image from "next/image";
import { FaStore } from "react-icons/fa";
import React from "react";

const cards = [
  {
    id: 1,
    name: "Mini Puff",
    image: "/puffer.png",
    clicks: 1000,
    price: 10,
  },
  {
    id: 2,
    name: "Mega Puff",
    image: "/puffer.png",
    clicks: 3000,
    price: 25,
  },
  {
    id: 3,
    name: "Whale Puff",
    image: "/puffer.png",
    clicks: 7500,
    price: 50,
  },
];

const ShopDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center justify-center  w-16 h-5 md:w-24 md:h-10 bg-blue-200 rounded-full p-4.5">
          <FaStore className="w-5 h-5 md:w-6 md:h-6 " />
          <span className="hidden md:inline text-sm md:text-lg font-semibold text-white ">
            Shop
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className=" bg-blue-700 text-white max-w-xs sm:max-w-md md:max-w-3xl rounded-xl shadow-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl text-white">
            Puff Shop
          </DialogTitle>
          <DialogDescription className="text-white/80 text-sm sm:text-base">
            Choose a puff to buy and gain more clicks!
          </DialogDescription>
        </DialogHeader>
        {/* Yükleme sırasında kartlar için skeleton */}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl p-4 flex flex-col items-center"
            >
              <Image
                src={card.image}
                alt={card.name}
                width={100}
                height={100}
                className="rounded-md mb-2"
              />
              <h3 className="text-base sm:text-lg font-semibold">
                {card.name}
              </h3>
              <p className="text-sm mb-2">
                {formatAndDivideNumber(card.clicks)} Clicks
              </p>
              <Button
                variant="secondary"
                className="bg-white text-black hover:bg-slate-100 text-sm sm:text-base"
              >
                Buy {card.price} SUI
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShopDialog;
