"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift, Mail, Lock, Loader2, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { signIn, signUp } from "@/lib/auth-client";
import { toast } from "sonner";
import { useUserStore } from "@/stores/user";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/trpc/routers/_app";
import { LoadingSpinner } from "@/components/shared";

function makeDirectClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/trpc`,
        transformer: superjson,
      }),
    ],
  });
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(!searchParams.get("inviteCode"));
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setDemoMode = useUserStore((s) => s.setDemoMode);
  const callbackUrl = searchParams.get("callbackUrl");
  const inviteCode = searchParams.get("inviteCode");
  const nextUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const res = await signIn.email({ email, password });
        if (res.error) {
          toast.error(res.error.message ?? "登录失败");
        } else {
          toast.success("登录成功");
          router.push(nextUrl);
        }
      } else {
        const res = await signUp.email({ email, password, name });
        if (res.error) {
          toast.error(res.error.message ?? "注册失败");
        } else {
          if (inviteCode) {
            try {
              const client = makeDirectClient();
              await client.user.bindInviteCode.mutate({ inviteCode });
            } catch {}
          }
          toast.success("注册成功");
          router.push(nextUrl);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const enterDemo = () => {
    setDemoMode(true);
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(255,45,85,0.25),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(138,43,226,0.25),transparent_55%)] p-4">
      <div className="w-full max-w-md">
        <Card className="overflow-hidden rounded-[28px] border-border bg-background shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <div
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--gradient-primary)]"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="mb-2 text-2xl font-bold text-foreground">
                {isLogin ? "欢迎回来" : "创建账户"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLogin ? "登录到您的账户" : "注册新账户开始使用"}
              </p>
              {!isLogin && inviteCode && (
                <Badge
                  variant="secondary"
                  className="mt-3 gap-1.5 rounded-full text-xs text-emerald-600"
                >
                  <Gift className="h-3.5 w-3.5" />
                  受邀注册，邀请码：{inviteCode}
                </Badge>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    用户名
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-2xl border-border bg-secondary/50 pl-11 shadow-none"
                      placeholder="你的名字"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  邮箱地址
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-2xl border-border bg-secondary/50 pl-11 shadow-none"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-2xl border-border bg-secondary/50 pl-11 shadow-none"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[var(--gradient-primary)] py-6 text-white hover:brightness-110"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    处理中...
                  </>
                ) : isLogin ? (
                  "登录"
                ) : (
                  "注册"
                )}
              </Button>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                  或者
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={enterDemo}
                className="w-full rounded-2xl border-border bg-secondary/50 py-6 text-foreground shadow-none hover:bg-secondary"
              >
                进入演示
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isLogin ? "没有账户？" : "已有账户？"}
                <span className="ml-1 font-medium">
                  {isLogin ? "立即注册" : "立即登录"}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
