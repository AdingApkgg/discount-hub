import type { PayMethod, PaymentProvider } from "@discount-hub/shared";
import type { PaymentGateway } from "./types";
import { paypalGateway } from "./providers/paypal";
import { rainbowGateway } from "./providers/rainbow";
import { stripeGateway } from "./providers/stripe";
import { usdtTrc20Gateway } from "./providers/usdt-trc20";

const gateways = [
  rainbowGateway,
  paypalGateway,
  stripeGateway,
  usdtTrc20Gateway,
] as const satisfies readonly PaymentGateway[];

export function getGatewayByMethod(method: PayMethod) {
  return gateways.find((gateway) => gateway.supports.includes(method));
}

export function getGatewayByProvider(provider: PaymentProvider) {
  return gateways.find((gateway) => gateway.id === provider);
}
