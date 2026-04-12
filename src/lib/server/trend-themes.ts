import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import type { BusinessTheme } from "@/types";

type ThemeFile = {
  run_metadata?: {
    run_timestamp?: string;
  };
  themes?: unknown[];
};

type RawTheme = {
  theme_id?: unknown;
  theme_name?: unknown;
  description?: unknown;
  category?: unknown;
  trending_reason?: unknown;
  created_at?: unknown;
  coloring_book_score?: unknown;
  page_ideas?: unknown;
  analysis?: {
    key_strengths?: unknown;
  };
};

const themeFilePattern = /^\d{4}-\d{2}-\d{2}_themes\.json$/;
const outputDir = path.join(process.cwd(), "data", "output");

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function toBusinessTheme(rawTheme: RawTheme, fallbackCreatedAt?: string, fallbackId?: string): BusinessTheme | null {
  const themeName = asString(rawTheme.theme_name);
  if (!themeName) {
    return null;
  }

  const score = typeof rawTheme.coloring_book_score === "number" ? rawTheme.coloring_book_score : 0;

  return {
    id: asString(rawTheme.theme_id) ?? fallbackId ?? `${themeName}-${fallbackCreatedAt ?? "unknown"}`,
    themeName,
    description: asString(rawTheme.description) ?? `A coloring-book theme based on ${themeName}.`,
    category: asString(rawTheme.category) ?? "general",
    trendingReason: asString(rawTheme.trending_reason) ?? "Selected from the recent trend pipeline output.",
    createdAt: asString(rawTheme.created_at) ?? fallbackCreatedAt ?? "",
    score,
    pageIdeas: asStringArray(rawTheme.page_ideas),
    keyStrengths: asStringArray(rawTheme.analysis?.key_strengths)
  };
}

async function listThemeFiles(): Promise<string[]> {
  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && themeFilePattern.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));
  } catch {
    return [];
  }
}

async function readThemesFromFile(fileName: string): Promise<BusinessTheme[]> {
  const filePath = path.join(outputDir, fileName);
  const raw = await fs.readFile(filePath, "utf8");
  const payload = JSON.parse(raw) as ThemeFile;
  const runTimestamp = asString(payload.run_metadata?.run_timestamp) ?? fileName.slice(0, 10);
  const themes = Array.isArray(payload.themes) ? payload.themes : [];

  return themes
    .map((theme, index) => toBusinessTheme(theme as RawTheme, runTimestamp, `${fileName}:${index}`))
    .filter((theme): theme is BusinessTheme => theme !== null);
}

export async function getRecentTrendThemes(limit = 12): Promise<BusinessTheme[]> {
  const files = await listThemeFiles();
  const seenThemeIds = new Set<string>();
  const collected: BusinessTheme[] = [];

  for (const fileName of files) {
    const themes = await readThemesFromFile(fileName);

    for (const theme of themes) {
      if (seenThemeIds.has(theme.id)) {
        continue;
      }

      seenThemeIds.add(theme.id);
      collected.push(theme);

      if (collected.length >= limit) {
        return collected;
      }
    }
  }

  return collected;
}
