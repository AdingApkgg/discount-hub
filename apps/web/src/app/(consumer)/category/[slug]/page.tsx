"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Coins,
  Flame,
  ImageOff,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Skeleton } from "@/components/ui/skeleton";
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
  CornerRibbon,
  DanmuBubble,
  GrabProgress,
  HotSticker,
  PriceTag,
  SaleHighlightStrip,
} from "@/components/consumer-visual";

type ProductItem = RouterOutputs["product"]["list"][number];
type CategoryId = "limited" | "today" | "zero";

type CategoryMeta = {
  title: string;
  subtitle: string;
  Icon: typeof Flame;
  accent: "red" | "gold" | "pink";
  emoji: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  limited: {
    title: "限时神券",
    subtitle: "倒计时结束自动下架 · 错过等明天",
    Icon: Flame,
    accent: "red",
    emoji: "限时",
  },
  today: {
    title: "今日值得兑",
    subtitle: "今天最稳妥的权益组合 · 编辑精挑",
    Icon: Sparkles,
    accent: "gold",
    emoji: "推荐",
  },
  zero: {
    title: "0 元兑专区",
    subtitle: "只需积分 · 不花一分钱",
    Icon: Coins,
    accent: "pink",
    emoji: "0元",
  },
};

const DANMU_ITEMS = [
  "张**刚刚抢到限时券",
  "李**用积分换走最后 1 件",
  "王**节省 ¥128 入手",
  "最近 1 小时 1.2 万人参团",
  "赵**晒单：超值",
];

/* ==============================
 * 限时倒计时 chips
 * ============================== */
function useCountdown(targetMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, targetMs - now);
  const hour = Math.floor(diff / 3_600_000);
  const min = Math.floor((diff % 3_600_000) / 60_000);
  const sec = Math.floor((diff % 60_000) / 1000);
  return { hour, min, sec };
}

function CountdownChips({ targetMs }: { targetMs: number }) {
  const { hour, min, sec } = useCountdown(targetMs);
  const Cell = ({ v }: { v: number }) => (
    <span className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px] font-black tabular-nums backdrop-blur">
      {String(v).padStart(2, "0")}
    </span>
  );
  return (
    <div className="flex items-center gap-0.5 text-white">
      <Cell v={hour} />
      <span className="text-[10px] font-black opacity-90">:</span>
      <Cell v={min} />
      <span className="text-[10px] font-black opacity-90">:</span>
      <Cell v={sec} />
    </div>
  );
}

/* ==============================
 * 商品卡
 * ============================== */
