import type { DashboardData } from "@/data/providers";
import type { DataRow } from "@/lib/import/types";
import type { SalesRecord } from "@/types/analytics";
import { dateAdd, monday, weekday, pct } from "./intelligence";
import { salesTotals } from "./selectors";
import { validDate } from "@/lib/import/validate";
export const overviewModes = [
  "Daily",
  "Same weekday",
  "WTD",
  "Weekly",
  "Festival",
  "Custom",
] as const;
export type OverviewMode = (typeof overviewModes)[number];
export interface OverviewFilters {
  mode: OverviewMode;
  date: string;
  start: string;
  end: string;
  comparison: "previous" | "custom";
  comparisonStart: string;
  event: string;
  zone: string;
  category: string;
  target: number;
}
export const dateList = (from: string, to: string) => {
  if (!validDate(from) || !validDate(to))
    throw new Error("กรุณาเลือกวันที่ให้ถูกต้อง");
  const n = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1;
  if (n < 1 || n > 366)
    throw new Error(
      "วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด และเลือกได้ไม่เกิน 366 วัน",
    );
  return Array.from({ length: n }, (_, i) => dateAdd(from, i));
};
export function festivals(calendar: DataRow[]) {
  const map = new Map<
    string,
    { id: string; name: string; start: string; end: string }
  >();
  for (const e of calendar.filter((r) => r.kind === "festival")) {
    const id = JSON.stringify([e.eventId, e.startDate, e.endDate]);
    map.set(id, {
      id,
      name: String(e.name),
      start: String(e.startDate),
      end: String(e.endDate),
    });
  }
  return [...map.values()];
}
export const shortDay = (d: string) =>
  new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    timeZone: "Asia/Bangkok",
  })
    .format(new Date(d + "T00:00:00+07:00"))
    .replace(/^วัน/, "");
export const fullDate = (d: string) =>
  new Intl.DateTimeFormat("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(d + "T00:00:00+07:00"));
export const compactDate = (d: string) =>
  new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(d + "T00:00:00+07:00"));
