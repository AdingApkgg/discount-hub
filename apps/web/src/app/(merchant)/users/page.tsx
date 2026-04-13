"use client";

import { useMemo, useState } from "react";
import {
  Crown,
  Loader2,
  Search,
  Shield,
  ShieldCheck,
  Store,
  User,
  Users,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type UsersPayload = RouterOutputs["admin"]["listUsers"];
type UserItem = UsersPayload["users"][number];
type RoleFilter = "all" | "CONSUMER" | "MERCHANT" | "ADMIN";
type Role = "CONSUMER" | "MERCHANT" | "ADMIN";

function roleBadge(role: string) {
  switch (role) {
    case "ADMIN":
      return (
        <Badge className="bg-violet-500/10 text-violet-300 border-violet-400/30 gap-1">
          <ShieldCheck className="h-3 w-3" />
          管理员
        </Badge>
      );
    case "MERCHANT":
      return (
        <Badge className="bg-blue-500/10 text-blue-300 border-blue-400/30 gap-1">
          <Store className="h-3 w-3" />
          商家
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-500/10 text-slate-300 border-slate-400/30 gap-1">
          <User className="h-3 w-3" />
          消费者
        </Badge>
      );
  }
}

const roleLabel: Record<Role, string> = {
  CONSUMER: "消费者",
  MERCHANT: "商家",
  ADMIN: "管理员",
};

export default function UsersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [roleChangeTarget, setRoleChangeTarget] = useState<{
    user: UserItem;
    newRole: Role;
  } | null>(null);
  const pageSize = 20;

  const { data, isLoading } = useQuery(
    trpc.admin.listUsers.queryOptions({
      page,
      pageSize,
      role: roleFilter,
      search: search.trim() || undefined,
    }),
  );

  const { data: platformStats } = useQuery(
    trpc.admin.platformStats.queryOptions(),
  );

  const updateRoleMutation = useMutation(
    trpc.admin.updateUserRole.mutationOptions(),
  );

  const payload = data as UsersPayload | undefined;
  const users = useMemo(() => payload?.users ?? [], [payload]);
  const totalPages = payload
    ? Math.max(1, Math.ceil(payload.total / payload.pageSize))
    : 1;

  const summary = useMemo(
    () => [
      {
        label: "总用户",
        value: platformStats ? String(platformStats.totalUsers) : "—",
        icon: Users,
        color: "text-blue-400",
      },
      {
        label: "总订单",
        value: platformStats ? String(platformStats.totalOrders) : "—",
        icon: Crown,
        color: "text-amber-400",
      },
      {
        label: "总商品",
        value: platformStats ? String(platformStats.totalProducts) : "—",
        icon: Store,
        color: "text-emerald-400",
      },
      {
        label: "总收入",
        value: platformStats
          ? `¥${platformStats.totalRevenue.toFixed(2)}`
          : "—",
        icon: Shield,
        color: "text-violet-400",
      },
    ],
    [platformStats],
  );

  async function handleRoleChange() {
    if (!roleChangeTarget) return;
    try {
      await updateRoleMutation.mutateAsync({
        userId: roleChangeTarget.user.id,
        role: roleChangeTarget.newRole,
      });
      toast.success(
        `已将 ${roleChangeTarget.user.name ?? roleChangeTarget.user.email} 设为${roleLabel[roleChangeTarget.newRole]}`,
      );
      setRoleChangeTarget(null);
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "角色更新失败");
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看平台用户、管理角色与权限
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                </div>
                <div className="text-2xl font-semibold text-foreground">
                  {s.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v as RoleFilter);
                setPage(1);
              }}
            >
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="CONSUMER">消费者</TabsTrigger>
                <TabsTrigger value="MERCHANT">商家</TabsTrigger>
                <TabsTrigger value="ADMIN">管理员</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="搜索名称 / 邮箱 / 手机号"
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Users className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="mt-4 text-sm font-medium text-foreground">
                没有找到匹配的用户
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>用户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead className="text-right">积分</TableHead>
                    <TableHead className="text-right">VIP</TableHead>
                    <TableHead className="text-right">订单</TableHead>
                    <TableHead className="text-right">券码</TableHead>
                    <TableHead className="text-right">邀请</TableHead>
                    <TableHead>注册时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-border">
                      <TableCell className="min-w-[200px]">
                        <div className="font-medium text-foreground">
                          {u.name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                        {u.phone && (
                          <div className="text-xs text-muted-foreground">
                            {u.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{roleBadge(u.role)}</TableCell>
                      <TableCell className="text-right text-foreground">
                        {u.points.toLocaleString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        Lv.{u.vipLevel}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {u._count.orders}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {u._count.coupons}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {u._count.referrals}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select
                          value={u.role}
                          onValueChange={(newRole) =>
                            setRoleChangeTarget({
                              user: u,
                              newRole: newRole as Role,
                            })
                          }
                        >
                          <SelectTrigger className="w-[100px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONSUMER">消费者</SelectItem>
                            <SelectItem value="MERCHANT">商家</SelectItem>
                            <SelectItem value="ADMIN">管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 text-sm text-muted-foreground">
            <span>
              第 {payload?.page ?? page} / {totalPages} 页（共{" "}
              {payload?.total ?? 0} 条）
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              disabled={page <= 1}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((c) => Math.min(totalPages, c + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!roleChangeTarget}
        onOpenChange={(open) => !open && setRoleChangeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认修改角色</AlertDialogTitle>
            <AlertDialogDescription>
              角色变更会立即生效，影响该用户的访问权限。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {roleChangeTarget && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">用户</span>
                <span className="text-foreground">
                  {roleChangeTarget.user.name ?? roleChangeTarget.user.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">当前角色</span>
                {roleBadge(roleChangeTarget.user.role)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">变更为</span>
                {roleBadge(roleChangeTarget.newRole)}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRoleChange}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  更新中...
                </>
              ) : (
                "确认修改"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
