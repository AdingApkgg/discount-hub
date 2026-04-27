"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Coins, ShieldCheck, Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { useSiteContent, asString } from "@/hooks/use-site-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { appCardClassName, PageHeading } from "@/components/shared";
import {
  AnimatedItem,
  AnimatedSection,
  PageTransition,
} from "@/components/motion";

export default function AgentCenterPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();
  const agentContent = useSiteContent("agent");
  const notAgentTitle = asString(agentContent["agent.not_agent_title"], "您还不是代理商");
  const notAgentSubtitle = asString(
    agentContent["agent.not_agent_subtitle"],
    "成为代理商后可在此查看下级与佣金",
  );

  const isAgentLike =
    session?.user?.role === "AGENT" || session?.user?.role === "ADMIN";

  const { data: summary, isLoading: summaryLoading } = useQuery({
    ...trpc.agent.commissionSummary.queryOptions(),
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

  if (!session?.user) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        请先登录
      </div>
    );
  }

  if (!isAgentLike) {
    return (
      <PageTransition>
        <div className="space-y-4 px-4 py-6 md:px-8 md:py-10">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <Card className={appCardClassName}>
            <CardContent className="p-8 text-center space-y-3">
              <ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="text-sm font-semibold text-foreground">
                {notAgentTitle}
              </div>
              <div className="text-xs text-muted-foreground">
                {notAgentSubtitle}
              </div>
              <Button onClick={() => router.push("/apply-agent")} className="rounded-full">
                立即申请
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="gap-2 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
        </AnimatedItem>

        <AnimatedItem>
          <PageHeading
            label="Agent Center"
            title="代理商中心"
            action={<ShieldCheck className="h-5 w-5 text-primary" />}
          />
        </AnimatedItem>

        <AnimatedSection className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className={appCardClassName}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> 待结算佣金
              </div>
              {summaryLoading ? (
                <Skeleton className="mt-3 h-8 w-24" />
              ) : (
                <div className="mt-2 text-2xl font-black text-amber-500 tabular-nums">
                  ¥{(summary?.pendingAmount ?? 0).toFixed(2)}
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {summary?.pendingCount ?? 0} 笔待结算
              </div>
            </CardContent>
          </Card>
          <Card className={appCardClassName}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Coins className="h-3.5 w-3.5" /> 已结算佣金
              </div>
              {summaryLoading ? (
                <Skeleton className="mt-3 h-8 w-24" />
              ) : (
                <div className="mt-2 text-2xl font-black text-emerald-500 tabular-nums">
                  ¥{(summary?.paidAmount ?? 0).toFixed(2)}
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {summary?.paidCount ?? 0} 笔已结算
              </div>
            </CardContent>
          </Card>
          <Card className={appCardClassName}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> 我的下级
              </div>
              {summaryLoading ? (
                <Skeleton className="mt-3 h-8 w-24" />
              ) : (
                <div className="mt-2 text-2xl font-black text-foreground tabular-nums">
                  {summary?.downlineCount ?? 0}
                </div>
              )}
              <div className="mt-1 text-xs text-muted-foreground">人</div>
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">下级用户</div>
                <Badge variant="outline" className="rounded-full text-xs">
                  {downline?.length ?? 0} 人
                </Badge>
              </div>
              {downlineLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !downline || downline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                  暂无下级
                </div>
              ) : (
                <div className="space-y-2">
                  {downline.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {u.name ?? u.email}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {u.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="p-5">
              <div className="mb-3 text-sm font-semibold text-foreground">
                佣金明细
              </div>
              {commissionsLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !commissions || commissions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                  暂无佣金记录
                </div>
              ) : (
                <div className="space-y-2">
                  {commissions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          订单 {c.orderId.slice(-8)}
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                            L{c.level}
                          </span>
                          <span
                            className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                              c.status === "PAID"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : c.status === "PENDING"
                                  ? "bg-amber-500/10 text-amber-500"
                                  : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {c.status === "PAID"
                              ? "已结算"
                              : c.status === "PENDING"
                                ? "待结算"
                                : "已撤销"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {Math.round(c.rate * 100)}% ·{" "}
                          {new Date(c.createdAt).toLocaleString("zh-CN")}
                        </div>
                      </div>
                      <div className="text-base font-bold text-amber-600 tabular-nums">
                        ¥{Number(c.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
