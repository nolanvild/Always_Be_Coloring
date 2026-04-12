"use client";

import { CardCvcElement, CardExpiryElement, CardNumberElement } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const elementOptions = {
  style: {
    base: {
      fontSize: "14px",
      color: "#111827",
      "::placeholder": { color: "#9CA3AF" }
    }
  }
};

export function CardForm({
  amountLabel,
  onSubmit,
  processing,
  error
}: {
  amountLabel: string;
  onSubmit: (values: { cardholderName: string; zip: string }) => void;
  processing: boolean;
  error?: string | null;
}) {
  const { register, handleSubmit } = useForm<{ cardholderName: string; zip: string }>({
    defaultValues: { cardholderName: "", zip: "" }
  });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Input placeholder="Cardholder name" {...register("cardholderName")} />
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
        <CardNumberElement options={elementOptions} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
          <CardExpiryElement options={elementOptions} />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-3">
          <CardCvcElement options={elementOptions} />
        </div>
        <Input placeholder="ZIP / Postcode" {...register("zip")} />
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-2 text-xs font-medium text-teal-dark">
        <Lock className="h-4 w-4" />
        256-bit SSL encryption · PCI DSS compliant · Your card details are never stored
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={processing}>
        {processing ? "Processing..." : `Pay ${amountLabel} and download`}
      </Button>
      <p className="text-xs text-gray-500">By completing this purchase you agree to our Terms and Refund Policy.</p>
    </form>
  );
}
