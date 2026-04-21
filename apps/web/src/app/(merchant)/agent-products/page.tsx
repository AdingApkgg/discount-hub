"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Package, Store } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@/trpc/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type MerchantProduct = RouterOutputs["product"]["manageList"][number];

function fmtMoney(v: unknown): string {
  if (v == null) return "—";
  const n =
    typeof v === "object" &&
    v !== null &&
    "toNumber" in v &&
    typeof (v as { toNumber(): number }).toNumber === "function"
      ? (v as { toNumber(): number }).toNumber()
      : Number(v);
  return Number.isFinite(n) ? `¥${n.toFixed(2)}` : "—";
}

export default function AgentProductsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [clearAgent, setClearAgent] = useState(false);
  const [bulkAgentPrice, setBulkAgentPrice] = useState("");
  const [bulkAgentMinQty, setBulkAgentMinQty] = useState("");

  const { data, isLoading } = useQuery(trpc.product.manageList.queryOptions({}));
  const products = useMemo(
    () => (data ?? []) as MerchantProduct[],
    [data],
  );

  const bulkAgentMutation = useMutation(trpc.product.bulkSetAgentPricing.mutationOptions());

  useEffect(() => {
    const idSet = new Set(products.map((p) => p.id));
    setSelectedIds((prev) => prev.filter((id) => idSet.has(id)));
  }, [products]);

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

  const pageIds = useMemo(() => products.map((p) => p.id), [products]);
  const selectedOnPage = pageIds.filter((id) => selectedIds.includes(id)).length;
  const headerCheckboxChecked =
    pageIds.length > 0 && selectedOnPage === pageIds.length
      ? true
      : selectedOnPage > 0
        ? ("indeterminate" as const)
        : false;

  function openBulk() {
    setClearAgent(false);
    setBulkAgentPrice("");
    setBulkAgentMinQty("");
    setBulkOpen(true);
  }

  async function runBulkAgent() {
    if (selectedIds.length === 0) {
      toast.error("请先勾选商品");
      return;
    }
    try {
      if (clearAgent) {
        const r = await bulkAgentMutation.mutateAsync({
          ids: selectedIds,
          clearAgent: true,
        });
        toast.success(`已清空代理价，更新 ${r.updated} 条`);
      } else {
        const ap =
          bulkAgentPrice.trim() === "" ? undefined : Number(bulkAgentPrice);
        const mq =
          bulkAgentMinQty.trim() === ""
            ? undefined
            : Number.parseInt(bulkAgentMinQty, 10);
        if (
          (ap === undefined && mq === undefined) ||
          (ap !== undefined && (Number.isNaN(ap) || ap < 0)) ||
          (mq !== undefined && (Number.isNaN(mq) || mq < 1))
        ) {
          toast.error("请填写有效的批发价和/或最低订量（订量≥1），或勾选清空");
          return;
        }
        const r = await bulkAgentMutation.mutateAsync({
          ids: selectedIds,
          agentPrice: ap,
          agentMinQty: mq,
        });
        toast.success(`已更新代理配置，${r.updated} 条`);
      }
      await queryClient.invalidateQueries();
      setSelectedIds([]);
      setBulkOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">代理批发价</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            为代理商配置专属批发价与最低起订量；清空后 C 端按普通现金价展示。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              商品管理
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-5 space-y-4">
          {selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
              <Store className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-foreground">已选 {selectedIds.length} 项</span>
              <Button size="sm" variant="outline" type="button" onClick={openBulk}>
                批量设置代理价
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
              <div className="mt-4 text-sm font-medium text-foreground">暂无商品</div>
              <div className="mt-1 text-sm text-muted-foreground">
                请先在「商品管理」中创建商品。
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
                    <TableHead>商品</TableHead>
                    <TableHead className="text-right">批发价</TableHead>
                    <TableHead className="text-right">最低订量</TableHead>
                    <TableHead className="text-right">现金价</TableHead>
                    <TableHead className="text-right">库存</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id} className="border-border">
                      <TableCell className="w-10 align-top pt-4">
                        <Checkbox
                          checked={selectedIds.includes(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                          aria-label={`选择 ${product.title}`}
                        />
                      </TableCell>
                      <TableCell className="min-w-[220px]">
                        <div className="font-semibold text-foreground">{product.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{product.app}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(product.agentPrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.agentMinQty != null ? product.agentMinQty : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ¥{Number(product.cashPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {product.stock}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>批量设置代理价</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="clear-agent"
                checked={clearAgent}
                onCheckedChange={(v) => setClearAgent(v === true)}
              />
              <Label htmlFor="clear-agent" className="cursor-pointer font-normal">
                清空代理批发价与起订量
              </Label>
            </div>
            {!clearAgent ? (
              <>
                <div className="space-y-2">
                  <Label>批发价（元）</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={bulkAgentPrice}
                    onChange={(e) => setBulkAgentPrice(e.target.value)}
                    placeholder="可选，与起订量至少填一项"
                  />
                </div>
                <div className="space-y-2">
                  <Label>最低起订量</Label>
                  <Input
                    type="number"
                    min={1}
                    value={bulkAgentMinQty}
                    onChange={(e) => setBulkAgentMinQty(e.target.value)}
                    placeholder="可选，整数 ≥1"
                  />
                </div>
              </>
            ) : null}
            <p className="text-xs text-muted-foreground">
              未勾选清空时，仅填写批发价或仅填写起订量也可提交；未填字段保持各商品原值。
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={bulkAgentMutation.isPending}
              onClick={() => void runBulkAgent()}
            >
              {bulkAgentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
