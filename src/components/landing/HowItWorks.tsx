const steps = [
  "Search or upload",
  "Pick your image",
  "AI converts it",
  "Download PDF"
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-medium text-gray-900">How it works</h2>
        <p className="mt-2 text-sm text-gray-600">A simple four-step flow from idea to finished coloring book.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="relative rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-purple-brand text-sm font-semibold text-white">
              {index + 1}
            </div>
            <div className="text-sm font-medium text-gray-900">{step}</div>
            {index < steps.length - 1 ? <div className="mt-4 h-[2px] w-full bg-gradient-to-r from-purple-brand to-purple-light" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
