import { NextResponse } from "next/server";
import { buildMockImages } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "playful animals";
  return NextResponse.json({ images: buildMockImages(q) });
}
