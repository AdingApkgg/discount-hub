"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appCardClassName, PageHeading, EmptyStateDashed } from "@/components/shared";
import { PageTransition, AnimatedItem, AnimatedSection, StaggerList, HoverScale } from "@/components/motion";

export default function FavoritesPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();

  const { data: favorites, isLoading } = useQuery({
    ...trpc.user.myFavorites.queryOptions(),
    enabled: !!session?.user,
    retry: false,
  });

  const items = (favorites ?? []) as { id: string; product: { id: string; title: string; app: string; pointsPrice: number; cashPrice: unknown } }[];

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
        </AnimatedItem>
        <AnimatedItem><PageHeading label="收藏" title="我的收藏" action={<Star className="h-5 w-5 text-muted-foreground" />} /></AnimatedItem>
        <AnimatedSection>
          {!session?.user ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">登录后查看与同步收藏</p>
              <Button className="mt-4 rounded-full bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-hover)]" onClick={() => router.push("/login")}>
                去登录
              </Button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className={`${appCardClassName} animate-pulse`}>
                  <CardContent className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-5 w-16 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyStateDashed text="还没有收藏任何商品" />
          ) : (
            <StaggerList className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {items.map((fav) => (
                <AnimatedItem key={fav.id}>
                  <HoverScale>
                    <Card className={`${appCardClassName} cursor-pointer`} onClick={() => router.push(`/scroll/${fav.product.id}`)}>
                      <CardContent className="p-4">
                        <div className="text-sm font-semibold text-foreground">{fav.product.title}</div>
                        <Badge variant="secondary" className="mt-2 text-[11px]">{fav.product.app}</Badge>
                        <div className="mt-2 text-xs text-muted-foreground">{fav.product.pointsPrice} 积分 + ¥{Number(fav.product.cashPrice).toFixed(2)}</div>
                      </CardContent>
                    </Card>
                  </HoverScale>
                </AnimatedItem>
              ))}
            </StaggerList>
          )}
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
