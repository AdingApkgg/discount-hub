"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Headphones,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Send,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { appCardClassName, PageHeading, SectionHeading } from "@/components/shared";
import {
  PageTransition,
  AnimatedItem,
  AnimatedSection,
  StaggerList,
} from "@/components/motion";

type Message = {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  timestamp: Date;
};

const FAQ_ITEMS = [
  { q: "积分怎么获取？", a: "您可以通过每日签到（连续7天最高获10,000积分）、完成日常任务（浏览、分享、兑换）以及邀请好友等方式获取积分。推荐优先坚持签到，这是最核心的积分来源。" },
  { q: "如何使用优惠券？", a: "购买商品后系统会自动生成券码，您可以在「我的券包」中查看。前往对应 APP 使用即可兑换权益。" },
  { q: "邀请好友有什么奖励？", a: "成功邀请好友注册并下单后，邀请人可获得积分和优惠券奖励，被邀请人也可获得新用户专属福利。具体奖励金额可在「邀请好友」页面查看。" },
  { q: "会员等级怎么提升？", a: "会员等级由累计积分决定，每500积分升一级，最高VIP10。等级越高，签到奖励加成越多（VIP4可达+20%），还有限时折扣、优先购等特权。" },
  { q: "如何申请退款？", a: "未核销的订单可以在「我的订单」中申请退款，积分将原路返还。已核销的券码无法退款。" },
  { q: "如何联系人工客服？", a: "如果 AI 助手无法解决您的问题，您可以点击下方「转接人工客服」按钮，我们的客服团队将在工作时间内为您服务。" },
];

function matchFAQ(input: string): string | null {
  const lower = input.toLowerCase();
  const keywords: Record<number, string[]> = {
    0: ["积分", "获取", "赚", "签到", "怎么得"],
    1: ["优惠券", "券", "使用", "兑换", "核销"],
    2: ["邀请", "好友", "推荐", "拉新"],
    3: ["会员", "等级", "vip", "升级", "提升"],
    4: ["退款", "退", "取消"],
    5: ["人工", "客服", "联系"],
  };

  for (const [idx, kws] of Object.entries(keywords)) {
    if (kws.some((kw) => lower.includes(kw))) {
      return FAQ_ITEMS[Number(idx)].a;
    }
  }
  return null;
}

const channels = [
  { icon: Mail, label: "邮件支持", desc: "support@discount-hub.com", action: "发送邮件" },
  { icon: Phone, label: "电话支持", desc: "400-888-0000", action: "拨打电话" },
];

export default function ContactPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content: "您好！我是 AI 智能助手，可以帮您解答积分、签到、优惠券、会员等级等常见问题。如有复杂问题，可随时转接人工客服。",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<"ai" | "human">("ai");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (mode === "human") {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: "system",
          content: "已记录您的留言，人工客服将尽快回复。工作时间：工作日 9:00-18:00",
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

    const faqAnswer = matchFAQ(text);
    const aiResponse = faqAnswer
      ?? "抱歉，我暂时无法回答这个问题。建议您点击下方「转接人工客服」获得更专业的帮助，或者换个方式描述您的问题。";

    setMessages((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: aiResponse,
        timestamp: new Date(),
      },
    ]);
    setIsTyping(false);
  }, [input, mode]);

  function handleTransferToHuman() {
    setMode("human");
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-transfer-${Date.now()}`,
        role: "system",
        content: "已为您转接人工客服。客服人员将在工作时间内回复您的消息，请耐心等待。",
        timestamp: new Date(),
      },
    ]);
    toast.success("已转接人工客服");
  }

  function handleSwitchToAI() {
    setMode("ai");
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-ai-${Date.now()}`,
        role: "system",
        content: "已切换回 AI 助手模式，有什么可以帮助您的？",
        timestamp: new Date(),
      },
    ]);
  }

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
        </AnimatedItem>

        <AnimatedItem>
          <PageHeading
            label="Contact"
            title="智能客服"
            action={
              <Badge variant="outline" className="gap-1.5 rounded-full border-border">
                {mode === "ai" ? <Bot className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                {mode === "ai" ? "AI 助手" : "人工客服"}
              </Badge>
            }
          />
        </AnimatedItem>

        <AnimatedSection className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <Card className={appCardClassName}>
            <CardContent className="flex flex-col p-0" style={{ height: "min(600px, 65vh)" }}>
              {/* Chat messages */}
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : msg.role === "system"
                            ? "bg-accent/50 text-accent-foreground"
                            : "bg-secondary text-foreground"
                      }`}
                    >
                      {msg.role === "ai" && (
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Bot className="h-3 w-3" /> AI 助手
                        </div>
                      )}
                      {msg.role === "system" && (
                        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Headphones className="h-3 w-3" /> 系统
                        </div>
                      )}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> 正在输入...
                    </div>
                  </div>
                )}
              </div>

              {/* Quick FAQ buttons */}
              {mode === "ai" && messages.length <= 3 && (
                <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
                  {FAQ_ITEMS.slice(0, 4).map((faq) => (
                    <Button
                      key={faq.q}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        setInput(faq.q);
                      }}
                    >
                      {faq.q}
                    </Button>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <div className="border-t border-border px-4 py-3">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={mode === "ai" ? "输入您的问题..." : "输入留言内容..."}
                    className="h-10 rounded-full border-border bg-secondary/50 shadow-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="h-10 w-10 shrink-0 rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex justify-center">
                  {mode === "ai" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleTransferToHuman}
                      className="text-xs text-muted-foreground"
                    >
                      <Headphones className="mr-1.5 h-3.5 w-3.5" />
                      转接人工客服
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSwitchToAI}
                      className="text-xs text-muted-foreground"
                    >
                      <Bot className="mr-1.5 h-3.5 w-3.5" />
                      切换 AI 助手
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className={appCardClassName}>
              <CardContent className="p-5">
                <SectionHeading title="常见问题" subtitle="点击快速查看答案" />
                <StaggerList className="mt-4 space-y-2">
                  {FAQ_ITEMS.map((faq) => (
                    <AnimatedItem key={faq.q}>
                      <Button
                        variant="outline"
                        className="h-auto w-full justify-start rounded-2xl border-border bg-secondary/50 px-4 py-3 text-left text-xs text-foreground hover:bg-secondary"
                        onClick={() => setInput(faq.q)}
                      >
                        <MessageCircle className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {faq.q}
                      </Button>
                    </AnimatedItem>
                  ))}
                </StaggerList>
              </CardContent>
            </Card>

            <Card className={appCardClassName}>
              <CardContent className="p-5">
                <SectionHeading title="其他联系方式" />
                <StaggerList className="mt-4 space-y-3">
                  {channels.map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <AnimatedItem key={ch.label}>
                        <div className="flex items-center gap-3 rounded-2xl bg-secondary/50 px-4 py-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background shadow-sm">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{ch.label}</div>
                            <div className="text-xs text-muted-foreground">{ch.desc}</div>
                          </div>
                        </div>
                      </AnimatedItem>
                    );
                  })}
                </StaggerList>
              </CardContent>
            </Card>
          </div>
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
