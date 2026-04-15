"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import Countdown from "@/components/Countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  appCardClassName,
  PageHeading,
  EmptyStateDashed,
} from "@/components/shared";
import {
  AnimatedSection,
  AnimatedItem,
  PageTransition,
  StaggerList,
  HoverScale,
} from "@/components/motion";

type ProductItem = RouterOutputs["product"]["list"][number];

const CATEGORY_META: Record<string, { title: string; subtitle: string }> = {
  limited: { title: "限时神券", subtitle: "倒计时结束后将自动下架" },
  today: { title: "今日值得兑", subtitle: "今天最稳妥的权益组合" },
  zero: { title: "0 元兑专区", subtitle: "只消耗积分，不额外花现金" },
};

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const trpc = useTRPC();
  const [targetAt] = useState(() => Date.now() + 6 * 60 * 60 * 1000);

  const meta = CATEGORY_META[slug] ?? { title: slug, subtitle: "" };

  const { data: products, isLoading } = useQuery(
    trpc.product.list.queryOptions({ category: slug as "limited" | "today" | "zero" }),
  );

  const items = (products ?? []) as ProductItem[];

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
        </AnimatedItem>

        <AnimatedItem>
          <div className="flex items-end justify-between gap-4">
            <PageHeading label={slug.toUpperCase()} title={meta.title} />
            {slug === "limited" && (
              <div className="text-2xl font-bold text-red-500">
                <Countdown targetAt={targetAt} />
              </div>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
        </AnimatedItem>

        <AnimatedSection>
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className={appCardClassName}>
                  <Skeleton className="aspect-square w-full rounded-t-[28px]" />
                  <CardContent className="space-y-3 p-4">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyStateDashed text="暂无商品" />
          ) : (
            <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const price = Number(item.cashPrice);
                return (
                  <AnimatedItem key={item.id}>
                    <HoverScale>
                      <Card
                        className={`${appCardClassName} group cursor-pointer overflow-hidden transition-shadow hover:shadow-[0_16px_48px_rgba(15,23,42,0.12)]`}
                        onClick={() => router.push(`/scroll/${item.id}`)}
                      >
                        <div className="relative aspect-square overflow-hidden bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#374151_100%)]">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          )}
                          {!item.imageUrl && (
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_48%)]" />
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                            <Badge className="bg-white/12 text-white hover:bg-white/12">{item.app}</Badge>
                            <div className="mt-2 truncate text-lg font-semibold text-white">{item.title}</div>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                          <div className="mt-3 flex items-end justify-between gap-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-semibold text-foreground">{item.pointsPrice}</span>
                              <span className="text-xs text-muted-foreground">积分</span>
                              {price > 0 && <span className="text-sm text-muted-foreground">+ ¥{price.toFixed(2)}</span>}
                            </div>
                            <Button size="sm" className="rounded-full bg-foreground px-4 text-[11px] text-background hover:bg-foreground/90">
                              去兑换
                            </Button>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">库存 {item.stock}</div>
                        </CardContent>
                      </Card>
                    </HoverScale>
                  </AnimatedItem>
                );
              })}
            </StaggerList>
          )}
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
