import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import PurchaseFlowDialog from '../components/PurchaseFlowDialog';
import Countdown from '../components/Countdown';
import { scrollsLimited, todayPicks, zeroCost } from '../utils/mockData';

function findScroll(id: string) {
  return [...scrollsLimited, ...todayPicks, ...zeroCost].find((x) => x.id === id) ?? scrollsLimited[0];
}

export default function ScrollDetailPage({
  scrollId,
  onBack,
  onGoMy,
}: {
  scrollId: string;
  onBack: () => void;
  onGoMy: () => void;
}) {
  const scroll = useMemo(() => findScroll(scrollId), [scrollId]);
  const [openBuy, setOpenBuy] = useState(false);
  const targetAt = useMemo(() => Date.now() + 6 * 60 * 60 * 1000, []);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-white/10 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Clock className="h-4 w-4" />
            <span>限时演示 · 以页面倒计时为准</span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[var(--panel)] overflow-hidden">
            <div className="h-72 bg-[radial-gradient(circle_at_20%_30%,rgba(255,45,85,0.35),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(138,43,226,0.35),transparent_55%)]" />
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {scroll.tags.map((t) => (
                  <span key={t} className="text-xs rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[var(--text-muted)]">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-sm text-[var(--text-muted)]">
                兑换说明、权益展示、规则细节均为原型演示，可后续与后台联调替换。
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm text-[var(--text-muted)]">{scroll.app}</div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-[var(--text)] truncate">
                  {scroll.title}
                </h1>
                <div className="mt-2 text-sm text-[var(--text-muted)]">{scroll.subtitle}</div>
              </div>
              <div className="shrink-0">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)]">{scroll.availableCountText}</span>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Countdown targetAt={targetAt} />
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-[var(--panel2)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">权益要点</div>
              <div className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">
                <div className="flex gap-2"><span className="text-[var(--primary)]">•</span><span>优惠可叠加，效果更明显（原型示意）。</span></div>
                <div className="flex gap-2"><span className="text-[var(--primary)]">•</span><span>成功后生成券码与二维码，可用于核销。</span></div>
                <div className="flex gap-2"><span className="text-[var(--primary)]">•</span><span>限购一张，先到先得。</span></div>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-xs text-[var(--text-muted)]">兑换价格</div>
                <div className="mt-1 text-xl font-semibold text-[var(--text)]">
                  {scroll.pointsPrice} 积分 + ¥{scroll.cashPrice.toFixed(2)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpenBuy(true)}
                className="rounded-2xl px-6 py-3 font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition"
                style={{ boxShadow: 'var(--shadow-glow)' }}
              >
                去兑换
              </button>
            </div>

            <div className="mt-4 text-xs text-[var(--text-muted)]">
              失效时间：{scroll.expiresAt}
            </div>
          </div>
        </div>
      </div>

      <PurchaseFlowDialog open={openBuy} scroll={scroll} onOpenChange={setOpenBuy} onGoMy={onGoMy} />
    </div>
  );
}

