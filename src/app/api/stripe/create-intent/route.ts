import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.json();
  const stripe = getStripeServer();
  const amountMap = {
    single: 99,
    book: 299,
    unlimited: 999
  } as const;
  const amount = amountMap[(body.planId as keyof typeof amountMap) ?? "book"] ?? 299;

  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const intent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    payment_method_types: ["card"],
    metadata: {
      pageCount: String(body.pageCount ?? 1),
      planId: String(body.planId ?? "book")
    }
  });

  return NextResponse.json({
    clientSecret: intent.client_secret,
    amount
  });
}
