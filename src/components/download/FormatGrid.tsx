import { DOWNLOAD_FORMATS, RECOMMENDED_FORMAT_ID } from "@/lib/formats";
import type { DownloadFormat } from "@/types";
import { FormatCard } from "@/components/download/FormatCard";

export function FormatGrid({
  selectedFormatId,
  onSelect
}: {
  selectedFormatId?: string | null;
  onSelect: (format: DownloadFormat) => void;
}) {
  const print = DOWNLOAD_FORMATS.filter((item) => item.category === "print");
  const digital = DOWNLOAD_FORMATS.filter((item) => item.category !== "print");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-base font-medium text-gray-900">Print formats</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {print.map((format) => (
            <FormatCard
              key={format.id}
              format={format}
              selected={selectedFormatId === format.id}
              onSelect={() => onSelect(format)}
            />
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-base font-medium text-gray-900">Tablet &amp; digital formats</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {digital.map((format) => (
            <FormatCard
              key={format.id}
              format={format}
              selected={selectedFormatId === format.id}
              recommended={format.id === RECOMMENDED_FORMAT_ID}
              universal={format.category === "universal"}
              onSelect={() => onSelect(format)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
