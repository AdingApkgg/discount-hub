"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ShortcutTone = "red" | "pink" | "orange" | "gold" | "gradient";

export type ShortcutItem = {
  id: string;
  emoji?: string;
  iconUrl?: string;
  label: string;
  tone: ShortcutTone;
  badge?: string;
  linkUrl: string;
};

const TONE_OPTIONS: {
  value: ShortcutTone;
  label: string;
  preview: string;
}[] = [
  { value: "red", label: "红", preview: "bg-rose-100" },
  { value: "pink", label: "粉", preview: "bg-pink-100" },
  { value: "orange", label: "橙", preview: "bg-orange-100" },
  { value: "gold", label: "金", preview: "bg-amber-100" },
  { value: "gradient", label: "渐变", preview: "bg-gradient-to-br from-pink-200 to-orange-200" },
];

const TONE_VALUES = new Set(TONE_OPTIONS.map((t) => t.value));

function genId(): string {
  return "s" + Math.random().toString(36).slice(2, 9);
}

function IconUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handlePick(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "shortcut");
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "上传失败");
        return;
      }
      onChange(json.url);
    } catch {
      toast.error("上传失败，请稍后重试");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePick(f);
        }}
      />
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md border border-border object-contain bg-secondary/30"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="gap-1"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            替换
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onChange("")}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            移除
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="gap-1"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          上传图片
        </Button>
      )}
    </div>
  );
}

export function normalizeShortcutsForEditor(raw: unknown): ShortcutItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ShortcutItem[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const toneRaw = typeof o.tone === "string" ? o.tone : "red";
    const tone: ShortcutTone = TONE_VALUES.has(toneRaw as ShortcutTone)
      ? (toneRaw as ShortcutTone)
      : "red";
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : genId(),
      emoji: typeof o.emoji === "string" ? o.emoji : "",
      iconUrl: typeof o.iconUrl === "string" ? o.iconUrl : "",
      label: typeof o.label === "string" ? o.label : "",
      tone,
      badge: typeof o.badge === "string" ? o.badge : "",
      linkUrl: typeof o.linkUrl === "string" ? o.linkUrl : "",
    });
  }
  return out;
}

export function ShortcutsEditor({
  value,
  onChange,
  linkPlaceholder = "/invite 或 https://...",
}: {
  value: ShortcutItem[];
  onChange: (items: ShortcutItem[]) => void;
  linkPlaceholder?: string;
}) {
  function update(idx: number, patch: Partial<ShortcutItem>) {
    onChange(value.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([
      ...value,
      {
        id: genId(),
        emoji: "✨",
        label: "新图标",
        tone: "red",
        linkUrl: "/",
      },
    ]);
  }

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
          还没有图标，点击下方「新增图标」添加。
        </div>
      ) : null}

      {value.map((item, idx) => {
        const tone = TONE_OPTIONS.find((t) => t.value === item.tone) ?? TONE_OPTIONS[0];
        return (
          <div
            key={item.id}
            className="rounded-lg border border-border bg-card p-3 space-y-2.5"
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl shadow-inner",
                  tone.preview,
                )}
                aria-label="预览"
              >
                {item.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.iconUrl}
                    alt=""
                    className="h-8 w-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : item.emoji ? (
                  <span>{item.emoji}</span>
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
                {item.badge ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black leading-none text-white">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">标签文字</Label>
                  <Input
                    value={item.label}
                    placeholder="视频VIP"
                    onChange={(e) => update(idx, { label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">底色</Label>
                  <Select
                    value={item.tone}
                    onValueChange={(v) => update(idx, { tone: v as ShortcutTone })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_OPTIONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-block h-3 w-3 rounded-full border border-border",
                                t.preview,
                              )}
                            />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="上移"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => move(idx, 1)}
                  disabled={idx === value.length - 1}
                  aria-label="下移"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => remove(idx)}
                aria-label="删除"
              >
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  Emoji（无上传图时显示）
                </Label>
                <Input
                  value={item.emoji ?? ""}
                  placeholder="🎬"
                  maxLength={4}
                  onChange={(e) => update(idx, { emoji: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  自定义图标（上传后优先于 Emoji）
                </Label>
                <IconUploader
                  value={item.iconUrl ?? ""}
                  onChange={(url) => update(idx, { iconUrl: url })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  右上角徽章（可选）
                </Label>
                <Input
                  value={item.badge ?? ""}
                  placeholder="HOT / 新 / ¥100"
                  maxLength={6}
                  onChange={(e) => update(idx, { badge: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">点击跳转</Label>
              <Input
                value={item.linkUrl}
                placeholder={linkPlaceholder}
                onChange={(e) => update(idx, { linkUrl: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">
                站内填路径如 <code>/invite</code> · <code>/coupons</code> · <code>/promotions</code>；外站填完整 https 链接
              </p>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        onClick={add}
        className="w-full gap-1"
      >
        <Plus className="h-4 w-4" /> 新增图标
      </Button>
    </div>
  );
}
