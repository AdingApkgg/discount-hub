import { NextResponse } from "next/server";
import { PAYMENT_PROVIDER_IDS, type PaymentProvider } from "@discount-hub/shared";
import { inspectWebhookReservation } from "@/lib/payment/webhook";

function isPaymentProvider(value: string): value is PaymentProvider {
  return (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;

  if (!isPaymentProvider(provider)) {
    return NextResponse.json({ error: "Unknown payment provider" }, { status: 404 });
  }

  const rawBody = await request.text();
  const payload = await inspectWebhookReservation(provider, rawBody);

  return NextResponse.json(
    payload ?? { ok: false, provider, message: "Webhook reservation missing" },
  );
}
