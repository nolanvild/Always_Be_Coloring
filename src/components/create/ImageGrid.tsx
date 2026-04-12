import type { SearchImage } from "@/types";
import { ImageCard } from "@/components/create/ImageCard";

type Props = {
  images: SearchImage[];
  selectedIds: string[];
  onToggle: (image: SearchImage) => void;
  loading?: boolean;
};

export function ImageGrid({ images, selectedIds, onToggle, loading }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="h-52 animate-pulse rounded-xl border border-gray-200 bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          selected={selectedIds.includes(image.id)}
          onToggle={() => onToggle(image)}
        />
      ))}
    </div>
  );
}
