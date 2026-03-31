import { useMemo } from 'react';
import { CheckCircle2, Clock, Flame, Sparkles, Ticket } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { openApp } from '../utils/appLinks';

export default function CouponsPage() {
  const { push } = useToast();

  const coupons = useMemo(
    () => [
      {
        id: 1,
        app: '抖音',
        title: '¥50 优惠券',
        description: '满 200 可用',
        expiry: '2026-04-30',
        status: 'active' as const,
        code: 'COUP12345678',
      },
      {
        id: 2,
        app: '抖音',
        title: '¥100 优惠券',
        description: '满 500 可用',
        expiry: '2026-05-15',
        status: 'active' as const,
        code: 'COUP87654321',
      },
      {
        id: 3,
        app: '抖音',
        title: '¥30 优惠券',
        description: '满 100 可用',
        expiry: '2026-03-15',
        status: 'used' as const,
        code: 'COUP11223344',
      },
    ],
    []
  );

  const handleUseCoupon = async (coupon: (typeof coupons)[number]) => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      push({ title: '券码已复制', description: coupon.code, variant: 'success' });
    } catch {
      push({ title: '复制失败', description: '请手动复制券码', variant: 'error' });
    }
    openApp(coupon.app);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--text)]">卷包</h1>
          <div className="inline-flex items-center gap-2 text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[var(--text-muted)]">
            <Flame className="h-4 w-4 text-[var(--primary)]" />
            购买后可在此查看
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {['全部', '未使用', '已使用', '已过期'].map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                index === 0
                  ? 'text-[var(--text)] bg-[rgba(255,45,85,0.12)] border border-[var(--primary)]/40'
                  : 'border border-white/10 bg-white/5 text-[var(--text-muted)] hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`rounded-3xl border border-white/10 bg-[var(--panel)] p-5 relative overflow-hidden ${
                coupon.status !== 'active' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white"
                    style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
                  >
                    <Ticket className="w-8 h-8" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[var(--text)] text-lg">{coupon.title}</h3>
                      <p className="text-sm text-[var(--text-muted)]">{coupon.description}</p>
                    </div>
                    {coupon.status === 'active' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>有效期至 {coupon.expiry}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-[var(--text)] bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                      {coupon.code}
                    </div>
                    {coupon.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleUseCoupon(coupon)}
                        className="text-sm font-semibold text-[var(--primary)] hover:brightness-110 transition"
                      >
                        立即使用
                      </button>
                    ) : coupon.status === 'used' ? (
                      <div className="text-xs font-semibold text-[var(--text)] bg-white/10 border border-white/10 px-3 py-1 rounded-full">已使用</div>
                    ) : (
                      <div className="text-xs font-semibold text-[var(--text-muted)] bg-white/5 border border-white/10 px-3 py-1 rounded-full">已失效</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

