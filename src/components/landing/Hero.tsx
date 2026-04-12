"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const previews = [
  {
    label: "Jungle lion",
    original: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=900&q=80",
    coloring: "https://dummyimage.com/900x600/ffffff/232323&text=Jungle+Lion+Line+Art"
  },
  {
    label: "Mermaid cove",
    original: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
    coloring: "https://dummyimage.com/900x600/ffffff/232323&text=Mermaid+Cove+Line+Art"
  },
  {
    label: "Space dog",
    original: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80",
    coloring: "https://dummyimage.com/900x600/ffffff/232323&text=Space+Dog+Line+Art"
  },
  {
    label: "Castle owl",
    original: "https://images.unsplash.com/photo-1543549790-8b5f4a028cfb?auto=format&fit=crop&w=900&q=80",
    coloring: "https://dummyimage.com/900x600/ffffff/232323&text=Castle+Owl+Line+Art"
  }
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
            Search for scenes, upload your own images, convert them into crisp line art, and download device-ready PDFs after checkout.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="min-w-[180px]" onClick={() => goTo("/create/search")}>
            Search images
          </Button>
          <Button variant="secondary" className="min-w-[180px]" onClick={() => goTo("/create/upload")}>
            Upload a photo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {previews.map((preview, index) => (
          <div key={preview.label} className="overflow-hidden rounded-2xl border border-purple-mid/30 bg-white shadow-soft">
            <div className="relative h-40 bg-purple-light">
              <Image
                src={preview.original}
                alt={`${preview.label} original sample`}
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 animate-coloring-wipe">
                <Image
                  src={preview.coloring}
                  alt={`${preview.label} coloring page version`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="absolute inset-y-0 w-0.5 animate-coloring-wipe-line bg-white shadow-[0_0_18px_rgba(0,0,0,0.35)]" />
              <div className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm">
                Original
              </div>
              <div className="absolute right-3 top-3 rounded-full bg-purple-brand px-2 py-1 text-[11px] font-medium text-white shadow-sm">
                Coloring
              </div>
            </div>
            <div className="p-4">
              <div className="text-sm font-medium text-gray-900">{preview.label}</div>
              <div className="text-xs text-gray-500">Swipe preview: photo to coloring page</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
