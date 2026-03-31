import { z } from 'zod';

export const scrollItemSchema = z.object({
  id: z.string(),
  app: z.string(),
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  pointsPrice: z.number().int().min(0),
  cashPrice: z.number().min(0),
  originalCashPrice: z.number().min(0).optional(),
  expiresAt: z.string(),
  availableCountText: z.string(),
  tags: z.array(z.string()),
});

export const couponSchema = z.object({
  id: z.number(),
  app: z.string(),
  title: z.string(),
  description: z.string(),
  expiry: z.string(),
  status: z.enum(['active', 'used', 'expired']),
  code: z.string(),
});

export const purchaseRequestSchema = z.object({
  scrollId: z.string(),
  qty: z.number().int().min(1).max(10),
  payMethod: z.enum(['alipay', 'wechat', 'unionpay', 'paypal', 'crypto']),
});

export const verifyCodeSchema = z.object({
  code: z.string().min(1).max(50),
});

export type ScrollItemInput = z.infer<typeof scrollItemSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
export type VerifyCodeRequest = z.infer<typeof verifyCodeSchema>;
