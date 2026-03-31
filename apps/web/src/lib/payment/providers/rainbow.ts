import type { PayMethod } from "@discount-hub/shared";
import { env } from "@/env";
import type { CreatePaymentSessionInput, PaymentGateway } from "../types";
import {
  buildNotifyPath,
  buildNotifyUrl,
  defaultExpiry,
  formatPaymentAmount,
  getPayMethodOrThrow,
} from "../utils";

const gatewayLabel = "彩虹易支付";
const supportedMethods = ["alipay", "wechat", "unionpay"] as const satisfies readonly PayMethod[];

function isConfigured() {
  return Boolean(
    env.RAINBOW_EASYPAY_API_URL &&
      env.RAINBOW_EASYPAY_PID &&
      env.RAINBOW_EASYPAY_KEY,
  );
}

export const rainbowGateway: PaymentGateway = {
  id: "rainbow",
  label: gatewayLabel,
  supports: supportedMethods,
  isConfigured,
  createSession(input: CreatePaymentSessionInput) {
    const method = getPayMethodOrThrow(input.method);
    const notifyPath = buildNotifyPath("rainbow");
    const configured = isConfigured();

    return {
      provider: "rainbow",
      providerLabel: gatewayLabel,
      method: input.method,
      methodLabel: method.name,
      mode: method.mode,
      status: "PENDING",
      amountText: formatPaymentAmount(input.method, input.amount),
      expiresAt: defaultExpiry(),
      qrCodeText: `rainbow:${input.method}:${input.orderId}:${input.amount.toFixed(2)}`,
      productionReady: configured,
      demoActionEnabled: true,
      notifyPath,
      instructions: configured
        ? [
            `已预留 ${method.name} 的彩虹易支付下单入口。`,
            `生产环境接入时，服务端可直接请求彩虹网关并将异步通知指向 ${notifyPath}。`,
            "当前项目仍保留模拟确认按钮，方便联调订单主流程。",
          ]
        : [
            `已预留 ${method.name} -> 彩虹易支付的接口层，但当前环境未配置商户参数。`,
            "后续只需要补充 PID、KEY、网关地址，并在本文件接入真实下单请求。",
            "异步回调地址和订单编号已固定好，前后端主流程无需再改。",
          ],
      fields: [
        {
          label: "商户订单号",
          value: input.orderId,
          copyable: true,
          emphasized: true,
        },
        {
          label: "回调地址",
          value: buildNotifyUrl("rainbow"),
          copyable: true,
        },
        {
          label: "支付渠道",
          value: method.name,
        },
        {
          label: "网关模式",
          value: configured ? "已配置待接实单请求" : "占位接口 / 模拟完成",
        },
      ],
    };
  },
  getWebhookReservationMessage() {
    return "彩虹易支付异步通知接口已预留，后续可在此补签名校验、验单与订单入账逻辑。";
  },
};
