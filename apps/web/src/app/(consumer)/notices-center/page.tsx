"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  Megaphone,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AnimatedItem,
  AnimatePresence,
  motion,
  PageTransition,
  StaggerList,
} from "@/components/motion";
import {
  BurstBadge,
  HotSticker,
} from "@/components/consumer-visual";

type LevelKey = "INFO" | "WARNING" | "SUCCESS" | "CRITICAL";

const LEVEL_META: Record<
  LevelKey,
  {
    label: string;
    Icon: LucideIcon;
    badgeBg: string;
    accentText: string;
    cardAccent: string;
  }
> = {
  INFO: {
    label: "通知",
    Icon: Info,
    badgeBg: "bg-[var(--app-soft-strong)] text-foreground",
    accentText: "text-foreground",
    cardAccent:
      "bg-[linear-gradient(180deg,rgba(193,122,60,0.12)_0%,rgba(193,122,60,0.0)_100%)]",
  },
  SUCCESS: {
    label: "好事",
    Icon: CheckCircle2,
    badgeBg: "bg-[var(--brand-gold-soft)] text-[#8B6A00]",
    accentText: "text-[#8B6A00]",
    cardAccent:
      "bg-[linear-gradient(180deg,rgba(245,184,0,0.18)_0%,rgba(245,184,0,0.0)_100%)]",
  },
  WARNING: {
    label: "注意",
    Icon: AlertTriangle,
    badgeBg: "bg-[var(--brand-orange-soft)] text-[var(--brand-orange)]",
    accentText: "text-[var(--brand-orange)]",
    cardAccent:
      "bg-[linear-gradient(180deg,rgba(255,110,55,0.16)_0%,rgba(255,110,55,0.0)_100%)]",
  },
  CRITICAL: {
    label: "重要",
    Icon: Zap,
    badgeBg:
      "bg-[var(--brand-red)] text-white shadow-[0_2px_4px_rgba(254,44,85,0.28)]",
    accentText: "text-[var(--brand-red)]",
    cardAccent:
      "bg-[linear-gradient(180deg,rgba(254,44,85,0.20)_0%,rgba(254,44,85,0.0)_100%)]",
  },
};

function formatRelative(value: Date | string) {
  const d = value instanceof Date ? value : new Date(String(value));
  const diff = Math.max(0, Date.now() - d.getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return d.toLocaleDateString("zh-CN");
}

/* ==============================
 * 顶部红色横幅
 * ============================== */
function NoticesHero({ unread }: { unread: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] px-4 py-3 text-white shadow-[0_10px_24px_rgba(254,44,85,0.22)]">
      <div className="stripe-urgent pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-[var(--brand-gold)]/30 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <BurstBadge tone="gold" size={56}>
          {unread}
        </BurstBadge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black drop-shadow-sm">
              公告中心
            </span>
            <HotSticker tone="gold" rotate={-5}>
              不踩雷
            </HotSticker>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-white/90">
            <BellRing className="h-3 w-3" />
            {unread > 0 ? `${unread} 条未读 · 看完领福利` : "你看的真勤快，全部已读"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NoticesCenterPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(trpc.notice.listActive.queryOptions());
  const markRead = useMutation(trpc.notice.markRead.mutationOptions());
  const markAllRead = useMutation(trpc.notice.markAllRead.mutationOptions());

  const notices = data ?? [];
  const unreadCount = notices.filter((n) => !n.read).length;

  async function handleMarkAll() {
    try {
      await markAllRead.mutateAsync();
      toast.success("已全部标记为已读");
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function handleMarkOne(noticeId: string, alreadyRead: boolean) {
    if (alreadyRead) return;
    try {
      await markRead.mutateAsync({ noticeId });
      await qc.invalidateQueries();
    } catch {
      // ignore — silent retry on next interaction
    }
  }

  return (
    <PageTransition>
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
        <AnimatedItem>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-card)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95"
              aria-label="返回"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAll}
                disabled={markAllRead.isPending}
                className="h-8 gap-1 rounded-full bg-[var(--brand-red-soft)] px-3 text-[11px] font-black text-[var(--brand-red)] hover:bg-[var(--brand-red-soft)]"
              >
                {markAllRead.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                全部已读
              </Button>
            )}
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <NoticesHero unread={unreadCount} />
        </AnimatedItem>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-5 py-10 text-center shadow-[inset_0_0_0_1px_var(--app-card-border)]"
          >
            <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <Megaphone
                className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
                strokeWidth={1.5}
              />
              <div className="text-[14px] font-black text-[var(--brand-red)]">
                暂无公告
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
                等有大新闻第一时间通知你
              </div>
            </div>
          </motion.div>
        ) : (
          <StaggerList className="space-y-2.5">
            <AnimatePresence mode="popLayout">
              {notices.map((n) => {
                const meta =
                  LEVEL_META[(n.level as LevelKey) ?? "INFO"] ?? LEVEL_META.INFO;
                const Icon = meta.Icon;
                const unread = !n.read;
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 28,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleMarkOne(n.id, !unread)}
                      className={cn(
                        "relative w-full overflow-hidden rounded-2xl bg-[var(--app-card)] p-3.5 text-left shadow-[0_4px_14px_rgba(122,60,30,0.06)] transition-transform active:scale-[0.99]",
                        !unread && "opacity-80",
                      )}
                    >
                      {unread && (
                        <div
                          className={cn(
                            "pointer-events-none absolute inset-0",
                            meta.cardAccent,
                          )}
                        />
                      )}
                      {unread && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-[linear-gradient(180deg,#FE2C55_0%,#FF6E37_100%)]"
                        />
                      )}
                      <div className="relative">
                        <div className="flex items-start gap-2">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                              meta.badgeBg,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-black",
                                  meta.badgeBg,
                                )}
                              >
                                {meta.label}
                              </span>
                              <span className="line-clamp-1 flex-1 text-[14px] font-black text-foreground">
                                {n.title}
                              </span>
                              {unread && (
                                <span
                                  aria-hidden
                                  className="pulse-red ml-auto h-2 w-2 shrink-0 rounded-full bg-[var(--brand-red)]"
                                />
                              )}
                            </div>
                            <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-[12px] leading-5 text-muted-foreground">
                              {n.content}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {formatRelative(n.createdAt)}
                              </span>
                              {n.linkUrl && (
                                <Link
                                  href={n.linkUrl}
                                  onClick={(e) => e.stopPropagation()}
                                  className={cn(
                                    "inline-flex items-center gap-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-black text-white shadow-[0_2px_6px_rgba(254,44,85,0.28)]",
                                    "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] hover:brightness-110",
                                  )}
                                >
                                  <Sparkles className="h-3 w-3" />
                                  查看详情
                                  <ArrowRight className="h-3 w-3" strokeWidth={3} />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </StaggerList>
        )}
      </div>
    </PageTransition>
  );
}
