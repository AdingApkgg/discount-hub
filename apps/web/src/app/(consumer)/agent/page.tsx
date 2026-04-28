"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  GraduationCap,
  Image as ImageIcon,
  Megaphone,
  Package,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { useSiteContent, asString, asNumber, asArray } from "@/hooks/use-site-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { appCardClassName, PageHeading } from "@/components/shared";
import {
  AnimatedItem,
  AnimatedSection,
  PageTransition,
} from "@/components/motion";

type WithdrawalMethod = "ALIPAY" | "WECHAT" | "BANK";
type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  PENDING: "审核中",
  APPROVED: "已批准",
  REJECTED: "已驳回",
  PAID: "已到账",
};

const STATUS_TONE: Record<WithdrawalStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  REJECTED: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  PAID: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

const METHOD_LABEL: Record<WithdrawalMethod, string> = {
  ALIPAY: "支付宝",
  WECHAT: "微信",
  BANK: "银行卡",
};

function formatCurrency(value: number) {
  return value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function MiniTrend({ data, height = 60 }: { data: { date: string; amount: number }[]; height?: number }) {
  const max = Math.max(0.01, ...data.map((d) => d.amount));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => {
        const pct = (d.amount / max) * 100;
        return (
          <div
            key={d.date}
            className="flex-1 rounded-t-sm bg-primary/20 transition-all"
            style={{
              height: `${Math.max(2, pct)}%`,
              opacity: 0.4 + (i / data.length) * 0.6,
              backgroundColor: d.amount > 0 ? "var(--brand-red, #FE2C55)" : undefined,
            }}
            title={`${d.date}: ¥${formatCurrency(d.amount)}`}
          />
        );
      })}
    </div>
  );
}

