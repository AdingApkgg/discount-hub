"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { mergeSiteContent } from "@/lib/site-content-defaults";

/**
 * Fetch admin-editable site content for a category.
 *
 * The returned map is always populated — until the query resolves it falls back
 * to the hardcoded defaults from `site-content-defaults.ts`, so consumer pages
 * never flash empty strings on first render.
 */
export function useSiteContent(category: string) {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.siteContent.getByCategory.queryOptions({ category }));

  return useMemo(() => {
    if (data) return data as Record<string, unknown>;
    return mergeSiteContent(category, {});
  }, [category, data]);
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asArray<T = unknown>(value: unknown, fallback: T[] = []): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}
