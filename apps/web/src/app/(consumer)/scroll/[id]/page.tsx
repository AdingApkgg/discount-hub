"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import PurchaseFlowDialog from "@/components/PurchaseFlowDialog";
import Countdown from "@/components/Countdown";
import { findScroll } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ScrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const scroll = useMemo(() => findScroll(id), [id]);
  const [openBuy, setOpenBuy] = useState(false);
  const targetAt = useMemo(() => Date.now() + 6 * 60 * 60 * 1000, []);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>限时演示 · 以页面倒计时为准</span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="border-border overflow-hidden">
            <div className="h-72 bg-[radial-gradient(circle_at_20%_30%,rgba(255,45,85,0.35),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(138,43,226,0.35),transparent_55%)]" />
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-2">
                {scroll.tags.map((t) => (
                  <Badge key={t} variant="outline" className="border-border">
                    {t}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                {scroll.description}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm text-muted-foreground">{scroll.app}</div>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-foreground truncate">
                    {scroll.title}
                  </h1>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {scroll.subtitle}
                  </div>
                </div>
                <Badge variant="outline" className="gap-2 border-border shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                  {scroll.availableCountText}
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
                      "优惠可叠加，效果更明显（原型示意）。",
                      "成功后生成券码与二维码，可用于核销。",
                      "限购一张，先到先得。",
                    ].map((text, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-[var(--primary)]">•</span>
                        <span>{text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">兑换价格</div>
                  <div className="mt-1 text-xl font-semibold text-foreground">
                    {scroll.pointsPrice} 积分 + ¥{scroll.cashPrice.toFixed(2)}
                  </div>
                </div>
                <Button
                  onClick={() => setOpenBuy(true)}
                  className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  去兑换
                </Button>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                失效时间：{scroll.expiresAt}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PurchaseFlowDialog
        open={openBuy}
        scroll={scroll}
        onOpenChange={setOpenBuy}
        onGoMy={() => router.push("/profile")}
      />
    </div>
  );
}
