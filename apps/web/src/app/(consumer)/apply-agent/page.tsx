"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, Loader2, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useSiteContent, asString, asArray } from "@/hooks/use-site-content";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { appCardClassName, PageHeading } from "@/components/shared";
import { PageTransition, AnimatedItem, AnimatedSection } from "@/components/motion";

const FALLBACK_STEPS = ["填写资料", "审批中", "审核通过", "完成"];

function stepIndex(status?: string | null): number {
  if (!status) return 0;
  if (status === "PENDING" || status === "REVIEWING") return 1;
  if (status === "APPROVED" || status === "DEPLOYED") return 2;
  if (status === "REJECTED") return -1;
  return 0;
}

export default function ApplyAgentPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const agentContent = useSiteContent("agent");
  const stepsFromContent = asArray<string>(agentContent["agent.application_steps"]);
  const STEPS = stepsFromContent.length > 0 ? stepsFromContent : FALLBACK_STEPS;
  const regionPlaceholder = asString(agentContent["agent.region_placeholder"], "如：中国, 北京, 朝阳");
  const platformsPlaceholder = asString(agentContent["agent.platforms_placeholder"], "如 YOUTUBE, TikTok, X, Instagram");
  const approvedMessage = asString(agentContent["agent.approved_message"], "恭喜成为官方代理商！");
  const [form, setForm] = useState({ realName: "", region: "", platforms: "" });

  const { data: application, isLoading } = useQuery({
    ...trpc.agent.myApplication.queryOptions(),
    retry: false,
  });

  const applyMutation = useMutation(trpc.agent.submitApplication.mutationOptions());

  const app = application as { status: string; realName: string; region: string; platforms: string[]; reviewNote?: string | null } | null;
  const currentStep = stepIndex(app?.status);

  async function handleSubmit() {
    if (!form.realName.trim() || !form.region.trim() || !form.platforms.trim()) {
      toast.error("请填写完整信息");
      return;
    }
    try {
      await applyMutation.mutateAsync({
        realName: form.realName.trim(),
        region: form.region.trim(),
        platforms: form.platforms.split(/[,，、\s]+/).filter(Boolean),
      });
      toast.success("申请已提交");
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "提交失败");
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <PageHeading label="Apply Agent" title="申请代理" />
        </AnimatedItem>

        {currentStep >= 0 && (
          <AnimatedItem>
            <Card className={appCardClassName}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex flex-1 flex-col items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        i <= currentStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}>
                        {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </div>
                <Progress value={((currentStep + 1) / STEPS.length) * 100} className="mt-4" />
              </CardContent>
            </Card>
          </AnimatedItem>
        )}

        {!app && (
          <AnimatedSection>
            <Card className={appCardClassName}>
              <CardContent className="space-y-5 p-5 md:p-6">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">姓名</Label>
                  <Input value={form.realName} onChange={(e) => setForm({ ...form, realName: e.target.value })} placeholder="请输入真实姓名" className="rounded-2xl bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">区域</Label>
                  <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder={regionPlaceholder} className="rounded-2xl bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">代理平台</Label>
                  <Input value={form.platforms} onChange={(e) => setForm({ ...form, platforms: e.target.value })} placeholder={platformsPlaceholder} className="rounded-2xl bg-secondary/50" />
                </div>
                <Button onClick={handleSubmit} disabled={applyMutation.isPending} className="w-full rounded-2xl py-6">
                  {applyMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />提交中</> : <><Send className="mr-2 h-4 w-4" />提交申请</>}
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {app && currentStep === 1 && (
          <AnimatedSection>
            <Card className={appCardClassName}>
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-amber-500" />
                  <div className="text-sm font-semibold text-foreground">审核中</div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <div className="flex justify-between"><span>姓名</span><span className="text-foreground">{app.realName}</span></div>
                  <div className="flex justify-between"><span>区域</span><span className="text-foreground">{app.region}</span></div>
                  <div className="flex justify-between"><span>平台</span><span className="text-foreground">{app.platforms.join(", ")}</span></div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {app && currentStep >= 2 && (
          <AnimatedSection>
            <Card className={appCardClassName}>
              <CardContent className="p-5 text-center md:p-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <Check className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="mt-4 text-lg font-semibold text-foreground">审核通过</div>
                <p className="mt-2 text-sm text-muted-foreground">{approvedMessage}</p>
                <Button onClick={() => router.push("/agent")} className="mt-6 rounded-full px-8">
                  进入代理商首页
                </Button>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {app && currentStep === -1 && (
          <AnimatedSection>
            <Card className={appCardClassName}>
              <CardContent className="p-5 md:p-6">
                <div className="text-sm font-semibold text-destructive">申请被拒绝</div>
                {app.reviewNote && <p className="mt-2 text-sm text-muted-foreground">原因：{app.reviewNote}</p>}
              </CardContent>
            </Card>
          </AnimatedSection>
        )}
      </div>
    </PageTransition>
  );
}
