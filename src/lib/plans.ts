import type { Plan } from "@/types";

export const PLANS: Plan[] = [
  {
    id: "single",
    name: "Single page",
    price: 99,
    displayPrice: "$0.99",
    description: "1 coloring page · Standard quality",
    pages: 1
  },
  {
    id: "book",
    name: "This coloring book",
    price: 299,
    displayPrice: "$2.99",
    description: "Pages you selected · High quality PDF",
    pages: 3
  },
  {
    id: "unlimited",
    name: "Unlimited month",
    price: 999,
    displayPrice: "$9.99 / mo",
    description: "Unlimited pages · All formats",
    pages: "unlimited"
  }
];

export const DEFAULT_PLAN_ID = "book";
export const POPULAR_PLAN_ID = "book";
