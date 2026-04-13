import "server-only";

import { Buffer } from "node:buffer";
import type { ColoringPage } from "@/types";

export const VECTOR_MODEL = "recraftv3_vector";
export const RASTER_MODEL = "recraftv3";
export const DEFAULT_SIZE = "3:4";
const RECRAFT_BASE_URL = "https://external.api.recraft.ai/v1";

export const profilePrompts = {
  children_line_art: {
    style: "Line art",
    description:
      "simple bold contours, broad closed shapes, minimal interior detail, readable printable coloring-book line art"
  },
  adult_engraving: {
    style: "Engraving",
    description:
      "finer contour detail with sparse black dots and thin hatch lines, still printable black-and-white coloring-book art"
  }
} as const;

export type RecraftProfile = keyof typeof profilePrompts;

type RecraftGenerationResponse = {
  data?: Array<{
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

export type BusinessGenerationInput = {
  themeId: string;
  themeName: string;
  category: string;
  description?: string;
  pageIdea?: string;
  artDirection?: string;
  profile?: RecraftProfile;
};

function getApiKey(): string {
  const apiKey = process.env.RECRAFT_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing RECRAFT_API_KEY. Add it to .env.local for the Next.js app.");
  }

  return apiKey;
}

function getRecraftErrorMessage(payload: RecraftGenerationResponse | null, status: number): string {
  const apiMessage = payload?.error?.message;
  return apiMessage ? `Recraft request failed: ${apiMessage}` : `Recraft request failed with status ${status}.`;
}

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toDataUrl(contentType: string, bytes: ArrayBuffer | Uint8Array): string {
  const buffer = bytes instanceof Uint8Array ? Buffer.from(bytes) : Buffer.from(bytes);
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function buildThemeBriefDataUrl(input: BusinessGenerationInput): string {
  const lines = [
    input.themeName,
    `Category: ${input.category}`,
    input.pageIdea ? `Page idea: ${input.pageIdea}` : "Page idea: coloring cover composition",
    input.artDirection ? `Direction: ${input.artDirection}` : "Direction: print-ready line art"
  ];

  const text = lines
    .map(
      (line, index) =>
        `<text x="48" y="${88 + index * 56}" font-family="Georgia, serif" font-size="${index === 0 ? 34 : 20}" fill="#1f2937">${escapeSvgText(line)}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
    <rect width="1200" height="1600" fill="#f8fafc" />
    <rect x="36" y="36" width="1128" height="1528" rx="28" fill="#ffffff" stroke="#d1d5db" stroke-width="4" />
    <text x="48" y="52" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#7c3aed">TREND PIPELINE BRIEF</text>
    ${text}
  </svg>`;

  return toDataUrl("image/svg+xml", new TextEncoder().encode(svg));
}

function buildBusinessPrompt(input: BusinessGenerationInput): string {
  const profile = profilePrompts[input.profile ?? "children_line_art"];
  const clauses = [
    `Create a printable coloring book page about ${input.themeName}.`,
    input.description ? `Theme description: ${input.description}.` : null,
    input.pageIdea ? `Scene idea: ${input.pageIdea}.` : null,
    `Category: ${input.category}.`,
    profile.description,
    "black-and-white vector line art on a pure white background",
    "closed contour shapes with large colorable regions",
    "black outlines only",
    "no color",
    "no gray fill",
    "no gradients",
    "no shadows",
    "no text",
    input.artDirection ? `Additional art direction: ${input.artDirection}.` : null
  ];

  return clauses.filter(Boolean).join(", ");
}

async function requestBusinessImage(input: BusinessGenerationInput): Promise<string> {
  const profile = input.profile ?? "children_line_art";
  const response = await fetch(`${RECRAFT_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: RASTER_MODEL,
      style: profilePrompts[profile].style,
      prompt: buildBusinessPrompt(input),
      size: DEFAULT_SIZE,
      response_format: "url"
    }),
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as RecraftGenerationResponse | null;
  if (!response.ok) {
    throw new Error(getRecraftErrorMessage(payload, response.status));
  }

  const imageUrl = payload?.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("Recraft response did not include an image URL.");
  }

  return imageUrl;
}

async function downloadAssetAsDataUrl(assetUrl: string): Promise<string> {
  const response = await fetch(assetUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Generated asset download failed with status ${response.status}.`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const bytes = await response.arrayBuffer();
  return toDataUrl(contentType, bytes);
}

export async function generateBusinessColoringPage(input: BusinessGenerationInput): Promise<ColoringPage> {
  const assetUrl = await requestBusinessImage(input);
  const coloringImageUrl = await downloadAssetAsDataUrl(assetUrl);

  return {
    id: `${input.themeId}-${Date.now()}`,
    originalImageUrl: buildThemeBriefDataUrl(input),
    coloringImageUrl,
    label: input.pageIdea ? `${input.themeName}: ${input.pageIdea}` : input.themeName
  };
}

export type SearchImageInput = {
  id: string;
  url: string;
  label: string;
};

export async function generateSearchColoringPage(image: SearchImageInput): Promise<ColoringPage> {
  const apiKey = getApiKey();

  const sourceResponse = await fetch(image.url, { cache: "no-store" });
  if (!sourceResponse.ok) {
    throw new Error(`Failed to download source image (status ${sourceResponse.status}).`);
  }
  const contentType = sourceResponse.headers.get("content-type") || "image/jpeg";
  const bytes = await sourceResponse.arrayBuffer();
  const blob = new Blob([bytes], { type: contentType });

  const form = new FormData();
  form.append("image", blob, "source.jpg");
  form.append("prompt", "printable coloring book page, simple bold black outlines, large colorable regions, no color, no fill, no shadows, white background, line art");
  form.append("strength", "0.5");
  form.append("model", RASTER_MODEL);
  form.append("style", "Line art");

  const response = await fetch(`${RECRAFT_BASE_URL}/images/imageToImage`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as RecraftGenerationResponse | null;
  if (!response.ok) {
    throw new Error(getRecraftErrorMessage(payload, response.status));
  }

  const resultUrl = payload?.data?.[0]?.url;
  if (!resultUrl) {
    throw new Error("Recraft response did not include an image URL.");
  }

  const coloringImageUrl = await downloadAssetAsDataUrl(resultUrl);

  return {
    id: `${image.id}-${Date.now()}`,
    originalImageUrl: image.url,
    coloringImageUrl,
    label: image.label
  };
}
