"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Loader2,
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

const surfaceClassName =
  "gap-0 rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-card)] py-0 shadow-[var(--app-card-shadow)]";

type CouponWithProduct = {
  id: string;
  code: string;
  status: string;
  expiresAt: Date | string;
  product: { title: string; app: string; subtitle: string };
};

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
    <div className="space-y-4 px-4 py-4">
      <section className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-slate-400">
            Coupons
          </div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900">
            券包
          </h1>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-[var(--app-card-border)] bg-[var(--app-card)] px-3 py-1 text-[var(--app-text-muted)]"
        >
          <Flame className="mr-1 h-3.5 w-3.5" />
          购买后自动入包
        </Badge>
      </section>

      <Card className={surfaceClassName}>
        <CardContent className="p-5">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-auto w-full rounded-[22px] bg-slate-100 p-1">
              <TabsTrigger
                value="all"
                className="rounded-[18px] data-[state=active]:bg-[var(--app-card)] data-[state=active]:text-[var(--app-heading)]"
              >
                全部
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="rounded-[18px] data-[state=active]:bg-[var(--app-card)] data-[state=active]:text-[var(--app-heading)]"
              >
                未使用
              </TabsTrigger>
              <TabsTrigger
                value="used"
                className="rounded-[18px] data-[state=active]:bg-[var(--app-card)] data-[state=active]:text-[var(--app-heading)]"
              >
                已使用
              </TabsTrigger>
              <TabsTrigger
                value="expired"
                className="rounded-[18px] data-[state=active]:bg-[var(--app-card)] data-[state=active]:text-[var(--app-heading)]"
              >
                已过期
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-5">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                暂无券码
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((coupon) => {
                  const expiresAt =
                    coupon.expiresAt instanceof Date
                      ? coupon.expiresAt.toLocaleDateString("zh-CN")
                      : String(coupon.expiresAt).slice(0, 10);

                  return (
                    <button
                      type="button"
                      key={coupon.id}
                      onClick={() => setDetailCoupon(coupon as unknown as CouponWithProduct)}
                      className={`w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        coupon.status === "ACTIVE"
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-slate-100">
                          <Ticket className="h-7 w-7 text-slate-700" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-slate-900">
                                {coupon.product.title}
                              </h3>
                              <p className="mt-1 text-sm text-slate-500">
                                {coupon.product.app}
                              </p>
                            </div>
                            {coupon.status === "ACTIVE" ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-slate-900" />
                            ) : (
                              <Sparkles className="h-5 w-5 shrink-0 text-slate-400" />
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>有效期至 {expiresAt}</span>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <code className="rounded-full bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-800">
                              {coupon.code}
                            </code>
                            {coupon.status === "ACTIVE" ? (
                              <Button
                                size="sm"
                                onClick={() => handleUseCoupon(coupon)}
                                className="rounded-full px-4"
                              >
                                立即使用
                              </Button>
                            ) : (
                              <Badge
                                variant="outline"
                                className="rounded-full border-slate-200 bg-white text-slate-600"
                              >
                                {statusLabel(coupon.status)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detailCoupon} onOpenChange={() => setDetailCoupon(null)}>
        <DialogContent className="max-w-sm rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-card)] p-0 text-[var(--app-heading)] shadow-[var(--app-card-shadow)]">
          <DialogHeader className="border-b border-slate-200 px-6 py-5">
            <DialogTitle>券码详情</DialogTitle>
          </DialogHeader>
          {detailCoupon && (
            <div className="px-6 py-5">
              <div className="text-center">
                <div className="text-base font-semibold text-slate-900">
                  {detailCoupon.product.title}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {detailCoupon.product.app}
                </div>
              </div>

              <div className="mt-5 flex justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <FakeQr value={detailCoupon.code} />
                </div>
              </div>

              <div className="mt-4 text-center">
                <code className="rounded-full bg-slate-100 px-4 py-2 font-mono text-sm text-slate-800">
                  {detailCoupon.code}
                </code>
              </div>

              <div className="mt-2 text-center text-xs text-slate-400">
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