export default function AgentCenterPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const content = useSiteContent("agent");

  const isAgentLike =
    session?.user?.role === "AGENT" || session?.user?.role === "ADMIN";

  const centerTitle = asString(content["agent.center_title"], "代理商中心");
  const welcomeTagline = asString(
    content["agent.welcome_tagline"],
    "邀请下单 · 持续返佣 · 团队躺赚",
  );
  const notAgentTitle = asString(content["agent.not_agent_title"], "您还不是代理商");
  const notAgentSubtitle = asString(
    content["agent.not_agent_subtitle"],
    "成为代理商后可在此查看下级与佣金",
  );
  const minWithdrawal = asNumber(content["agent.withdrawal_min_amount"], 10);
  const withdrawalFeeRate = asNumber(content["agent.withdrawal_fee_rate"], 0);
  const withdrawalRules = asArray<string>(content["agent.withdrawal_rules"]);
  const trainingLinks = asArray<{ title: string; url: string }>(
    content["agent.training_links"],
  );

  const { data: withdrawalSummary } = useQuery({
    ...trpc.agent.withdrawalSummary.queryOptions(),
    enabled: isAgentLike,
  });
  const { data: trend } = useQuery({
    ...trpc.agent.commissionTrend.queryOptions({ days: 30 }),
    enabled: isAgentLike,
  });
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    ...trpc.agent.myCommissions.queryOptions({ limit: 30 }),
    enabled: isAgentLike,
  });
  const { data: downline, isLoading: downlineLoading } = useQuery({
    ...trpc.agent.myDownline.queryOptions(),
    enabled: isAgentLike,
  });
  const { data: products } = useQuery({
    ...trpc.agent.products.queryOptions(),
    enabled: isAgentLike,
  });
  const { data: withdrawals } = useQuery({
    ...trpc.agent.myWithdrawals.queryOptions({ limit: 30 }),
    enabled: isAgentLike,
  });
  const { data: profile } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  });
  const { data: posters } = useQuery({
    ...trpc.share.listActivePosterTemplates.queryOptions({ kind: "invite" }),
    enabled: isAgentLike,
  });

  const inviteCode = (profile as { inviteCode?: string | null } | undefined)?.inviteCode ?? "";
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const inviteLink = useMemo(
    () => (origin && inviteCode ? `${origin}/login?inviteCode=${encodeURIComponent(inviteCode)}` : ""),
    [origin, inviteCode],
  );

  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [tabFilter, setTabFilter] = useState<"all" | "PENDING" | "PAID">("all");

  const requestWithdrawalMutation = useMutation(
    trpc.agent.requestWithdrawal.mutationOptions(),
  );
  const cancelWithdrawalMutation = useMutation(
    trpc.agent.cancelWithdrawal.mutationOptions(),
  );

  const filteredCommissions = useMemo(() => {
    if (!commissions) return [];
    if (tabFilter === "all") return commissions;
    return commissions.filter((c) => c.status === tabFilter);
  }, [commissions, tabFilter]);

  const handleCopyInvite = useCallback(async () => {
    if (!inviteLink) {
      toast.error("邀请码尚未生成");
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("邀请链接已复制");
    } catch {
      toast.error("复制失败");
    }
  }, [inviteLink]);

  const handleCancelWithdrawal = useCallback(
    async (id: string) => {
      try {
        await cancelWithdrawalMutation.mutateAsync({ id });
        await queryClient.invalidateQueries();
        toast.success("已撤回");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "撤回失败");
      }
    },
    [cancelWithdrawalMutation, queryClient],
  );

  if (!session?.user) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">请先登录</div>
    );
  }

  if (!isAgentLike) {
    return (
      <PageTransition>
        <div className="space-y-4 px-4 py-6 md:px-8 md:py-10">
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <Card className={appCardClassName}>
            <CardContent className="space-y-3 p-8 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="text-sm font-semibold text-foreground">{notAgentTitle}</div>
              <div className="text-xs text-muted-foreground">{notAgentSubtitle}</div>
              <Button onClick={() => router.push("/apply-agent")} className="rounded-full">
                立即申请
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const available = withdrawalSummary?.available ?? 0;
  const totalEarned = withdrawalSummary?.totalEarned ?? 0;
  const totalWithdrawn = withdrawalSummary?.totalWithdrawn ?? 0;

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:px-8 md:py-6">
        <AnimatedItem>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
        </AnimatedItem>

        <AnimatedItem>
          <PageHeading
            label="Agent Center"
            title={centerTitle}
            action={<ShieldCheck className="h-5 w-5 text-primary" />}
          />
          <p className="mt-2 text-sm text-muted-foreground">{welcomeTagline}</p>
        </AnimatedItem>

        {/* ============ 收益概览 ============ */}
        <AnimatedItem>
          <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#FE2C55_0%,#FF6E37_55%,#F5B800_120%)] text-white shadow-[0_10px_24px_rgba(254,44,85,0.22)]">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium opacity-80">可提现余额（元）</div>
                  <div className="mt-1 text-3xl font-black tabular-nums drop-shadow-sm">
                    ¥{formatCurrency(available)}
                  </div>
                  <div className="mt-1 text-[11px] opacity-80">
                    待结算 ¥{formatCurrency(withdrawalSummary?.pendingClearance ?? 0)} · 累计入账 ¥
                    {formatCurrency(totalEarned)}
                  </div>
                </div>
                <Button
                  onClick={() => setWithdrawalOpen(true)}
                  disabled={available < minWithdrawal}
                  className="shrink-0 rounded-full bg-white px-5 font-bold text-[var(--brand-red,#FE2C55)] hover:bg-white/90"
                >
                  <Wallet className="h-4 w-4" />
                  申请提现
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-white/20 pt-3 text-center">
                <div>
                  <div className="text-[10px] opacity-75">本月入账</div>
                  <div className="mt-0.5 text-base font-black tabular-nums">
                    ¥{formatCurrency(
                      (trend ?? []).slice(-30).reduce((sum, d) => sum + d.amount, 0),
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] opacity-75">已结算</div>
                  <div className="mt-0.5 text-base font-black tabular-nums">
                    ¥{formatCurrency(withdrawalSummary?.cleared ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] opacity-75">累计提现</div>
                  <div className="mt-0.5 text-base font-black tabular-nums">
                    ¥{formatCurrency(totalWithdrawn)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedItem>

        {/* ============ 收益趋势 ============ */}
        <AnimatedItem>
          <Card className={appCardClassName}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">近 30 天收益</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  ¥{formatCurrency((trend ?? []).reduce((s, d) => s + d.amount, 0))}
                </span>
              </div>
              {trend ? <MiniTrend data={trend} /> : <Skeleton className="h-[60px] w-full" />}
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span>{trend?.[0]?.date}</span>
                <span>{trend?.[trend.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>
        </AnimatedItem>

        {/* ============ 推广素材 ============ */}
        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">推广素材</span>
              </div>

              {/* 邀请短链快速复制 */}
              <div className="rounded-2xl bg-secondary/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-muted-foreground">我的邀请链接</div>
                    <div className="mt-1 truncate font-mono text-xs text-foreground">
                      {inviteLink || "邀请码生成中…"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleCopyInvite}
                    className="shrink-0 rounded-full"
                    disabled={!inviteLink}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    复制
                  </Button>
                </div>
              </div>

              {/* 海报模板 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">海报模板</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/invite")}
                    className="h-auto gap-1 p-0 text-xs text-primary"
                  >
                    生成分享图 <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                {!posters || posters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-center text-xs text-muted-foreground">
                    暂无海报模板
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {posters.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push("/invite")}
                        className={cn(
                          "relative aspect-[3/4] overflow-hidden rounded-xl bg-gradient-to-br p-3 text-left transition-transform active:scale-[0.97]",
                          p.bgGradient ?? "from-primary/10 via-background to-accent/10",
                        )}
                      >
                        <ImageIcon className="h-5 w-5" style={{ color: p.accentColor ?? undefined }} />
                        <div className="mt-2 line-clamp-2 text-xs font-bold text-foreground">
                          {p.headline}
                        </div>
                        {p.subline ? (
                          <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                            {p.subline}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* ============ 分销商品 ============ */}
        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">分销商品</span>
                </div>
                <Badge variant="outline" className="rounded-full text-xs">
                  {products?.length ?? 0} 件
                </Badge>
              </div>
              {!products || products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                  暂无可分销商品
                </div>
              ) : (
                <div className="space-y-2">
                  {products.slice(0, 6).map((p) => {
                    const cash = Number(p.cashPrice);
                    const agentP = p.agentPrice != null ? Number(p.agentPrice) : null;
                    const margin = agentP != null ? cash - agentP : 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => router.push(`/scroll/${p.id}`)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-secondary/40 p-3 text-left transition-all active:scale-[0.99]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-bold text-foreground">
                            {p.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>售价 ¥{formatCurrency(cash)}</span>
                            {agentP != null ? (
                              <>
                                <span>·</span>
                                <span>代理价 ¥{formatCurrency(agentP)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        {margin > 0 ? (
                          <div className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-black text-emerald-600">
                            +¥{formatCurrency(margin)}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* ============ 团队管理 ============ */}
        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">我的团队</span>
                </div>
                <Badge variant="outline" className="rounded-full text-xs">
                  {downline?.length ?? 0} 人
                </Badge>
              </div>
              {downlineLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !downline || downline.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                  还没有下级 · 去推广邀请吧
                </div>
              ) : (
                <div className="space-y-2">
                  {downline.slice(0, 8).map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-foreground">
                            {u.name ?? u.email}
                          </span>
                          {u.role === "AGENT" ? (
                            <Badge variant="outline" className="h-5 rounded-full px-1.5 text-[10px]">
                              代理
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                          {u.contributedCount > 0
                            ? ` · ${u.contributedCount} 单`
                            : ""}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-black tabular-nums text-foreground">
                          ¥{formatCurrency(u.contributedAmount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">贡献佣金</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* ============ 佣金明细 ============ */}
        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">佣金明细</span>
                </div>
              </div>
              <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as typeof tabFilter)}>
                <TabsList className="bg-secondary/50">
                  <TabsTrigger value="all" className="text-xs">全部</TabsTrigger>
                  <TabsTrigger value="PENDING" className="text-xs">待结算</TabsTrigger>
                  <TabsTrigger value="PAID" className="text-xs">已结算</TabsTrigger>
                </TabsList>
              </Tabs>
              {commissionsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : filteredCommissions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                  暂无佣金记录
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCommissions.slice(0, 10).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleString("zh-CN")} · 第 {c.level} 级
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                          订单 {c.orderId.slice(0, 8)}…
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-black tabular-nums text-foreground">
                          ¥{formatCurrency(Number(c.amount))}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full text-[10px]",
                            c.status === "PAID"
                              ? "border-emerald-500/30 text-emerald-600"
                              : c.status === "PENDING"
                                ? "border-amber-500/30 text-amber-600"
                                : "border-rose-500/30 text-rose-600",
                          )}
                        >
                          {c.status === "PAID"
                            ? "已结算"
                            : c.status === "PENDING"
                              ? "待结算"
                              : "已撤销"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* ============ 提现记录 ============ */}
        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">提现记录</span>
                </div>
              </div>
              {!withdrawals || withdrawals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                  暂无提现记录
                </div>
              ) : (
                <div className="space-y-2">
                  {withdrawals.slice(0, 10).map((w) => {
                    const account = (w.accountInfo as Record<string, unknown> | null) ?? {};
                    return (
                      <div
                        key={w.id}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">
                              {METHOD_LABEL[w.method as WithdrawalMethod]}
                            </span>
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold",
                              STATUS_TONE[w.status as WithdrawalStatus],
                            )}>
                              {STATUS_LABEL[w.status as WithdrawalStatus]}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {String(account.account ?? "")} · {new Date(w.createdAt).toLocaleString("zh-CN")}
                          </div>
                          {w.reviewNote ? (
                            <div className="mt-0.5 text-[11px] text-rose-600">
                              备注：{w.reviewNote}
                            </div>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-black tabular-nums text-foreground">
                            ¥{formatCurrency(Number(w.amount))}
                          </div>
                          {w.status === "PENDING" ? (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-[11px] text-rose-600"
                              onClick={() => handleCancelWithdrawal(w.id)}
                            >
                              撤回
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* ============ 培训资料 ============ */}
        {trainingLinks.length > 0 ? (
          <AnimatedSection>
            <Card className={appCardClassName}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">新手培训</span>
                </div>
                <div className="space-y-2">
                  {trainingLinks.map((link, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => router.push(link.url)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-3 py-2.5 text-left transition-all active:scale-[0.99]"
                    >
                      <span className="text-sm font-medium text-foreground">{link.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        ) : null}
      </div>

      <WithdrawalDialog
        open={withdrawalOpen}
        onOpenChange={setWithdrawalOpen}
        available={available}
        minAmount={minWithdrawal}
        feeRate={withdrawalFeeRate}
        rules={withdrawalRules}
        onSubmit={async (input) => {
          try {
            await requestWithdrawalMutation.mutateAsync(input);
            await queryClient.invalidateQueries();
            toast.success("提现申请已提交，等待审核");
            setWithdrawalOpen(false);
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "提交失败");
          }
        }}
        submitting={requestWithdrawalMutation.isPending}
      />
    </PageTransition>
  );
}

function WithdrawalDialog({
  open,
  onOpenChange,
  available,
  minAmount,
  feeRate,
  rules,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  available: number;
  minAmount: number;
  feeRate: number;
  rules: string[];
  onSubmit: (input: {
    amount: number;
    method: WithdrawalMethod;
    account: string;
    realName: string;
    bankName?: string;
    branch?: string;
  }) => Promise<void>;
  submitting: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WithdrawalMethod>("ALIPAY");
  const [account, setAccount] = useState("");
  const [realName, setRealName] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");

  useEffect(() => {
    if (!open) {
      setAmount("");
      setAccount("");
      setRealName("");
      setBankName("");
      setBranch("");
    }
  }, [open]);

  const numericAmount = Number(amount);
  const validAmount =
    Number.isFinite(numericAmount) && numericAmount >= minAmount && numericAmount <= available;
  const arrivalAmount = validAmount ? numericAmount * (1 - feeRate) : 0;

  function handleSubmit() {
    if (!validAmount) {
      toast.error(`请输入 ¥${minAmount} ~ ¥${available.toFixed(2)} 之间的金额`);
      return;
    }
    if (!account.trim() || !realName.trim()) {
      toast.error("请填写收款账号和真实姓名");
      return;
    }
    onSubmit({
      amount: numericAmount,
      method,
      account: account.trim(),
      realName: realName.trim(),
      bankName: method === "BANK" ? bankName.trim() : undefined,
      branch: method === "BANK" ? branch.trim() : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>申请提现</DialogTitle>
          <DialogDescription>
            可提现 ¥{available.toFixed(2)} · 单笔最低 ¥{minAmount}
            {feeRate > 0 ? ` · 手续费 ${(feeRate * 100).toFixed(2)}%` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">提现金额</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${minAmount}`}
              min={minAmount}
              max={available}
            />
            {feeRate > 0 && validAmount ? (
              <div className="text-[11px] text-muted-foreground">
                预计到账 ¥{arrivalAmount.toFixed(2)}
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">提现方式</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["ALIPAY", "WECHAT", "BANK"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-xs transition-all",
                    method === m
                      ? "border-primary bg-primary/10 font-bold text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary/50",
                  )}
                >
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">{method === "BANK" ? "卡号" : "账号"}</Label>
            <Input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder={
                method === "ALIPAY"
                  ? "支付宝账号 / 手机号"
                  : method === "WECHAT"
                    ? "微信号 / 手机号"
                    : "银行卡号"
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">真实姓名</Label>
            <Input
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="收款人姓名"
            />
          </div>

          {method === "BANK" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">开户行</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="例如：招商银行"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">支行（可选）</Label>
                <Input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="例如：北京朝阳支行"
                />
              </div>
            </>
          ) : null}

          {rules.length > 0 ? (
            <div className="rounded-xl bg-secondary/40 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <Clock className="h-3 w-3" /> 提现规则
              </div>
              <ul className="space-y-0.5 text-[11px] leading-5 text-muted-foreground">
                {rules.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!validAmount || submitting}>
            {submitting ? "提交中…" : "确认提现"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
