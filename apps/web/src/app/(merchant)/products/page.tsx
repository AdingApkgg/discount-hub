"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Clock,
  Copy,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Store,
  Trash2,
  X,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type BulkDialogKind = "status" | "stock" | "delta" | "price" | "csv" | "delete";

type ProductSortKey =
  | "createdAt-desc"
  | "createdAt-asc"
  | "stock-asc"
  | "stock-desc"
  | "cashPrice-asc"
  | "cashPrice-desc"
  | "expiresAt-asc"
  | "expiresAt-desc";

const SORT_OPTIONS: { value: ProductSortKey; label: string }[] = [
  { value: "createdAt-desc", label: "最新创建" },
  { value: "createdAt-asc", label: "最早创建" },
  { value: "stock-asc", label: "库存（少→多）" },
  { value: "stock-desc", label: "库存（多→少）" },
  { value: "cashPrice-asc", label: "现金价（低→高）" },
  { value: "cashPrice-desc", label: "现金价（高→低）" },
  { value: "expiresAt-asc", label: "过期（最近）" },
  { value: "expiresAt-desc", label: "过期（最远）" },
];

const LOW_STOCK_THRESHOLD = 10;
const EXPIRING_SOON_DAYS = 7;

type ProductFormState = {
  app: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  coverImage: string;
  category: string;
  pointsPrice: string;
  cashPrice: string;
  originalCashPrice: string;
  stock: string;
  minAmount: string;
  minQuantity: string;
  purchaseNotes: string;
  usageNotes: string;
  expiresAt: string;
  tags: string;
  status: ProductStatus;
};

