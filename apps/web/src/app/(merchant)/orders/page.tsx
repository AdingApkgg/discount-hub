"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const orders = [
  {
    id: "JZ-A3F2-K9D7X1LM",
    user: "用户 0xA3F2",
    product: "通用八折卷",
    amount: "¥10.00",
    points: 300,
    status: "已完成",
    time: "2026-03-31 14:22",
  },
  {
    id: "JZ-19D8-P2Q6R8WN",
    user: "用户 0x19D8",
    product: "VIP 周卡",
    amount: "¥12.00",
    points: 260,
    status: "已完成",
    time: "2026-03-31 13:15",
  },
  {
    id: "JZ-4C11-T5V3Y0ZB",
    user: "用户 0x4C11",
    product: "1000 钻石",
    amount: "¥0.00",
    points: 300,
    status: "待核销",
    time: "2026-03-31 12:08",
  },
  {
    id: "JZ-7E55-M8N2J4XC",
    user: "用户 0x7E55",
    product: "新用户首充礼",
    amount: "¥9.00",
    points: 220,
    status: "已核销",
    time: "2026-03-30 22:41",
  },
];

function statusBadge(status: string) {
  switch (status) {
    case "已完成":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-400/30">
          {status}
        </Badge>
      );
    case "已核销":
      return (
        <Badge className="bg-blue-500/10 text-blue-300 border-blue-400/30">
          {status}
        </Badge>
      );
    case "待核销":
      return (
        <Badge className="bg-amber-500/10 text-amber-300 border-amber-400/30">
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function OrdersPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">订单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看所有订单和核销状态
        </p>
      </div>

      <Card className="border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead>订单号</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>商品</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead className="text-right">积分</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} className="border-border">
                <TableCell className="font-mono text-xs text-foreground">
                  {o.id}
                </TableCell>
                <TableCell className="text-foreground">{o.user}</TableCell>
                <TableCell className="text-foreground">{o.product}</TableCell>
                <TableCell className="text-right text-foreground">
                  {o.amount}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {o.points}
                </TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
                <TableCell className="text-muted-foreground">{o.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
