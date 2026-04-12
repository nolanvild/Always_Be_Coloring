"use client";

import axios from "axios";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { FormatGrid } from "@/components/download/FormatGrid";
import { DownloadActions } from "@/components/download/DownloadActions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEFAULT_FORMAT_ID, DOWNLOAD_FORMATS } from "@/lib/formats";
import { useColorBookStore } from "@/store/useColorBookStore";

export default function DownloadPage() {
  const router = useRouter();
  const {
    coloringPages,
    paymentIntentId,
    selectedFormat,
    setSelectedFormat
  } = useColorBookStore();

  useEffect(() => {
    if (!paymentIntentId) router.replace("/payment");
    if (!selectedFormat) {
      const defaultFormat = DOWNLOAD_FORMATS.find((item) => item.id === DEFAULT_FORMAT_ID);
      if (defaultFormat) setSelectedFormat(defaultFormat);
    }
  }, [paymentIntentId, router, selectedFormat, setSelectedFormat]);

  const doDownload = async (formatId = selectedFormat?.id ?? DEFAULT_FORMAT_ID) => {
    try {
      const response = await axios.get("/api/download", {
        params: {
          pageIds: coloringPages.map((page) => page.id).join(","),
          format: formatId,
          options: JSON.stringify({
            includeTitlePage: true,
            addPageNumbers: true,
            cropMarks: false
          })
        },
        responseType: "blob"
      });

      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "abc-always-be-coloring.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Something went wrong generating your PDF. Try again.");
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="py-6">
        <ProgressBar currentStep={4} />
        <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-6 lg:px-8">
          <div className="flex items-start gap-3 rounded-2xl bg-teal-brand p-5 text-white">
            <CheckCircle2 className="mt-0.5 h-6 w-6" />
            <div>
              <div className="text-base font-medium">Payment confirmed — your ABC download is ready!</div>
              <div className="mt-1 text-sm text-white/80">Choose the best format for printing, tablets, or a universal PDF.</div>
            </div>
          </div>

          <FormatGrid selectedFormatId={selectedFormat?.id} onSelect={setSelectedFormat} />

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3 p-5">
              <h2 className="text-base font-medium text-gray-900">Extra options</h2>
              <CheckOption label="Include title page" defaultChecked />
              <CheckOption label="Add page numbers" defaultChecked />
              <CheckOption label="Crop marks for print" />
            </Card>
            <Card className="space-y-3 p-5">
              <h2 className="text-base font-medium text-gray-900">Download all formats</h2>
              <CheckOption label="All tablet sizes as ZIP" />
              <CheckOption label="Print + digital bundle" />
            </Card>
          </div>

          <DownloadActions selectedLabel={selectedFormat?.name ?? "A4 / Letter"} onDownload={() => doDownload()} />

          <div className="flex flex-wrap gap-3">
            {["a4", "ipad-pro-11", "samsung-s9", "pdf-universal"].map((id) => {
              const format = DOWNLOAD_FORMATS.find((item) => item.id === id);
              if (!format) return null;
              return (
                <Button key={id} variant="secondary" onClick={() => doDownload(id)}>
                  {format.name}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function CheckOption({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm text-gray-600">
      <input type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 rounded border-gray-300 text-purple-brand" />
      {label}
    </label>
  );
}
