"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Rocket,
  ShoppingCart,
  Ticket,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { openApp } from "@discount-hub/shared";
import { useTRPC } from "@/trpc/client";
import FakeQr from "@/components/FakeQr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  motion,
  AnimatePresence,
  AnimatedItem,
  PageTransition,
  StaggerList,
} from "@/components/motion";
import {
  BurstBadge,
  CoinBadge,
  FloorHeader,
  HotSticker,
  StampMark,
  TearDivider,
} from "@/components/consumer-visual";

type CouponWithProduct = {
  id: string;
  code: string;
  status: string;
  expiresAt: Date | string;
  product: { title: string; app: string; subtitle: string };
};

const TABS = [
  { value: "all", label: "全部" },
  { value: "active", label: "未使用" },
  { value: "used", label: "已使用" },
  { value: "expired", label: "已过期" },
] as const;
type TabValue = (typeof TABS)[number]["value"];

function daysUntil(expiresAt: Date | string): number {
  const d =
    expiresAt instanceof Date ? expiresAt : new Date(String(expiresAt));
  const diffMs = d.getTime() - Date.now();
  return Math.ceil(diffMs / 86_400_000);
}

function formatDate(expiresAt: Date | string) {
  const d =
    expiresAt instanceof Date ? expiresAt : new Date(String(expiresAt));
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

function CouponsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[150px] w-full rounded-2xl" />
      ))}
    </div>
  );
}

/* ==============================
 * 顶部红色横幅
 * ============================== */
function CouponsHero({
  total,
  active,
}: {
  total: number;
  active: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] px-4 py-3 text-white shadow-[0_10px_24px_rgba(254,44,85,0.22)]">
      <div className="stripe-urgent pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-[var(--brand-gold)]/30 blur-2xl" />

      <div className="relative flex items-center gap-3">
        <BurstBadge tone="gold" size={56}>
          {active}
        </BurstBadge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-black drop-shadow-sm">
              我的券包
            </span>
            <HotSticker tone="gold" rotate={-5}>
              立刻可用
            </HotSticker>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
            <span>共 {total} 张</span>
            <span className="opacity-60">·</span>
            <span className="flex items-center gap-0.5">
              <Flame className="h-3 w-3" />
              {active} 张待用
            </span>
          </div>
        </div>
        <CoinBadge value={active} label="可用" size="md" />
      </div>
    </div>
  );
}

/* ==============================
 * 状态分段切换
 * ============================== */
