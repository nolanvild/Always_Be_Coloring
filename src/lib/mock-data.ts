import type { ColoringPage, SearchImage } from "@/types";

const SEEDS = [
  "Lion cub", "Rocket cat", "Garden fairy", "Dinosaur parade", "Sea turtle",
  "Castle dragon", "Space fox", "Rainforest frog", "Unicorn meadow", "Robot owl"
];

export function buildMockImages(prompt: string): SearchImage[] {
  return SEEDS.map((label, index) => {
    const text = encodeURIComponent(`${prompt || label} ${index + 1}`);
    return {
      id: `img-${index + 1}`,
      url: `https://picsum.photos/seed/${text}/1200/900`,
      thumbnailUrl: `https://picsum.photos/seed/${text}/600/400`,
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
