"use client";

import { create } from "zustand";
import type { ColoringPage, DownloadFormat, OrderState, Plan, SearchImage } from "@/types";

type Actions = {
  toggleImageSelection: (image: SearchImage) => void;
  clearSelectedImages: () => void;
  setUploadedFile: (file: File | null) => void;
  setUploadedResult: (payload: OrderState["uploadedResult"]) => void;
  setColoringPages: (pages: ColoringPage[]) => void;
  setSelectedImages: (images: SearchImage[]) => void;
  setSelectedPlan: (plan: Plan) => void;
  setPaymentIntentId: (id: string) => void;
  setSelectedFormat: (format: DownloadFormat) => void;
  setDownloadUrl: (url: string) => void;
  reset: () => void;
};

const initialState: OrderState = {
  selectedImages: [],
  uploadedFile: null,
  coloringPages: [],
  selectedPlan: null,
  paymentIntentId: null,
  selectedFormat: null,
  downloadUrl: null,
  uploadedResult: null
};

export const useColorBookStore = create<OrderState & Actions>((set) => ({
  ...initialState,
  toggleImageSelection: (image) =>
    set((state) => ({
      selectedImages: state.selectedImages.find((item) => item.id === image.id)
        ? state.selectedImages.filter((item) => item.id !== image.id)
        : state.selectedImages.length < 10
          ? [...state.selectedImages, image]
          : state.selectedImages
    })),
  clearSelectedImages: () => set({ selectedImages: [] }),
  setUploadedFile: (file) => set({ uploadedFile: file }),
  setUploadedResult: (payload) => set({ uploadedResult: payload }),
  setColoringPages: (pages) => set({ coloringPages: pages }),
  setSelectedImages: (images) => set({ selectedImages: images }),
  setSelectedPlan: (plan) => set({ selectedPlan: plan }),
  setPaymentIntentId: (id) => set({ paymentIntentId: id }),
  setSelectedFormat: (format) => set({ selectedFormat: format }),
  setDownloadUrl: (url) => set({ downloadUrl: url }),
  reset: () => set(initialState)
}));
