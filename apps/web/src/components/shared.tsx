"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const appCardClassName =
  "gap-0 rounded-[28px] border border-[var(--app-card-border)] bg-[var(--app-card)] py-0 shadow-[var(--app-card-shadow)]";

export function SectionHeading({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 md:items-center">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function PageHeading({
  label,
  title,
  action,
}: {
  label: string;
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          {label}
        </div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-foreground md:text-[34px]">
          {title}
        </h1>
      </div>
      {action}
    </section>
  );
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] items-center justify-center",
        className,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  text,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  text: string;
  className?: string;
}) {
  return (
    <Card className={cn(appCardClassName, className)}>
      <CardContent className="p-8 text-center">
        {Icon && (
          <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        )}
        <p className="text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyStateDashed({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-dashed border-border bg-secondary/50 p-8 text-center text-sm leading-6 text-muted-foreground",
        className,
      )}
    >
      {text}
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card className={appCardClassName}>
      <CardContent className="space-y-4 p-5">
        <Skeleton className="h-5 w-1/3" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function GridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={appCardClassName}>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className={appCardClassName}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-foreground">
          {value}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