function ProductCard({
  item,
  onClick,
  highlight,
}: {
  item: ProductItem;
  onClick: () => void;
  highlight: "burn" | "burst" | null;
}) {
  const price = Number(item.cashPrice);
  const original =
    item.originalCashPrice != null ? Number(item.originalCashPrice) : null;
  const saved =
    original != null && original > price
      ? Math.max(1, Math.round(original - price))
      : 0;
  const stock = item.stock ?? 0;
  const lowStock = stock > 0 && stock <= 10;
  const soldOut = stock === 0;

  // 抢购百分比（粗略推断）
  const totalStock = Math.max(stock + 80, 100);
  const grabbed = totalStock - stock;
  const grabPercent = Math.min(99, Math.round((grabbed / totalStock) * 100));

  const tags = (item.tags as string[] | undefined) ?? [];
  const subtitle = item.subtitle ?? "";

  const isPointsOnly = price === 0 && item.pointsPrice > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-[var(--app-card)] text-left shadow-[0_6px_18px_rgba(122,60,30,0.08)] transition-transform active:scale-[0.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--app-soft)]">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}

        {/* 平台标签 */}
        <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur">
          {item.app}
        </div>

        {/* 立省角标 */}
        {saved > 0 && (
          <CornerRibbon tone="red" position="right">
            立省¥{saved}
          </CornerRibbon>
        )}

        {/* 高亮：限时类目 → 燃烧贴；0元 → 大爆炸贴 */}
        {highlight === "burn" && (
          <div className="absolute bottom-2 right-2">
            <HotSticker tone="red" rotate={-6}>
              <Flame className="mr-0.5 h-2.5 w-2.5" />
              限时
            </HotSticker>
          </div>
        )}
        {highlight === "burst" && isPointsOnly && (
          <div className="absolute bottom-2 right-2">
            <BurstBadge tone="pink" size={48}>
              0 元
            </BurstBadge>
          </div>
        )}

        {/* 售罄遮罩 */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
            <span className="rounded-full bg-white/95 px-3 py-1 text-[12px] font-black text-[var(--brand-red)] shadow">
              已售罄
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="line-clamp-1 text-[13px] font-black text-foreground">
          {item.title}
        </div>
        {subtitle && (
          <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-muted-foreground">
            {subtitle}
          </div>
        )}

        {/* 标签 */}
        {(tags.length > 0 || lowStock) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {lowStock && (
              <HotSticker tone="red" rotate={-4}>
                仅剩 {stock} 件
              </HotSticker>
            )}
            {tags.slice(0, 2).map((tag, i) => (
              <HotSticker
                key={tag}
                tone={i % 2 === 0 ? "gold" : "orange"}
                rotate={i % 2 === 0 ? -3 : 4}
              >
                {tag}
              </HotSticker>
            ))}
          </div>
        )}

        {/* 抢购进度 */}
        {!soldOut && grabPercent >= 60 && (
          <div className="mt-2">
            <GrabProgress
              percent={grabPercent}
              label={`已抢 ${grabPercent}%`}
              size="sm"
            />
          </div>
        )}

        <div className="mt-2 flex items-end justify-between gap-2">
          <PriceTag
            price={price}
            pointsPrice={item.pointsPrice}
            original={original ?? undefined}
            size="sm"
          />
          <span
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[11px] font-black text-white shadow-[0_2px_6px_rgba(254,44,85,0.32)]",
              soldOut
                ? "bg-[var(--app-soft-strong)] text-muted-foreground shadow-none"
                : "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)] hover:brightness-110",
            )}
          >
            {soldOut ? "缺货" : "去抢"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const trpc = useTRPC();
  const [targetAt] = useState(() => Date.now() + 6 * 60 * 60 * 1000);

  const meta = CATEGORY_META[slug] ?? {
    title: slug,
    subtitle: "",
    Icon: Sparkles,
    accent: "red" as const,
    emoji: "推荐",
  };
  const HeaderIcon = meta.Icon;

  const { data: products, isLoading } = useQuery(
    trpc.product.list.queryOptions({
      category: slug as CategoryId,
    }),
  );

  const items = useMemo(
    () => (products ?? []) as ProductItem[],
    [products],
  );

  const cardHighlight: "burn" | "burst" | null =
    slug === "limited" ? "burn" : slug === "zero" ? "burst" : null;

  return (
    <PageTransition>
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-4">
        <AnimatedItem>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-card)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95"
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </AnimatedItem>

        {/* 限时类目：倒计时通栏 */}
        {slug === "limited" && (
          <AnimatedItem>
            <SaleHighlightStrip
              title="限时神券 · 距结束"
              emoji={<Zap className="h-4 w-4" />}
              timer={<CountdownChips targetMs={targetAt} />}
            />
          </AnimatedItem>
        )}

        {/* 顶部品类 hero */}
        <AnimatedItem>
          <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#FE2C55_0%,#FF4D6A_50%,#FF6E37_100%)] px-4 py-3 text-white shadow-[0_10px_24px_rgba(254,44,85,0.22)]">
            <div className="stripe-urgent pointer-events-none absolute inset-0" />
            <div className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-[var(--brand-gold)]/30 blur-2xl" />

            <div className="relative flex items-center gap-3">
              <BurstBadge
                tone={meta.accent === "gold" ? "gold" : meta.accent === "pink" ? "pink" : "red"}
                size={56}
              >
                <HeaderIcon className="h-5 w-5" />
              </BurstBadge>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px] font-black drop-shadow-sm">
                    {meta.title}
                  </span>
                  <HotSticker tone="gold" rotate={-5}>
                    {meta.emoji}
                  </HotSticker>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-white/90">
                  {meta.subtitle}
                </div>
              </div>
              <div className="shrink-0 rounded-full bg-white/25 px-2.5 py-0.5 text-[11px] font-black backdrop-blur">
                共 {items.length} 件
              </div>
            </div>
          </div>
        </AnimatedItem>

        {/* 弹幕社证 */}
        {items.length > 0 && (
          <AnimatedItem>
            <DanmuBubble items={DANMU_ITEMS} />
          </AnimatedItem>
        )}

        {/* 商品列表 */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative overflow-hidden rounded-2xl bg-[var(--festive-card-bg)] px-5 py-10 text-center shadow-[inset_0_0_0_1px_var(--app-card-border)]"
          >
            <div className="dotted-warm pointer-events-none absolute inset-0 opacity-50" />
            <div className="relative">
              <Timer
                className="mx-auto mb-2 h-12 w-12 text-[var(--brand-red)]"
                strokeWidth={1.5}
              />
              <div className="text-[14px] font-black text-[var(--brand-red)]">
                暂无商品
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[#8B4513]">
                这个分类正在补货，去其他分类看看
              </div>
            </div>
          </motion.div>
        ) : (
          <StaggerList className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
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
                  <ProductCard
                    item={item}
                    onClick={() => router.push(`/scroll/${item.id}`)}
                    highlight={cardHighlight}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </StaggerList>
        )}
      </div>
    </PageTransition>
  );
}
