"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, ChevronRight, Gift, Loader2, Sparkles, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type PointsStatus = RouterOutputs["points"]["getStatus"];
type ProductItem = RouterOutputs["product"]["list"][number];

const SESSION_KEY = "checkin_prompt_dismissed";

function wasShownToday(): boolean {
  if (typeof window === "undefined") return true;
  const val = sessionStorage.getItem(SESSION_KEY);
  if (!val) return false;
  return val === new Date().toISOString().slice(0, 10);
}

function markShownToday() {
  sessionStorage.setItem(SESSION_KEY, new Date().toISOString().slice(0, 10));
}

export default function CheckinPrompt() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"prompt" | "result">("prompt");
  const [reward, setReward] = useState(0);

  const { data: statusData } = useQuery({
    ...trpc.points.getStatus.queryOptions(),
    enabled: !!session?.user,
  });

  const { data: zeroProducts } = useQuery({
    ...trpc.product.list.queryOptions({ category: "zero" }),
    enabled: phase === "result",
  });

  const checkinMutation = useMutation(trpc.points.checkin.mutationOptions());

  const status = statusData as PointsStatus | undefined;
  const checkedIn = status?.checkedInToday ?? false;
  const points = status?.points ?? 0;
  const redeemable = ((zeroProducts ?? []) as ProductItem[]).filter(
    (p) => p.pointsPrice <= points + reward,
  );

  useEffect(() => {
    if (!session?.user || !status) return;
    if (checkedIn || wasShownToday()) return;
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [session, status, checkedIn]);

  const handleDismiss = useCallback(() => {
    markShownToday();
    setOpen(false);
  }, []);

  const handleCheckin = useCallback(async () => {
    try {
      const result = await checkinMutation.mutateAsync();
      setReward(result.reward);
      setPhase("result");
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "签到失败");
      handleDismiss();
    }
  }, [checkinMutation, queryClient, handleDismiss]);

  const handleGoRedeem = useCallback(() => {
    markShownToday();
    setOpen(false);
    router.push("/category/zero");
  }, [router]);

  const handleGoMember = useCallback(() => {
    markShownToday();
    setOpen(false);
    router.push("/member");
  }, [router]);

  if (!session?.user || checkedIn) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-sm rounded-[28px] border-border bg-background p-0">
        {phase === "prompt" ? (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CalendarCheck className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-4 text-xl font-bold text-foreground">别忘了签到！</div>
            <div className="mt-2 text-sm text-muted-foreground">
              连续签到 7 天可获 <span className="font-bold text-primary">10,000 积分</span>
            </div>
            <div className="mt-3 rounded-2xl bg-secondary/50 px-4 py-3">
              <div className="text-xs text-muted-foreground">当前积分</div>
              <div className="mt-1 text-2xl font-bold text-foreground">{points.toLocaleString("zh-CN")}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                连续签到第 {status?.nextDayIndex ?? 1} / {status?.checkinCycle ?? 7} 天
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full" onClick={handleDismiss}>
                稍后再说
              </Button>
              <Button
                className="flex-1 rounded-full"
                onClick={handleCheckin}
                disabled={checkinMutation.isPending}
              >
                {checkinMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarCheck className="h-4 w-4" />
                )}
                立即签到
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-secondary"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-4 text-xl font-bold text-foreground">签到成功！</div>
              <div className="mt-2 text-3xl font-bold text-primary">+{reward}</div>
              <div className="text-sm text-muted-foreground">积分已到账，当前共 {(points + reward).toLocaleString("zh-CN")} 积分</div>
            </div>

            {redeemable.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gift className="h-4 w-4 text-primary" />
                  可兑换商品
                </div>
                <div className="mt-3 space-y-2">
                  {redeemable.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="flex cursor-pointer items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3 transition-colors hover:bg-secondary"
                      onClick={() => { markShownToday(); setOpen(false); router.push(`/scroll/${p.id}`); }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{p.title}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {p.pointsPrice} 积分 {Number(p.cashPrice) > 0 ? `+ ¥${Number(p.cashPrice).toFixed(2)}` : ""}
                        </div>
                      </div>
                      <Badge className="shrink-0 rounded-full bg-primary/10 text-xs text-primary hover:bg-primary/10">
                        去兑换
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full" onClick={handleGoMember}>
                做任务
              </Button>
              <Button className="flex-1 rounded-full gap-1" onClick={handleGoRedeem}>
                <Gift className="h-4 w-4" />
                立即兑换
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
