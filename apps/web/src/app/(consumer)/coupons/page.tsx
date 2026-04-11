"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Sparkles,
  Ticket,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { openApp } from "@discount-hub/shared";
import { useTRPC } from "@/trpc/client";
import FakeQr from "@/components/FakeQr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  appCardClassName,
  PageHeading,
  EmptyStateDashed,
} from "@/components/shared";

type CouponWithProduct = {
  id: string;
  code: string;
  status: string;
  expiresAt: Date | string;
  product: { title: string; app: string; subtitle: string };
};

function CouponsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-[24px] border border-border p-4">
          <Skeleton className="h-14 w-14 rounded-[20px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CouponsPage() {
  const [tab, setTab] = useState("all");
  const [detailCoupon, setDetailCoupon] = useState<CouponWithProduct | null>(null);
  const trpc = useTRPC();

  const { data: coupons, isLoading } = useQuery(
    trpc.user.myCoupons.queryOptions(),
  );

  const filtered = (coupons ?? []).filter((coupon) => {
    if (tab === "active") return coupon.status === "ACTIVE";
    if (tab === "used") return coupon.status === "USED";
    if (tab === "expired") return coupon.status === "EXPIRED";
    return true;
  });

  const handleUseCoupon = async (coupon: { code: string; product: { app: string } }) => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      toast.success("券码已复制到剪贴板");
    } catch {
      toast.error("复制失败");
    }
    openApp(coupon.product.app);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("券码已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  const statusLabel = (status: string) => {
    if (status === "ACTIVE") return "未使用";
    if (status === "USED") return "已使用";
    return "已失效";
  };

  return (
    <div className="space-y-4 px-4 py-4 md:px-8 md:py-8">
      <PageHeading
        label="Coupons"
        title="券包"
        action={
          <Badge
            variant="outline"
            className="rounded-full border-border bg-secondary px-3 py-1 text-muted-foreground"
          >
            <Flame className="mr-1 h-3.5 w-3.5" />
            购买后自动入包
          </Badge>
        }
      />

      <Card className={appCardClassName}>
        <CardContent className="p-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto w-full rounded-[22px] bg-secondary p-1">
              {[
                { value: "all", label: "全部" },
                { value: "active", label: "未使用" },
                { value: "used", label: "已使用" },
                { value: "expired", label: "已过期" },
              ].map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-[18px] data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-5">
            {isLoading ? (
              <CouponsSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyStateDashed text="暂无券码" />
            ) : (
              <div className="space-y-3">
                {filtered.map((coupon) => {
                  const expiresAt =
                    coupon.expiresAt instanceof Date
                      ? coupon.expiresAt.toLocaleDateString("zh-CN")
                      : String(coupon.expiresAt).slice(0, 10);

                  return (
                    <Card
                      key={coupon.id}
                      className={`cursor-pointer gap-0 overflow-hidden rounded-[24px] border py-0 transition hover:-translate-y-0.5 hover:shadow-md ${
                        coupon.status === "ACTIVE"
                          ? "border-border bg-background"
                          : "border-border bg-secondary/50"
                      }`}
                      onClick={() => setDetailCoupon(coupon as unknown as CouponWithProduct)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-secondary">
                            <Ticket className="h-7 w-7 text-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-base font-semibold text-foreground">
                                  {coupon.product.title}
                                </h3>
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {coupon.product.app}
                                </p>
                              </div>
                              {coupon.status === "ACTIVE" ? (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-foreground" />
                              ) : (
                                <Sparkles className="h-5 w-5 shrink-0 text-muted-foreground" />
                              )}
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>有效期至 {expiresAt}</span>
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3">
                              <Badge variant="secondary" className="rounded-full font-mono text-xs">
                                {coupon.code}
                              </Badge>
                              {coupon.status === "ACTIVE" ? (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUseCoupon(coupon);
                                  }}
                                  className="rounded-full px-4"
                                >
                                  立即使用
                                </Button>
                              ) : (
                                <Badge variant="outline" className="rounded-full border-border text-muted-foreground">
                                  {statusLabel(coupon.status)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detailCoupon} onOpenChange={() => setDetailCoupon(null)}>
        <DialogContent className="max-w-sm rounded-[28px] border-border bg-background p-0">
          <DialogHeader className="border-b border-border px-6 py-5">
            <DialogTitle>券码详情</DialogTitle>
          </DialogHeader>
          {detailCoupon && (
            <div className="px-6 py-5">
              <div className="text-center">
                <div className="text-base font-semibold text-foreground">
                  {detailCoupon.product.title}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {detailCoupon.product.app}
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <FakeQr value={detailCoupon.code} />
                </div>
              </div>

              <div className="mt-4 text-center">
                <Badge variant="secondary" className="rounded-full px-4 py-2 font-mono text-sm">
                  {detailCoupon.code}
                </Badge>
              </div>

              <div className="mt-2 text-center text-xs text-muted-foreground">
                有效期至{" "}
                {detailCoupon.expiresAt instanceof Date
                  ? detailCoupon.expiresAt.toLocaleDateString("zh-CN")
                  : String(detailCoupon.expiresAt).slice(0, 10)}
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleCopyCode(detailCoupon.code)}
                  className="flex-1 rounded-full"
                >
                  <Copy className="h-4 w-4" />
                  复制券码
                </Button>
                {detailCoupon.status === "ACTIVE" && (
                  <Button
                    onClick={() => {
                      handleUseCoupon(detailCoupon);
                      setDetailCoupon(null);
                    }}
                    className="flex-1 rounded-full"
                  >
                    立即使用
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
