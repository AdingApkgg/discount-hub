"use client";

import { useRouter } from "next/navigation";
import {
  Crown,
  Gift,
  Heart,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

const VIP_TIERS = [
  { level: 1, label: "VIP1", points: 200, color: "from-amber-400 to-orange-400" },
  { level: 2, label: "VIP2", points: 500, color: "from-orange-500 to-red-500" },
  { level: 3, label: "VIP3", points: 1200, color: "from-rose-500 to-pink-500" },
  { level: 4, label: "VIP4", points: 2000, color: "from-pink-500 to-red-600" },
  { level: 5, label: "VIP5", points: 5000, color: "from-yellow-500 to-amber-600" },
];

const mockPosts = [
  { id: "mp1", title: "今天刷到的隐藏福利，真的香", content: "限时神卷叠加后到手价太离谱了…赶紧冲，先到先得", images: [] as string[], likeCount: 2400, app: "抖音", user: { name: "用户A", image: null as string | null }, _count: { comments: 128 }, createdAt: new Date().toISOString() },
  { id: "mp2", title: "0 元兑专区怎么用最划算", content: "签到拿积分，三天就能换到钻石包。别犹豫直接签", images: [], likeCount: 1100, app: "抖音", user: { name: "用户B", image: null }, _count: { comments: 56 }, createdAt: new Date().toISOString() },
  { id: "mp3", title: "首充礼的正确打开方式", content: "别直接买，先领券再叠加，立省更多。这个技巧很多人不知道", images: [], likeCount: 870, app: "抖音", user: { name: "用户C", image: null }, _count: { comments: 34 }, createdAt: new Date().toISOString() },
  { id: "mp4", title: "连续签到 4 天直接起飞", content: "第四天直接 500 积分奖励，配合 0 元兑专区简直不要太爽", images: [], likeCount: 650, app: "抖音", user: { name: "用户D", image: null }, _count: { comments: 22 }, createdAt: new Date().toISOString() },
];

function formatLikes(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function FeedPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data: session } = useSession();

  const { data: profile } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  });

  const { data: postData } = useQuery({
    ...trpc.post.list.queryOptions(),
    retry: false,
  });

  const posts = postData?.posts ?? mockPosts;
  const points = (profile as { points?: number } | undefined)?.points ?? 0;

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <PageHeading
            label="Hot Feed"
            title="X热点"
            action={
              session?.user ? (
                <Badge variant="outline" className="rounded-full border-border bg-secondary px-3 py-1 text-foreground">
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  {points.toLocaleString("zh-CN")} 积分
                </Badge>
              ) : null
            }
          />
        </AnimatedItem>

        <AnimatedSection>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {VIP_TIERS.map((tier) => (
                <Card key={tier.level} className={`w-[140px] shrink-0 gap-0 overflow-hidden rounded-[22px] border-0 py-0 bg-gradient-to-br ${tier.color} text-white shadow-lg`}>
                  <CardContent className="p-4 text-center">
                    <Crown className="mx-auto h-6 w-6" />
                    <div className="mt-2 text-base font-bold">{tier.label}</div>
                    <div className="mt-1 text-xs text-white/80">{tier.points} 积分</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </AnimatedSection>

        <AnimatedItem>
          <HoverScale>
            <Card className={appCardClassName}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10">
                      <Gift className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">邀请好友</div>
                      <div className="text-xs text-muted-foreground">邀请成功获得丰厚积分奖励</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push("/invite")} className="rounded-full">
                    去邀请
                  </Button>
                </div>
              </CardContent>
            </Card>
          </HoverScale>
        </AnimatedItem>

        <AnimatedSection>
          <Card className={appCardClassName}>
            <CardContent className="p-5 md:p-6">
              <div className="mb-5 text-lg font-semibold text-foreground">热门帖子</div>
              {posts.length === 0 ? (
                <EmptyStateDashed text="暂无帖子" />
              ) : (
                <StaggerList className="grid gap-3">
                  {posts.map((post) => (
                    <AnimatedItem key={post.id}>
                      <HoverScale scale={1.01}>
                        <Card
                          className="cursor-pointer gap-0 overflow-hidden rounded-[22px] border-border py-0 transition-shadow hover:shadow-md"
                          onClick={() => router.push(`/post/${post.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarFallback className="bg-secondary text-sm text-foreground">
                                  {(post.user.name ?? "U").slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">{post.user.name ?? "匿名"}</span>
                                  {post.app && <Badge variant="secondary" className="rounded-full text-[11px]">{post.app}</Badge>}
                                </div>
                                <h3 className="mt-1.5 text-base font-semibold text-foreground">{post.title}</h3>
                                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.content}</p>
                                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{formatLikes(post.likeCount)}</span>
                                  <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{post._count.comments}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
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
