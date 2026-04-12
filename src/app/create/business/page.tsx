"use client";

import axios from "axios";
import { Loader2, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useColorBookStore } from "@/store/useColorBookStore";
import type { BusinessTheme } from "@/types";
import { getApiErrorMessage } from "@/lib/utils";

export default function BusinessCreatePage() {
  const router = useRouter();
  const [themes, setThemes] = useState<BusinessTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedPageIdea, setSelectedPageIdea] = useState("");
  const [artDirection, setArtDirection] = useState("");
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [generating, setGenerating] = useState(false);
  const {
    setColoringPages,
    setGenerationSource,
    setSelectedBusinessTheme,
    setSelectedImages,
    setUploadedFile,
    setUploadedResult
  } = useColorBookStore();

  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === selectedThemeId) ?? null,
    [selectedThemeId, themes]
  );

  async function loadThemes() {
    setLoadingThemes(true);

    try {
      const response = await axios.get<{ themes: BusinessTheme[] }>("/api/themes");
      const nextThemes = response.data.themes;
      setThemes(nextThemes);
      setSelectedThemeId((current) => current ?? nextThemes[0]?.id ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to load recent pipeline themes."));
    } finally {
      setLoadingThemes(false);
    }
  }

  useEffect(() => {
    void loadThemes();
  }, []);

  useEffect(() => {
    if (!selectedTheme) {
      return;
    }

    setSelectedPageIdea(selectedTheme.pageIdeas[0] ?? "");
  }, [selectedTheme]);

  const handleGenerate = async () => {
    if (!selectedTheme) {
      toast.error("Select a trend theme before generating.");
      return;
    }

    setGenerating(true);

    try {
      const response = await axios.post("/api/convert", {
        mode: "business_prompt",
        themeId: selectedTheme.id,
        themeName: selectedTheme.themeName,
        category: selectedTheme.category,
        description: selectedTheme.description,
        pageIdea: selectedPageIdea || undefined,
        artDirection: artDirection.trim() || undefined
      });

      setSelectedImages([]);
      setUploadedFile(null);
      setUploadedResult(null);
      setGenerationSource("business");
      setSelectedBusinessTheme(selectedTheme);
      setColoringPages(response.data.pages);
      router.push("/preview");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Theme generation failed."));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen pb-12">
      <Navbar />
      <div className="py-6">
        <ProgressBar currentStep={1} />
        <div className="mx-auto max-w-7xl space-y-6 px-4 md:px-6 lg:px-8">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-light px-3 py-1 text-xs font-medium text-purple-dark">
                <TrendingUp className="h-4 w-4" />
                Trend pipeline to Recraft
              </div>
              <h1 className="text-3xl font-medium text-gray-900">Generate business-ready coloring pages from live theme ideas.</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Pick a recent pipeline theme, optionally tune the art direction, and generate a real Recraft coloring page for review.
              </p>
            </div>
            <Button variant="secondary" onClick={loadThemes} disabled={loadingThemes}>
              Refresh themes
            </Button>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
            <Card className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium text-gray-900">Recent pipeline themes</h2>
                  <p className="text-sm text-gray-500">Loaded from `data/output/*.json` without running the pipeline in-request.</p>
                </div>
                {loadingThemes ? <Loader2 className="h-4 w-4 animate-spin text-gray-500" /> : null}
              </div>

              {loadingThemes ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
                  ))}
                </div>
              ) : themes.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {themes.map((theme) => {
                    const active = theme.id === selectedThemeId;

                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedThemeId(theme.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          active ? "border-purple-brand bg-purple-light/60" : "border-gray-200 hover:border-purple-mid"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{theme.themeName}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-gray-500">{theme.category}</div>
                          </div>
                          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-purple-dark shadow-soft">
                            Score {theme.score}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-gray-600">{theme.description}</p>
                        <p className="mt-3 text-xs text-gray-500">{theme.trendingReason}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {theme.keyStrengths.slice(0, 3).map((strength) => (
                            <span key={strength} className="rounded-full bg-white px-2 py-1 text-xs text-gray-600 shadow-soft">
                              {strength}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                  No pipeline output was found yet. Run `uv run python main.py --run-now` to generate theme files under `data/output/`.
                </div>
              )}
            </Card>

            <Card className="space-y-5 p-5">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-1 text-xs font-medium text-teal-dark">
                  <Sparkles className="h-4 w-4" />
                  Generation brief
                </div>
                <h2 className="mt-3 text-xl font-medium text-gray-900">
                  {selectedTheme ? selectedTheme.themeName : "Select a theme"}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedTheme
                    ? "This brief is sent to the live Recraft API through the new business_prompt convert mode."
                    : "Choose a recent theme to inspect its page ideas and generate a live preview."}
                </p>
              </div>

              {selectedTheme ? (
                <>
                  <div className="space-y-2">
                    <label htmlFor="page-idea" className="text-sm font-medium text-gray-900">
                      Page idea
                    </label>
                    <select
                      id="page-idea"
                      value={selectedPageIdea}
                      onChange={(event) => setSelectedPageIdea(event.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
                    >
                      {selectedTheme.pageIdeas.map((idea) => (
                        <option key={idea} value={idea}>
                          {idea}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="art-direction" className="text-sm font-medium text-gray-900">
                      Additional art direction
                    </label>
                    <textarea
                      id="art-direction"
                      value={artDirection}
                      onChange={(event) => setArtDirection(event.target.value)}
                      placeholder="Optional business-specific direction, such as audience, layout, or complexity."
                      className="min-h-[132px] w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-gray-700"
                    />
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                    <div className="font-medium text-gray-900">Theme context</div>
                    <div className="mt-2">{selectedTheme.description}</div>
                    <div className="mt-3 text-xs text-gray-500">{selectedTheme.trendingReason}</div>
                  </div>

                  <Button className="w-full" onClick={handleGenerate} disabled={generating}>
                    {generating ? "Generating with Recraft..." : "Generate coloring preview"}
                  </Button>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
                  Waiting for a theme selection.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
