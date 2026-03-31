import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Crown, Play } from 'lucide-react';
import Modal from '../components/Modal';
import { useToast } from '../contexts/ToastContext';
import { openApp } from '../utils/appLinks';
import { earnContents, scrollsLimited } from '../utils/mockData';
import {
  addPoints,
  canCheckin,
  checkinRewardForDayIndex,
  doCheckin,
  getCheckinState,
  getPoints,
  getVipLabel,
  getVipProgress,
  getVipTiers,
  claimContent,
  isContentClaimed,
  isDailyTaskDone,
  markDailyTaskDone,
  markPurchase,
  todayStr,
} from '../utils/pointsStore';

type Props = {
  onOpenScroll: (id: string) => void;
};

type DailyTask = {
  id: string;
  title: string;
  desc: string;
  points: number;
  actionLabel: string;
  action: () => void;
  disabledReason?: string;
};

function fmtPoints(n: number) {
  return n.toLocaleString('zh-CN');
}

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

export default function MemberPage({ onOpenScroll }: Props) {
  const { push } = useToast();
  const [points, setPoints] = useState(() => getPoints());
  const [vipOpen, setVipOpen] = useState(false);
  const [checkinState, setCheckinState] = useState(() => getCheckinState());
  const [browseRemaining, setBrowseRemaining] = useState<number | null>(null);

  const browseTimerRef = useRef<number | null>(null);
  const today = useMemo(() => todayStr(), []);

  const vip = useMemo(() => getVipProgress(points), [points]);
  const vipLabel = useMemo(() => getVipLabel(vip.level), [vip.level]);
  const nextVipLabel = useMemo(() => getVipLabel(Math.min(10, vip.level + 1)), [vip.level]);
  const nextVipNeed = useMemo(() => Math.max(0, vip.max - points), [points, vip.max]);

  const refreshPoints = () => setPoints(getPoints());

  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<{ scrollId: string; app: string; title: string; couponCode: string; paidAt: string }>;
      markPurchase(new Date(e.detail.paidAt));

      if (!isDailyTaskDone('exchange-once')) {
        markDailyTaskDone('exchange-once');
        addPoints(100);
        push({ title: '任务完成', description: '完成一次兑换 +100 积分', variant: 'success' });
        refreshPoints();
      }

      const lvl = getVipProgress(getPoints()).level;
      if (lvl >= 5 && !isDailyTaskDone('vip5-upgrade')) {
        markDailyTaskDone('vip5-upgrade');
        addPoints(500);
        push({ title: '任务完成', description: '升级到 VIP5 +500 积分', variant: 'success' });
        refreshPoints();
      }
    };

    window.addEventListener('jz:purchaseSuccess', handler as EventListener);
    return () => window.removeEventListener('jz:purchaseSuccess', handler as EventListener);
  }, [push]);

  useEffect(() => {
    return () => {
      if (browseTimerRef.current) window.clearInterval(browseTimerRef.current);
    };
  }, []);

  const checkinNextDayIndex = useMemo(() => {
    const t = todayStr();
    if (checkinState.lastDate === t) return checkinState.dayIndex;
    if (checkinState.lastDate) {
      const last = new Date(checkinState.lastDate + 'T00:00:00');
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - last.getTime()) / 86400000);
      if (diffDays === 1) return Math.min(4, checkinState.dayIndex + 1);
    }
    return 1;
  }, [checkinState]);

  const checkinAvailable = useMemo(() => canCheckin(), [checkinState, points]);
  const checkinReward = useMemo(() => checkinRewardForDayIndex(checkinNextDayIndex), [checkinNextDayIndex]);

  const handleCheckin = () => {
    const r = doCheckin();
    if (!r.ok) {
      push({ title: '今日已签到', description: '明天再来领更多积分', variant: 'default' });
      return;
    }
    setCheckinState(getCheckinState());
    setPoints(r.points);
    push({ title: '签到成功', description: `+${r.reward} 积分`, variant: 'success' });
  };

  const handleBrowse50s = () => {
    if (isDailyTaskDone('douyin-50s')) {
      push({ title: '已完成', description: '今日任务已领取', variant: 'default' });
      return;
    }
    if (browseRemaining !== null) return;

    openApp('抖音');
    setBrowseRemaining(50);
    push({ title: '开始计时', description: '浏览 50 秒后自动发放积分', variant: 'default' });

    browseTimerRef.current = window.setInterval(() => {
      setBrowseRemaining((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next > 0) return next;

        if (browseTimerRef.current) window.clearInterval(browseTimerRef.current);
        browseTimerRef.current = null;

        markDailyTaskDone('douyin-50s');
        addPoints(100);
        refreshPoints();
        push({ title: '任务完成', description: '浏览 50 秒 +100 积分', variant: 'success' });
        return null;
      });
    }, 1000);
  };

  const goBuy = () => {
    onOpenScroll(scrollsLimited[0]?.id ?? '');
  };

  const goExchange = () => {
    onOpenScroll(scrollsLimited[0]?.id ?? '');
  };

  const dailyTasks: DailyTask[] = useMemo(() => {
    const browseDone = isDailyTaskDone('douyin-50s');
    const exchangeDone = isDailyTaskDone('exchange-once');
    const vip5Done = isDailyTaskDone('vip5-upgrade');

    const lvl = vip.level;
    const vip5Hint = lvl >= 5 ? undefined : `当前 ${vipLabel}，还差 ${fmtPoints(Math.max(0, 2500 - points))} 积分到 VIP5`;

    return [
      {
        id: 'douyin-50s',
        title: '打开抖音视频浏览 50 秒',
        desc: browseDone ? '今日已完成' : browseRemaining ? `计时中：还剩 ${browseRemaining}s` : '+100 积分',
        points: 100,
        actionLabel: browseDone ? '已领取' : browseRemaining ? '计时中' : '去浏览',
        action: handleBrowse50s,
        disabledReason: browseDone ? '今日已完成' : browseRemaining ? '计时中' : undefined,
      },
      {
        id: 'exchange-once',
        title: '完成一次兑换',
        desc: exchangeDone ? '今日已完成' : '购买任意卡卷并完成兑换',
        points: 100,
        actionLabel: exchangeDone ? '已领取' : '去兑换',
        action: goExchange,
        disabledReason: exchangeDone ? '今日已完成' : undefined,
      },
      {
        id: 'vip5-upgrade',
        title: '升级到 VIP5',
        desc: vip5Done ? '今日已完成' : vip5Hint ?? '购买任意卡卷并完成兑换',
        points: 500,
        actionLabel: vip5Done ? '已领取' : '去购买',
        action: goBuy,
        disabledReason: vip5Done ? '今日已完成' : undefined,
      },
      {
        id: 'share',
        title: '分享 1 个权益到好友',
        desc: isDailyTaskDone('share') ? '今日已完成' : '+80 积分',
        points: 80,
        actionLabel: isDailyTaskDone('share') ? '已领取' : '去分享',
        action: () => {
          if (isDailyTaskDone('share')) return;
          markDailyTaskDone('share');
          addPoints(80);
          refreshPoints();
          push({ title: '任务完成', description: '分享成功 +80 积分', variant: 'success' });
        },
        disabledReason: isDailyTaskDone('share') ? '今日已完成' : undefined,
      },
      {
        id: 'collect',
        title: '收藏 1 个今日值得兑',
        desc: isDailyTaskDone('collect') ? '今日已完成' : '+60 积分',
        points: 60,
        actionLabel: isDailyTaskDone('collect') ? '已领取' : '去收藏',
        action: () => {
          if (isDailyTaskDone('collect')) return;
          markDailyTaskDone('collect');
          addPoints(60);
          refreshPoints();
          push({ title: '任务完成', description: '收藏成功 +60 积分', variant: 'success' });
        },
        disabledReason: isDailyTaskDone('collect') ? '今日已完成' : undefined,
      },
    ];
  }, [browseRemaining, points, vip.level, vipLabel, push, onOpenScroll]);

  const tiers = useMemo(() => getVipTiers(), []);
  const checkinLabels = ['今日', '明日', '第三天', '第四天'];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <div className="rounded-3xl border border-white/10 bg-[var(--panel)] overflow-hidden">
        <div className="p-6 bg-[radial-gradient(circle_at_20%_30%,rgba(255,45,85,0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(138,43,226,0.25),transparent_55%)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-[var(--text)]">会员中心</h1>
              <div className="mt-1 text-xs text-[var(--text-muted)]">任务赚积分 · 兑换更划算</div>
            </div>
            <button
              type="button"
              onClick={() => setVipOpen(true)}
              className="shrink-0 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-4 py-2.5 text-sm font-semibold text-[var(--text)] inline-flex items-center gap-2"
            >
              <Crown className="h-4 w-4 text-[var(--accent)]" />
              VIP 等级
            </button>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <div className="text-sm text-[var(--text-muted)] mb-1">会员等级</div>
                <div className="text-2xl font-semibold text-gradient">{vipLabel}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-[var(--text-muted)] mb-1">积分</div>
                <div className="text-2xl font-semibold text-[var(--text)]">{fmtPoints(points)}</div>
              </div>
            </div>

            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.round(vip.ratio * 100)}%`, background: 'var(--gradient-primary)' }} />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
              <div>今日：{today}</div>
              <div>
                {vip.level >= 10 ? '已达最高等级' : `再获得 ${fmtPoints(nextVipNeed)} 积分升级至 ${nextVipLabel}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
          <SectionTitle
            title="签到任务"
            subtitle="连续签到奖励更高"
            action={
              <button
                type="button"
                onClick={handleCheckin}
                disabled={!checkinAvailable}
                className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition disabled:opacity-60"
                style={{ boxShadow: 'var(--shadow-glow)' }}
              >
                {checkinAvailable ? `签到 +${fmtPoints(checkinReward)}` : '今日已签到'}
              </button>
            }
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {checkinLabels.map((label, i) => {
              const idx = i + 1;
              const active = checkinState.dayIndex === idx && checkinState.lastDate === todayStr();
              const unlocked = idx <= Math.max(checkinState.dayIndex, checkinNextDayIndex);
              const claimed = idx <= checkinState.dayIndex && checkinState.lastDate !== null;
              return (
                <div
                  key={label}
                  className={`rounded-2xl border p-4 ${
                    active
                      ? 'border-[var(--primary)]/50 bg-[rgba(255,45,85,0.10)] shadow-[var(--shadow-glow)]'
                      : claimed
                        ? 'border-white/10 bg-white/5'
                        : unlocked
                          ? 'border-white/10 bg-white/5'
                          : 'border-white/10 bg-black/20 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-[var(--text)]">{label}</div>
                    {claimed ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">+{fmtPoints(checkinRewardForDayIndex(idx))} 积分</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
          <SectionTitle title="日常积分任务" subtitle="做任务拿积分，越用越赚" />

          <div className="mt-4 grid gap-3">
            {dailyTasks.map((t) => {
              const done = isDailyTaskDone(t.id);
              const disabled = Boolean(t.disabledReason);
              return (
                <div key={t.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text)] truncate">{t.title}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{t.desc}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-[var(--text-muted)]">奖励</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--primary)]">+{fmtPoints(t.points)}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-[var(--text-muted)]">{done ? '已领取' : t.disabledReason ?? '可领取'}</div>
                    <button
                      type="button"
                      onClick={t.action}
                      disabled={disabled}
                      className="rounded-2xl px-4 py-2 text-sm font-semibold border border-white/10 bg-white/5 text-[var(--text)] hover:bg-white/10 transition disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span>{t.actionLabel}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-[var(--panel)] p-5">
        <SectionTitle title="刷内容拿积分" subtitle="小红书风格 · 点开就送" />

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {earnContents.map((c) => {
            const claimed = isContentClaimed(c.id);
            return (
              <div key={c.id} className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
                <div className={`h-36 bg-gradient-to-br ${c.gradient} relative`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.10),transparent_60%)]" />
                  <div className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-[var(--text)]">
                    <Play className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {c.app}
                  </div>
                  <div className="absolute top-3 right-3 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-[var(--text)]">
                    +{fmtPoints(c.rewardPoints)}
                  </div>
                </div>

                <div className="p-4">
                  <div className="text-sm font-semibold text-[var(--text)] line-clamp-2">{c.title}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{c.subtitle}</div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-[var(--text-muted)]">{claimed ? '已领取' : '点开即可领取'}</div>
                    <button
                      type="button"
                      onClick={() => {
                        openApp(c.app);
                        if (claimed) {
                          push({ title: '已领取', description: '换一个内容继续刷', variant: 'default' });
                          return;
                        }
                        claimContent(c.id);
                        addPoints(c.rewardPoints);
                        refreshPoints();
                        push({ title: '积分已到账', description: `+${fmtPoints(c.rewardPoints)} 积分`, variant: 'success' });
                      }}
                      className="rounded-2xl px-4 py-2 text-sm font-semibold text-[var(--text)] bg-[var(--gradient-primary)] hover:brightness-110 transition"
                      style={{ boxShadow: 'var(--shadow-glow)' }}
                    >
                      去抖音观看
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={vipOpen} title="VIP 等级与权益" onClose={() => setVipOpen(false)}>
        <div className="px-5 py-5 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">当前等级：{vipLabel}</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">积分 {fmtPoints(points)} · 升级更划算</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <div className="text-xs text-[var(--text-muted)]">下一等级</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">{vip.level >= 10 ? '—' : nextVipLabel}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {tiers.map((t) => {
              const active = t.level === vip.level;
              return (
                <div
                  key={t.level}
                  className={`rounded-3xl border p-4 ${
                    active
                      ? 'border-[var(--primary)]/50 bg-[rgba(255,45,85,0.10)] shadow-[var(--shadow-glow)]'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--text)]">{t.name}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{fmtPoints(t.minPoints)} ~ {fmtPoints(t.maxPoints)} 积分</div>
                    </div>
                    {active ? (
                      <div className="text-xs rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[var(--text)]">当前</div>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {t.perks.map((p) => (
                      <div key={p} className="text-sm text-[var(--text-muted)] flex items-start gap-2">
                        <span className="text-[var(--accent)]">•</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
