import type { PaymentProvider } from "@discount-hub/shared";
import { getGatewayByProvider } from "./registry";

export async function inspectWebhookReservation(
  provider: PaymentProvider,
  rawBody: string,
) {
  const gateway = getGatewayByProvider(provider);

  if (!gateway) {
    return null;
  }

  return {
    ok: true,
    provider,
    providerLabel: gateway.label,
    configured: gateway.isConfigured(),
    rawBodyLength: rawBody.length,
    message: gateway.getWebhookReservationMessage(),
  };
}
