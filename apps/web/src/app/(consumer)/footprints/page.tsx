"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appCardClassName, PageHeading, EmptyStateDashed } from "@/components/shared";
import { PageTransition, AnimatedItem, AnimatedSection, StaggerList, HoverScale } from "@/components/motion";

export default function FootprintsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();

  const { data: footprints, isLoading } = useQuery({
    ...trpc.user.myFootprints.queryOptions(),
    enabled: !!session?.user,
    retry: false,
  });

  const items = (footprints ?? []) as { id: string; viewedAt: string | Date; product: { id: string; title: string; app: string } }[];

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
        </AnimatedItem>
        <AnimatedItem><PageHeading label="足迹" title="我的足迹" action={<Eye className="h-5 w-5 text-muted-foreground" />} /></AnimatedItem>
        <AnimatedSection>
          {!session?.user ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/40 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">登录后查看浏览记录</p>
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
            <EmptyStateDashed text="还没有浏览记录" />
          ) : (
            <StaggerList className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {items.map((fp) => (
                <AnimatedItem key={fp.id}>
                  <HoverScale>
                    <Card className={`${appCardClassName} cursor-pointer`} onClick={() => router.push(`/scroll/${fp.product.id}`)}>
                      <CardContent className="p-4">
                        <div className="text-sm font-semibold text-foreground">{fp.product.title}</div>
                        <Badge variant="secondary" className="mt-2 text-[11px]">{fp.product.app}</Badge>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {new Date(fp.viewedAt).toLocaleString("zh-CN")}
                        </div>
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
