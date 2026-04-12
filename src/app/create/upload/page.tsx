"use client";

import axios from "axios";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { DropZone } from "@/components/create/DropZone";
import { ColoringPreview } from "@/components/create/ColoringPreview";
import { Card } from "@/components/ui/card";
import { getApiErrorMessage } from "@/lib/utils";
import { useColorBookStore } from "@/store/useColorBookStore";

export default function UploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const {
    uploadedFile,
    setUploadedFile,
    uploadedResult,
    setUploadedResult,
    setColoringPages,
    setGenerationSource,
    setSelectedBusinessTheme
  } = useColorBookStore();

  const previewUrl = useMemo(() => uploadedFile ? URL.createObjectURL(uploadedFile) : uploadedResult?.originalImageUrl, [uploadedFile, uploadedResult?.originalImageUrl]);

  const handleDrop = async (file: File) => {
    setUploadedFile(file);
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    try {
      const response = await axios.post("/api/upload", formData);
      setUploadedResult(response.data);
      setGenerationSource("upload");
      setSelectedBusinessTheme(null);
      setColoringPages([{
        id: "upload-page-1",
        originalImageUrl: response.data.originalImageUrl,
        coloringImageUrl: response.data.coloringImageUrl,
        label: file.name
      }]);
      toast.success("Image uploaded and converted.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Upload failed. Please try another image."));
      setUploadedFile(null);
      setUploadedResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="py-6">
        <ProgressBar currentStep={1} />
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-medium text-gray-900">Your photo</h1>
                <p className="mt-2 text-sm text-gray-600">Upload a single image and tune the output before payment.</p>
              </div>
              <DropZone
                previewUrl={previewUrl}
                fileName={uploadedFile?.name}
                fileMeta={uploadedResult ? `${uploadedResult.fileSize} · ${uploadedResult.dimensions}` : undefined}
                onDrop={handleDrop}
              />
              <Card className="space-y-4 p-5">
                <SettingRow label="Line thickness" type="select" options={["Thin", "Medium", "Thick"]} />
                <SettingRow label="Detail level" type="select" options={["Low", "Medium", "High"]} />
                <SettingRow label="Remove background" type="toggle" defaultEnabled />
                <SettingRow label="Add border frame" type="toggle" />
              </Card>
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-medium text-gray-900">Coloring page preview</h2>
                <p className="mt-2 text-sm text-gray-600">Switch between the original image and the line-art version.</p>
              </div>
              <ColoringPreview
                originalImageUrl={uploadedResult?.originalImageUrl ?? previewUrl}
                coloringImageUrl={uploadedResult?.coloringImageUrl}
                loading={loading}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium text-gray-900">Print quality</span>
              <select className="h-9 rounded-lg border border-gray-200 px-3">
                <option>Standard 150dpi</option>
                <option>High 300dpi</option>
              </select>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-teal-brand px-4 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-500"
              onClick={() => router.push("/preview")}
              disabled={!uploadedResult}
            >
              Continue to preview
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function SettingRow({
  label,
  type,
  options,
  defaultEnabled
}: {
  label: string;
  type: "select" | "toggle";
  options?: string[];
  defaultEnabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-700">{label}</span>
      {type === "select" ? (
        <select className="h-9 rounded-lg border border-gray-200 px-3 text-sm">
          {options?.map((option) => <option key={option}>{option}</option>)}
        </select>
      ) : (
        <label className="relative inline-flex cursor-pointer items-center">
          <input type="checkbox" defaultChecked={defaultEnabled} className="peer sr-only" />
          <span className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:bg-purple-brand peer-checked:after:translate-x-5" />
        </label>
      )}
    </div>
  );
}
