"use client";

import { cn } from "@/lib/utils";

const tabs = ["Card", "PayPal", "Apple Pay", "Google Pay"] as const;
export type PaymentTab = typeof tabs[number];

export function PaymentMethodTabs({ active, onChange }: { active: PaymentTab; onChange: (tab: PaymentTab) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium",
            active === tab ? "bg-purple-brand text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
