"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Flame, Sparkles, Ticket } from "lucide-react";
import { openApp } from "@discount-hub/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function CouponsPage() {
  const [tab, setTab] = useState("all");

  const coupons = useMemo(
    () => [
      {
        id: 1,
        app: "抖音",
        title: "¥50 优惠券",
        description: "满 200 可用",
        expiry: "2026-04-30",
        status: "active" as const,
        code: "COUP12345678",
      },
      {
        id: 2,
        app: "抖音",
        title: "¥100 优惠券",
        description: "满 500 可用",
        expiry: "2026-05-15",
        status: "active" as const,
        code: "COUP87654321",
      },
      {
        id: 3,
        app: "抖音",
        title: "¥30 优惠券",
        description: "满 100 可用",
        expiry: "2026-03-15",
        status: "used" as const,
        code: "COUP11223344",
      },
      {
        id: 4,
        app: "抖音",
        title: "¥20 优惠券",
        description: "满 80 可用",
        expiry: "2026-02-01",
        status: "expired" as const,
        code: "COUP99887766",
      },
    ],
    [],
  );

  const filtered = coupons.filter((c) => {
    if (tab === "active") return c.status === "active";
    if (tab === "used") return c.status === "used";
    if (tab === "expired") return c.status === "expired";
    return true;
  });

  const handleUseCoupon = async (coupon: (typeof coupons)[number]) => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.success("券码已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
    openApp(coupon.app);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-foreground">卷包</h1>
            <Badge variant="outline" className="gap-2 border-border">
              <Flame className="h-3.5 w-3.5 text-[var(--primary)]" />
              购买后可在此查看
            </Badge>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mb-4">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="active">未使用</TabsTrigger>
              <TabsTrigger value="used">已使用</TabsTrigger>
              <TabsTrigger value="expired">已过期</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {filtered.map((coupon) => (
              <Card
                key={coupon.id}
                className={`border-border relative overflow-hidden ${
                  coupon.status !== "active" ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
                        style={{
                          background: "var(--gradient-primary)",
                          boxShadow: "var(--shadow-glow)",
                        }}
                      >
                        <Ticket className="w-7 h-7" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground text-lg">
                            {coupon.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {coupon.description}
                          </p>
                        </div>
                        {coupon.status === "active" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>有效期至 {coupon.expiry}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono text-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border">
                          {coupon.code}
                        </code>
                        {coupon.status === "active" ? (
                          <Button
                            variant="link"
                            onClick={() => handleUseCoupon(coupon)}
                            className="text-[var(--primary)] hover:brightness-110 p-0"
                          >
                            立即使用
                          </Button>
                        ) : (
                          <Badge
                            variant={coupon.status === "used" ? "secondary" : "outline"}
                            className="border-border"
                          >
                            {coupon.status === "used" ? "已使用" : "已失效"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
