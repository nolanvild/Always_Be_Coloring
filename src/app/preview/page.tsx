"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, WandSparkles } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useColorBookStore } from "@/store/useColorBookStore";
import { cn } from "@/lib/utils";

export default function PreviewPage() {
  const router = useRouter();
  const { coloringPages, selectedImages, uploadedResult } = useColorBookStore();
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [view, setView] = useState<"coloring" | "original">("coloring");

  useEffect(() => {
    if (!coloringPages.length) {
      router.replace("/create/search");
      return;
    }
    if (!activePageId) {
      setActivePageId(coloringPages[0]?.id ?? null);
    }
  }, [activePageId, coloringPages, router]);

  const activePage = useMemo(
    () => coloringPages.find((page) => page.id === activePageId) ?? coloringPages[0],
    [activePageId, coloringPages]
  );

  const sourceCount = selectedImages.length || coloringPages.length;

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="py-6">
        <ProgressBar currentStep={2} />
        <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-light px-3 py-1 text-xs font-medium text-purple-dark">
                <WandSparkles className="h-4 w-4" />
                Preview your ABC pages
              </div>
              <h1 className="text-2xl font-medium text-gray-900">Review the converted artwork before checkout.</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600">
                Your outlines are ready. Check the result, switch between original and coloring view, then continue to payment when it looks right.
              </p>
            </div>
            <Card className="flex items-center gap-3 border-teal-mid bg-teal-light px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-teal-dark" />
              <div className="text-sm text-teal-dark">{sourceCount} page{sourceCount === 1 ? "" : "s"} ready for checkout</div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="overflow-hidden p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full bg-gray-100 p-1">
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
                <div className="text-xs text-gray-500">Optimized for print-ready ABC pages</div>
              </div>
              <div className="relative min-h-[420px] overflow-hidden rounded-2xl bg-gray-100">
                {activePage ? (
                  <Image
                    src={view === "coloring" ? activePage.coloringImageUrl : activePage.originalImageUrl}
                    alt={activePage.label}
                    fill
                    unoptimized
                    className="object-contain"
                  />
                ) : null}
              </div>
            </Card>

            <div className="space-y-4">
              <Card className="p-5">
                <h2 className="text-base font-medium text-gray-900">Page lineup</h2>
                <div className="mt-4 grid gap-3">
                  {coloringPages.map((page, index) => (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setActivePageId(page.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                        page.id === activePage?.id ? "border-purple-brand bg-purple-light" : "border-gray-200 hover:border-purple-mid"
                      )}
                    >
                      <div className="relative h-16 w-14 overflow-hidden rounded-lg bg-gray-100">
                        <Image src={page.coloringImageUrl} alt={page.label} fill unoptimized className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900">{page.label || `Page ${index + 1}`}</div>
                        <div className="text-xs text-gray-500">Converted page {index + 1}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="space-y-3 bg-gray-50 p-5 text-sm text-gray-600">
                <div>AI detected outlines and simplified details for clean coloring.</div>
                <div>Background cleanup and print-friendly contrast have been applied.</div>
                <div>{uploadedResult ? "Upload flow detected: single-image preview ready." : "Search flow detected: selected results bundled for your ABC set."}</div>
              </Card>

              <Button className="w-full justify-between" onClick={() => router.push("/payment")}>
                Continue to payment
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
