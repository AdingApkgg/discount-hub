export interface ScrollItem {
  id: string;
  app: string;
  title: string;
  subtitle: string;
  description: string;
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

export type PayMethod = 'alipay' | 'wechat' | 'unionpay' | 'paypal' | 'crypto';

export const PAY_METHODS: { id: PayMethod; name: string; hint: string }[] = [
  { id: 'alipay', name: '支付宝', hint: '推荐' },
  { id: 'wechat', name: '微信支付', hint: '快捷' },
  { id: 'unionpay', name: '银联卡', hint: '银行卡' },
  { id: 'paypal', name: 'PayPal', hint: '海外' },
  { id: 'crypto', name: '加密货币', hint: 'Web3' },
];
