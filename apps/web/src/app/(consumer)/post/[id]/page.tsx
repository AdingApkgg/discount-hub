"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bookmark, MessageCircle, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition, AnimatedItem } from "@/components/motion";
import { cn } from "@/lib/utils";

const mockPostDetail = {
  id: "mp1",
  title: "今天刷到的隐藏福利，真的香",
  content: "限时神卷叠加后到手价太离谱了…赶紧冲，先到先得。\n\n1. 先打开 0 元兑专区\n2. 签到拿积分，连续签到 4 天收益最大化\n3. 配合限时神券叠加使用\n\n这个技巧真的很多人不知道，赶紧试试！",
  images: [] as string[],
  likeCount: 2400,
  app: "抖音",
  user: { id: "u1", name: "用户A", image: null as string | null },
  comments: [
    { id: "c1", content: "真的有用！已经试过了", user: { id: "u2", name: "用户B", image: null }, createdAt: new Date().toISOString() },
    { id: "c2", content: "666 感谢分享", user: { id: "u3", name: "用户C", image: null }, createdAt: new Date().toISOString() },
  ],
  _count: { comments: 128 },
  createdAt: new Date().toISOString(),
};

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const trpc = useTRPC();
  const [commentText, setCommentText] = useState("");

  const { data: postData, isLoading } = useQuery({
    ...trpc.post.byId.queryOptions({ id }),
    retry: false,
  });

  const post = (postData as typeof mockPostDetail | undefined) ?? (id.startsWith("mp") ? mockPostDetail : undefined);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <Skeleton className="h-10 w-20 rounded-lg" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 text-center">
        <p className="text-muted-foreground">帖子不存在</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/feed")}>返回热点</Button>
      </div>
    );
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("链接已复制");
    } catch { toast.error("复制失败"); }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl px-4 py-4 pb-32 max-md:pb-44 md:py-6 md:pb-8">
        <AnimatedItem>
          <Button variant="outline" onClick={() => router.back()} className="gap-2 rounded-full">
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
        </AnimatedItem>

        {post.images.length > 0 && (
          <AnimatedItem>
            <div className="relative mt-4 aspect-video overflow-hidden rounded-2xl bg-secondary">
              <img src={post.images[0]} alt="" className="h-full w-full object-cover" />
              {post.images.length > 1 && (
                <Badge className="absolute right-3 top-3 bg-black/50 text-white">1/{post.images.length}</Badge>
              )}
            </div>
          </AnimatedItem>
        )}

        <AnimatedItem>
          <div className="mt-5">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-secondary text-foreground">
                  {(post.user.name ?? "U").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-sm font-semibold text-foreground">{post.user.name}</div>
                {post.app && <Badge variant="secondary" className="mt-0.5 text-[11px]">{post.app}</Badge>}
              </div>
            </div>
            <h1 className="mt-4 text-xl font-bold text-foreground md:text-2xl">{post.title}</h1>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {post.content}
            </div>
          </div>
        </AnimatedItem>

        <AnimatedItem>
          <Card className="mt-6 gap-0 rounded-[22px] border-border py-0">
            <CardContent className="p-4">
              <div className="mb-3 text-sm font-semibold text-foreground">
                评论 ({post._count.comments})
              </div>
              {post.comments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">暂无评论</p>
              ) : (
                <div className="space-y-3">
                  {post.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-secondary text-xs">{(c.user.name ?? "U").slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-medium text-foreground">{c.user.name}</div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedItem>

        <div
          className={cn(
            "fixed inset-x-0 z-20 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur",
            "max-md:bottom-[calc(54px+env(safe-area-inset-bottom))] max-md:pb-3",
            "md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="输入你的想法..."
              className="flex-1 rounded-full bg-secondary/50"
            />
            <Button size="icon" variant="ghost" className="shrink-0" onClick={handleShare}><Share2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="shrink-0"><Bookmark className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="shrink-0"><MessageCircle className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
