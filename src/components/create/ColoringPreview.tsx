"use client";

import Image from "next/image";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  originalImageUrl?: string;
  coloringImageUrl?: string;
  loading?: boolean;
};

export function ColoringPreview({ originalImageUrl, coloringImageUrl, loading }: Props) {
  const [view, setView] = useState<"coloring" | "original">("coloring");
  const activeSrc = view === "coloring" ? coloringImageUrl : originalImageUrl;

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-4">
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-full bg-purple-light px-3 py-1 text-xs font-medium text-purple-dark">
            Coloring version
          </span>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-xl bg-gray-100">
          {loading ? <div className="absolute inset-0 animate-pulse bg-gray-200" /> : null}
          {activeSrc ? <Image src={activeSrc} alt="Coloring preview" fill unoptimized className="object-contain" /> : null}
        </div>
        <div className="mt-4 inline-flex rounded-full bg-gray-100 p-1">
          <button
            type="button"
            className={cn("rounded-full px-4 py-2 text-xs font-medium", view === "coloring" ? "bg-purple-brand text-white" : "text-gray-600")}
            onClick={() => setView("coloring")}
          >
            Coloring view
          </button>
          <button
            type="button"
            className={cn("rounded-full px-4 py-2 text-xs font-medium", view === "original" ? "bg-purple-brand text-white" : "text-gray-600")}
            onClick={() => setView("original")}
          >
            Original
          </button>
        </div>
      </Card>
      <Card className="bg-gray-50 p-4 text-sm text-gray-600">
        AI detected faces, objects and outlines. Background removed. Optimised for A4 print at 300dpi.
      </Card>
      <Card className="border-teal-mid bg-teal-light p-4">
        <div className="mb-1 text-sm font-medium text-teal-dark">PDF ready to download</div>
        <div className="text-xs text-teal-dark/80">A4 · 1 page · 2.1 MB</div>
      </Card>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1">Regenerate</Button>
        <Button variant="success" className="flex-1">Download PDF</Button>
      </div>
    </div>
  );
}
