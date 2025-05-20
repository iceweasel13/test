import { Card } from "../types";

export const cards: Card[] = [
  {
    id: 1,
    name: "Mini Puff",
    image: "/fish.png", // Bu yolun public klasörüne göre doğru olduğundan emin ol
    clicks: 1000,
    price: 0.1,
    card_type: 1,
  },
  {
    id: 2,
    name: "Mega Puff",
    image: "/fish.png",
    clicks: 3000,
    price: 0.25,
    card_type: 2,
  },
  {
    id: 3,
    name: "Wale Puff",
    image: "/fish.png",
    clicks: 7500,
    price: 0.5,
    card_type: 3,
  },
];
