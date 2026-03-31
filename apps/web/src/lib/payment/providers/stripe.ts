import { env } from "@/env";
import type { CreatePaymentSessionInput, PaymentGateway } from "../types";
import {
  buildNotifyPath,
  buildNotifyUrl,
  defaultExpiry,
  formatPaymentAmount,
  getPayMethodOrThrow,
} from "../utils";

const gatewayLabel = "Stripe Checkout";

function isConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export const stripeGateway: PaymentGateway = {
  id: "stripe",
  label: gatewayLabel,
  supports: ["visa"] as const,
  isConfigured,
  createSession(input: CreatePaymentSessionInput) {
    const method = getPayMethodOrThrow(input.method);
    const notifyPath = buildNotifyPath("stripe");
    const configured = isConfigured();

    return {
      provider: "stripe",
      providerLabel: gatewayLabel,
      method: input.method,
      methodLabel: method.name,
      mode: "redirect",
      status: "PENDING",
      amountText: formatPaymentAmount(input.method, input.amount),
      expiresAt: defaultExpiry(30),
      productionReady: configured,
      demoActionEnabled: true,
      notifyPath,
      instructions: configured
        ? [
            "已预留 Stripe Checkout / Payment Element 的入口。",
            `后续可在本 provider 创建 session，并监听 ${notifyPath} 完成入账。`,
            "当前仍保留模拟支付完成按钮，方便业务联调。",
          ]
        : [
            "已预留 VISA 国际卡接入层，建议未来走 Stripe Checkout。",
            "真实接入时只需在本 provider 补创建会话和 webhook 验签逻辑。",
            "当前界面为占位支付会话，不会跳出真实收银台。",
          ],
      fields: [
        {
          label: "商户订单号",
          value: input.orderId,
          copyable: true,
          emphasized: true,
        },
        {
          label: "Webhook 地址",
          value: buildNotifyUrl("stripe"),
          copyable: true,
        },
        {
          label: "卡组织",
          value: "VISA",
        },
      ],
    };
  },
  getWebhookReservationMessage() {
    return "Stripe webhook 入口已预留，后续可补 event 验签、payment_intent 对账与幂等更新。";
  },
};
