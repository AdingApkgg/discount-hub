"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import PurchaseFlowDialog from "@/components/PurchaseFlowDialog";
import Countdown from "@/components/Countdown";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type ProductDetail = RouterOutputs["product"]["byId"];

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Skeleton className="h-10 w-28 rounded-lg" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-12 w-40" />
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
  const [targetAt] = useState(() => Date.now() + 6 * 60 * 60 * 1000);

  const { data: product, isLoading } = useQuery(
    trpc.product.byId.queryOptions({ id }),
  );
  const item = (product ?? null) as ProductDetail;

  if (isLoading) return <DetailSkeleton />;

  if (!item) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 text-center sm:px-6">
        <div className="text-lg text-muted-foreground">商品不存在</div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/")}
        >
          返回首页
        </Button>
      </div>
    );
  }

  const price = Number(item.cashPrice);
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
    originalCashPrice:
      item.originalCashPrice != null ? Number(item.originalCashPrice) : undefined,
    expiresAt: expiresAtStr,
    availableCountText: `剩余 ${item.stock} 件`,
    tags: item.tags,
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Clock className="h-4 w-4" />
            <span>限时活动 · 以页面倒计时为准</span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden border-border">
            <div className="relative aspect-square bg-[radial-gradient(circle_at_20%_30%,rgba(255,45,85,0.35),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(138,43,226,0.35),transparent_55%)]">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2">
                {item.tags.map((t: string) => (
                  <Badge key={t} variant="outline" className="border-border">
                    {t}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Badge variant="secondary">{item.app}</Badge>
                  <h1 className="mt-3 truncate text-2xl font-semibold text-foreground sm:text-3xl">
                    {item.title}
                  </h1>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {item.subtitle}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 gap-2 border-border"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  剩余 {item.stock} 件
                </Badge>
              </div>

              <div className="mt-4">
                <Countdown targetAt={targetAt} />
              </div>

              <Card className="mt-5 border-border bg-secondary/30">
                <CardContent className="p-4">
                  <div className="text-sm font-semibold text-foreground">
                    权益要点
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {[
                      "优惠可叠加，效果更明显。",
                      "成功后生成券码与二维码，可用于核销。",
                      "限购一张，先到先得。",
                    ].map((text, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Separator className="my-6" />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">兑换价格</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {item.pointsPrice} 积分 + ¥{price.toFixed(2)}
                  </div>
                </div>
                <Button
                  onClick={() => setOpenBuy(true)}
                  disabled={item.stock <= 0 || item.status !== "ACTIVE"}
                  className="bg-[var(--gradient-primary)] text-white hover:brightness-110"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  {item.stock > 0 && item.status === "ACTIVE"
                    ? "去兑换"
                    : "暂不可兑换"}
                </Button>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                失效时间：{expiresAtStr}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PurchaseFlowDialog
        open={openBuy}
        scroll={scrollItem}
        onOpenChange={setOpenBuy}
        onGoMy={() => router.push("/coupons")}
      />
    </div>
  );
}
