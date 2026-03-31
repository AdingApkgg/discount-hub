"use client";

import { useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MerchantProduct = RouterOutputs["product"]["manageList"][number];
type ProductStatusFilter = "all" | "ACTIVE" | "SOLD_OUT" | "EXPIRED" | "DRAFT";
type ProductStatus = MerchantProduct["status"];

type ProductFormState = {
  app: string;
  title: string;
  subtitle: string;
  description: string;
  pointsPrice: string;
  cashPrice: string;
  originalCashPrice: string;
  stock: string;
  expiresAt: string;
  tags: string;
  status: ProductStatus;
};

const DEFAULT_FORM: ProductFormState = {
  app: "",
  title: "",
  subtitle: "",
  description: "",
  pointsPrice: "0",
  cashPrice: "0",
  originalCashPrice: "",
  stock: "0",
  expiresAt: "",
  tags: "",
  status: "ACTIVE",
};

function cashNum(v: number | { toNumber(): number } | null | undefined) {
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "toNumber" in v) return v.toNumber();
  return 0;
}

function formatDateInput(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatDateText(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("zh-CN");
}

function buildForm(product?: MerchantProduct | null): ProductFormState {
  if (!product) return DEFAULT_FORM;
  return {
    app: product.app,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    pointsPrice: String(product.pointsPrice),
    cashPrice: String(cashNum(product.cashPrice)),
    originalCashPrice:
      product.originalCashPrice == null
        ? ""
        : String(cashNum(product.originalCashPrice)),
    stock: String(product.stock),
    expiresAt: formatDateInput(product.expiresAt),
    tags: product.tags.join(", "),
    status: product.status,
  };
}

function statusBadge(status: ProductStatus) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30">
          在架
        </Badge>
      );
    case "SOLD_OUT":
      return (
        <Badge className="bg-amber-500/10 text-amber-300 border-amber-400/30">
          售罄
        </Badge>
      );
    case "EXPIRED":
      return (
        <Badge className="bg-slate-500/10 text-slate-300 border-slate-400/30">
          已过期
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge className="bg-blue-500/10 text-blue-300 border-blue-400/30">
          草稿
        </Badge>
      );
  }
}

