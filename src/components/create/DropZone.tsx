"use client";

import Image from "next/image";
import { FileImage, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";

type Props = {
  previewUrl?: string;
  fileName?: string;
  fileMeta?: string;
  onDrop: (file: File) => void;
};

export function DropZone({ previewUrl, fileName, fileMeta, onDrop }: Props) {
  const { getRootProps, getInputProps, open } = useDropzone({
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    noClick: Boolean(previewUrl),
    onDropAccepted(files) {
      const [file] = files;
      if (file) onDrop(file);
    }
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className="relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-mid/40 bg-white p-6 text-center"
      >
        <input {...getInputProps()} />
        {previewUrl ? (
          <>
            <span className="absolute left-4 top-4 rounded-full bg-teal-light px-3 py-1 text-xs font-medium text-teal-dark">
              Image ready
            </span>
            <Button type="button" variant="secondary" className="absolute right-4 top-4" onClick={open}>
              Change
            </Button>
            <div className="relative h-full min-h-[250px] w-full overflow-hidden rounded-xl">
              <Image src={previewUrl} alt="Uploaded image preview" fill className="object-cover" />
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-purple-light p-4 text-purple-dark">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-base font-medium text-gray-900">Drag &amp; drop or browse</p>
            <p className="mt-2 text-sm text-gray-500">JPG, PNG, WEBP — max 20MB</p>
          </>
        )}
      </div>

      {fileName ? (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <FileImage className="h-5 w-5 text-purple-brand" />
          <div>
            <div className="text-sm font-medium text-gray-900">{fileName}</div>
            <div className="text-xs text-gray-500">{fileMeta}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
