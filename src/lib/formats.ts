import type { DownloadFormat } from "@/types";

export const DOWNLOAD_FORMATS: DownloadFormat[] = [
  { id: "a4", name: "A4 / Letter", category: "print", widthPx: 2480, heightPx: 3508, ppi: 300, displaySpec: "210×297mm · 8.5×11in", deviceLabel: "A4 / Letter" },
  { id: "a3", name: "A3", category: "print", widthPx: 3508, heightPx: 4961, ppi: 300, displaySpec: "297×420mm · large print", deviceLabel: "A3" },
  { id: "square", name: "Square", category: "print", widthPx: 2480, heightPx: 2480, ppi: 300, displaySpec: "210×210mm · 8×8in", deviceLabel: "Square" },
  { id: "ipad-10", name: "iPad (10th gen)", category: "tablet", widthPx: 2360, heightPx: 1640, ppi: 264, displaySpec: "2360×1640px · 264ppi", deviceLabel: "iPad (10th gen)" },
  { id: "ipad-pro-11", name: "iPad Pro 11\"", category: "tablet", widthPx: 2388, heightPx: 1668, ppi: 264, displaySpec: "2388×1668px · 264ppi", deviceLabel: "iPad Pro 11\"" },
  { id: "ipad-pro-13", name: "iPad Pro 13\"", category: "tablet", widthPx: 2752, heightPx: 2064, ppi: 264, displaySpec: "2752×2064px · 264ppi", deviceLabel: "iPad Pro 13\"" },
  { id: "samsung-s9", name: "Samsung Tab S9", category: "tablet", widthPx: 2560, heightPx: 1600, ppi: 274, displaySpec: "2560×1600px · 274ppi", deviceLabel: "Samsung Tab S9" },
  { id: "kindle-scribe", name: "Kindle Scribe", category: "tablet", widthPx: 1860, heightPx: 2480, ppi: 300, displaySpec: "1860×2480px · 300ppi", deviceLabel: "Kindle Scribe" },
  { id: "pdf-universal", name: "PDF (any device)", category: "universal", widthPx: 0, heightPx: 0, ppi: 0, displaySpec: "Scales to any screen", deviceLabel: "PDF (any device)" }
];

export const RECOMMENDED_FORMAT_ID = "ipad-10";
export const DEFAULT_FORMAT_ID = "a4";
