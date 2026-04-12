import Image from "next/image";
import { Check } from "lucide-react";
import type { SearchImage } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  image: SearchImage;
  selected: boolean;
  onToggle: () => void;
};

export function ImageCard({ image, selected, onToggle }: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white text-left transition hover:border-purple-mid",
        selected ? "border-purple-brand ring-2 ring-purple-brand" : "border-gray-200"
      )}
    >
      <div className="relative h-36 bg-gray-100">
        <Image src={image.thumbnailUrl} alt={image.label} fill unoptimized className="object-cover" />
        {selected ? (
          <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-purple-brand text-white">
            <Check className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-medium text-gray-900">{image.label}</div>
        <div className="truncate text-xs text-gray-500">{image.source}</div>
      </div>
    </button>
  );
}
