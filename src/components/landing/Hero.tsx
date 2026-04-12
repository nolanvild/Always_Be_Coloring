"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const previews = [
  "Jungle lion", "Mermaid cove", "Space dog", "Castle owl"
];

export function Hero() {
  const router = useRouter();

  const goTo = (path: string) => {
    router.push(path);
  };

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-light px-3 py-1 text-xs font-medium text-purple-dark">
          <Sparkles className="h-4 w-4" />
          AI-Powered Coloring Books
        </div>
        <div className="space-y-4">
          <h1 className="max-w-2xl text-4xl font-medium tracking-tight text-gray-900 md:text-5xl">
            Turn photos and ideas into printable coloring books in minutes.
          </h1>
          <p className="max-w-xl text-base leading-7 text-gray-600">
            Pull recent business themes from the trend pipeline, search for scenes, or upload your own images, then convert them into crisp line art and review before checkout.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="min-w-[180px]" onClick={() => goTo("/create/business")}>
            Business themes
          </Button>
          <Button variant="secondary" className="min-w-[180px]" onClick={() => goTo("/create/search")}>
            Search images
          </Button>
          <Button variant="ghost" className="min-w-[180px]" onClick={() => goTo("/create/upload")}>
            Upload a photo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {previews.map((label, index) => (
          <div key={label} className="overflow-hidden rounded-2xl border border-purple-mid/30 bg-white shadow-soft">
            <div className="relative h-40 bg-purple-light">
              <Image
                src={`https://dummyimage.com/600x400/${index % 2 === 0 ? "ffffff" : "f6f5ff"}/2b2b2b&text=${encodeURIComponent(label)}`}
                alt={label}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-900">{label}</div>
              <div className="text-xs text-gray-500">Preview coloring page</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
