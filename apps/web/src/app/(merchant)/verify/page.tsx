"use client";

import { useState } from "react";
import { QrCode, KeyRound, Check, Search, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [verifiedInfo, setVerifiedInfo] = useState<{
    code: string;
    productTitle: string;
    userName: string;
  } | null>(null);

  const trpc = useTRPC();
  const verifyMutation = useMutation(
    trpc.verify.verifyCoupon.mutationOptions(),
  );

  const handleVerify = async () => {
    if (!code.trim()) return;
    setResult("loading");
    try {
      const res = await verifyMutation.mutateAsync({ code: code.trim() });
      setVerifiedInfo({
        code: res.coupon.code,
        productTitle: res.coupon.productTitle,
        userName: res.coupon.userName,
      });
      setResult("success");
      toast.success(`券码 ${res.coupon.code} 核销成功！`);
    } catch (err: unknown) {
      setResult("error");
      const message =
        err instanceof Error ? err.message : "核销失败，请检查券码";
      toast.error(message);
      // Reset to idle so user can retry
      setTimeout(() => setResult("idle"), 2000);
    }
  };

  const resetVerify = () => {
    setResult("idle");
    setCode("");
    setVerifiedInfo(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">扫码核销</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          扫描或输入券码完成核销
        </p>
      </div>

      {result === "idle" || result === "loading" ? (
        <Tabs defaultValue="input">
          <TabsList className="bg-secondary/50 w-full">
            <TabsTrigger value="scan" className="flex-1 gap-2">
              <QrCode className="h-4 w-4" />
              扫码核销
            </TabsTrigger>
            <TabsTrigger value="input" className="flex-1 gap-2">
              <KeyRound className="h-4 w-4" />
              输入券码
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan">
            <Card className="border-border">
              <CardContent className="p-6">
                <div className="aspect-square max-w-sm mx-auto rounded-lg bg-black/40 border border-border flex items-center justify-center">
                  <div className="text-center p-6">
                    <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <div className="text-sm text-muted-foreground mb-4">
                      摄像头扫码功能将在移动端 APP 中实现
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="input">
            <Card className="border-border">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">券码</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="请输入券码"
                      className="pl-11 font-mono text-center text-lg tracking-wider"
                      maxLength={30}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleVerify}
                  disabled={!code.trim() || result === "loading"}
                  className="w-full bg-[var(--gradient-primary)] hover:brightness-110 text-white"
                  style={{ boxShadow: "var(--shadow-glow)" }}
                >
                  {result === "loading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      核销中...
                    </>
                  ) : (
                    "确认核销"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : result === "success" && verifiedInfo ? (
        <Card className="border-emerald-400/30 bg-emerald-500/10">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-300" />
            </div>
            <div className="text-xl font-semibold text-foreground">核销成功</div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>
                券码：
                <span className="font-mono text-foreground">{verifiedInfo.code}</span>
              </div>
              <div>
                商品：
                <span className="text-foreground">{verifiedInfo.productTitle}</span>
              </div>
              <div>
                用户：
                <span className="text-foreground">{verifiedInfo.userName}</span>
              </div>
            </div>
            <Button
              onClick={resetVerify}
              className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              继续核销
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
