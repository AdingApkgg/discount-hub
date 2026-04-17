"use client";

import { useState } from "react";
import { Ban, Loader2, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  userId: string | null;
  onClose: () => void;
};

export function UserDetailSheet({ userId, onClose }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [pointsDelta, setPointsDelta] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [vipLevel, setVipLevel] = useState<number | "">("");
  const [vipReason, setVipReason] = useState("");
  const [banReason, setBanReason] = useState("");

  const detailQuery = useQuery({
    ...trpc.admin.userDetail.queryOptions({ userId: userId ?? "" }),
    enabled: !!userId,
  });

  const adjustPointsMut = useMutation(
    trpc.admin.adjustUserPoints.mutationOptions(),
  );
  const setVipMut = useMutation(trpc.admin.setUserVip.mutationOptions());
  const banMut = useMutation(trpc.admin.setUserBanned.mutationOptions());

  async function handleAdjustPoints(sign: 1 | -1) {
    if (!userId) return;
    const amount = Number(pointsDelta);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("请输入正整数积分");
      return;
    }
    if (!pointsReason.trim()) {
      toast.error("请填写调整原因");
      return;
    }
    try {
      await adjustPointsMut.mutateAsync({
        userId,
        delta: sign * Math.floor(amount),
        reason: pointsReason.trim(),
      });
      toast.success("积分已更新");
      setPointsDelta("");
      setPointsReason("");
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "调整失败");
    }
  }

  async function handleSetVip() {
    if (!userId) return;
    const lv = typeof vipLevel === "number" ? vipLevel : parseInt(String(vipLevel), 10);
    if (!Number.isInteger(lv) || lv < 0 || lv > 10) {
      toast.error("VIP 级别应在 0-10 之间");
      return;
    }
    if (!vipReason.trim()) {
      toast.error("请填写调整原因");
      return;
    }
    try {
      await setVipMut.mutateAsync({
        userId,
        vipLevel: lv,
        reason: vipReason.trim(),
      });
      toast.success("VIP 已更新");
      setVipReason("");
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "更新失败");
    }
  }

  async function handleToggleBan(next: boolean) {
    if (!userId) return;
    if (next && !banReason.trim()) {
      toast.error("请填写封禁原因");
      return;
    }
    try {
      await banMut.mutateAsync({
        userId,
        banned: next,
        reason: next ? banReason.trim() : undefined,
      });
      toast.success(next ? "已封禁" : "已解除封禁");
      setBanReason("");
      await qc.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  const detail = detailQuery.data;

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle>用户详情</SheetTitle>
        </SheetHeader>

        {!detail ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground">
                  {detail.user.name ?? detail.user.email}
                </span>
                <Badge variant="outline" className="text-[11px]">
                  {detail.user.role}
                </Badge>
                {detail.user.isBanned ? (
                  <Badge className="bg-red-500/10 text-red-300 border-red-400/30">
                    已封禁
                  </Badge>
                ) : null}
              </div>
              <div className="text-xs text-muted-foreground">
                {detail.user.email} · 注册于{" "}
                {new Date(detail.user.createdAt).toLocaleString("zh-CN")}
              </div>
              {detail.user.phone ? (
                <div className="text-xs text-muted-foreground">
                  电话：{detail.user.phone}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">积分</div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  {detail.user.points.toLocaleString("zh-CN")}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">VIP</div>
                <div className="mt-1 text-xl font-semibold text-foreground">
                  Lv.{detail.user.vipLevel}
                </div>
                {detail.user.vipExpiresAt ? (
                  <div className="text-[11px] text-muted-foreground">
                    到期 {new Date(detail.user.vipExpiresAt).toLocaleDateString("zh-CN")}
                  </div>
                ) : null}
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">订单 / 券码</div>
                <div className="mt-1 text-sm text-foreground">
                  {detail.user._count.orders} · {detail.user._count.coupons}
                </div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">邀请 / 帖子 / 评论</div>
                <div className="mt-1 text-sm text-foreground">
                  {detail.user._count.referrals} · {detail.user._count.posts} ·{" "}
                  {detail.user._count.comments}
                </div>
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="actions">
              <TabsList>
                <TabsTrigger value="actions">操作</TabsTrigger>
                <TabsTrigger value="orders">近期订单</TabsTrigger>
                <TabsTrigger value="audits">操作审计</TabsTrigger>
              </TabsList>

              <TabsContent value="actions" className="space-y-5 pt-4">
                {/* 积分调整 */}
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="text-sm font-medium text-foreground">积分调整</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="数量"
                      value={pointsDelta}
                      onChange={(e) => setPointsDelta(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => handleAdjustPoints(1)}
                        disabled={adjustPointsMut.isPending}
                      >
                        <TrendingUp className="h-4 w-4" /> 加
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1"
                        onClick={() => handleAdjustPoints(-1)}
                        disabled={adjustPointsMut.isPending}
                      >
                        <TrendingDown className="h-4 w-4" /> 扣
                      </Button>
                    </div>
                  </div>
                  <Input
                    placeholder="调整原因（必填，会写入审计）"
                    value={pointsReason}
                    onChange={(e) => setPointsReason(e.target.value)}
                  />
                </div>

                {/* VIP 调整 */}
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="text-sm font-medium text-foreground">VIP 调整</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">级别 (0-10)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={vipLevel}
                        onChange={(e) =>
                          setVipLevel(
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="col-span-2 flex items-end">
                      <Button
                        className="w-full gap-1"
                        onClick={handleSetVip}
                        disabled={setVipMut.isPending}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        设置
                      </Button>
                    </div>
                  </div>
                  <Input
                    placeholder="调整原因（必填，会写入审计）"
                    value={vipReason}
                    onChange={(e) => setVipReason(e.target.value)}
                  />
                </div>

                {/* 封禁 */}
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="text-sm font-medium text-foreground">
                    账号封禁
                  </div>
                  {detail.user.isBanned ? (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">
                        封禁原因：{detail.user.banReason ?? "—"}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleToggleBan(false)}
                        disabled={banMut.isPending}
                      >
                        {banMut.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        解除封禁
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="封禁原因（必填）"
                      />
                      <Button
                        variant="destructive"
                        className="w-full gap-1"
                        onClick={() => handleToggleBan(true)}
                        disabled={banMut.isPending}
                      >
                        <Ban className="h-4 w-4" />
                        封禁该账号
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="orders" className="pt-4">
                {detail.recentOrders.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    无订单
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {detail.recentOrders.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center justify-between rounded-md border border-border p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="text-foreground">{o.product.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleString("zh-CN")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-foreground">
                            ¥{Number(o.cashPaid).toFixed(2)}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {o.status}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="audits" className="pt-4">
                {detail.recentAudits.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    无审计记录
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {detail.recentAudits.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-md border border-border p-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {a.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.createdAt).toLocaleString("zh-CN")}
                          </span>
                        </div>
                        <div className="mt-1 text-foreground">{a.summary}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          by {a.actor.name ?? a.actor.email}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
