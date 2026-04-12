export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
};

export type SearchImage = {
  id: string;
  url: string;
  thumbnailUrl: string;
  label: string;
  width: number;
  height: number;
  source: string;
};

export type ColoringPage = {
  id: string;
  originalImageUrl: string;
  coloringImageUrl: string;
  label: string;
};

export type BusinessTheme = {
  id: string;
  themeName: string;
  description: string;
  category: string;
  trendingReason: string;
  createdAt: string;
  score: number;
  pageIdeas: string[];
  keyStrengths: string[];
};

export type GenerationSource = "search" | "upload" | "business";

export type Plan = {
  id: "single" | "book" | "unlimited";
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  pages: number | "unlimited";
};

export type DownloadFormat = {
  id: string;
  name: string;
  category: "print" | "tablet" | "universal";
  widthPx: number;
  heightPx: number;
  ppi: number;
  displaySpec: string;
  deviceLabel: string;
};

export type OrderState = {
  selectedImages: SearchImage[];
  uploadedFile: File | null;
  coloringPages: ColoringPage[];
  generationSource: GenerationSource | null;
  selectedBusinessTheme: BusinessTheme | null;
  selectedPlan: Plan | null;
  paymentIntentId: string | null;
  selectedFormat: DownloadFormat | null;
  downloadUrl: string | null;
  uploadedResult: {
    originalImageUrl: string;
    coloringImageUrl: string;
    fileSize?: string;
    dimensions?: string;
  } | null;
};
