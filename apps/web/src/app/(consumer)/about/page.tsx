"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { appCardClassName, PageHeading } from "@/components/shared";
import { PageTransition, AnimatedItem } from "@/components/motion";

export default function AboutPage() {
  const router = useRouter();
  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
        </AnimatedItem>
        <AnimatedItem><PageHeading label="About Us" title="关于我们" /></AnimatedItem>
        <AnimatedItem>
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div className="text-xl font-bold text-foreground">Discount Hub</div>
              </div>
              <Separator className="my-5" />
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>Discount Hub 是一个折扣权益交易平台，致力于为用户提供最优质的数字权益兑换服务。</p>
                <p>我们通过积分+现金的混合支付模式，让用户以更低的价格获取各类数字产品和服务权益。</p>
                <p>平台支持多种支付方式，包括支付宝、微信支付、银联卡、PayPal 及加密货币等。</p>
              </div>
              <Separator className="my-5" />
              <div className="text-xs text-muted-foreground">版本 1.0.0 · © 2026 Discount Hub</div>
            </CardContent>
          </Card>
        </AnimatedItem>
      </div>
    </PageTransition>
  );
}
