import { Download, Images, ScanSearch, WandSparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const items = [
  { title: "Search & select", description: "Find image inspiration with a natural language prompt.", icon: ScanSearch, tone: "bg-purple-light text-purple-dark" },
  { title: "Upload your photo", description: "Drag in your own picture and preview the result instantly.", icon: Images, tone: "bg-teal-light text-teal-dark" },
  { title: "Download as PDF", description: "Choose print or tablet formats after payment succeeds.", icon: Download, tone: "bg-amber-light text-amber-brand" },
  { title: "High quality outlines", description: "Designed for crisp, printable line work and clean coloring.", icon: WandSparkles, tone: "bg-coral-light text-coral-brand" }
];

export function FeatureCards() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="p-5 shadow-soft">
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mb-2 text-base font-medium text-gray-900">{item.title}</h2>
              <p className="text-sm text-gray-600">{item.description}</p>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
