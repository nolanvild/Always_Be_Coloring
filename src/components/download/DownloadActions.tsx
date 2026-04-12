"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DownloadActions({
  selectedLabel,
  onDownload
}: {
  selectedLabel: string;
  onDownload: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Button variant="secondary" className="gap-2">
        <Share2 className="h-4 w-4" />
        Share link
      </Button>
      <Button onClick={onDownload}>{`Download ${selectedLabel} PDF`}</Button>
    </div>
  );
}
