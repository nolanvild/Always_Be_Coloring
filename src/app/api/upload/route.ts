import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const safeName = encodeURIComponent(file.name.replace(/\.[^.]+$/, ""));
  return NextResponse.json({
    originalImageUrl: `https://picsum.photos/seed/${safeName}/1200/900`,
    coloringImageUrl: `https://dummyimage.com/1200x900/ffffff/2d2d2d&text=${safeName}+line+art`,
    fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    dimensions: "3840 × 2160"
  });
}
