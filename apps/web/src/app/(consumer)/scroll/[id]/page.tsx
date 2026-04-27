"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Flame,
  Gift,
  Heart,
  Minus,
  Plus,
  Rocket,
  Share2,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import PurchaseFlowDialog from "@/components/PurchaseFlowDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BurstBadge,
  CornerRibbon,
  DanmuBubble,
  FloorHeader,
  GrabProgress,
  HotSticker,
  PriceTag,
  SaleHighlightStrip,
} from "@/components/consumer-visual";

type ProductDetail = RouterOutputs["product"]["byId"];

function DetailSkeleton() {
  return (
    <div className="space-y-3 px-3 py-3 md:px-6 md:py-5">
      <Skeleton className="h-9 w-24 rounded-full" />
      <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}

/* ==============================
 * 倒计时（活动失效）
 * ============================== */
function useCountdown(target: Date | string | undefined) {
  const targetMs = useMemo(() => {
    if (!target) return 0;
    return target instanceof Date
      ? target.getTime()
      : new Date(String(target)).getTime();
  }, [target]);
  // Initial value is null so SSR and first client render match (both render 00:00:00).
  // Effect kicks in after hydration to start the live countdown.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!targetMs) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  const diff = now === null ? 0 : Math.max(0, targetMs - now);
  const day = Math.floor(diff / 86_400_000);
  const hour = Math.floor((diff % 86_400_000) / 3_600_000);
  const min = Math.floor((diff % 3_600_000) / 60_000);
  const sec = Math.floor((diff % 60_000) / 1000);
  return { day, hour, min, sec, expired: targetMs > 0 && diff === 0 };
}

function CountdownChips({
  day,
  hour,
  min,
  sec,
}: {
  day: number;
  hour: number;
  min: number;
  sec: number;
}) {
  const Cell = ({ v }: { v: number }) => (
    <span className="rounded bg-black/30 px-1 py-0.5 font-mono text-[11px] font-black tabular-nums backdrop-blur">
      {String(v).padStart(2, "0")}
    </span>
  );
  return (
    <div className="flex items-center gap-0.5 text-white">
      {day > 0 && (
        <>
          <Cell v={day} />
          <span className="text-[10px] font-black opacity-90">天</span>
        </>
      )}
      <Cell v={hour} />
      <span className="text-[10px] font-black opacity-90">:</span>
      <Cell v={min} />
      <span className="text-[10px] font-black opacity-90">:</span>
      <Cell v={sec} />
    </div>
  );
}

/* ==============================
 * 假"X 人在抢" 动态社证
 * ============================== */
function buildDanmu(app: string) {
  return [
    `张**在 3 秒前抢到 ${app}`,
    `李**用积分换走最后 1 件`,
    `王**节省 ¥128 入手`,
    `最近 1 小时 1.2 万人参团`,
    `赵**晒单：超值，已 5 星好评`,
  ];
}

/* ============================================================= */
export default function ScrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const trpc = useTRPC();
  const [openBuy, setOpenBuy] = useState(false);
  const [qty, setQty] = useState(1);

  const { data: product, isLoading } = useQuery(
    trpc.product.byId.queryOptions({ id }),
  );
  const item = (product ?? null) as ProductDetail;

  const countdown = useCountdown(item?.expiresAt);

  if (isLoading) return <DetailSkeleton />;

  if (!item) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
        <div className="text-lg text-muted-foreground">商品不存在</div>
        <Button
          variant="outline"
          className="mt-4 rounded-full"
          onClick={() => router.push("/")}
        >
          返回首页
        </Button>
      </div>
    );
  }

  const price = Number(item.cashPrice);
  const original =
    item.originalCashPrice != null ? Number(item.originalCashPrice) : null;
  const saved = original ? Math.max(0, original - price) : 0;
  const discountPercent =
    original && original > 0
      ? Math.max(1, Math.round((1 - price / original) * 100))
      : 0;

  const expiresAtStr =
    item.expiresAt instanceof Date
      ? item.expiresAt.toLocaleDateString("zh-CN")
      : String(item.expiresAt).slice(0, 10);

  const scrollItem = {
    id: item.id,
    app: item.app,
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    imageUrl: item.imageUrl,
    pointsPrice: item.pointsPrice,
    cashPrice: price,
    originalCashPrice: original ?? undefined,
    expiresAt: expiresAtStr,
    availableCountText: `剩余 ${item.stock} 件`,
    tags: item.tags,
  };

  const canBuy = item.stock > 0 && item.status === "ACTIVE";
  const maxQty = Math.min(10, item.stock);

  // 库存进度（假设原始库存为 max(stock, 100) 计算"已抢百分比"）
  const totalStock = Math.max(item.stock + 80, 100);
  const grabbed = totalStock - item.stock;
  const grabPercent = Math.min(99, Math.round((grabbed / totalStock) * 100));

  const danmuItems = buildDanmu(item.app);

  return (
    <div className="pb-28 md:pb-6">
      <div className="space-y-3 px-3 py-3 md:space-y-4 md:px-6 md:py-5">
        {/* 顶部返回 + 操作 */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-card)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95"
            aria-label="返回"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-card)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95"
              aria-label="收藏"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--app-card)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95"
              aria-label="分享"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 限时秒杀通栏 */}
        {!countdown.expired && (
          <SaleHighlightStrip
            title="限时特惠 · 距结束"
            emoji={<Zap className="h-4 w-4" />}
            timer={
              <CountdownChips
                day={countdown.day}
                hour={countdown.hour}
                min={countdown.min}
                sec={countdown.sec}
              />
            }
          />
        )}

        {/* 商品图 + 角标 */}
        <div className="relative overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-[0_8px_24px_rgba(122,60,30,0.08)]">
          <div className="relative aspect-[4/3] overflow-hidden bg-[var(--app-soft)]">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Gift className="h-16 w-16" strokeWidth={1.25} />
              </div>
            )}

            {/* 左上角：平台标签 */}
            <div className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-[11px] font-black text-white backdrop-blur">
              {item.app}
            </div>

            {/* 右上角：立省角标 */}
            {saved > 0 && (
              <CornerRibbon tone="red" position="right">
                立省¥{saved.toFixed(0)}
              </CornerRibbon>
            )}

            {/* 右下角：折扣爆炸贴 */}
            {discountPercent > 0 && (
              <div className="absolute bottom-2 right-2">
                <BurstBadge tone="red" size={56}>
                  {discountPercent >= 50 ? `${discountPercent}%off` : `${(10 - discountPercent / 10).toFixed(1)}折`}
                </BurstBadge>
              </div>
            )}

            {/* 底部渐变压底 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_top,rgba(0,0,0,0.45)_0%,transparent_100%)]" />
          </div>
        </div>

        {/* 价格 + 标题卡 */}
        <div className="relative overflow-hidden rounded-2xl bg-[var(--app-card)] p-3.5 shadow-[0_4px_14px_rgba(122,60,30,0.08)]">
          <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-[var(--brand-red-soft)] blur-2xl" />

          <div className="relative">
            <PriceTag
              price={price}
              pointsPrice={item.pointsPrice}
              original={original ?? undefined}
              size="lg"
            />

            <h1 className="mt-2 text-[16px] font-black leading-tight text-foreground md:text-[18px]">
              {item.title}
            </h1>
            {item.subtitle && (
              <p className="mt-1 text-[12px] font-semibold leading-5 text-muted-foreground">
                {item.subtitle}
              </p>
            )}

            {/* 标签 */}
            {item.tags && item.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <HotSticker tone="red" rotate={-4}>
                  官方
                </HotSticker>
                <HotSticker tone="orange" rotate={3}>
                  极速核销
                </HotSticker>
                {(item.tags as string[]).slice(0, 3).map((tag: string, i: number) => (
                  <HotSticker
                    key={tag}
                    tone={i % 2 === 0 ? "gold" : "pink"}
                    rotate={i % 2 === 0 ? -3 : 4}
                  >
                    {tag}
                  </HotSticker>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 抢购进度 + 社证 */}
        {canBuy && (
          <div className="relative overflow-hidden rounded-2xl bg-[var(--app-card)] p-3 shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
            <div className="flex items-center justify-between text-[11px] font-black">
              <span className="inline-flex items-center gap-1 text-[var(--brand-red)]">
                <Flame className="h-3 w-3" />
                已抢 {grabPercent}% · 剩余 {item.stock} 件
              </span>
              <span className="text-muted-foreground">手慢就没了</span>
            </div>
            <div className="mt-2">
              <GrabProgress percent={grabPercent} size="md" />
            </div>
          </div>
        )}

        {/* 社证弹幕 */}
        <DanmuBubble items={danmuItems} />

        {/* 数量 + 价格明细 */}
        <div className="space-y-2">
          <FloorHeader
            emoji={<ShoppingCart className="h-5 w-5 text-[var(--brand-red)]" />}
            title="下单明细"
            tone="red"
          />
          <div className="rounded-2xl bg-[var(--app-card)] p-3.5 shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
            {/* 数量 */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-foreground">
                购买数量
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-soft)] text-foreground shadow-[inset_0_0_0_1px_var(--app-card-border)] active:scale-95 disabled:opacity-40"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="min-w-[2ch] text-center text-[13px] font-black tabular-nums text-foreground">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-red-soft)] text-[var(--brand-red)] shadow-[inset_0_0_0_1px_rgba(254,44,85,0.25)] active:scale-95 disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="my-3 h-px bg-[var(--app-card-border)]" />

            <div className="space-y-1.5 text-[12px]">
              {price > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">
                    现金小计
                  </span>
                  <span className="font-black text-foreground tabular-nums">
                    ¥{(price * qty).toFixed(price % 1 === 0 ? 0 : 2)}
                  </span>
                </div>
              )}
              {item.pointsPrice > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-muted-foreground">
                    积分小计
                  </span>
                  <span className="font-black text-foreground tabular-nums">
                    {item.pointsPrice * qty}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">
                  剩余库存
                </span>
                <span
                  className={cn(
                    "font-black tabular-nums",
                    item.stock <= 10
                      ? "text-[var(--brand-red)]"
                      : "text-foreground",
                  )}
                >
                  {item.stock} 件
                  {item.stock <= 10 && (
                    <span className="ml-1 text-[10px] font-black text-[var(--brand-red)]">
                      告急
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-muted-foreground">
                  失效时间
                </span>
                <span className="font-black text-foreground tabular-nums">
                  {expiresAtStr}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 规则说明 */}
        <div className="space-y-2">
          <FloorHeader
            emoji={<ClipboardList className="h-5 w-5 text-[var(--brand-gold)]" />}
            title="规则说明"
            tone="gold"
          />
          <div className="rounded-2xl bg-[var(--app-card)] p-3.5 shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
            <ol className="space-y-2 text-[12px] leading-5 text-foreground">
              <li className="flex gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red-soft)] text-[9px] font-black text-[var(--brand-red)]">
                  1
                </span>
                <span className="text-muted-foreground">
                  下单后券码自动入券包，去
                  <span className="font-black text-[var(--brand-red)]">
                    {" "}
                    我的券包{" "}
                  </span>
                  查看。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red-soft)] text-[9px] font-black text-[var(--brand-red)]">
                  2
                </span>
                <span className="text-muted-foreground">
                  在
                  <span className="font-black text-foreground">
                    {" "}
                    {item.app}{" "}
                  </span>
                  对应入口出示券码核销，秒到账。
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-red-soft)] text-[9px] font-black text-[var(--brand-red)]">
                  3
                </span>
                <span className="text-muted-foreground">
                  每张限购 {maxQty} 张，先到先得；积分与现金可组合抵扣。
                </span>
              </li>
            </ol>
          </div>
        </div>

        {/* 商品介绍 */}
        {item.description && (
          <div className="space-y-2">
            <FloorHeader
              emoji={<FileText className="h-5 w-5 text-[var(--brand-pink)]" />}
              title="商品介绍"
              tone="pink"
            />
            <div className="rounded-2xl bg-[var(--app-card)] p-3.5 shadow-[0_4px_14px_rgba(122,60,30,0.06)]">
              <p className="whitespace-pre-line text-[12px] leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 底部浮动购买栏 */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mx-3",
          "md:static md:mx-6 md:mt-2",
        )}
      >
        <div className="relative flex items-center gap-2 overflow-hidden rounded-full bg-[var(--app-card)] p-1.5 shadow-[0_-4px_20px_rgba(122,60,30,0.16)] md:shadow-[0_4px_14px_rgba(122,60,30,0.08)]">
          <div className="ml-2.5 flex flex-1 flex-col">
            <div className="flex items-baseline gap-1">
              {item.pointsPrice > 0 && (
                <span className="text-[14px] font-black italic text-[var(--brand-red)] tabular-nums">
                  {item.pointsPrice * qty}
                  <span className="ml-0.5 text-[10px] not-italic">积分</span>
                </span>
              )}
              {item.pointsPrice > 0 && price > 0 && (
                <span className="text-[10px] font-black text-foreground">
                  +
                </span>
              )}
              {price > 0 && (
                <span className="text-[16px] font-black italic leading-none text-[var(--brand-red)] tabular-nums">
                  <span className="text-[10px] not-italic">¥</span>
                  {(price * qty).toFixed(price % 1 === 0 ? 0 : 2)}
                </span>
              )}
              {price === 0 && item.pointsPrice === 0 && (
                <span className="text-[14px] font-black italic text-[var(--brand-red)]">
                  免费!
                </span>
              )}
            </div>
            {saved > 0 && (
              <span className="mt-0.5 text-[10px] font-black text-[var(--brand-orange)]">
                已省 ¥{(saved * qty).toFixed(0)}
              </span>
            )}
          </div>
          <Button
            onClick={() => setOpenBuy(true)}
            disabled={!canBuy}
            className={cn(
              "h-10 shrink-0 gap-1.5 rounded-full px-7 text-[14px] font-black text-white shadow-[0_4px_12px_rgba(254,44,85,0.32)] hover:brightness-110",
              canBuy
                ? "bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_100%)]"
                : "bg-[var(--app-soft-strong)] text-muted-foreground shadow-none",
            )}
          >
            {canBuy ? (
              <>
                <Rocket className="h-4 w-4" />
                立即抢购
              </>
            ) : (
              "暂不可购"
            )}
          </Button>
        </div>
      </div>

      <PurchaseFlowDialog
        open={openBuy}
        scroll={scrollItem}
        onOpenChange={setOpenBuy}
        onGoMy={() => router.push("/profile")}
      />
    </div>
  );
}