function StatusTabs({
  tab,
  setTab,
  counts,
}: {
  tab: TabValue;
  setTab: (v: TabValue) => void;
  counts: Record<TabValue, number>;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {TABS.map((t) => {
        const isActive = tab === t.value;
        const c = counts[t.value];
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "relative shrink-0 rounded-full px-3 py-1.5 text-[12px] font-black transition-all active:scale-95",
              isActive
                ? "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-white shadow-[0_3px_8px_rgba(254,44,85,0.3)]"
                : "bg-[var(--app-card)] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(193,122,60,0.2)]",
            )}
          >
            {t.label}
            {c > 0 && (
              <span
                className={cn(
                  "ml-1 rounded px-1 py-0 text-[9px] font-black",
                  isActive
                    ? "bg-white/30 text-white"
                    : "bg-[var(--brand-red-soft)] text-[var(--brand-red)]",
                )}
              >
                {c}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ==============================
 * 票券卡 — 国内电商风
 *   左：商品图标 + 信息
 *   中：垂直撕齿
 *   右：码 + 使用 CTA
 * ============================== */
function CouponTicket({
  coupon,
  onClick,
  onUse,
}: {
  coupon: CouponWithProduct;
  onClick: () => void;
  onUse: () => void;
}) {
  const days = daysUntil(coupon.expiresAt);
  const isActive = coupon.status === "ACTIVE";
  const isUsed = coupon.status === "USED";
  const isExpired = coupon.status === "EXPIRED";

  // 紧迫感（≤3 天）
  const urgent = isActive && days <= 3 && days >= 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_6px_18px_rgba(122,60,30,0.08)] transition-transform active:scale-[0.99]",
        !isActive && "opacity-75",
      )}
    >
      {/* 顶部红条 */}
      {isActive && (
        <div
          className={cn(
            "h-1 w-full",
            urgent
              ? "bg-[linear-gradient(90deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)]"
              : "bg-[linear-gradient(90deg,#FE2C55_0%,#FF6E37_100%)]",
          )}
        />
      )}
      {!isActive && (
        <div className="h-1 w-full bg-[var(--app-soft-strong)]" />
      )}

      <div className="flex items-stretch">
        {/* 左：信息区 */}
        <div className="relative min-w-0 flex-1 px-3.5 py-3">
          <div className="flex items-start gap-2.5">
            {/* 商品图标 */}
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black shadow-[inset_0_0_0_1px_rgba(193,122,60,0.16)]",
                isActive
                  ? "bg-[var(--brand-red-soft)] text-[var(--brand-red)]"
                  : "bg-[var(--app-soft)] text-muted-foreground",
              )}
            >
              {coupon.product.app.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="line-clamp-1 text-[14px] font-black text-foreground">
                  {coupon.product.title}
                </span>
                {isActive && urgent && (
                  <HotSticker tone="red" rotate={-4}>
                    急用
                  </HotSticker>
                )}
                {isActive && !urgent && (
                  <HotSticker tone="orange" rotate={-4}>
                    可用
                  </HotSticker>
                )}
              </div>
              <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted-foreground">
                {coupon.product.app}
                {coupon.product.subtitle && (
                  <span className="ml-1 opacity-70">
                    · {coupon.product.subtitle}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "mt-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black tabular-nums",
                  isActive && urgent && "bg-[var(--brand-red)] text-white",
                  isActive &&
                    !urgent &&
                    "bg-[var(--brand-orange-soft)] text-[var(--brand-orange)]",
                  !isActive &&
                    "bg-[var(--app-soft-strong)] text-muted-foreground",
                )}
              >
                {isActive ? (
                  urgent ? (
                    <>
                      <Clock className="h-3 w-3" />
                      仅剩 {Math.max(0, days)} 天
                    </>
                  ) : (
                    <>
                      <Calendar className="h-3 w-3" />
                      {formatDate(coupon.expiresAt)} 截止
                    </>
                  )
                ) : isUsed ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    已核销
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    已过期
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 已用/过期盖戳 */}
          {!isActive && (
            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <StampMark size={48} tone={isUsed ? "red" : "gold"}>
                {isUsed ? "已用" : "失效"}
              </StampMark>
            </div>
          )}
        </div>

        {/* 中：垂直撕齿 */}
        <div className="relative shrink-0">
          <div
            className="absolute -top-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rounded-full"
            style={{ background: "var(--app-shell-bg)" }}
          />
          <div
            className="absolute -bottom-1.5 left-1/2 z-10 h-3 w-3 -translate-x-1/2 rounded-full"
            style={{ background: "var(--app-shell-bg)" }}
          />
          <div className="coupon-dashed-v h-full w-px" />
        </div>

        {/* 右：CTA / 状态 */}
        <div className="flex w-[110px] shrink-0 flex-col items-center justify-center gap-1.5 px-2.5 py-3">
          {isActive ? (
            <>
              <div className="text-[10px] font-semibold text-muted-foreground">
                券码
              </div>
              <div className="rounded bg-[var(--app-soft)] px-1.5 py-0.5 font-mono text-[11px] font-black tabular-nums text-foreground">
                {coupon.code.slice(0, 8)}
              </div>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onUse();
                }}
                className={cn(
                  "h-8 w-full rounded-full text-[12px] font-black text-white shadow-[0_3px_8px_rgba(254,44,85,0.32)] hover:brightness-110",
                  urgent
                    ? "pulse-red bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)]"
                    : "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)]",
                )}
              >
                立即使用
              </Button>
            </>
          ) : (
            <>
              <div className="text-[10px] font-semibold text-muted-foreground">
                {isUsed ? "核销时间" : "失效"}
              </div>
              <div className="font-mono text-[11px] font-black text-muted-foreground">
                {formatDate(coupon.expiresAt)}
              </div>
              <div className="h-8 w-full rounded-full bg-[var(--app-soft-strong)] text-center text-[11px] font-black leading-8 text-muted-foreground">
                {isUsed ? "已使用" : "已过期"}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==============================
 * 空状态
 * ============================== */
function CouponEmpty({
  tab,
  onGoHome,
}: {
  tab: TabValue;
  onGoHome: () => void;
}) {
  const text =
    tab === "active"
      ? "暂无可用券码"
      : tab === "used"
        ? "暂无已用券码"
        : tab === "expired"
          ? "暂无过期券码"
          : "券包空空，去首页抢张";
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-5 py-8 text-center shadow-[inset_0_0_0_1px_var(--app-card-border)]">
      <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative">
        <Ticket
          className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
          strokeWidth={1.5}
        />
        <div className="text-[14px] font-black text-[var(--brand-red)]">
          {text}
        </div>
        <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
          买完商品自动入包，凭码核销立享优惠
        </div>
        {tab === "all" && (
          <Button
            onClick={onGoHome}
            className="mt-4 h-9 gap-1 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] px-5 text-[12px] font-black text-white shadow-[0_4px_10px_rgba(254,44,85,0.32)] hover:brightness-110"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            去首页抢券 ›
          </Button>
        )}
      </div>
    </div>
  );
}

/* ============================================================= */
export default function CouponsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabValue>("all");
  const [detailCoupon, setDetailCoupon] =
    useState<CouponWithProduct | null>(null);
  const trpc = useTRPC();

  const { data: coupons, isLoading } = useQuery(
    trpc.user.myCoupons.queryOptions(),
  );

  const list = (coupons ?? []) as CouponWithProduct[];

  const counts = useMemo<Record<TabValue, number>>(() => {
    return {
      all: list.length,
      active: list.filter((c) => c.status === "ACTIVE").length,
      used: list.filter((c) => c.status === "USED").length,
      expired: list.filter((c) => c.status === "EXPIRED").length,
    };
  }, [list]);

  const filtered = useMemo(() => {
    const sorted = [...list].sort((a, b) => {
      // 优先排序：未使用 > 已使用 > 已过期；同状态内按到期升序
      const order: Record<string, number> = { ACTIVE: 0, USED: 1, EXPIRED: 2 };
      const sa = order[a.status] ?? 3;
      const sb = order[b.status] ?? 3;
      if (sa !== sb) return sa - sb;
      const da = new Date(a.expiresAt).getTime();
      const db = new Date(b.expiresAt).getTime();
      return da - db;
    });
    if (tab === "active") return sorted.filter((c) => c.status === "ACTIVE");
    if (tab === "used") return sorted.filter((c) => c.status === "USED");
    if (tab === "expired")
      return sorted.filter((c) => c.status === "EXPIRED");
    return sorted;
  }, [list, tab]);

  async function handleUseCoupon(coupon: CouponWithProduct) {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.success("券码已复制 · 即将跳转核销");
    } catch {
      toast.error("复制失败");
    }
    openApp(coupon.product.app);
  }

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("券码已复制");
    } catch {
      toast.error("复制失败");
    }
  }

  return (
    <PageTransition>
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
        <AnimatedItem>
          <CouponsHero total={counts.all} active={counts.active} />
        </AnimatedItem>

        <AnimatedItem>
          <FloorHeader
            emoji={<Ticket className="h-5 w-5 text-[var(--brand-red)]" />}
            title="我的券码"
            subtitle="按到期时间排序 · 急用券置顶"
            tone="red"
          />
        </AnimatedItem>

        <AnimatedItem>
          <StatusTabs tab={tab} setTab={setTab} counts={counts} />
        </AnimatedItem>

        <div>
          {isLoading ? (
            <CouponsSkeleton />
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <CouponEmpty tab={tab} onGoHome={() => router.push("/")} />
            </motion.div>
          ) : (
            <StaggerList className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((coupon) => (
                  <motion.div
                    key={coupon.id}
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
                    <CouponTicket
                      coupon={coupon}
                      onClick={() => setDetailCoupon(coupon)}
                      onUse={() => handleUseCoupon(coupon)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </StaggerList>
          )}
        </div>
      </div>

      <Dialog
        open={!!detailCoupon}
        onOpenChange={(open) => !open && setDetailCoupon(null)}
      >
        <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-0 bg-[var(--festive-dialog-bg)] p-0 shadow-[0_20px_60px_rgba(254,44,85,0.3)]">
          <DialogHeader className="sr-only">
            <DialogTitle>券码详情</DialogTitle>
          </DialogHeader>
          {detailCoupon && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
            >
              {/* 顶部红条 */}
              <div className="relative h-12 overflow-hidden bg-[linear-gradient(135deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)]">
                <div className="stripe-urgent pointer-events-none absolute inset-0" />
                <div className="relative flex h-full items-center justify-center gap-1.5 text-[13px] font-black text-white drop-shadow-sm">
                  <Ticket className="h-4 w-4" />
                  凭此码核销 · {detailCoupon.product.app}
                </div>
              </div>

              <TearDivider
                bg="var(--festive-dialog-bg)"
                hole="var(--app-shell-bg)"
              />

              <div className="px-6 pb-6 pt-3">
                <div className="text-center">
                  <div className="text-[15px] font-black text-foreground">
                    {detailCoupon.product.title}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    {detailCoupon.product.app}
                    {detailCoupon.product.subtitle &&
                      ` · ${detailCoupon.product.subtitle}`}
                  </div>
                </div>

                <motion.div
                  className="mx-auto mt-4 w-fit rounded-2xl bg-white p-3 shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                    delay: 0.1,
                  }}
                >
                  <FakeQr value={detailCoupon.code} />
                </motion.div>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <span className="rounded bg-[var(--app-soft)] px-3 py-1.5 font-mono text-sm font-black tracking-wider text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)]">
                    {detailCoupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(detailCoupon.code)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-red-soft)] text-[var(--brand-red)] active:scale-95"
                    aria-label="复制券码"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 text-center text-[11px] font-semibold text-muted-foreground">
                  有效期至 {formatDate(detailCoupon.expiresAt)}
                  {detailCoupon.status === "ACTIVE" &&
                    daysUntil(detailCoupon.expiresAt) <= 3 && (
                      <span className="ml-1 font-black text-[var(--brand-red)]">
                        · 仅剩 {Math.max(0, daysUntil(detailCoupon.expiresAt))} 天
                      </span>
                    )}
                </div>

                {detailCoupon.status === "ACTIVE" && (
                  <Button
                    onClick={() => {
                      handleUseCoupon(detailCoupon);
                      setDetailCoupon(null);
                    }}
                    className="mt-4 h-11 w-full gap-1.5 rounded-full bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] text-[14px] font-black text-white shadow-[0_6px_16px_rgba(254,44,85,0.35)] hover:brightness-110"
                  >
                    <Rocket className="h-4 w-4" />
                    立即跳转核销
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
