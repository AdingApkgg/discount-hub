"use client";

import { useState } from "react";
import { Save, Store, Bell, Shield, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("折扣中心旗舰店");
  const [storeDesc, setStoreDesc] = useState(
    "优质团购优惠券，诱惑优惠先到先得",
  );
  const [notify, setNotify] = useState(true);
  const [autoVerify, setAutoVerify] = useState(false);

  const handleSave = () => {
    toast.success("设置已保存");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">设置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理商家信息与系统偏好
          </p>
        </div>
        <Button
          onClick={handleSave}
          className="bg-[var(--gradient-primary)] hover:brightness-110 text-white gap-2"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>

      <Tabs defaultValue="store">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="store" className="gap-2">
            <Store className="h-4 w-4" />
            店铺信息
          </TabsTrigger>
          <TabsTrigger value="notification" className="gap-2">
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            安全
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            外观
          </TabsTrigger>
        </TabsList>

        <TabsContent value="store">
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label>店铺名称</Label>
                <Input
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="输入店铺名称"
                />
              </div>

              <div className="space-y-2">
                <Label>店铺简介</Label>
                <Textarea
                  value={storeDesc}
                  onChange={(e) => setStoreDesc(e.target.value)}
                  placeholder="输入店铺简介"
                  rows={4}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>联系邮箱</Label>
                <Input placeholder="store@example.com" type="email" />
              </div>

              <div className="space-y-2">
                <Label>联系电话</Label>
                <Input placeholder="400-xxx-xxxx" type="tel" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notification">
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    订单通知
                  </div>
                  <div className="text-xs text-muted-foreground">
                    有新订单时发送通知
                  </div>
                </div>
                <Switch checked={notify} onCheckedChange={setNotify} />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    核销提醒
                  </div>
                  <div className="text-xs text-muted-foreground">
                    券码核销时发送提醒
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    每日汇总
                  </div>
                  <div className="text-xs text-muted-foreground">
                    每日经营数据汇总邮件
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    自动核销
                  </div>
                  <div className="text-xs text-muted-foreground">
                    扫码后自动完成核销（不需要确认）
                  </div>
                </div>
                <Switch
                  checked={autoVerify}
                  onCheckedChange={setAutoVerify}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    防重核销
                  </div>
                  <div className="text-xs text-muted-foreground">
                    使用 Redis 防止同一券码被重复核销
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>修改密码</Label>
                <Input type="password" placeholder="当前密码" />
                <Input type="password" placeholder="新密码" />
                <Button variant="outline" size="sm">
                  更新密码
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card className="border-border">
            <CardContent className="p-6 space-y-6">
              <div className="text-sm text-muted-foreground">
                外观自定义功能将在后续版本中实现，当前使用默认暗色主题。
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
