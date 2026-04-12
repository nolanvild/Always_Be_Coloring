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
import { useColorBookStore } from "@/store/useColorBookStore";
import type { SearchImage } from "@/types";

export default function SearchPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("cute woodland animals having a picnic");
  const [images, setImages] = useState<SearchImage[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedImages, toggleImageSelection, clearSelectedImages, setColoringPages, setSelectedImages } = useColorBookStore();

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

    try {
      const response = await axios.post("/api/convert", {
        imageIds: selectedImages.map((item) => item.id)
      });
      setSelectedImages(selectedImages);
      setColoringPages(response.data.pages);
      router.push("/preview");
    } catch {
      toast.error("Conversion failed. Please try again.");
    }
  };

  return (
    <main className="min-h-screen pb-28">
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
          <p className="text-sm text-gray-600">{selectedImages.length} images selected · ready to convert</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={clearSelectedImages}>Clear</Button>
            <Button onClick={handleGenerate} disabled={!selectedImages.length}>Generate coloring PDF</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
