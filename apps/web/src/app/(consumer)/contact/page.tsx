"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appCardClassName, PageHeading } from "@/components/shared";
import { PageTransition, AnimatedItem, AnimatedSection, StaggerList } from "@/components/motion";

const channels = [
  { icon: MessageCircle, label: "在线客服", desc: "工作日 9:00-18:00", action: "立即咨询" },
  { icon: Mail, label: "邮件支持", desc: "support@discount-hub.com", action: "发送邮件" },
  { icon: Phone, label: "电话支持", desc: "400-888-0000", action: "拨打电话" },
];

export default function ContactPage() {
  const router = useRouter();
  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" /> 返回
          </Button>
        </AnimatedItem>
        <AnimatedItem><PageHeading label="Contact" title="联系客服" /></AnimatedItem>
        <AnimatedSection>
          <StaggerList className="grid gap-3 md:grid-cols-3">
            {channels.map((ch) => {
              const Icon = ch.icon;
              return (
                <AnimatedItem key={ch.label}>
                  <Card className={appCardClassName}>
                    <CardContent className="p-5 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                        <Icon className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="mt-3 text-sm font-semibold text-foreground">{ch.label}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{ch.desc}</p>
                      <Button variant="outline" size="sm" className="mt-4 rounded-full">{ch.action}</Button>
                    </CardContent>
                  </Card>
                </AnimatedItem>
              );
            })}
          </StaggerList>
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
