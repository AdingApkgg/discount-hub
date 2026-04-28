import { z } from 'zod';
import { PAY_METHOD_IDS } from './types';

export const purchaseRequestSchema = z.object({
  productId: z.string(),
  qty: z.number().int().min(1).max(10).default(1),
  payMethod: z.enum(PAY_METHOD_IDS),
});

export const verifyCodeSchema = z.object({
  code: z.string().min(1).max(50),
});

export const productCreateSchema = z.object({
  app: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  coverImage: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
  pointsPrice: z.number().int().min(0),
  cashPrice: z.number().min(0),
  originalCashPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0),
  minAmount: z.number().min(0).optional(),
  minQuantity: z.number().int().min(1).optional(),
  purchaseNotes: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
  expiresAt: z.date(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'DRAFT']).default('ACTIVE'),
});

export const productUpdateSchema = z.object({
  id: z.string(),
  data: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().url().nullable().optional().or(z.literal('')),
    coverImage: z.string().url().nullable().optional().or(z.literal('')),
    category: z.string().optional(),
    app: z.string().optional(),
    pointsPrice: z.number().int().min(0).optional(),
    cashPrice: z.number().min(0).optional(),
    originalCashPrice: z.number().min(0).nullable().optional(),
    stock: z.number().int().min(0).optional(),
    minAmount: z.number().min(0).nullable().optional(),
    minQuantity: z.number().int().min(1).nullable().optional(),
    purchaseNotes: z.array(z.string()).optional(),
    usageNotes: z.string().nullable().optional(),
    expiresAt: z.date().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(['ACTIVE', 'SOLD_OUT', 'EXPIRED', 'DRAFT']).optional(),
  }),
});

export type PurchaseRequest = z.infer<typeof purchaseRequestSchema>;
export type VerifyCodeRequest = z.infer<typeof verifyCodeSchema>;
export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
