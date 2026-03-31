import { TRPCError } from "@trpc/server";
import type { CreatePaymentSessionInput } from "./types";
import { getGatewayByMethod } from "./registry";

export function createPaymentSession(input: CreatePaymentSessionInput) {
  const gateway = getGatewayByMethod(input.method);

  if (!gateway) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "暂不支持该支付方式",
    });
  }

  return gateway.createSession(input);
}
