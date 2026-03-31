"use client";

import { useState } from "react";
import {
  Crown,
  Check,
  Loader2,
  CalendarCheck,
  Eye,
  ShoppingCart,
  Share2,
  Play,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { earnContents } from "@/data/mock";
import { openApp } from "@discount-hub/shared";

const CHECKIN_REWARDS = [200, 3000, 300, 500];
const VIP_TIERS = [
  { level: 0, name: "普通会员", minPoints: 0, benefits: ["基础兑换"] },
  { level: 1, name: "VIP1", minPoints: 200, benefits: ["基础兑换", "每日签到 +200"] },
  { level: 2, name: "VIP2", minPoints: 500, benefits: ["全部 VIP1", "限时折扣"] },
  { level: 3, name: "VIP3", minPoints: 1200, benefits: ["全部 VIP2", "优先购资格", "专属折扣"] },
  { level: 4, name: "VIP4", minPoints: 2000, benefits: ["全部 VIP3", "抢先看", "双倍积分日"] },
];

const DAILY_TASKS = [
  { id: "checkin", title: "每日签到", desc: "每日首次签到", reward: 200, icon: CalendarCheck },
  { id: "browse", title: "浏览抖音 50 秒", desc: "去 APP 浏览 50s", reward: 100, icon: Eye },
  { id: "purchase", title: "完成一次兑换", desc: "购买任意商品", reward: 100, icon: ShoppingCart },
  { id: "share", title: "分享权益到好友", desc: "复制链接分享", reward: 80, icon: Share2 },
];

export default function MemberPage() {
  const [points, setPoints] = useState(1280);
  const [vipLevel, setVipLevel] = useState(3);
  const [checkedIn, setCheckedIn] = useState(false);
  const [dayIndex, setDayIndex] = useState(2);
  const [doneTasks, setDoneTasks] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const currentTier = VIP_TIERS[vipLevel] ?? VIP_TIERS[0];
  const nextTier = VIP_TIERS[Math.min(vipLevel + 1, VIP_TIERS.length - 1)];
  const progressPct =
    nextTier.level === currentTier.level
      ? 100
      : Math.min(100, ((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100);

  const handleCheckin = async () => {
    if (checkedIn || checking) return;
    setChecking(true);
    await new Promise((r) => setTimeout(r, 500));
    const reward = CHECKIN_REWARDS[Math.min(dayIndex, CHECKIN_REWARDS.length - 1)];
    setPoints((p) => p + reward);
    setDayIndex((d) => Math.min(d + 1, CHECKIN_REWARDS.length));
    setCheckedIn(true);
    setChecking(false);
    toast.success(`签到成功！+${reward} 积分`, {
      description: `连续签到第 ${dayIndex + 1} 天`,
    });
  };

  const handleTask = async (taskId: string, reward: number) => {
    if (doneTasks.includes(taskId)) return;
    if (taskId === "checkin") return handleCheckin();
    setDoneTasks((d) => [...d, taskId]);
    setPoints((p) => p + reward);
    toast.success(`任务完成！+${reward} 积分`);
  };

  const handleEarn = async (id: string, app: string, rewardPoints: number) => {
    if (doneTasks.includes(id)) return;
    openApp(app);
    setDoneTasks((d) => [...d, id]);
    setPoints((p) => p + rewardPoints);
    toast.success(`观看奖励！+${rewardPoints} 积分`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <Card className="border-border overflow-hidden">
        <div className="p-6 bg-[radial-gradient(circle_at_20%_30%,rgba(255,45,85,0.25),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(138,43,226,0.25),transparent_55%)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground">会员中心</h1>
              <div className="mt-1 text-xs text-muted-foreground">
                任务赚积分 · 兑换更划算
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-border">
                  <Crown className="h-4 w-4 text-[var(--accent)]" />
                  VIP 等级
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-md">
                <DialogHeader>
                  <DialogTitle>VIP 等级体系</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  {VIP_TIERS.map((tier) => (
                    <Card
                      key={tier.level}
                      className={`border-border ${
                        tier.level === vipLevel ? "ring-2 ring-primary/50" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground">
                            {tier.name}
                          </span>
                          {tier.level === vipLevel && (
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              当前
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mb-2">
                          需要 {tier.minPoints} 积分
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tier.benefits.map((b) => (
                            <Badge
                              key={b}
                              variant="outline"
                              className="text-[11px] border-border"
                            >
                              {b}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="mt-5 border-border bg-white/5 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">会员等级</div>
                  <div className="text-2xl font-semibold text-gradient">
                    {currentTier.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1">积分</div>
                  <div className="text-2xl font-semibold text-foreground">
                    {points.toLocaleString()}
                  </div>
                </div>
              </div>

              <Progress value={progressPct} className="h-2" />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <div>签到/任务可加速升级</div>
                <div>
                  再获得 {Math.max(0, nextTier.minPoints - points)} 积分升级至{" "}
                  {nextTier.name}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Card>

      {/* 签到 */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold text-foreground">连续签到</div>
              <div className="mt-1 text-xs text-muted-foreground">
                连续签到奖励递增，第 2 天 3000 积分
              </div>
            </div>
            <Button
              onClick={handleCheckin}
              disabled={checkedIn || checking}
              className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
              style={{ boxShadow: checkedIn ? undefined : "var(--shadow-glow)" }}
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : checkedIn ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <CalendarCheck className="h-4 w-4 mr-2" />
              )}
              {checkedIn ? "已签到" : "立即签到"}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {CHECKIN_REWARDS.map((reward, i) => (
              <Card
                key={i}
                className={`border-border text-center ${
                  i < dayIndex
                    ? "bg-primary/10 border-primary/30"
                    : i === dayIndex && checkedIn
                      ? "bg-primary/10 border-primary/30"
                      : ""
                }`}
              >
                <CardContent className="p-3">
                  <div className="text-xs text-muted-foreground">第 {i + 1} 天</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    +{reward}
                  </div>
                  {i < dayIndex || (i === dayIndex && checkedIn) ? (
                    <Check className="h-4 w-4 mx-auto mt-1 text-emerald-400" />
                  ) : (
                    <Sparkles className="h-4 w-4 mx-auto mt-1 text-muted-foreground" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 日常任务 */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="text-lg font-semibold text-foreground">日常积分任务</div>
          <div className="mt-1 text-xs text-muted-foreground mb-4">
            完成任务赚取积分
          </div>
          <div className="grid gap-3">
            {DAILY_TASKS.map((t) => {
              const done =
                doneTasks.includes(t.id) || (t.id === "checkin" && checkedIn);
              const Icon = t.icon;
              return (
                <Card key={t.id} className="border-border">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {t.title}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          +{t.reward} 积分
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "default"}
                      disabled={done}
                      onClick={() => handleTask(t.id, t.reward)}
                      className={
                        done
                          ? ""
                          : "bg-[var(--gradient-primary)] hover:brightness-110 text-white"
                      }
                    >
                      {done ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          已完成
                        </>
                      ) : (
                        "去完成"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 看内容赚积分 */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="text-lg font-semibold text-foreground">看内容赚积分</div>
          <div className="mt-1 text-xs text-muted-foreground mb-4">
            观看推荐内容获取积分奖励
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {earnContents.map((c) => {
              const done = doneTasks.includes(c.id);
              return (
                <Card
                  key={c.id}
                  className="border-border overflow-hidden cursor-pointer hover:bg-secondary/50 transition"
                  onClick={() => handleEarn(c.id, c.app, c.rewardPoints)}
                >
                  <div
                    className={`h-20 bg-gradient-to-r ${c.gradient} flex items-center justify-center`}
                  >
                    <Play className="h-8 w-8 text-white/60" />
                  </div>
                  <CardContent className="p-4">
                    <div className="text-sm font-semibold text-foreground line-clamp-2">
                      {c.title}
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="outline" className="text-[11px] border-border">
                        {c.subtitle}
                      </Badge>
                      <Badge
                        className={
                          done
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                            : "bg-primary/20 text-primary border-primary/30"
                        }
                      >
                        {done ? "已领" : `+${c.rewardPoints}`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
