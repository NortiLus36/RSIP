"use client";
import { useMemo } from "react";
import type { DashboardData } from "@/data/providers";
import { useIntelligence } from "@/stores/intelligence";
import { dateAdd, demandForecast } from "@/lib/analytics/intelligence";
import type { ForecastOptions } from "@/types/intelligence";
export function defaultOptions(data: DashboardData): ForecastOptions {
  const cutoff =
    data.dataset.sales
      .map((r) => r.date)
      .sort()
      .at(-1) ?? data.dataset.asOf.slice(0, 10);
  return {
    cutoff,
    start: dateAdd(cutoff, 1),
    horizon: 7,
    scenario: "Expected",
    manual: false,
    baseDemand: 10,
    weekendPct: 20,
    festivalPct: 0,
    promotionPct: 0,
  };
}
export function useForecast(data: DashboardData) {
  const ref = data.dataset.intelligence?.reference ?? "legacy",
    saved = useIntelligence((s) => s.options[ref]);
  const options = useMemo(() => saved ?? defaultOptions(data), [saved, data]);
  const result = useMemo(() => {
    try {
      return { rows: demandForecast(data, options), error: "" };
    } catch (e) {
      return { rows: [], error: String(e) };
    }
  }, [data, options]);
  return {
    ref,
    options,
    ...result,
    setOptions: (p: Partial<ForecastOptions>) =>
      useIntelligence
        .getState()
        .setOptions(ref, {
          ...(useIntelligence.getState().options[ref] ?? options),
          ...p,
        }),
  };
}

export function usePlanningSku(data: DashboardData) {
  const ref = data.dataset.intelligence?.reference ?? "legacy",
    selected = useIntelligence((s) => s.selection[ref]);
  const sku = data.catalog.products.some((p) => p.sku === selected)
    ? selected
    : (data.catalog.products[0]?.sku ?? "");
  return [
    sku,
    (sku: string) => useIntelligence.getState().selectSku(ref, sku),
  ] as const;
}
