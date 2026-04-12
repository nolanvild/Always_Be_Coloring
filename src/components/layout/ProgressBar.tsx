import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Create", "Preview", "Payment", "Download"] as const;

export function ProgressBar({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mx-auto mb-8 max-w-5xl px-4 md:px-6 lg:px-8" role="progressbar" aria-valuenow={currentStep} aria-valuemin={1} aria-valuemax={4}>
      <div className="grid grid-cols-4 items-start gap-2">
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const complete = stepNumber < currentStep;
          const current = stepNumber === currentStep;

          return (
            <div key={step} className="relative flex flex-col items-center gap-2 text-center">
              {index < STEPS.length - 1 && (
                <div className={cn("absolute left-1/2 top-5 h-[2px] w-full", stepNumber < currentStep ? "bg-teal-brand" : "bg-gray-200")} />
              )}
              <div className={cn(
                "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold",
                complete && "border-teal-brand bg-teal-brand text-white",
                current && "border-purple-brand bg-purple-brand text-white",
                !complete && !current && "border-gray-300 bg-white text-gray-500"
              )}>
                {complete ? <Check className="h-5 w-5" /> : stepNumber}
              </div>
              <span className={cn("text-xs font-medium", current ? "text-purple-dark" : complete ? "text-teal-dark" : "text-gray-500")}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
