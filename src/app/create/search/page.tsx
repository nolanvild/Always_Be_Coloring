"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { SearchBar } from "@/components/create/SearchBar";
import { ImageGrid } from "@/components/create/ImageGrid";
import { Button } from "@/components/ui/button";
import { buildMockImages } from "@/lib/mock-data";
import { getApiErrorMessage } from "@/lib/utils";
import { useColorBookStore } from "@/store/useColorBookStore";
import type { SearchImage } from "@/types";

const GENERATING_MESSAGES = [
  "Sketching outlines…",
  "Adding fine details…",
  "Preparing coloring pages…",
  "Almost ready to color…",
];

function GeneratingOverlay({ count }: { count: number }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % GENERATING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-2xl bg-white px-12 py-10 shadow-2xl ring-1 ring-gray-100">
        {/* Crayon icon with bounce + sway */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-purple-100 opacity-60" />
          <svg
            className="relative h-12 w-12 animate-bounce"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animationDuration: "0.9s" }}
          >
            {/* Crayon body */}
            <rect x="9" y="3" width="6" height="13" rx="1.5" fill="#a78bfa" />
            {/* Crayon tip */}
            <polygon points="9,16 15,16 12,21" fill="#7c3aed" />
            {/* Crayon label stripe */}
            <rect x="9" y="8" width="6" height="2" fill="#c4b5fd" />
            {/* Crayon top */}
            <rect x="10" y="2" width="4" height="2" rx="1" fill="#7c3aed" />
          </svg>
        </div>

        {/* Animated progress dots + message */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-base font-semibold text-gray-800 transition-all duration-500">
            {GENERATING_MESSAGES[msgIndex]}
          </p>
          <p className="text-sm text-gray-400">
            Converting {count} image{count !== 1 ? "s" : ""} into coloring pages
          </p>
        </div>

        {/* Animated progress bar */}
        <div className="h-1.5 w-56 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-1/3 animate-shimmer rounded-full bg-gradient-to-r from-purple-300 via-purple-500 to-purple-300 bg-[length:200%_100%]" />
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("cute woodland animals having a picnic");
  const [images, setImages] = useState<SearchImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const {
    selectedImages,
    toggleImageSelection,
    clearSelectedImages,
    setColoringPages,
    setSelectedImages,
    setGenerationSource,
    setSelectedBusinessTheme
  } = useColorBookStore();

  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/search", { params: { q: prompt } });
      setImages(response.data.images);
    } catch {
      toast.error("Unable to fetch images. Showing placeholders instead.");
      setImages(buildMockImages(prompt));
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const handleGenerate = async () => {
    if (!selectedImages.length) {
      toast.error("Select at least one image to continue.");
      return;
    }

    setGenerating(true);
    try {
      const response = await axios.post("/api/convert", {
        mode: "search_selection",
        images: selectedImages
      });
      setSelectedImages(selectedImages);
      setGenerationSource("search");
      setSelectedBusinessTheme(null);
      setColoringPages(response.data.pages);
      router.push("/preview");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Search conversion failed."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen pb-28">
      {generating && <GeneratingOverlay count={selectedImages.length} />}

      <Navbar />
      <div className="py-6">
        <ProgressBar currentStep={1} />
        <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-6 lg:px-8">
          <SearchBar prompt={prompt} setPrompt={setPrompt} onSearch={performSearch} loading={loading} />

          <div className="flex items-center justify-between gap-3 text-sm">
            <div className="text-gray-600">
              Showing {images.length || 10} results · {selectedImages.length} selected
            </div>
            <button
              type="button"
              className="font-medium text-purple-brand"
              onClick={() => images.forEach((image) => {
                if (!selectedImages.find((item) => item.id === image.id)) toggleImageSelection(image);
              })}
            >
              Select all
            </button>
          </div>

          <ImageGrid
            images={images}
            selectedIds={selectedImages.map((item) => item.id)}
            onToggle={toggleImageSelection}
            loading={loading}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
          <p className="text-sm text-gray-600">
            {generating
              ? `Converting ${selectedImages.length} image${selectedImages.length !== 1 ? "s" : ""}…`
              : `${selectedImages.length} images selected · ready to convert`}
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={clearSelectedImages} disabled={generating}>Clear</Button>
            <Button onClick={handleGenerate} disabled={!selectedImages.length || generating}>
              {generating ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                "Generate coloring PDF"
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
