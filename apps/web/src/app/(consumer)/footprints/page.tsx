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

  const { data: footprints } = useQuery({
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
        <AnimatedItem><PageHeading label="Footprints" title="我的足迹" action={<Eye className="h-5 w-5 text-muted-foreground" />} /></AnimatedItem>
        <AnimatedSection>
          {items.length === 0 ? (
            <EmptyStateDashed text="还没有浏览记录" />
          ) : (
            <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
