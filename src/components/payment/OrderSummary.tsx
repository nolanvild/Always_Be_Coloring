import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  thumbnails: string[];
  planLabel: string;
  pages: string;
  total: string;
};

export function OrderSummary({ thumbnails, planLabel, pages, total }: Props) {
  return (
    <Card className="bg-gray-50 p-5">
      <div className="mb-5 flex -space-x-4">
        {thumbnails.slice(0, 3).map((thumb, index) => (
          <div key={index} className="relative h-20 w-16 overflow-hidden rounded-xl border border-white bg-white">
            <Image src={thumb} alt={`Selected page ${index + 1}`} fill unoptimized className="object-cover" />
          </div>
        ))}
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between"><span className="text-gray-500">Coloring book</span><span>{planLabel}</span></div>
        <div className="flex items-center justify-between"><span className="text-gray-500">Format</span><span>PDF</span></div>
        <div className="flex items-center justify-between"><span className="text-gray-500">Pages</span><span>{pages}</span></div>
        <div className="flex items-center justify-between"><span className="text-gray-500">Quality</span><span>High</span></div>
      </div>
      <div className="my-5 flex gap-2">
        <input className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm" placeholder="Promo code" />
        <Button variant="secondary">Apply</Button>
      </div>
      <div className="mb-4 flex items-center justify-between border-t border-gray-200 pt-4">
        <span className="font-medium text-gray-900">Total</span>
        <span className="text-xl font-medium text-purple-brand">{total}</span>
      </div>
      <div className="flex gap-3 rounded-xl bg-white p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-teal-brand" />
        <p className="text-xs leading-5 text-gray-600">
          30-day money-back guarantee. If your coloring page doesn&apos;t look right, we&apos;ll refund you instantly.
        </p>
      </div>
    </Card>
  );
}
