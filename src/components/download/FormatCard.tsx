import { cn } from "@/lib/utils";
import type { DownloadFormat } from "@/types";

function DeviceIcon({ tablet = false }: { tablet?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 text-gray-700" fill="none" aria-hidden="true">
      <rect x={tablet ? 8 : 10} y={tablet ? 8 : 6} width={tablet ? 32 : 28} height={tablet ? 24 : 36} rx="6" stroke="currentColor" strokeWidth="2" />
      {tablet ? <circle cx="24" cy="34" r="1.5" fill="currentColor" /> : <line x1="18" y1="14" x2="30" y2="14" stroke="currentColor" strokeWidth="2" />}
    </svg>
  );
}

export function FormatCard({
  format,
  selected,
  recommended,
  universal,
  onSelect
}: {
  format: DownloadFormat;
  selected: boolean;
  recommended?: boolean;
  universal?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-2xl border p-4 text-left transition",
        selected ? "border-purple-brand bg-purple-light ring-2 ring-purple-brand" : "border-gray-200 bg-white hover:border-purple-mid"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <DeviceIcon tablet={format.category !== "print"} />
        {recommended ? <span className="rounded-full bg-teal-light px-2 py-1 text-[11px] font-medium text-teal-dark">Recommended</span> : null}
        {universal ? <span className="rounded-full bg-amber-light px-2 py-1 text-[11px] font-medium text-amber-brand">Universal</span> : null}
      </div>
      <div className="text-sm font-medium text-gray-900">{format.name}</div>
      <div className="mt-1 text-xs text-gray-500">{format.displaySpec}</div>
    </button>
  );
}
