"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import PurchaseFlowDialog from "@/components/PurchaseFlowDialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ProductDetail = RouterOutputs["product"]["byId"];

function DetailSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
      <Skeleton className="h-9 w-24 rounded-full" />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="pb-28 md:pb-6">
      <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
        {/* 顶部返回 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--app-card-border)] bg-white text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="text-base font-semibold text-foreground">商品详情</div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* 左：商品图 */}
          <Card className="gap-0 overflow-hidden rounded-xl border border-[var(--app-card-border)] bg-white p-0 shadow-none">
            <div className="relative aspect-square overflow-hidden bg-secondary">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-semibold text-muted-foreground">
                    {item.app}
                  </span>
                </div>
              )}
              <div className="absolute left-2 top-2 rounded bg-black/55 px-2 py-0.5 text-[11px] text-white backdrop-blur-sm">
                {item.app}
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            {/* 标题区 */}
            <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-white p-4 shadow-none">
              <h1 className="text-lg font-bold leading-tight text-foreground md:text-xl">
                {item.title}
              </h1>
              {item.subtitle && (
                <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
                  {item.subtitle}
                </p>
              )}
              {original && original > price && (
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="rounded bg-[var(--brand-red-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-red)]">
                    省 ¥{saved.toFixed(0)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    原价 <span className="line-through">¥{original}</span>
                  </span>
                </div>
              )}
            </Card>

            {/* 购买明细 */}
            <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-white p-4 shadow-none">
              {/* 购买数量 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">购买数量</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--app-card-border)] text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[2ch] text-center text-sm font-semibold text-foreground">
                    ×{qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    disabled={qty >= maxQty}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--app-card-border)] text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="mt-3 h-px bg-[var(--app-card-border)]" />

              {/* 订单价格 */}
              {price > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">订单价格</span>
                  <span className="text-sm font-semibold text-foreground">
                    ¥{(price * qty).toFixed(0)}
                  </span>
                </div>
              )}
              {/* 消耗积分 */}
              {item.pointsPrice > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">消耗积分</span>
                  <span className="text-sm font-semibold text-foreground">
                    {item.pointsPrice * qty}
                  </span>
                </div>
              )}
              {/* 库存 */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">剩余库存</span>
                <span className="text-sm text-foreground">
                  {item.stock} 件
                </span>
              </div>
              {/* 失效时间 */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">失效时间</span>
                <span className="text-sm text-foreground">{expiresAtStr}</span>
              </div>
            </Card>
          </div>
        </div>

        {/* 规则说明 */}
        <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-white p-4 shadow-none">
          <div className="text-sm font-bold text-foreground">规则说明</div>
          <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <li>
              <span className="mr-1 font-semibold text-foreground">1.</span>
              购买方式：在 x-pass 平台选择你想购买的商品类型、数量、单个价格、季节、年卡点券等，添加到购物车后提交订单。
            </li>
            <li>
              <span className="mr-1 font-semibold text-foreground">2.</span>
              进入个人中心后台查看，导出对应的平台券码，核验成功后发货。
            </li>
            <li>
              <span className="mr-1 font-semibold text-foreground">3.</span>
              每张限购一张，先到先得；积分与现金可组合抵扣。
            </li>
          </ol>
        </Card>

        {/* 商品介绍 */}
        {item.description && (
          <Card className="gap-0 rounded-xl border border-[var(--app-card-border)] bg-white p-4 shadow-none">
            <div className="text-sm font-bold text-foreground">商品介绍</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </Card>
        )}
      </div>

      {/* 底部浮动立即购买 */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 mx-4",
          "md:static md:mx-6 md:mt-2",
        )}
      >
        <div className="flex items-center gap-3 rounded-full border border-[var(--app-card-border)] bg-white p-2 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] md:shadow-none">
          <div className="ml-3 flex-1">
            <div className="text-[11px] text-muted-foreground">到手价</div>
            <div className="flex items-baseline gap-1">
              {item.pointsPrice > 0 && (
                <span className="text-sm font-bold text-[var(--brand-red)]">
                  {item.pointsPrice * qty} 积分
                </span>
              )}
              {item.pointsPrice > 0 && price > 0 && (
                <span className="text-xs text-muted-foreground">+</span>
              )}
              {price > 0 && (
                <span className="text-sm font-bold text-[var(--brand-red)]">
                  ¥{(price * qty).toFixed(0)}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={() => setOpenBuy(true)}
            disabled={!canBuy}
            className="h-10 rounded-full bg-[var(--brand-red)] px-8 text-sm font-bold text-white hover:bg-[var(--brand-red-hover)]"
          >
            {canBuy ? "立即购买" : "暂不可兑换"}
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
