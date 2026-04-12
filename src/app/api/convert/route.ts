import { NextResponse } from "next/server";
import { buildMockPages } from "@/lib/mock-data";

export async function POST(request: Request) {
  const body = await request.json();
  const imageIds = Array.isArray(body.imageIds) ? body.imageIds : [];
  return NextResponse.json({ pages: buildMockPages(imageIds) });
}
