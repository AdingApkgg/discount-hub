"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appCardClassName, PageHeading, EmptyStateDashed } from "@/components/shared";
import { PageTransition, AnimatedItem } from "@/components/motion";

export default function PromotionsPage() {
  const router = useRouter();
  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
        </AnimatedItem>
        <AnimatedItem><PageHeading label="Promotions" title="我的推广" action={<Heart className="h-5 w-5 text-muted-foreground" />} /></AnimatedItem>
        <AnimatedItem>
          <EmptyStateDashed text="推广功能即将上线，敬请期待" />
        </AnimatedItem>
      </div>
    </PageTransition>
  );
}
