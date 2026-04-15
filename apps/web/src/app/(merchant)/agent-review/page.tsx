"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { appCardClassName, PageHeading, EmptyStateDashed } from "@/components/shared";
import { AnimatedItem, AnimatedSection, PageTransition, StaggerList, HoverScale } from "@/components/motion";

type Application = {
  id: string;
  userId: string;
  realName: string;
  region: string;
  platforms: string[];
  qualificationUrl?: string | null;
  status: string;
  reviewNote?: string | null;
  reviewedAt?: string | Date | null;
  createdAt: string | Date;
  user: { id: string; name?: string | null; email: string };
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "待审核", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REVIEWING: { label: "审核中", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  APPROVED: { label: "已通过", cls: "bg-green-50 text-green-700 border-green-200" },
  REJECTED: { label: "已拒绝", cls: "bg-red-50 text-red-700 border-red-200" },
  DEPLOYED: { label: "已上线", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

export default function AgentReviewPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<Application | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const { data: applicationsData, isLoading } = useQuery(
    trpc.agent.pendingApplications.queryOptions(),
  );

  const reviewMutation = useMutation(trpc.agent.reviewApplication.mutationOptions());

  const applications = (applicationsData ?? []) as Application[];

  async function handleReview(approve: boolean) {
    if (!reviewTarget) return;
    setIsApproving(true);
    try {
      await reviewMutation.mutateAsync({
        id: reviewTarget.id,
        approve,
        note: approve ? undefined : rejectNote.trim() || undefined,
      });
      toast.success(approve ? "已通过代理申请" : "已拒绝代理申请");
      setReviewTarget(null);
      setRejectNote("");
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <PageTransition>
      <div className="space-y-4 px-4 py-4 md:space-y-6 md:px-8 md:py-8">
        <AnimatedItem>
          <PageHeading label="Agent Review" title="代理审核" />
        </AnimatedItem>

        <AnimatedSection>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-[28px]" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <Card className={appCardClassName}>
              <CardContent className="p-6">
                <EmptyStateDashed text="暂无代理申请" />
              </CardContent>
            </Card>
          ) : (
            <StaggerList className="space-y-3">
              {applications.map((app) => {
                const s = STATUS_LABELS[app.status] ?? { label: app.status, cls: "bg-secondary text-muted-foreground border-border" };
                const createdAt = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
                const isPending = app.status === "PENDING" || app.status === "REVIEWING";
                return (
                  <AnimatedItem key={app.id}>
                    <HoverScale scale={1.005}>
                      <Card className={appCardClassName}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">{app.realName}</span>
                                <Badge variant="outline" className={`rounded-full ${s.cls}`}>{s.label}</Badge>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {app.user.name ?? app.user.email} · {createdAt.toLocaleString("zh-CN")}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge variant="secondary" className="text-[11px]">{app.region}</Badge>
                                {app.platforms.map((p) => (
                                  <Badge key={p} variant="outline" className="border-border text-[11px]">{p}</Badge>
                                ))}
                              </div>
                              {app.reviewNote && (
                                <div className="mt-2 text-xs text-muted-foreground">备注：{app.reviewNote}</div>
                              )}
                            </div>
                            {isPending && (
                              <div className="flex shrink-0 gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1 rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => { setReviewTarget(app); setRejectNote(""); }}
                                >
                                  <X className="h-3.5 w-3.5" />
                                  拒绝
                                </Button>
                                <Button
                                  size="sm"
                                  className="gap-1 rounded-full"
                                  onClick={() => { setReviewTarget(app); handleReview(true); }}
                                  disabled={isApproving}
                                >
                                  {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  通过
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </HoverScale>
                  </AnimatedItem>
                );
              })}
            </StaggerList>
          )}
        </AnimatedSection>

        <Dialog open={!!reviewTarget && !isApproving} onOpenChange={(open) => !open && setReviewTarget(null)}>
          <DialogContent className="max-w-md rounded-[28px]">
            <DialogHeader>
              <DialogTitle>拒绝代理申请</DialogTitle>
              <DialogDescription>
                请输入拒绝原因（可选），申请人将看到此原因。
              </DialogDescription>
            </DialogHeader>
            <Input
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="拒绝原因..."
              className="rounded-2xl bg-secondary/50"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewTarget(null)} className="rounded-full">取消</Button>
              <Button
                variant="destructive"
                onClick={() => handleReview(false)}
                disabled={reviewMutation.isPending}
                className="rounded-full"
              >
                {reviewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                确认拒绝
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
