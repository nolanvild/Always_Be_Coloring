import { NextResponse } from "next/server";
import { getRecentTrendThemes } from "@/lib/server/trend-themes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 24) : 12;
  const themes = await getRecentTrendThemes(limit);
  return NextResponse.json({ themes });
}
