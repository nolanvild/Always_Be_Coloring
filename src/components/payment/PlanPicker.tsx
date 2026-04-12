"use client";

import { PLANS, POPULAR_PLAN_ID } from "@/lib/plans";
import type { Plan } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  selectedPlanId?: Plan["id"];
  pageCount: number;
  onSelect: (plan: Plan) => void;
};

export function PlanPicker({ selectedPlanId, pageCount, onSelect }: Props) {
  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs">
        <span className="rounded-full bg-white px-4 py-2 font-medium text-gray-900">Pay once</span>
        <span className="px-4 py-2 text-gray-500">Subscribe &amp; save</span>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          const description = plan.id === "book" ? `${pageCount} pages selected · High quality PDF` : plan.description;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => onSelect({ ...plan, description })}
              className={cn(
                "relative rounded-2xl border p-4 text-left transition",
                isSelected ? "border-purple-brand bg-purple-light ring-2 ring-purple-brand" : "border-gray-200 bg-white hover:border-purple-mid"
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className={cn("mt-1 h-4 w-4 rounded-full border", isSelected ? "border-purple-brand bg-purple-brand" : "border-gray-300")} />
                {plan.id === POPULAR_PLAN_ID ? (
                  <span className="rounded-full bg-purple-brand px-2 py-1 text-[11px] font-medium text-white">Most popular</span>
                ) : null}
              </div>
              <div className="text-sm font-medium text-gray-900">{plan.name}</div>
              <div className="mt-2 text-2xl font-medium text-gray-900">{plan.displayPrice}</div>
              <div className="mt-2 text-sm text-gray-600">{description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
