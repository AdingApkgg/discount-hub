import type {
  PayMethod,
  PaymentProvider,
  PaymentSession,
} from "@discount-hub/shared";

export interface CreatePaymentSessionInput {
  orderId: string;
  productTitle: string;
  quantity: number;
  amount: number;
  method: PayMethod;
}

export interface PaymentGateway {
  id: PaymentProvider;
  label: string;
  supports: readonly PayMethod[];
  isConfigured(): boolean;
  createSession(input: CreatePaymentSessionInput): PaymentSession;
  getWebhookReservationMessage(): string;
}
