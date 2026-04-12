import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar showMarketingLinks />
      <Hero />
      <FeatureCards />
      <HowItWorks />
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-gray-200 px-4 py-10 text-sm text-gray-500 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <span className="font-medium text-gray-900">ABC (Always Be Coloring)</span>
        <div className="flex gap-4">
          <Link href="#">Terms</Link>
          <Link href="#">Privacy</Link>
          <Link href="#">Support</Link>
        </div>
      </footer>
    </main>
  );
}
