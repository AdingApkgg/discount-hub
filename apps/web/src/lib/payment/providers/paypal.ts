import { env } from "@/env";
import type { CreatePaymentSessionInput, PaymentGateway } from "../types";
import {
  buildNotifyPath,
  buildNotifyUrl,
  defaultExpiry,
  formatPaymentAmount,
  getPayMethodOrThrow,
} from "../utils";

const gatewayLabel = "PayPal Checkout";

function isConfigured() {
  return Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);
}

export const paypalGateway: PaymentGateway = {
  id: "paypal",
  label: gatewayLabel,
  supports: ["paypal"] as const,
  isConfigured,
  createSession(input: CreatePaymentSessionInput) {
    const method = getPayMethodOrThrow(input.method);
    const notifyPath = buildNotifyPath("paypal");
    const configured = isConfigured();

    return {
      provider: "paypal",
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
            "已预留 PayPal Orders API 接入位置。",
            `后续创建订单成功后可跳转 PayPal 托管收银台，并将 webhook 指向 ${notifyPath}。`,
            "当前为了不影响演示流程，仍允许本地模拟完成支付。",
          ]
        : [
            "已预留 PayPal 国际支付接口，但当前未配置 Client ID / Secret。",
            "生产环境建议在本 provider 内创建 order、捕获支付并处理 webhook。",
            "当前页面展示的是待接入结构，不会直连真实 PayPal。",
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
          value: buildNotifyUrl("paypal"),
          copyable: true,
        },
        {
          label: "结算币种",
          value: "USD（待接汇率换算）",
        },
      ],
    };
  },
  getWebhookReservationMessage() {
    return "PayPal webhook 入口已预留，后续可补事件验签、capture 校验与幂等处理。";
  },
};
