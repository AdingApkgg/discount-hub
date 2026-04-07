import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <FileQuestion className="h-8 w-8 text-slate-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">找不到页面</h2>
        <p className="mt-2 text-sm text-slate-500">
          你访问的页面不存在或已被移除
        </p>
      </div>
      <Button asChild className="rounded-full px-6">
        <Link href="/">返回首页</Link>
      </Button>
    </div>
  );
}