export default function ProductsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProductStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(DEFAULT_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(
    trpc.product.manageList.queryOptions({
      status,
      search: search.trim() || undefined,
    }),
  );
  const products = useMemo(
    () => (data ?? []) as MerchantProduct[],
    [data],
  );

  const createMutation = useMutation(trpc.product.create.mutationOptions());
  const updateMutation = useMutation(trpc.product.update.mutationOptions());

  const summary = useMemo(() => {
    const activeCount = products.filter((item) => item.status === "ACTIVE").length;
    const soldOutCount = products.filter((item) => item.status === "SOLD_OUT").length;
    const lowStockCount = products.filter(
      (item) => item.status === "ACTIVE" && item.stock <= 10,
    ).length;
    const totalStock = products.reduce((sum, item) => sum + item.stock, 0);

    return [
      { label: "当前结果", value: String(products.length) },
      { label: "在架商品", value: String(activeCount) },
      { label: "低库存", value: String(lowStockCount) },
      { label: "总库存", value: totalStock.toLocaleString("zh-CN") },
      { label: "售罄商品", value: String(soldOutCount) },
    ];
  }, [products]);

  function updateForm<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openCreateDialog() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(product: MerchantProduct) {
    setEditing(product);
    setForm(buildForm(product));
    setDialogOpen(true);
  }

  async function refreshAll() {
    await queryClient.invalidateQueries();
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.app.trim() || !form.expiresAt) {
      toast.error("请先填写商品名称、平台和过期时间");
      return;
    }

    const payload = {
      app: form.app.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      description: form.description.trim() || undefined,
      pointsPrice: Number(form.pointsPrice),
      cashPrice: Number(form.cashPrice),
      originalCashPrice: form.originalCashPrice
        ? Number(form.originalCashPrice)
        : undefined,
      stock: Number(form.stock),
      expiresAt: new Date(form.expiresAt),
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      status: form.status,
    };

    if (
      Number.isNaN(payload.pointsPrice) ||
      Number.isNaN(payload.cashPrice) ||
      Number.isNaN(payload.stock) ||
      Number.isNaN(payload.expiresAt.getTime())
    ) {
      toast.error("价格、库存和时间格式不正确");
      return;
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          data: {
            app: payload.app,
            title: payload.title,
            subtitle: payload.subtitle,
            description: payload.description,
            pointsPrice: payload.pointsPrice,
            cashPrice: payload.cashPrice,
            originalCashPrice: payload.originalCashPrice ?? null,
            stock: payload.stock,
            expiresAt: payload.expiresAt,
            tags: payload.tags,
            status: payload.status,
          },
        });
        toast.success("商品已更新");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("商品已创建");
      }

      await refreshAll();
      setDialogOpen(false);
      setEditing(null);
      setForm(DEFAULT_FORM);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "保存失败，请稍后重试");
    }
  }

  async function quickUpdateStatus(product: MerchantProduct, next: ProductStatus) {
    setBusyId(product.id);
    try {
      await updateMutation.mutateAsync({
        id: product.id,
        data: { status: next },
      });
      await refreshAll();
      toast.success(`已将 ${product.title} 设为${next === "ACTIVE" ? "在架" : next === "DRAFT" ? "草稿" : "售罄"}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "状态更新失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">商品管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理在架优惠券和虚拟商品，支持新建、编辑和上下架。
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-[var(--gradient-primary)] hover:brightness-110 text-white gap-2"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="h-4 w-4" />
          添加商品
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((item) => (
          <Card key={item.label} className="border-border">
            <CardContent className="p-5">
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className="mt-2 text-2xl font-semibold text-foreground">
                {item.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Tabs value={status} onValueChange={(value) => setStatus(value as ProductStatusFilter)}>
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="ACTIVE">在架</TabsTrigger>
                <TabsTrigger value="SOLD_OUT">售罄</TabsTrigger>
                <TabsTrigger value="DRAFT">草稿</TabsTrigger>
                <TabsTrigger value="EXPIRED">已过期</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索商品名称 / 平台"
                className="pl-9"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center">
              <Package className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="mt-4 text-sm font-medium text-foreground">
                当前筛选下还没有商品
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                先创建一个商品，或者换个状态筛选看看。
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>商品</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">积分价</TableHead>
                    <TableHead className="text-right">现金价</TableHead>
                    <TableHead className="text-right">库存</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="border-border">
                      <TableCell className="min-w-[240px]">
                        <div className="font-semibold text-foreground">{product.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {product.app} · {product.subtitle || "无副标题"}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(product.status)}</TableCell>
                      <TableCell className="text-right text-foreground">
                        {product.pointsPrice}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        ¥{cashNum(product.cashPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.stock}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateText(product.expiresAt)}
                      </TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {product.tags.length > 0 ? (
                            product.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="outline"
                                className="text-[11px] border-border"
                              >
                                {tag}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">无标签</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                            className="gap-2"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            编辑
                          </Button>
                          {product.status !== "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === product.id}
                              onClick={() => quickUpdateStatus(product, "ACTIVE")}
                            >
                              {busyId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "上架"
                              )}
                            </Button>
                          )}
                          {product.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === product.id}
                              onClick={() => quickUpdateStatus(product, "SOLD_OUT")}
                            >
                              {busyId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "设为售罄"
                              )}
                            </Button>
                          )}
                          {product.status !== "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === product.id}
                              onClick={() => quickUpdateStatus(product, "DRAFT")}
                            >
                              {busyId === product.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "转草稿"
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑商品" : "新增商品"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>平台</Label>
              <Input
                value={form.app}
                onChange={(event) => updateForm("app", event.target.value)}
                placeholder="例如：抖音 / 支付宝"
              />
            </div>
            <div className="space-y-2">
              <Label>商品名称</Label>
              <Input
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="输入商品名称"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>副标题</Label>
              <Input
                value={form.subtitle}
                onChange={(event) => updateForm("subtitle", event.target.value)}
                placeholder="一句话卖点"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>描述</Label>
              <Textarea
                value={form.description}
                onChange={(event) => updateForm("description", event.target.value)}
                rows={4}
                placeholder="填写商品说明和权益细节"
              />
            </div>
            <div className="space-y-2">
              <Label>积分价</Label>
              <Input
                type="number"
                min="0"
                value={form.pointsPrice}
                onChange={(event) => updateForm("pointsPrice", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>现金价</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cashPrice}
                onChange={(event) => updateForm("cashPrice", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>原价</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.originalCashPrice}
                onChange={(event) => updateForm("originalCashPrice", event.target.value)}
                placeholder="可留空"
              />
            </div>
            <div className="space-y-2">
              <Label>库存</Label>
              <Input
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => updateForm("stock", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>过期时间</Label>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(event) => updateForm("expiresAt", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Tabs
                value={form.status}
                onValueChange={(value) => updateForm("status", value as ProductStatus)}
              >
                <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
                  <TabsTrigger value="ACTIVE">在架</TabsTrigger>
                  <TabsTrigger value="DRAFT">草稿</TabsTrigger>
                  <TabsTrigger value="SOLD_OUT">售罄</TabsTrigger>
                  <TabsTrigger value="EXPIRED">过期</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>标签</Label>
              <Input
                value={form.tags}
                onChange={(event) => updateForm("tags", event.target.value)}
                placeholder="用逗号分隔，例如：限时, 热门, 今日推荐"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                C 端分类依赖标签：`限时`、`今日推荐`、`零元购`
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[var(--gradient-primary)] hover:brightness-110 text-white"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : editing ? (
                "保存修改"
              ) : (
                "创建商品"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
