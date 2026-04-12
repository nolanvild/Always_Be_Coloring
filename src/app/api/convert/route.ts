import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBusinessColoringPage, generateSearchColoringPage } from "@/lib/server/recraft";

const searchImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  label: z.string(),
  thumbnailUrl: z.string(),
  width: z.number(),
  height: z.number(),
  source: z.string()
});

const convertRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("business_prompt"),
    themeId: z.string().min(1),
    themeName: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional(),
    pageIdea: z.string().optional(),
    artDirection: z.string().optional()
  }),
  z.object({
    mode: z.literal("search_selection"),
    images: z.array(searchImageSchema).min(1)
  }),
  z.object({
    mode: z.literal("upload_image"),
    uploadToken: z.string().min(1).optional()
  })
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = convertRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid convert request payload." }, { status: 400 });
  }

  try {
    if (parsed.data.mode === "business_prompt") {
      const page = await generateBusinessColoringPage(parsed.data);
      return NextResponse.json({ pages: [page] });
    }

    if (parsed.data.mode === "search_selection") {
      const pages = await Promise.all(
        parsed.data.images.map((img) => generateSearchColoringPage(img))
      );
      return NextResponse.json({ pages });
    }

    return NextResponse.json(
      { error: "Upload conversion is not yet available." },
      { status: 501 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coloring page generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
