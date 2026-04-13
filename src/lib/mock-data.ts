import type { ColoringPage, SearchImage } from "@/types";

const MOCK_IMAGES: Pick<SearchImage, "id" | "label">[] = [
  { id: "img-1",  label: "Wooden pier at dawn" },
  { id: "img-2",  label: "Dock over calm water" },
  { id: "img-3",  label: "Golden wheat field" },
  { id: "img-4",  label: "Mountain sunset" },
  { id: "img-5",  label: "Coastal lighthouse" },
  { id: "img-6",  label: "Misty ocean horizon" },
  { id: "img-7",  label: "Rocky shoreline" },
  { id: "img-8",  label: "Pebble beach waves" },
  { id: "img-9",  label: "Vintage roadside sign" },
  { id: "img-10", label: "Desert landscape" },
];

export function buildMockImages(prompt: string): SearchImage[] {
  const base = prompt.trim() || "coloring book";
  return MOCK_IMAGES.map(({ id, label }, index) => {
    const seed = encodeURIComponent(`${base} ${index + 1}`);
    return {
      id,
      url: `https://picsum.photos/seed/${seed}/1200/900`,
      thumbnailUrl: `https://picsum.photos/seed/${seed}/600/400`,
      label,
      width: 1200,
      height: 900,
      source: "picsum.photos"
    };
  });
}

export function buildMockPages(imageIds: string[]): ColoringPage[] {
  return imageIds.map((id, index) => ({
    id: `page-${index + 1}`,
    originalImageUrl: `https://picsum.photos/seed/${id}/1200/900`,
    coloringImageUrl: `https://dummyimage.com/1200x900/ffffff/1f2937&text=Coloring+Page+${index + 1}`,
    label: `Coloring page ${index + 1}`
  }));
}
