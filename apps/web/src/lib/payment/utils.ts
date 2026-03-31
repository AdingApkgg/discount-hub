import {
  formatMoney,
  getPayMethodDefinition,
  type PayMethod,
  type PaymentProvider,
} from "@discount-hub/shared";
import { env } from "@/env";

export function getPayMethodOrThrow(method: PayMethod) {
  const definition = getPayMethodDefinition(method);
  if (!definition) {
    throw new Error(`Unsupported pay method: ${method}`);
  }
  return definition;
}

export function buildNotifyPath(provider: PaymentProvider) {
  return `/api/payments/notify/${provider}`;
}

export function buildNotifyUrl(provider: PaymentProvider) {
  const origin = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${origin}${buildNotifyPath(provider)}`;
}

export function defaultExpiry(minutes = 15) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

export function formatPaymentAmount(method: PayMethod, amount: number) {
  const definition = getPayMethodOrThrow(method);

  if (definition.settlement === "CNY") {
    return formatMoney(amount);
  }

  if (definition.settlement === "USD") {
    return `${formatMoney(amount)} / 待换算 USD`;
  }

  return `${formatMoney(amount)} / 待换算 USDT`;
}
