"use client";
import { useMemo } from "react";
import type { DashboardData } from "@/data/providers";
import { useIntelligence } from "@/stores/intelligence";
import { dateAdd, demandForecast } from "@/lib/analytics/intelligence";
import { validDate } from "@/lib/import/validate";
import type { ForecastOptions } from "@/types/intelligence";
export function defaultOptions(data: DashboardData): ForecastOptions {
  const cutoff =
    data.dataset.sales
      .filter(
        (r) =>
          validDate(r.date) &&
          r.quantity !== undefined &&
          Number.isFinite(r.quantity) &&
          r.quantity >= 0,
      )
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
    festivalMode: "calendar",
    promotionMode: "calendar",
    festivalPct: 0,
    promotionPct: 0,
  };
}
export function useForecast(data: DashboardData) {
  const ref = data.dataset.intelligence?.reference ?? "legacy",
    saved = useIntelligence((s) => s.options[ref]);
  const options = useMemo(
    () =>
      saved
        ? {
            ...saved,
            festivalMode:
              saved.festivalMode ??
              (saved.festivalPct ? ("manual" as const) : ("calendar" as const)),
            promotionMode:
              saved.promotionMode ??
              (saved.promotionPct
                ? ("manual" as const)
                : ("calendar" as const)),
          }
        : defaultOptions(data),
    [saved, data],
  );
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
      useIntelligence.getState().setOptions(ref, {
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
