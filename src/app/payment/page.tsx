"use client";

import axios from "axios";
import { CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { ProgressBar } from "@/components/layout/ProgressBar";
import { PlanPicker } from "@/components/payment/PlanPicker";
import { PaymentMethodTabs, type PaymentTab } from "@/components/payment/PaymentMethodTabs";
import { CardForm } from "@/components/payment/CardForm";
import { OrderSummary } from "@/components/payment/OrderSummary";
import { Card } from "@/components/ui/card";
import { StripeTestGuide } from "@/components/payment/StripeTestGuide";
import { PLANS } from "@/lib/plans";
import { formatPrice } from "@/lib/utils";
import { useColorBookStore } from "@/store/useColorBookStore";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function PaymentPage() {
  const router = useRouter();
  const { coloringPages, selectedPlan, setSelectedPlan } = useColorBookStore();

  useEffect(() => {
    if (!coloringPages.length) router.replace("/preview");
    if (!selectedPlan) setSelectedPlan(PLANS[1]);
  }, [coloringPages.length, router, selectedPlan, setSelectedPlan]);

  const pageCount = coloringPages.length || 1;
  const activePlan = selectedPlan ?? PLANS[1];

  if (!stripePromise) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-10 text-sm text-gray-600">
          Stripe is not configured yet. Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` to run the real payment flow.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="py-6">
        <ProgressBar currentStep={3} />
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <PlanPicker selectedPlanId={activePlan.id} pageCount={pageCount} onSelect={setSelectedPlan} />
              <Elements stripe={stripePromise}>
                <CheckoutPanel amount={activePlan.price} />
              </Elements>
              <StripeTestGuide />
            </div>
            <OrderSummary
              thumbnails={coloringPages.map((page) => page.coloringImageUrl)}
              planLabel={activePlan.name}
              pages={`${pageCount}`}
              total={formatPrice(activePlan.price)}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function CheckoutPanel({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paymentTab, setPaymentTab] = useState<PaymentTab>("Card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { coloringPages, selectedPlan, setPaymentIntentId } = useColorBookStore();

  useEffect(() => {
    async function loadIntent() {
      if (!selectedPlan) return;
      try {
        const response = await axios.post("/api/stripe/create-intent", {
          planId: selectedPlan.id,
          pageCount: coloringPages.length || 1
        });
        setClientSecret(response.data.clientSecret);
      } catch {
        setError("Unable to prepare checkout. Check your Stripe configuration.");
      }
    }

    loadIntent();
  }, [coloringPages.length, selectedPlan]);

  const amountLabel = useMemo(() => formatPrice(amount), [amount]);

  const onPay = async () => {
    if (paymentTab !== "Card") {
      toast.info(`${paymentTab} UI is ready, but only card confirmation is wired in this version.`);
      return;
    }
  };

  const handleCardSubmit = async () => {
    if (!stripe || !elements || !clientSecret) return;
    setProcessing(true);
    setError(null);

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) {
      setError("Card details are not ready yet.");
      setProcessing(false);
      return;
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardNumber
      }
    });

    if (result.error) {
      setError(result.error.message ?? "Payment failed.");
      setProcessing(false);
      return;
    }

    if (result.paymentIntent) {
      setPaymentIntentId(result.paymentIntent.id);
      toast.success("Payment confirmed.");
      router.push("/download");
    }
    setProcessing(false);
  };

  return (
    <Card className="space-y-5 p-5">
      <PaymentMethodTabs active={paymentTab} onChange={setPaymentTab} />
      {paymentTab === "Card" ? (
        <CardForm amountLabel={amountLabel} onSubmit={handleCardSubmit} processing={processing} error={error} />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-sm text-gray-600">
          {paymentTab} will slot into the same checkout area once enabled.
          <div className="mt-4">
            <button type="button" className="text-purple-brand underline" onClick={onPay}>
              Switch back to card payment
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
