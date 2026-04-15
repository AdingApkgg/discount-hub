"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Crown, Gift } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { inviteBenefits } from "@/data/mock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  appCardClassName,
  PageHeading,
  EmptyStateDashed,
} from "@/components/shared";
import {
  AnimatedSection,
  AnimatedItem,
  PageTransition,
  StaggerList,
  HoverScale,
} from "@/components/motion";

const VIP_REWARDS = [
  { level: 1, label: "VIP1", bonus: 300 },
  { level: 2, label: "VIP2", bonus: 200 },
  { level: 3, label: "VIP3", bonus: 200 },
  { level: 4, label: "VIP4", bonus: 100 },
  { level: 5, label: "VIP5", bonus: 100 },
];

const INVITE_REWARDS = [
  { label: "邀请成功", value: "¥10000 积分" },
  { label: "优惠券", value: "专属折扣券" },
  { label: "30 钻石", value: "虚拟货币奖励" },
];

export default function InvitePage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();

  const { data: profile } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  });

  const { data: referrals } = useQuery({
    ...trpc.user.referrals.queryOptions(),
    enabled: !!session?.user,
  });

  const inviteCode = (profile as { inviteCode?: string | null } | undefined)?.inviteCode ?? "暂未生成";
  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/login?inviteCode=${encodeURIComponent(inviteCode)}`;
  }, [inviteCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink || inviteCode);
      toast.success("邀请链接已复制");
    } catch { toast.error("复制失败"); }
  };

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
        </AnimatedItem>

        <AnimatedItem>
          <PageHeading label="Invite Friends" title="邀请好友" action={<Gift className="h-5 w-5 text-muted-foreground" />} />
          <p className="mt-2 text-sm text-muted-foreground">您将获得以下奖励</p>
        </AnimatedItem>

        <AnimatedSection>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {VIP_REWARDS.map((tier) => (
                <Card key={tier.level} className="w-[120px] shrink-0 gap-0 rounded-[22px] border-border py-0 text-center">
                  <CardContent className="p-4">
                    <Crown className="mx-auto h-5 w-5 text-primary" />
                    <div className="mt-2 text-sm font-bold text-foreground">{tier.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{tier.bonus}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </AnimatedSection>

        <AnimatedItem>
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              <div className="text-sm font-semibold text-foreground">邀请奖励</div>
              <div className="mt-4 space-y-3">
                {INVITE_REWARDS.map((r) => (
                  <div key={r.label} className="flex items-center justify-between rounded-2xl bg-secondary/50 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span className="text-primary">●</span> {r.label}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{r.value}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-5" />
              <div className="space-y-2 text-xs leading-5 text-muted-foreground">
                <p>1. 购买方式：在 X-Pass 平台操作充值</p>
                <p>2. 进入平台充值页面 — 绑定手机号进行充值操作</p>
                <p>3. 每人限购一张</p>
              </div>
            </CardContent>
          </Card>
        </AnimatedItem>

        <AnimatedItem>
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">邀请码</div>
                    <div className="mt-2 font-mono text-sm text-foreground">{inviteCode}</div>
                  </CardContent>
                </Card>
                <Card className="gap-0 rounded-[22px] border-border bg-secondary/50 py-0">
                  <CardContent className="p-4">
                    <div className="text-xs text-muted-foreground">邀请链接</div>
                    <div className="mt-2 break-all font-mono text-xs leading-5 text-foreground">
                      {inviteLink || "请先登录"}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {inviteBenefits.map((b) => (
                  <Badge key={b} variant="outline" className="rounded-full border-border bg-background text-muted-foreground">{b}</Badge>
                ))}
              </div>
              <Button onClick={handleCopy} className="mt-5 w-full rounded-full">
                <Copy className="h-4 w-4" />
                复制邀请码 & 分享链接
              </Button>
            </CardContent>
          </Card>
        </AnimatedItem>

        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              <div className="mb-4 text-sm font-semibold text-foreground">邀请记录</div>
              {!referrals || (referrals as unknown[]).length === 0 ? (
                <EmptyStateDashed text="还没有邀请记录" />
              ) : (
                <StaggerList className="space-y-3">
                  {(referrals as { id: string; name?: string | null; email: string; createdAt: string | Date }[]).map((r) => (
                    <AnimatedItem key={r.id}>
                      <HoverScale scale={1.01}>
                        <div className="flex items-center justify-between rounded-[22px] bg-secondary/50 px-4 py-3">
                          <div>
                            <div className="text-sm font-medium text-foreground">{r.name ?? r.email}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {new Date(r.createdAt).toLocaleDateString("zh-CN")}
                            </div>
                          </div>
                          <Badge variant="outline" className="rounded-full border-border text-muted-foreground">邀请成功</Badge>
                        </div>
                      </HoverScale>
                    </AnimatedItem>
                  ))}
                </StaggerList>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
