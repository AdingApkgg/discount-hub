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
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const channels = [
  { icon: Mail, label: "邮件支持", desc: "support@discount-hub.com", action: "发送邮件" },
  { icon: Phone, label: "电话支持", desc: "400-888-0000", action: "拨打电话" },
];

export default function ContactPage() {
  const router = useRouter();
  const trpc = useTRPC();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "您好！我是 AI 智能助手，可以帮您解答积分、签到、优惠券、会员等级等常见问题。如有复杂问题，可随时转接人工客服。",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"ai" | "human">("ai");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferRemaining, setTransferRemaining] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: faqs } = useQuery(trpc.support.listFaqs.queryOptions());
  const { data: publicConfig } = useQuery(trpc.support.getPublicConfig.queryOptions());
  const askAI = useMutation(trpc.support.askAI.mutationOptions());

  const transferWaitSeconds = publicConfig?.transferWaitSeconds ?? 30;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Transfer countdown
  useEffect(() => {
    if (!transferOpen) return;
    if (transferRemaining <= 0) {
      setTransferOpen(false);
      setMode("human");
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-connected-${Date.now()}`,
          role: "system",
          content: "人工客服已为您接通。请描述您遇到的问题，客服将尽快回复。",
          timestamp: new Date(),
        },
      ]);
      toast.success("人工客服已接通");
      return;
    }
    const timer = setTimeout(() => {
      setTransferRemaining((r) => r - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [transferOpen, transferRemaining]);

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

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "ai")
        .slice(-10)
        .map((m) => ({
          role: m.role as "user" | "ai",
          content: m.content,
        }));
      const result = await askAI.mutateAsync({ message: text, history });
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: result.answer,
          timestamp: new Date(),
        },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-err-${Date.now()}`,
          role: "system",
          content:
            err instanceof Error
              ? `请求失败：${err.message}。建议转接人工客服。`
              : "请求失败，建议转接人工客服。",
          timestamp: new Date(),
        },
      ]);
    }
  }, [input, mode, messages, askAI]);

  function handleTransferToHuman() {
    setTransferRemaining(transferWaitSeconds);
    setTransferOpen(true);
  }

  function handleCancelTransfer() {
    setTransferOpen(false);
    setTransferRemaining(0);
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

  const displayedFaqs = faqs ?? [];
  const isTyping = askAI.isPending;

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
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
            <CardContent
              className="flex flex-col p-0"
              style={{ height: "min(600px, 65vh)" }}
            >
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
              {mode === "ai" && messages.length <= 3 && displayedFaqs.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border px-5 py-3">
                  {displayedFaqs.slice(0, 4).map((faq) => (
                    <Button
                      key={faq.id}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => {
                        setInput(faq.question);
                      }}
                    >
                      {faq.question}
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
                    disabled={isTyping}
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
                    disabled={!input.trim() || isTyping}
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
                  {displayedFaqs.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center text-xs text-muted-foreground">
                      暂无常见问题
                    </div>
                  )}
                  {displayedFaqs.map((faq) => (
                    <AnimatedItem key={faq.id}>
                      <Button
                        variant="outline"
                        className="h-auto w-full justify-start rounded-2xl border-border bg-secondary/50 px-4 py-3 text-left text-xs text-foreground hover:bg-secondary"
                        onClick={() => setInput(faq.question)}
                      >
                        <MessageCircle className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {faq.question}
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

      <Dialog open={transferOpen} onOpenChange={(open) => !open && handleCancelTransfer()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>正在为您转接人工客服</DialogTitle>
            <DialogDescription>
              客服正在连接，请稍候。预计在 {transferWaitSeconds} 秒内为您接通。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-4xl font-black tabular-nums text-foreground">
              {transferRemaining}s
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${
                    transferWaitSeconds > 0
                      ? Math.max(
                          0,
                          ((transferWaitSeconds - transferRemaining) / transferWaitSeconds) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={handleCancelTransfer}>
              取消转接
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
