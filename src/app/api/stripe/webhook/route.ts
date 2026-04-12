import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeServer } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = getStripeServer();
  const signature = headers().get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    if (event.type === "payment_intent.succeeded") {
      return NextResponse.json({ received: true, status: "paid" });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
