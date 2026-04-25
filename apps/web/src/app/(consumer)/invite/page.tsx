"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Crown, Download, Gift, Image, Link2, ShoppingCart } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const [shareMode, setShareMode] = useState<"link" | "image">("link");
  const shareCardRef = useRef<HTMLDivElement>(null);

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

  const { data: posterTemplates } = useQuery({
    ...trpc.share.listActivePosterTemplates.queryOptions({ kind: "invite" }),
    enabled: !!session?.user,
  });
  const activePoster = posterTemplates?.[0];

  const createShortLinkMutation = useMutation(
    trpc.share.createShortLink.mutationOptions(),
  );
  const recordInviteEvent = useMutation(
    trpc.share.recordInviteEvent.mutationOptions(),
  );
  const [shortUrl, setShortUrl] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const shortLinkRequested = useRef(false);

  useEffect(() => {
    if (!inviteLink || !inviteCode || inviteCode === "暂未生成") return;
    if (shortLinkRequested.current) return;
    shortLinkRequested.current = true;
    let cancelled = false;
    (async () => {
      try {
        const result = await createShortLinkMutation.mutateAsync({
          targetUrl: inviteLink,
          kind: "invite",
          expiresInDays: 90,
        });
        if (cancelled || typeof window === "undefined") return;
        setShortUrl(`${window.location.origin}/s/${result.code}`);
      } catch {
        // Fallback to plain invite link if short link generation fails.
        if (!cancelled) setShortUrl(inviteLink);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteLink, inviteCode, createShortLinkMutation]);

  useEffect(() => {
    const target = shortUrl || inviteLink;
    if (!target) return;
    let cancelled = false;
    (async () => {
      try {
        const QRCode = await import("qrcode");
        const dataUrl = await QRCode.toDataURL(target, {
          margin: 1,
          width: 200,
          color: { dark: "#1f2937", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("QR code generation failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shortUrl, inviteLink]);

  const handleCopyLink = useCallback(async () => {
    const target = shortUrl || inviteLink || inviteCode;
    try {
      await navigator.clipboard.writeText(target);
      toast.success(shortUrl ? "短链已复制" : "邀请链接已复制");
      recordInviteEvent.mutate({ eventType: "SHARE_LINK" });
    } catch { toast.error("复制失败"); }
  }, [shortUrl, inviteLink, inviteCode, recordInviteEvent]);

  const handleShareImage = useCallback(async () => {
    const el = shareCardRef.current;
    if (!el) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(el, { useCORS: true, scale: 2, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) { toast.error("生成图片失败"); return; }

      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "invite.png", { type: "image/png" })] })) {
        await navigator.share({
          title: activePoster?.headline ?? "邀请好友加入",
          text: `使用我的邀请码 ${inviteCode} 注册，双方均可获得丰厚积分奖励！`,
          files: [new File([blob], "invite.png", { type: "image/png" })],
        });
        toast.success("分享成功");
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invite-${inviteCode}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("图片已保存，请手动发送给好友");
      }
      recordInviteEvent.mutate({ eventType: "SHARE_IMAGE" });
    } catch {
      toast.error("生成分享图片失败，请尝试复制链接");
    }
  }, [inviteCode, activePoster, recordInviteEvent]);

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
          <p className="mt-2 text-sm text-muted-foreground">邀请好友注册并下单，双方均可获得丰厚奖励</p>
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
                <p>1. 分享邀请链接或图片给好友</p>
                <p>2. 好友通过您的邀请码注册并完成首单</p>
                <p>3. 双方各获得对应积分和优惠券奖励</p>
              </div>
            </CardContent>
          </Card>
        </AnimatedItem>

        <AnimatedItem>
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              {/* 分享模式切换 */}
              <div className="mb-4 flex gap-2">
                <Button
                  variant={shareMode === "link" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setShareMode("link")}
                >
                  <Link2 className="h-4 w-4" />
                  链接分享
                </Button>
                <Button
                  variant={shareMode === "image" ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setShareMode("image")}
                >
                  <Image className="h-4 w-4" />
                  图片分享
                </Button>
              </div>

              {shareMode === "link" ? (
                <>
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
                  <Button onClick={handleCopyLink} className="mt-5 w-full rounded-full">
                    <Copy className="h-4 w-4" />
                    复制邀请码 & 分享链接
                  </Button>
                </>
              ) : (
                <>
                  <div
                    ref={shareCardRef}
                    className={`overflow-hidden rounded-[22px] border border-border bg-gradient-to-br ${activePoster?.bgGradient ?? "from-primary/5 via-background to-accent/5"} p-6 text-center`}
                  >
                    <Gift
                      className="mx-auto h-10 w-10"
                      style={{ color: activePoster?.accentColor ?? undefined }}
                    />
                    <div className="mt-3 text-lg font-bold text-foreground">
                      {activePoster?.headline ?? "邀请好友，一起省"}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {activePoster?.subline ?? "使用邀请码注册，双方各得丰厚积分"}
                    </div>
                    {qrDataUrl ? (
                      <div className="mx-auto mt-4 inline-block rounded-2xl bg-white p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrDataUrl} alt="QR" className="h-32 w-32" />
                      </div>
                    ) : (
                      <div className="mx-auto mt-4 inline-block h-32 w-32 rounded-2xl bg-secondary/60" />
                    )}
                    <div className="mx-auto mt-4 rounded-2xl bg-secondary/80 px-6 py-3">
                      <div className="text-xs text-muted-foreground">邀请码</div>
                      <div
                        className="mt-1 text-xl font-bold tracking-wider"
                        style={{ color: activePoster?.accentColor ?? undefined }}
                      >
                        {inviteCode}
                      </div>
                    </div>
                    {activePoster?.ctaText && (
                      <div
                        className="mt-3 inline-block rounded-full px-5 py-2 text-sm font-bold text-white"
                        style={{ background: activePoster.accentColor }}
                      >
                        {activePoster.ctaText}
                      </div>
                    )}
                    <div className="mt-3 break-all text-xs text-muted-foreground">
                      {shortUrl || (typeof window !== "undefined" ? window.location.origin : "")}
                    </div>
                  </div>
                  <Button onClick={handleShareImage} className="mt-5 w-full rounded-full">
                    <Download className="h-4 w-4" />
                    保存分享图片
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </AnimatedItem>

        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">邀请记录</div>
                <Button variant="link" size="sm" onClick={() => router.push("/my-orders")} className="text-xs text-muted-foreground">
                  <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                  查看订单 →
                </Button>
              </div>
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
