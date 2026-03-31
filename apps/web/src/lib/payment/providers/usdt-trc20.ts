import { env } from "@/env";
import type { CreatePaymentSessionInput, PaymentGateway } from "../types";
import {
  buildNotifyPath,
  buildNotifyUrl,
  defaultExpiry,
  formatPaymentAmount,
  getPayMethodOrThrow,
} from "../utils";

const DEMO_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const gatewayLabel = "TRON 钱包收款";

function isConfigured() {
  return Boolean(env.USDT_TRC20_RECEIVE_ADDRESS);
}

export const usdtTrc20Gateway: PaymentGateway = {
  id: "manual_crypto",
  label: gatewayLabel,
  supports: ["usdt_trc20"] as const,
  isConfigured,
  createSession(input: CreatePaymentSessionInput) {
    const method = getPayMethodOrThrow(input.method);
    const notifyPath = buildNotifyPath("manual_crypto");
    const configured = isConfigured();
    const walletAddress = env.USDT_TRC20_RECEIVE_ADDRESS ?? DEMO_ADDRESS;

    return {
      provider: "manual_crypto",
      providerLabel: gatewayLabel,
      method: input.method,
      methodLabel: method.name,
      mode: "wallet_transfer",
      status: "PENDING",
      amountText: formatPaymentAmount(input.method, input.amount),
      expiresAt: defaultExpiry(45),
      walletAddress,
      walletProtocol: "TRC20",
      memo: input.orderId,
      qrCodeText: `tron:${walletAddress}?amount=${input.amount.toFixed(2)}&memo=${input.orderId}`,
      productionReady: configured,
      demoActionEnabled: true,
      notifyPath,
      instructions: configured
        ? [
            "已预留 TRC20 地址收款结构。",
            "生产环境建议补充汇率换算、链上确认数校验和异步到账任务。",
            "当前页面仍支持手动模拟入账，方便先打通订单主流程。",
          ]
        : [
            "已预留 USDT TRC20 支付结构，但当前未配置正式收款地址。",
            "后续只需配置地址、补充链上监听或轮询任务，即可接入真实到账逻辑。",
            "当前展示的是演示地址，请勿用于真实收款。",
          ],
      fields: [
        {
          label: "收款地址",
          value: walletAddress,
          copyable: true,
          emphasized: true,
        },
        {
          label: "链路协议",
          value: "TRC20 / TRON",
        },
        {
          label: "订单备注",
          value: input.orderId,
          copyable: true,
        },
        {
          label: "回调入口",
          value: buildNotifyUrl("manual_crypto"),
          copyable: true,
        },
      ],
    };
  },
  getWebhookReservationMessage() {
    return "USDT TRC20 到账入口已预留，后续可接链上监听、确认数校验与人工复核。";
  },
};
