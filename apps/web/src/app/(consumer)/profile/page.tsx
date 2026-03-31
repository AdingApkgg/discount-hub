"use client";

import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Settings,
  Bell,
  HelpCircle,
  FileText,
  LogOut,
  User as UserIcon,
  Mail,
  Phone,
  Copy,
  Gift,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { signOut, useSession } from "@/lib/auth-client";
import { toast } from "sonner";
import { inviteBenefits, inviteRecords } from "@/data/mock";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const inviteCode = "JZ8K-2F9Q";
  const inviteLink = `https://jz.example/invite?code=${inviteCode}`;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("邀请链接已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    toast.success("已退出登录");
  };

  const menuSections = [
    {
      items: [
        { icon: Settings, label: "账户设置" },
        { icon: Bell, label: "消息通知" },
      ],
    },
    {
      items: [
        { icon: HelpCircle, label: "帮助中心" },
        { icon: FileText, label: "服务条款" },
      ],
    },
  ];

  const userName = session?.user?.name ?? "演示用户";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* Profile header */}
      <Card className="border-border overflow-hidden">
        <div className="p-6 bg-[radial-gradient(circle_at_20%_30%,rgba(255,45,85,0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(138,43,226,0.25),transparent_55%)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="h-14 w-14 border-2 border-border">
                <AvatarFallback className="bg-secondary text-foreground text-lg">
                  {userName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">
                  {userName}
                </h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-gradient font-semibold">VIP3</span>
                  <span>•</span>
                  <span>1,280 积分</span>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyInvite}
              className="hidden sm:inline-flex gap-2 border-border"
            >
              <Copy className="h-4 w-4" />
              复制邀请
            </Button>
          </div>
        </div>
      </Card>

      {/* Invite */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-foreground">邀请好友</div>
              <div className="mt-1 text-xs text-muted-foreground">
                复制邀请链接与邀请码，享受邀请权益
              </div>
            </div>
            <Gift className="h-5 w-5 text-[var(--accent)]" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Card className="border-border bg-secondary/50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">邀请码</div>
                <div className="mt-1 font-mono text-sm text-foreground">
                  {inviteCode}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-secondary/50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">邀请链接</div>
                <div className="mt-1 font-mono text-xs text-foreground break-all">
                  {inviteLink}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {inviteBenefits.map((b) => (
              <Badge key={b} variant="outline" className="border-border">
                {b}
              </Badge>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              邀请成功后奖励将记录在下方列表
            </div>
            <Button
              onClick={handleCopyInvite}
              className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              立即邀请（复制）
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invite records */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="text-lg font-semibold text-foreground">邀请记录</div>
          <div className="mt-1 text-xs text-muted-foreground mb-4">
            最近 {inviteRecords.length} 条
          </div>
          <div className="grid gap-2">
            {inviteRecords.map((r) => (
              <Card key={r.id} className="border-border bg-secondary/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {r.who}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {r.time}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge variant="outline" className="border-border">
                        {r.status}
                      </Badge>
                      <div className="mt-2 text-xs text-[var(--primary)] font-semibold">
                        {r.reward}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="text-lg font-semibold text-foreground mb-4">账户信息</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border bg-secondary/50">
              <CardContent className="p-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">邮箱</div>
                  <div className="mt-1 text-sm text-foreground truncate">
                    {session?.user?.email ?? "demo@jz.app"}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-secondary/50">
              <CardContent className="p-4 flex items-start gap-3">
                <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">手机号</div>
                  <div className="mt-1 text-sm text-foreground truncate">
                    未设置
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Menu */}
      <Card className="border-border overflow-hidden">
        {menuSections.map((section, si) => (
          <div key={si}>
            {si > 0 && <Separator />}
            {section.items.map((item, ii) => {
              const Icon = item.icon;
              return (
                <button
                  key={ii}
                  type="button"
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-left text-foreground text-sm">
                    {item.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        ))}
      </Card>

      <Button
        variant="outline"
        onClick={handleLogout}
        className="w-full border-red-400/30 text-red-300 hover:bg-red-500/10 gap-2"
      >
        <LogOut className="w-4 h-4" />
        退出登录
      </Button>

      <div className="text-center text-xs text-muted-foreground pt-2">
        版本 1.0.0
      </div>
    </div>
  );
}
