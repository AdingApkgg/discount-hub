type AppLink = {
  scheme?: string;
  web: string;
};

const APP_LINKS: Record<string, AppLink> = {
  抖音: { scheme: 'snssdk1128://', web: 'https://www.douyin.com/' },
  支付宝: { scheme: 'alipays://', web: 'https://www.alipay.com/' },
  微信支付: { scheme: 'weixin://', web: 'https://weixin.qq.com/' },
  银联卡: { web: 'https://www.unionpayintl.com/' },
  PayPal: { scheme: 'paypal://', web: 'https://www.paypal.com/' },
  加密货币: { web: 'https://ethereum.org/' },
};

export function openApp(appName: string) {
  const link = APP_LINKS[appName] ?? { web: 'https://www.baidu.com/s?wd=' + encodeURIComponent(appName) };

  const wasVisible = document.visibilityState === 'visible';

  if (link.scheme) {
    try {
      window.location.href = link.scheme;
    } catch {
    }
  }

  window.setTimeout(() => {
    if (wasVisible && document.visibilityState === 'visible') {
      window.open(link.web, '_blank', 'noopener,noreferrer');
    }
  }, 450);
}