const DEFAULT_FORM: ProductFormState = {
  app: "",
  title: "",
  subtitle: "",
  description: "",
  imageUrl: "",
  coverImage: "",
  category: "",
  pointsPrice: "0",
  cashPrice: "0",
  originalCashPrice: "",
  stock: "0",
  minAmount: "",
  minQuantity: "",
  purchaseNotes: "",
  usageNotes: "",
  expiresAt: "",
  tags: "",
  status: "ACTIVE",
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function daysUntil(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
  const now = Date.now();
  return Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
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

/** 解析库存导入：每行 `商品ID,库存`，支持表头与逗号/制表符 */
function parseStockCsv(text: string): { id: string; stock: number }[] {
  const rows: { id: string; stock: number }[] = [];
  for (const rawLine of text.trim().split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split(/[,，\t]/).map((s) => s.trim());
    if (parts.length < 2) continue;
    const [id, stockStr] = parts;
    if (!id) continue;
    if (/^id$/i.test(id) || id.includes("商品")) continue;
    const stock = Number.parseInt(stockStr, 10);
    if (!Number.isFinite(stock)) continue;
    rows.push({ id, stock });
  }
  return rows;
}

function buildForm(product?: MerchantProduct | null): ProductFormState {
  if (!product) return DEFAULT_FORM;
  return {
    app: product.app,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    imageUrl: product.imageUrl ?? "",
    coverImage: product.coverImage ?? "",
    category: product.category ?? "",
    pointsPrice: String(product.pointsPrice),
    cashPrice: String(Number(product.cashPrice)),
    originalCashPrice:
      product.originalCashPrice == null
        ? ""
        : String(Number(product.originalCashPrice)),
    stock: String(product.stock),
    minAmount:
      product.minAmount == null ? "" : String(Number(product.minAmount)),
    minQuantity: product.minQuantity == null ? "" : String(product.minQuantity),
    purchaseNotes: (product.purchaseNotes ?? []).join("\n"),
    usageNotes: product.usageNotes ?? "",
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
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [sortBy, setSortBy] = useState<ProductSortKey>("createdAt-desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantProduct | null>(null);
  const [form, setForm] = useState<ProductFormState>(DEFAULT_FORM);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MerchantProduct | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDialog, setBulkDialog] = useState<BulkDialogKind | null>(null);
  const [bulkStatusChoice, setBulkStatusChoice] = useState<ProductStatus>("ACTIVE");
  const [bulkStockInput, setBulkStockInput] = useState("0");
  const [bulkDeltaInput, setBulkDeltaInput] = useState("0");
  const [bulkCashInput, setBulkCashInput] = useState("");
  const [bulkPointsInput, setBulkPointsInput] = useState("");
  const [bulkCsvText, setBulkCsvText] = useState("");

  const productPathFilter = trpc.product.pathFilter();

  const { data, isLoading } = useQuery(
    trpc.product.manageList.queryOptions({
      status,
      search: debouncedSearch || undefined,
      sortBy,
    }),
  );
  const products = useMemo(
    () => (data ?? []) as MerchantProduct[],
    [data],
  );

  const createMutation = useMutation(trpc.product.create.mutationOptions());
  const updateMutation = useMutation(trpc.product.update.mutationOptions());
  const deleteMutation = useMutation(trpc.product.delete.mutationOptions());
  const duplicateMutation = useMutation(trpc.product.duplicate.mutationOptions());
  const bulkSetStatusMutation = useMutation(trpc.product.bulkSetStatus.mutationOptions());
  const bulkSetStockMutation = useMutation(trpc.product.bulkSetStock.mutationOptions());
  const bulkAdjustStockMutation = useMutation(trpc.product.bulkAdjustStock.mutationOptions());
  const bulkSetPricesMutation = useMutation(trpc.product.bulkSetPrices.mutationOptions());
  const bulkImportStockMutation = useMutation(
    trpc.product.bulkImportStockRows.mutationOptions(),
  );
  const bulkDeleteMutation = useMutation(trpc.product.bulkDelete.mutationOptions());

  const bulkBusy =
    bulkSetStatusMutation.isPending ||
    bulkSetStockMutation.isPending ||
    bulkAdjustStockMutation.isPending ||
    bulkSetPricesMutation.isPending ||
    bulkImportStockMutation.isPending ||
    bulkDeleteMutation.isPending;

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

  useEffect(() => {
    const idSet = new Set(products.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [products]);

  async function afterBulkSuccess() {
    await queryClient.invalidateQueries(productPathFilter);
    setSelectedIds([]);
    setBulkDialog(null);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return Array.from(s);
    });
  }

  function toggleSelectAllOnPage() {
    const pageIds = products.map((p) => p.id);
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) => {
      if (allSelected) return prev.filter((id) => !pageIds.includes(id));
      return Array.from(new Set([...prev, ...pageIds]));
    });
  }

  function openBulk(kind: BulkDialogKind) {
    if (kind === "stock") setBulkStockInput("0");
    if (kind === "delta") setBulkDeltaInput("0");
    if (kind === "price") {
      setBulkCashInput("");
      setBulkPointsInput("");
    }
    if (kind === "csv") {
      setBulkCsvText("");
    }
    setBulkDialog(kind);
  }

  async function runBulkStatus() {
    if (selectedIds.length === 0) {
      toast.error("请先勾选商品");
      return;
    }
    try {
      const r = await bulkSetStatusMutation.mutateAsync({
        ids: selectedIds,
        status: bulkStatusChoice,
      });
      toast.success(`已更新 ${r.updated} 个商品状态`);
      await afterBulkSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "批量操作失败");
    }
  }

  async function runBulkSetStock() {
    if (selectedIds.length === 0) {
      toast.error("请先勾选商品");
      return;
    }
    const stock = Number.parseInt(bulkStockInput, 10);
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("请输入有效的库存数量");
      return;
    }
    try {
      const r = await bulkSetStockMutation.mutateAsync({
        ids: selectedIds,
        stock,
      });
      toast.success(`已统一库存，更新 ${r.updated} 条`);
      await afterBulkSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "批量操作失败");
    }
  }

  async function runBulkAdjustStock() {
    if (selectedIds.length === 0) {
      toast.error("请先勾选商品");
      return;
    }
    const delta = Number.parseInt(bulkDeltaInput, 10);
    if (!Number.isFinite(delta)) {
      toast.error("请输入有效的增减数量（可为负数）");
      return;
    }
    try {
      const r = await bulkAdjustStockMutation.mutateAsync({
        ids: selectedIds,
        delta,
      });
      toast.success(`已调整库存，处理 ${r.updated} 条`);
      await afterBulkSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "批量操作失败");
    }
  }

  async function runBulkPrices() {
    if (selectedIds.length === 0) {
      toast.error("请先勾选商品");
      return;
    }
    const cash =
      bulkCashInput.trim() === "" ? undefined : Number(bulkCashInput);
    const points =
      bulkPointsInput.trim() === "" ? undefined : Number.parseInt(bulkPointsInput, 10);
    if (
      (cash === undefined && points === undefined) ||
      (cash !== undefined && (Number.isNaN(cash) || cash < 0)) ||
      (points !== undefined && (Number.isNaN(points) || points < 0))
    ) {
      toast.error("请至少填写一项合法价格（现金价或积分价）");
      return;
    }
    try {
      const r = await bulkSetPricesMutation.mutateAsync({
        ids: selectedIds,
        cashPrice: cash,
        pointsPrice: points,
      });
      toast.success(`已批量调价，更新 ${r.updated} 条`);
      await afterBulkSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "批量操作失败");
    }
  }

  async function runBulkImportCsv() {
    const rows = parseStockCsv(bulkCsvText);
    if (rows.length === 0) {
      toast.error("未解析到有效行，请使用「商品ID,库存」格式");
      return;
    }
    try {
      const r = await bulkImportStockMutation.mutateAsync({ rows });
      toast.success(
        `导入完成：更新 ${r.updated} 条，跳过 ${r.skipped} 条`,
      );
      await queryClient.invalidateQueries(productPathFilter);
      setBulkDialog(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "导入失败");
    }
  }

  const pageIds = useMemo(() => products.map((p) => p.id), [products]);
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id)).length;
  const headerCheckboxChecked =
    pageIds.length > 0 && selectedOnPage === pageIds.length
      ? true
      : selectedOnPage > 0
        ? ("indeterminate" as const)
        : false;

  function updateForm<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(
    file: File,
    field: "imageUrl" | "coverImage" = "imageUrl",
  ) {
    const setBusy = field === "coverImage" ? setCoverUploading : setUploading;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "上传失败");
        return;
      }
      updateForm(field, json.url);
    } catch {
      toast.error("上传失败，请稍后重试");
    } finally {
      setBusy(false);
    }
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
    await queryClient.invalidateQueries(productPathFilter);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.app.trim() || !form.expiresAt) {
      toast.error("请先填写商品名称、平台和过期时间");
      return;
    }

    const minAmount = form.minAmount.trim() ? Number(form.minAmount) : undefined;
    const minQuantity = form.minQuantity.trim()
      ? Number.parseInt(form.minQuantity, 10)
      : undefined;
    const purchaseNotes = form.purchaseNotes
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      app: form.app.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || undefined,
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
      coverImage: form.coverImage || undefined,
      category: form.category.trim() || undefined,
      pointsPrice: Number(form.pointsPrice),
      cashPrice: Number(form.cashPrice),
      originalCashPrice: form.originalCashPrice
        ? Number(form.originalCashPrice)
        : undefined,
      stock: Number(form.stock),
      minAmount,
      minQuantity,
      purchaseNotes,
      usageNotes: form.usageNotes.trim() || undefined,
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
      Number.isNaN(payload.expiresAt.getTime()) ||
      (minAmount !== undefined && Number.isNaN(minAmount)) ||
      (minQuantity !== undefined && (!Number.isFinite(minQuantity) || minQuantity < 1))
    ) {
      toast.error("价格、库存、起购数量或时间格式不正确");
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
            imageUrl: payload.imageUrl ?? null,
            coverImage: payload.coverImage ?? null,
            category: payload.category,
            pointsPrice: payload.pointsPrice,
            cashPrice: payload.cashPrice,
            originalCashPrice: payload.originalCashPrice ?? null,
            stock: payload.stock,
            minAmount: payload.minAmount ?? null,
            minQuantity: payload.minQuantity ?? null,
            purchaseNotes: payload.purchaseNotes,
            usageNotes: payload.usageNotes ?? null,
            expiresAt: payload.expiresAt,
            tags: payload.tags,
            status: payload.status,
          },
        });
        toast.success("商品已更新");
      } else {
        const createStatus = payload.status === "ACTIVE" || payload.status === "DRAFT"
          ? payload.status
          : "ACTIVE";
        await createMutation.mutateAsync({ ...payload, status: createStatus });
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

  async function handleDuplicate(product: MerchantProduct) {
    setBusyId(product.id);
    try {
      await duplicateMutation.mutateAsync({ id: product.id });
      toast.success(`已复制「${product.title}」为草稿`);
      await refreshAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "复制失败");
    } finally {
      setBusyId(null);
    }
  }

  async function runBulkDelete() {
    if (selectedIds.length === 0) {
      toast.error("请先勾选商品");
      return;
    }
    try {
      const r = await bulkDeleteMutation.mutateAsync({ ids: selectedIds });
      toast.success(
        r.skipped > 0
          ? `已删除 ${r.deleted} 个，${r.skipped} 个含未完结订单已跳过`
          : `已删除 ${r.deleted} 个商品`,
      );
      await afterBulkSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "批量删除失败");
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

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id });
      toast.success(`已删除「${deleteTarget.title}」`);
      setDeleteTarget(null);
      await refreshAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "删除失败");
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
        <div className="flex flex-wrap gap-2 justify-end">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/agent-products">
              <Store className="h-4 w-4" />
              代理批发价
            </Link>
          </Button>
          <Button
            onClick={openCreateDialog}
            className="bg-transparent text-white [background-image:var(--gradient-primary)] hover:brightness-110 gap-2"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <Plus className="h-4 w-4" />
            添加商品
          </Button>
        </div>
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

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-2xl">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => openBulk("csv")}
              >
                粘贴导入库存
              </Button>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as ProductSortKey)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索商品名称 / 平台"
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {selectedIds.length > 0 ? (
            <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-card px-3 py-2.5 text-sm shadow-md ring-1 ring-primary/15 lg:top-2">
              <span className="font-medium text-foreground">已选 {selectedIds.length} 项</span>
              <Button size="sm" variant="outline" type="button" onClick={() => openBulk("status")}>
                改状态
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={() => openBulk("stock")}>
                统一库存
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={() => openBulk("delta")}>
                增减库存
              </Button>
              <Button size="sm" variant="outline" type="button" onClick={() => openBulk("price")}>
                调价
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                className="gap-1.5 text-rose-400 hover:text-rose-300 hover:border-rose-400/50"
                onClick={() => openBulk("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
                批量删除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                className="text-muted-foreground"
                onClick={() => setSelectedIds([])}
              >
                清除选择
              </Button>
            </div>
          ) : null}

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
                    <TableHead className="w-10 pr-0">
                      <Checkbox
                        checked={headerCheckboxChecked}
                        onCheckedChange={() => toggleSelectAllOnPage()}
                        aria-label="全选当前页"
                      />
                    </TableHead>
                    <TableHead className="w-14 px-0">图</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="min-w-[140px]">价格 · 库存</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const days = daysUntil(product.expiresAt);
                    const isExpiringSoon =
                      product.status === "ACTIVE" &&
                      days <= EXPIRING_SOON_DAYS &&
                      days >= 0;
                    const isExpiredAlready = days < 0;
                    const isLowStock =
                      product.status === "ACTIVE" &&
                      product.stock <= LOW_STOCK_THRESHOLD;
                    const isOutOfStock = product.stock === 0;
                    return (
                    <TableRow key={product.id} className="border-border">
                      <TableCell className="w-10 align-top pt-4">
                        <Checkbox
                          checked={selectedIds.includes(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`选择 ${product.title}`}
                        />
                      </TableCell>
                      <TableCell className="w-14 px-0 align-top pt-3">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt={product.title}
                            className="h-12 w-12 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border bg-secondary/30 text-muted-foreground">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[240px]">
                        <div className="font-semibold text-foreground">{product.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {product.app} · {product.subtitle || "无副标题"}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(product.status)}</TableCell>
                      <TableCell className="min-w-[140px] align-top pt-3 text-sm leading-tight">
                        <div>
                          <span className="text-muted-foreground">积分 </span>
                          <span className="font-medium text-foreground">{product.pointsPrice}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">现金 </span>
                          <span className="font-medium text-foreground">¥{Number(product.cashPrice).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">库存 </span>
                          {isLowStock && !isOutOfStock ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                          ) : null}
                          <span
                            className={
                              isOutOfStock
                                ? "font-semibold text-rose-300"
                                : isLowStock
                                  ? "font-semibold text-amber-300"
                                  : "font-medium text-foreground"
                            }
                          >
                            {product.stock}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isExpiredAlready
                              ? "inline-flex items-center gap-1 text-slate-400"
                              : isExpiringSoon
                                ? "inline-flex items-center gap-1 font-medium text-amber-300"
                                : "text-muted-foreground"
                          }
                        >
                          {isExpiringSoon ? <Clock className="h-3.5 w-3.5" /> : null}
                          {formatDateText(product.expiresAt)}
                          {isExpiringSoon ? (
                            <span className="text-[10px]">（{days}天）</span>
                          ) : null}
                        </span>
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={busyId === product.id || duplicateMutation.isPending}
                            onClick={() => void handleDuplicate(product)}
                          >
                            {busyId === product.id && duplicateMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            复制
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-rose-400 hover:text-rose-300 hover:border-rose-400/50"
                            onClick={() => setDeleteTarget(product)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-2 sm:col-span-2">
              <Label>商品图片</Label>
              {form.imageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={form.imageUrl}
                    alt="商品图片"
                    className="aspect-square h-40 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateForm("imageUrl", "")}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex aspect-square h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/30 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/50">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <ImagePlus className="h-6 w-6" />
                  )}
                  <span className="text-xs">
                    {uploading ? "上传中..." : "点击上传图片（JPG / PNG / WebP，≤ 5MB）"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
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

            <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
              <div className="text-sm font-semibold text-foreground">高级字段</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                覆盖详情页购买须知、使用说明，以及起购门槛与封面图等扩展字段。
              </p>
            </div>

            <div className="space-y-2">
              <Label>分类标识</Label>
              <Input
                value={form.category}
                onChange={(event) => updateForm("category", event.target.value)}
                placeholder="内部标识，留空保持默认"
              />
              <p className="text-[11px] text-muted-foreground">
                内部分类码，C 端栏目分类目前由「标签」驱动。
              </p>
            </div>

            <div className="space-y-2">
              <Label>起购金额（¥）</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.minAmount}
                onChange={(event) => updateForm("minAmount", event.target.value)}
                placeholder="可留空"
              />
            </div>

            <div className="space-y-2">
              <Label>起购数量</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={form.minQuantity}
                onChange={(event) => updateForm("minQuantity", event.target.value)}
                placeholder="可留空"
              />
            </div>

            <div className="space-y-2">
              <Label>封面图</Label>
              {form.coverImage ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.coverImage}
                    alt="封面图"
                    className="aspect-square h-32 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateForm("coverImage", "")}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/30 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary/50">
                  {coverUploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  <span className="text-[11px]">
                    {coverUploading ? "上传中..." : "海报/分享场景使用，可留空"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={coverUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "coverImage");
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>购买须知</Label>
              <Textarea
                value={form.purchaseNotes}
                onChange={(event) => updateForm("purchaseNotes", event.target.value)}
                rows={3}
                placeholder="每行一条，例如：&#10;不与其他优惠叠加&#10;限新用户使用"
              />
              <p className="text-[11px] text-muted-foreground">
                每行一条须知，将在 C 端商品详情按列表展示。
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>使用说明</Label>
              <Textarea
                value={form.usageNotes}
                onChange={(event) => updateForm("usageNotes", event.target.value)}
                rows={3}
                placeholder="一段文字说明使用流程或注意事项"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-transparent text-white [background-image:var(--gradient-primary)] hover:brightness-110"
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

      <Dialog
        open={bulkDialog !== null}
        onOpenChange={(open) => {
          if (!open) setBulkDialog(null);
        }}
      >
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {bulkDialog === "status" ? "批量修改状态" : null}
              {bulkDialog === "stock" ? "统一库存" : null}
              {bulkDialog === "delta" ? "增减库存" : null}
              {bulkDialog === "price" ? "批量调价" : null}
              {bulkDialog === "csv" ? "粘贴导入库存" : null}
              {bulkDialog === "delete" ? "批量删除商品" : null}
            </DialogTitle>
          </DialogHeader>

          {bulkDialog === "status" ? (
            <div className="space-y-2">
              <Label>目标状态</Label>
              <Select
                value={bulkStatusChoice}
                onValueChange={(v) => setBulkStatusChoice(v as ProductStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">在架</SelectItem>
                  <SelectItem value="SOLD_OUT">售罄</SelectItem>
                  <SelectItem value="DRAFT">草稿</SelectItem>
                  <SelectItem value="EXPIRED">已过期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {bulkDialog === "stock" ? (
            <div className="space-y-2">
              <Label>库存数量（绝对值）</Label>
              <Input
                type="number"
                min={0}
                value={bulkStockInput}
                onChange={(event) => setBulkStockInput(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                将应用到已选的 {selectedIds.length} 个商品。
              </p>
            </div>
          ) : null}

          {bulkDialog === "delta" ? (
            <div className="space-y-2">
              <Label>增减数量</Label>
              <Input
                type="number"
                value={bulkDeltaInput}
                onChange={(event) => setBulkDeltaInput(event.target.value)}
                placeholder="可为负数"
              />
              <p className="text-xs text-muted-foreground">
                在当前库存基础上加减，结果不低于 0。
              </p>
            </div>
          ) : null}

          {bulkDialog === "price" ? (
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label>现金价（留空则不修改）</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={bulkCashInput}
                  onChange={(event) => setBulkCashInput(event.target.value)}
                  placeholder="可选"
                />
              </div>
              <div className="space-y-2">
                <Label>积分价（留空则不修改）</Label>
                <Input
                  type="number"
                  min={0}
                  value={bulkPointsInput}
                  onChange={(event) => setBulkPointsInput(event.target.value)}
                  placeholder="可选"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                至少填写一项；留空的字段保持各商品原值不变。
              </p>
            </div>
          ) : null}

          {bulkDialog === "csv" ? (
            <div className="space-y-2">
              <Label>CSV 文本</Label>
              <Textarea
                value={bulkCsvText}
                onChange={(event) => setBulkCsvText(event.target.value)}
                rows={10}
                placeholder={`例如：\n商品ID,库存\n或每行：clxxx123,50`}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                每行一条：商品 ID 与库存，可用逗号或 Tab 分隔；不含表头亦可。单次最多 500 行。
              </p>
            </div>
          ) : null}

          {bulkDialog === "delete" ? (
            <div className="space-y-3 text-sm">
              <p className="text-foreground">
                即将永久删除已选 {selectedIds.length} 个商品，及其全部券码、已完结订单与核销记录。
              </p>
              <p className="text-xs text-muted-foreground">
                含未完结订单（待支付/已支付）的商品会被自动跳过。
              </p>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBulkDialog(null)}>
              取消
            </Button>
            {bulkDialog === "status" ? (
              <Button type="button" disabled={bulkBusy} onClick={() => void runBulkStatus()}>
                {bulkSetStatusMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "确认"
                )}
              </Button>
            ) : null}
            {bulkDialog === "stock" ? (
              <Button type="button" disabled={bulkBusy} onClick={() => void runBulkSetStock()}>
                {bulkSetStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "确认"
                )}
              </Button>
            ) : null}
            {bulkDialog === "delta" ? (
              <Button type="button" disabled={bulkBusy} onClick={() => void runBulkAdjustStock()}>
                {bulkAdjustStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "确认"
                )}
              </Button>
            ) : null}
            {bulkDialog === "price" ? (
              <Button type="button" disabled={bulkBusy} onClick={() => void runBulkPrices()}>
                {bulkSetPricesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  "确认"
                )}
              </Button>
            ) : null}
            {bulkDialog === "csv" ? (
              <Button type="button" disabled={bulkBusy} onClick={() => void runBulkImportCsv()}>
                {bulkImportStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    导入中...
                  </>
                ) : (
                  "导入"
                )}
              </Button>
            ) : null}
            {bulkDialog === "delete" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={bulkBusy}
                onClick={() => void runBulkDelete()}
              >
                {bulkDeleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    删除中...
                  </>
                ) : (
                  "确认删除"
                )}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后该商品及其关联的已完结订单、券码记录将被永久移除。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">商品名称</span>
                <span className="font-medium text-foreground">{deleteTarget.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">平台</span>
                <span className="text-foreground">{deleteTarget.app}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">当前状态</span>
                {statusBadge(deleteTarget.status)}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