export function overviewPeriods(data: DashboardData, f: OverviewFilters) {
  const calendar = data.dataset.intelligence?.calendar ?? [],
    events = festivals(calendar),
    event = events.find((e) => e.id === f.event) ?? events[0];
  let from = f.date,
    to = f.date;
  if (f.mode === "WTD" || f.mode === "Weekly") {
    if (!validDate(f.date)) throw new Error("เลือกวันในสัปดาห์ที่ต้องการ");
    from = monday(f.date);
    to = f.mode === "Weekly" ? dateAdd(from, 6) : f.date;
  }
  if (f.mode === "Custom") {
    from = f.start;
    to = f.end;
  }
  if (f.mode === "Festival") {
    if (!event)
      throw new Error(
        "No Event Calendar · นำเข้า Business Calendar หรือเลือก Demo ตุลาคม 2569",
      );
    from = event.start;
    to = event.end;
  }
  const current = dateList(from, to);
  let previous: (string | null)[];
  if (f.mode === "Festival") {
    // Retrospective normal-day benchmark: equal count, same weekday, no event days, no day reused.
    const candidates = [
      ...new Set(data.dataset.sales.map((r) => r.date)),
    ].filter(
      (d) =>
        !calendar.some(
          (e) => String(e.startDate) <= d && String(e.endDate) >= d,
        ),
    );
    const used = new Set<string>();
    previous = current.map((d) => {
      const p = candidates
        .filter((c) => weekday(c) === weekday(d) && !used.has(c))
        .sort(
          (a, b) =>
            Math.abs(Date.parse(a) - Date.parse(d)) -
              Math.abs(Date.parse(b) - Date.parse(d)) || a.localeCompare(b),
        )[0];
      if (p) used.add(p);
      return p ?? null;
    });
  } else {
    const previousStart =
      f.mode === "Custom"
        ? f.comparison === "custom"
          ? f.comparisonStart
          : dateAdd(from, -current.length)
        : dateAdd(from, f.mode === "Daily" ? -1 : -7);
    previous = dateList(
      previousStart,
      dateAdd(previousStart, current.length - 1),
    );
  }
  return {
    current,
    previous,
    from,
    to,
    event: f.mode === "Festival" ? event : undefined,
    nonContinuous: f.mode === "Festival",
  };
}
export function overviewSelection(
  data: DashboardData,
  f: Pick<OverviewFilters, "zone" | "category">,
) {
  const skus = new Set(
    data.catalog.products
      .filter(
        (p) =>
          !f.category ||
          p.categoryId === f.category ||
          data.catalog.categories.some(
            (c) => c.id === p.categoryId && c.parentId === f.category,
          ),
      )
      .map((p) => p.sku),
  );
  return (r: { sku: string; zoneId: string }) =>
    (!f.zone || r.zoneId === f.zone) && (!f.category || skus.has(r.sku));
}
export function overviewModel(data: DashboardData, f: OverviewFilters) {
  const periods = overviewPeriods(data, f),
    matches = overviewSelection(data, f),
    sales = data.dataset.sales.filter(matches),
    days = new Set(sales.map((r) => r.date));
  const summarize = (rows: SalesRecord[]) => {
    const totals = salesTotals(rows);
    return {
      ...totals,
      margin: totals.sales ? (totals.grossProfit / totals.sales) * 100 : null,
      transactions:
        rows.length && rows.every((r) => !!r.transactionId)
          ? new Set(rows.map((r) => r.transactionId)).size
          : null,
    };
  };
  const calendar = data.dataset.intelligence?.calendar ?? [];
  const rows = periods.current.map((date, i) => {
    const previousDate = periods.previous[i],
      current = sales.filter((r) => r.date === date),
      prev = sales.filter((r) => r.date === previousDate),
      a = summarize(current),
      b = summarize(prev);
    return {
      date,
      previousDate,
      label: shortDay(date),
      actual: days.has(date) ? a.sales : null,
      previous: previousDate && days.has(previousDate) ? b.sales : null,
      current: days.has(date) ? a : null,
      prior: previousDate && days.has(previousDate) ? b : null,
      festival: calendar
        .filter(
          (e) =>
            e.kind === "festival" &&
            String(e.startDate) <= date &&
            String(e.endDate) >= date,
        )
        .map((e) => String(e.name))
        .filter((x, i, a) => a.indexOf(x) === i)
        .join(", "),
      previousFestival: calendar
        .filter(
          (e) =>
            previousDate &&
            e.kind === "festival" &&
            String(e.startDate) <= previousDate &&
            String(e.endDate) >= previousDate,
        )
        .map((e) => String(e.name))
        .filter((x, i, a) => a.indexOf(x) === i)
        .join(", "),
    };
  });
  const currentRows = sales.filter((r) => periods.current.includes(r.date)),
    previousRows = sales.filter((r) => periods.previous.includes(r.date)),
    current = summarize(currentRows),
    previous = summarize(previousRows),
    matched = rows.filter((r) => r.actual !== null && r.previous !== null),
    matchedCurrent = matched.reduce((s, r) => s + r.actual!, 0),
    matchedPrevious = matched.reduce((s, r) => s + r.previous!, 0),
    coverage = rows.filter((r) => r.actual !== null).length,
    previousCoverage = rows.filter((r) => r.previous !== null).length;
  // OOS is the exact end-date stock snapshot, never latest-stock fallback or averaged daily percentages.
  const stock = (data.dataset.intelligence?.inventory ?? []).filter(
    (r) =>
      r.snapshotDate === periods.to &&
      matches({
        sku: String(r.sku),
        zoneId:
          data.store.fixtures.find((f) => f.id === r.fixtureId)?.zoneId ?? "",
      }),
  );
  const peak = [...rows]
    .filter((r) => r.actual !== null)
    .sort((a, b) => b.actual! - a.actual! || a.date.localeCompare(b.date))[0];
  const zones = data.store.zones
    .map((z) => ({
      id: z.id,
      date: z.nameTh,
      sales: salesTotals(currentRows.filter((r) => r.zoneId === z.id)).sales,
      covered: currentRows.some((r) => r.zoneId === z.id),
    }))
    .filter((z) => !f.zone || z.id === f.zone);
  const categories = data.catalog.categories
    .filter((c) => !c.parentId)
    .map((c) => ({
      id: c.id,
      name: c.nameTh,
      ...summarize(
        currentRows.filter(
          (r) =>
            r.categoryId === c.id ||
            data.catalog.products.some(
              (p) =>
                p.sku === r.sku &&
                data.catalog.categories.some(
                  (sub) => sub.id === p.categoryId && sub.parentId === c.id,
                ),
            ),
        ),
      ),
    }))
    .filter((c) => c.sales !== 0)
    .sort((a, b) => b.sales - a.sales);
  return {
    periods,
    rows,
    current,
    previous,
    coverage,
    previousCoverage,
    expected: rows.length,
    matched: matched.length,
    matchedCurrent,
    matchedPrevious,
    growth: matched.length ? pct(matchedCurrent, matchedPrevious) : null,
    difference: matched.length ? matchedCurrent - matchedPrevious : null,
    marginDifference:
      coverage &&
      previousCoverage &&
      current.margin !== null &&
      previous.margin !== null
        ? current.margin - previous.margin
        : null,
    stockDate: periods.to,
    oos: stock.length
      ? (stock.filter((r) => Number(r.shelfStock) === 0).length /
          stock.length) *
        100
      : null,
    stockPositions: stock.length,
    targetAchievement:
      coverage && Number.isFinite(f.target) && f.target > 0
        ? (current.sales / f.target) * 100
        : null,
    peak,
    zones,
    categories,
    oneDay: new Set(sales.map((r) => r.date)).size === 1,
    partial: coverage < rows.length || previousCoverage < rows.length,
  };
}
