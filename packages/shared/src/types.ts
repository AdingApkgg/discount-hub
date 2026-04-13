export interface ScrollItem {
  id: string;
  app: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl?: string | null;
  pointsPrice: number;
  cashPrice: number;
  originalCashPrice?: number;
  expiresAt: string;
  availableCountText: string;
  tags: string[];
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  gradient: string;
  scrollId: string;
}

export interface InviteRecord {
  id: string;
  who: string;
  time: string;
  status: '已注册' | '已下单' | '已完成';
  reward: string;
}

export interface EarnContentItem {
  id: string;
  title: string;
  subtitle: string;
  app: string;
  rewardPoints: number;
  gradient: string;
}

export interface CouponItem {
  id: number;
  app: string;
  title: string;
  description: string;
  expiry: string;
  status: 'active' | 'used' | 'expired';
  code: string;
}

export interface VipTier {
  level: number;
  name: string;
  minPoints: number;
  maxPoints: number;
  perks: string[];
}

export type Tab = 'home' | 'coupons' | 'member' | 'profile';

export const PAY_METHOD_IDS = [
  'alipay',
  'wechat',
  'unionpay',
  'paypal',
  'visa',
  'usdt_trc20',
] as const;

export type PayMethod = (typeof PAY_METHOD_IDS)[number];

export const PAYMENT_PROVIDER_IDS = [
  'rainbow',
  'paypal',
  'stripe',
  'manual_crypto',
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER_IDS)[number];

export type PaymentMode = 'qr_code' | 'redirect' | 'wallet_transfer';
export type PaymentSessionStatus = 'PENDING' | 'PAID';

export interface PaymentField {
  label: string;
  value: string;
  copyable?: boolean;
  emphasized?: boolean;
}

export interface PaymentSession {
  provider: PaymentProvider;
  providerLabel: string;
  method: PayMethod;
  methodLabel: string;
  mode: PaymentMode;
  status: PaymentSessionStatus;
  amountText: string;
  expiresAt: string;
  qrCodeText?: string;
  checkoutUrl?: string;
  walletAddress?: string;
  walletProtocol?: string;
  memo?: string;
  productionReady: boolean;
  demoActionEnabled: boolean;
  notifyPath: string;
  instructions: string[];
  fields: PaymentField[];
}

export interface PayMethodDefinition {
  id: PayMethod;
  name: string;
  hint: string;
  provider: PaymentProvider;
  providerLabel: string;
  mode: PaymentMode;
  settlement: 'CNY' | 'USD' | 'USDT';
  note: string;
}

export const PAY_METHODS: PayMethodDefinition[] = [
  {
    id: 'alipay',
    name: '支付宝',
    hint: '彩虹',
    provider: 'rainbow',
    providerLabel: '彩虹易支付',
    mode: 'qr_code',
    settlement: 'CNY',
    note: '适合国内扫码支付场景，未来可直接对接彩虹易支付下单接口。',
  },
  {
    id: 'wechat',
    name: '微信支付',
    hint: '彩虹',
    provider: 'rainbow',
    providerLabel: '彩虹易支付',
    mode: 'qr_code',
    settlement: 'CNY',
    note: '适合公众号/H5/扫码支付，未来统一走彩虹易支付网关。',
  },
  {
    id: 'unionpay',
    name: '银联',
    hint: '银行卡',
    provider: 'rainbow',
    providerLabel: '彩虹易支付',
    mode: 'redirect',
    settlement: 'CNY',
    note: '可预留网银或银联收银台模式，后续由彩虹易支付聚合接入。',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    hint: '海外',
    provider: 'paypal',
    providerLabel: 'PayPal Checkout',
    mode: 'redirect',
    settlement: 'USD',
    note: '适合海外账户与跨境场景，后续接 PayPal Orders API。',
  },
  {
    id: 'visa',
    name: 'VISA',
    hint: '国际卡',
    provider: 'stripe',
    providerLabel: 'Stripe Checkout',
    mode: 'redirect',
    settlement: 'USD',
    note: '预留国际信用卡能力，未来建议走 Stripe Checkout 或 Payment Element。',
  },
  {
    id: 'usdt_trc20',
    name: 'USDT TRC20',
    hint: '链上',
    provider: 'manual_crypto',
    providerLabel: 'TRON 钱包收款',
    mode: 'wallet_transfer',
    settlement: 'USDT',
    note: '预留 TRC20 收款地址与链上回执能力，生产环境需补充汇率与确认数校验。',
  },
];

export function getPayMethodDefinition(method: PayMethod) {
  return PAY_METHODS.find((item) => item.id === method);
}
