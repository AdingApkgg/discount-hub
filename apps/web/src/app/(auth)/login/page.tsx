"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Loader2, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { signIn, signUp } from "@/lib/auth-client";
import { toast } from "sonner";
import { useUserStore } from "@/stores/user";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const setDemoMode = useUserStore((s) => s.setDemoMode);
  const callbackUrl = searchParams.get("callbackUrl");
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(255,45,85,0.25),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(138,43,226,0.25),transparent_55%)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-[var(--border)] bg-[var(--panel)] shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[var(--gradient-primary)]"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
                {isLogin ? "欢迎回来" : "创建账户"}
              </h1>
              <p className="text-[var(--text-muted)] text-sm">
                {isLogin ? "登录到您的账户" : "注册新账户开始使用"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label className="text-[var(--text-muted)]">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border-[var(--border)] bg-[var(--app-input-bg)] pl-11 text-[var(--text)] placeholder:text-[var(--text-muted)]"
                      placeholder="你的名字"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[var(--text-muted)]">邮箱地址</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-[var(--border)] bg-[var(--app-input-bg)] pl-11 text-[var(--text)] placeholder:text-[var(--text-muted)]"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[var(--text-muted)]">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-[var(--border)] bg-[var(--app-input-bg)] pl-11 text-[var(--text)] placeholder:text-[var(--text-muted)]"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--gradient-primary)] hover:brightness-110 text-white"
                style={{ boxShadow: "var(--shadow-glow)" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    处理中...
                  </>
                ) : isLogin ? (
                  "登录"
                ) : (
                  "注册"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={enterDemo}
                className="w-full border-[var(--border)] bg-[var(--panel2)] text-[var(--text)] hover:bg-[var(--app-input-bg)]"
              >
                进入演示
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {isLogin ? "没有账户？" : "已有账户？"}
                <span className="font-medium ml-1">
                  {isLogin ? "立即注册" : "立即登录"}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
