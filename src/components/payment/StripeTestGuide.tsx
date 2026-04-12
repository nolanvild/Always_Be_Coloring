import { Card } from "@/components/ui/card";

const testCards = [
  {
    label: "Successful payment",
    number: "4242 4242 4242 4242",
    note: "Completes the happy path."
  },
  {
    label: "Generic decline",
    number: "4000 0000 0000 0002",
    note: "Shows card_declined handling."
  },
  {
    label: "Insufficient funds",
    number: "4000 0000 0000 9995",
    note: "Shows insufficient_funds handling."
  },
  {
    label: "Incorrect CVC",
    number: "4000 0000 0000 0127",
    note: "Use any CVC to trigger the error."
  }
];

export function StripeTestGuide() {
  return (
    <Card className="border-amber-brand/30 bg-amber-light/70 p-5">
      <div className="mb-3">
        <h2 className="text-base font-medium text-gray-900">Stripe test mode</h2>
        <p className="mt-1 text-xs leading-5 text-gray-600">
          Use these fake card numbers with any future expiry, such as 12/34. Use any 3-digit CVC unless the row says otherwise.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {testCards.map((card) => (
          <div key={card.number} className="rounded-xl border border-amber-brand/20 bg-white p-3">
            <div className="text-xs font-medium text-gray-900">{card.label}</div>
            <div className="mt-1 font-mono text-sm text-purple-dark">{card.number}</div>
            <div className="mt-1 text-[11px] text-gray-500">{card.note}</div>
          </div>
        ))}
      </div>
      <a
        href="https://docs.stripe.com/testing"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs font-medium text-purple-dark underline"
      >
        Stripe test card reference
      </a>
    </Card>
  );
}
