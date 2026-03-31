"use client";

import { Plus } from "lucide-react";
import { scrollsLimited, todayPicks, zeroCost } from "@/data/mock";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductsPage() {
  const allProducts = [...scrollsLimited, ...todayPicks, ...zeroCost];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">商品管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理在架优惠券和虚拟商品
          </p>
        </div>
        <Button
          className="bg-[var(--gradient-primary)] hover:brightness-110 text-white gap-2"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="h-4 w-4" />
          添加商品
        </Button>
      </div>

      <Card className="border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>商品名称</TableHead>
              <TableHead>平台</TableHead>
              <TableHead className="text-right">积分价</TableHead>
              <TableHead className="text-right">现金价</TableHead>
              <TableHead>库存</TableHead>
              <TableHead>过期时间</TableHead>
              <TableHead>标签</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allProducts.map((p) => (
              <TableRow key={p.id} className="border-border">
                <TableCell>
                  <div className="font-semibold text-foreground">{p.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.subtitle}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.app}</TableCell>
                <TableCell className="text-right text-foreground">
                  {p.pointsPrice}
                </TableCell>
                <TableCell className="text-right text-foreground">
                  ¥{p.cashPrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.availableCountText}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.expiresAt}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="text-[11px] border-border"
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
