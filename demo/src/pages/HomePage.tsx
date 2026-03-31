import { ArrowRight, Flame, Sparkles } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Countdown from '../components/Countdown';
import { banners, hotPosts, hotRanking, scrollsLimited, todayPicks, zeroCost, type ScrollItem } from '../utils/mockData';

function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="text-lg font-semibold text-[var(--text)] truncate">{title}</div>
        {subtitle ? <div className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</div> : null}
      </div>
      {action}
    </div>
  );
}

function ScrollCard({ item, onClick }: { item: ScrollItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-3xl border border-white/10 bg-[var(--panel)] hover:bg-[var(--panel2)] transition overflow-hidden text-left"
    >
      <div className="h-28 bg-[radial-gradient(circle_at_20%_20%,rgba(255,45,85,0.30),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(138,43,226,0.28),transparent_55%)]" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-[var(--text-muted)]">{item.app}</div>
            <div className="mt-1 text-base font-semibold text-[var(--text)] truncate">{item.title}</div>
            <div className="mt-1 text-xs text-[var(--text-muted)] truncate">{item.subtitle}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-[var(--text-muted)]">{item.availableCountText}</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text)]">{item.pointsPrice} 积分</div>
            <div className="text-xs text-[var(--text-muted)]">+ ¥{item.cashPrice.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[var(--text-muted)]">
                {t}
              </span>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] group-hover:brightness-110 transition">
            去兑换
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function HomePage({
  onOpenScroll,
  onGoMember,
}: {
  onOpenScroll: (id: string) => void;
  onGoMember: () => void;
}) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const targetAt = useMemo(() => Date.now() + 6 * 60 * 60 * 1000, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, 10000);
    return () => window.clearTimeout(t);
  }, [bannerIndex]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-8">
      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-[var(--text-muted)]">你的会员等级</div>
            <div className="mt-1 text-2xl sm:text-3xl font-semibold text-[var(--text)]">
              <span className="text-gradient">VIP3</span>
              <span className="ml-3 text-sm text-[var(--text-muted)]">到期 2026-12-31</span>
            </div>
            <div className="mt-2 text-sm text-[var(--text-muted)]">签到/任务拿积分，兑换更划算</div>
          </div>

          <button
            type="button"
            onClick={onGoMember}
            className="rounded-2xl px-5 py-3 font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            查看VIP等级与任务
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] overflow-hidden">
        <div className="relative h-44 sm:h-56 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
          >
            {banners.map((b) => (
              <div key={b.id} className={`relative h-full w-full shrink-0 bg-gradient-to-r ${b.gradient}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,0.18),transparent_55%)]" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="text-2xl sm:text-3xl font-semibold text-white">{b.title}</div>
                  <div className="mt-2 text-sm text-white/85">{b.subtitle}</div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenScroll(b.scrollId)}
                      className="rounded-2xl bg-white/15 hover:bg-white/20 border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition"
                    >
                      {b.cta}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute bottom-5 right-6 flex items-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBannerIndex(i)}
                className={`h-2.5 rounded-full transition ${i === bannerIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/60'}`}
                aria-label={`切换到Banner ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <SectionTitle
          title="限时神卷"
          subtitle="倒计时结束后将自动下架（原型演示）"
          action={<Countdown targetAt={targetAt} />}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scrollsLimited.map((x) => (
            <ScrollCard key={x.id} item={x} onClick={() => onOpenScroll(x.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="今日值得兑" subtitle="今天最推荐的权益组合" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {todayPicks.map((x) => (
            <ScrollCard key={x.id} item={x} onClick={() => onOpenScroll(x.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle title="0 元兑" subtitle="只消耗积分，0 元即可兑换" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zeroCost.map((x) => (
            <ScrollCard key={x.id} item={x} onClick={() => onOpenScroll(x.id)} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
          <SectionTitle
            title="运营活动位"
            subtitle="小红书风格热帖 · 点击进入详情"
            action={
              <div className="inline-flex items-center gap-2 text-xs rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[var(--text-muted)]">
                <Flame className="h-4 w-4 text-[var(--primary)]" />
                热门
              </div>
            }
          />
          <div className="mt-4 grid gap-3">
            {hotPosts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenScroll(scrollsLimited[0].id)}
                className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text)] truncate">{p.title}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{p.excerpt}</div>
                  </div>
                  <div className="shrink-0 text-xs text-[var(--text-muted)]">❤️ {p.likeText}</div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[11px] rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[var(--text-muted)]">
                    {p.app}
                  </div>
                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                    去看看 <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
          <SectionTitle title="热门 APP 权益榜单" subtitle="今天最火的 TOP 5" />
          <div className="mt-4 space-y-2">
            {hotRanking.map((r) => (
              <button
                key={r.rank}
                type="button"
                onClick={() => onOpenScroll(scrollsLimited[Math.min(scrollsLimited.length - 1, r.rank - 1)].id)}
                className="w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-3 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-2xl bg-[rgba(255,45,85,0.12)] border border-[var(--primary)]/25 flex items-center justify-center text-xs font-semibold text-[var(--text)]">
                      {r.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text)] truncate">{r.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{r.hot}</div>
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
