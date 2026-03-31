export function formatMoney(amount: number) {
  return `¥${amount.toFixed(2)}`;
}

export function formatDateTime(dt: Date) {
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  const ss = String(dt.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function formatExpires(expiresAt: string) {
  return expiresAt;
}

export function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

export function fmtPoints(n: number) {
  return n.toLocaleString('zh-CN');
}

export function pad2(x: number) {
  return String(x).padStart(2, '0');
}

export function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function createOrderId() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase();
  const b = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `JZ-${a}-${b}`;
}

export function createSerial() {
  const n = Math.floor(Math.random() * 900000000 + 100000000);
  return `SN${n}`;
}

export function createCouponCode(scrollId: string) {
  const core = scrollId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const tail = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CP-${core}-${tail}`;
}

type AppLink = { scheme?: string; web: string };

const APP_LINKS: Record<string, AppLink> = {
  抖音: { scheme: 'snssdk1128://', web: 'https://www.douyin.com/' },
  支付宝: { scheme: 'alipays://', web: 'https://www.alipay.com/' },
  微信支付: { scheme: 'weixin://', web: 'https://weixin.qq.com/' },
  银联卡: { web: 'https://www.unionpayintl.com/' },
  PayPal: { scheme: 'paypal://', web: 'https://www.paypal.com/' },
  加密货币: { web: 'https://ethereum.org/' },
};

export function openApp(appName: string) {
  const link =
    APP_LINKS[appName] ??
    ({ web: 'https://www.baidu.com/s?wd=' + encodeURIComponent(appName) } as AppLink);

  const wasVisible = document.visibilityState === 'visible';

  if (link.scheme) {
    try {
      window.location.href = link.scheme;
    } catch {
      /* ignore */
    }
  }

  window.setTimeout(() => {
    if (wasVisible && document.visibilityState === 'visible') {
      window.open(link.web, '_blank', 'noopener,noreferrer');
    }
  }, 450);
}
