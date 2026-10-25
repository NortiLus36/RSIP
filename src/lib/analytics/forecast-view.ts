import type { DashboardData } from "@/data/providers";
import type {
  ForecastOptions,
  ForecastRow,
  ForecastSnapshot,
} from "@/types/intelligence";
export interface ForecastScope {
  categoryId: string;
  sku: string;
}
export function categoryPath(data: DashboardData, id: string) {
  const path = [];
  const seen = new Set<string>();
  let current = data.catalog.categories.find((c) => c.id === id);
  while (current) {
    if (seen.has(current.id))
      throw Error("หมวดสินค้ามีความสัมพันธ์วนซ้ำ (Unmapped)");
    seen.add(current.id);
    path.unshift(current);
    if (!current.parentId) break;
    const parent = data.catalog.categories.find(
      (c) => c.id === current!.parentId,
    );
    if (!parent) throw Error(`หมวด ${current.id}: ไม่พบหมวดหลัก (Unmapped)`);
    current = parent;
  }
  return path;
}
export function scopeForSku(data: DashboardData, sku: string): ForecastScope {
  const p = data.catalog.products.find((p) => p.sku === sku && p.active);
  if (!p) throw Error(`ไม่พบ SKU ${sku} ที่ใช้งานได้`);
  const path = categoryPath(data, p.categoryId);
  if (!path.length)
    throw Error(`SKU ${sku}: ไม่มีหมวดสินค้าที่สัมพันธ์กัน (Unmapped)`);
  return { categoryId: path[0].id, sku };
}
export function scopeProducts(data: DashboardData, scope: ForecastScope) {
  if (
    scope.categoryId &&
    !data.catalog.categories.some((c) => c.id === scope.categoryId)
  )
    throw Error("ไม่พบหมวดสินค้าในชุดข้อมูลปัจจุบัน");
  const products = data.catalog.products
    .filter((p) => p.active)
    .filter((p) => {
      const path = categoryPath(data, p.categoryId);
      if (!path.length)
        throw Error(`SKU ${p.sku}: ไม่มีหมวดสินค้าที่สัมพันธ์กัน (Unmapped)`);
      return !scope.categoryId || path.some((c) => c.id === scope.categoryId);
    });
  if (scope.sku && !products.some((p) => p.sku === scope.sku))
    throw Error("สินค้าไม่อยู่ในหมวดที่เลือก กรุณาเลือกสินค้าใหม่");
  return scope.sku ? products.filter((p) => p.sku === scope.sku) : products;
}
export function forecastView(
  data: DashboardData,
  rows: ForecastRow[],
  options: ForecastOptions,
  scope: ForecastScope,
) {
  const products = scopeProducts(data, scope),
    skus = new Set(products.map((p) => p.sku));
  const selected = rows.filter((r) => skus.has(r.sku));
  const days = [...new Set(selected.map((r) => r.date))].sort();
  const history = data.dataset.sales.filter(
    (r) =>
      skus.has(r.sku) &&
      r.date <= options.cutoff &&
      r.quantity !== undefined &&
      Number.isFinite(r.quantity) &&
      r.quantity >= 0,
  );
  const historyDays = [...new Set(history.map((r) => r.date))]
    .sort()
    .slice(-14);
  const total = (key: "quantity" | "revenue" | "low" | "high" | "baseline") =>
    selected.reduce((sum, r) => sum + r[key], 0);
  const quantity = total("quantity"),
    baseline = total("baseline");
  const daily = days.map((date) => {
    const group = selected.filter((r) => r.date === date);
    return {
      date,
      quantity: group.reduce((sum, r) => sum + r.quantity, 0),
      revenue: group.reduce((sum, r) => sum + r.revenue, 0),
      range: [
        group.reduce((sum, r) => sum + r.low, 0),
        group.reduce((sum, r) => sum + r.high, 0),
      ],
    };
  });
  return {
    products,
    rows: selected,
    quantity,
    revenue: total("revenue"),
    low: total("low"),
    high: total("high"),
    change: baseline ? ((quantity - baseline) / baseline) * 100 : null,
    assumed: selected.filter((r) => r.manual).length,
    historyDays: historyDays.length,
    chart: [
      ...historyDays.map((date) => ({
        date,
        actual: history
          .filter((r) => r.date === date)
          .reduce((sum, r) => sum + r.quantity!, 0),
        forecast: null,
        range: null,
      })),
      ...daily.map((r) => ({
        date: r.date,
        actual: null,
        forecast: r.quantity,
        range: r.range,
      })),
    ],
    daily,
    top: products
      .map((p) => ({
        sku: p.sku,
        name: p.nameTh,
        quantity: selected
          .filter((r) => r.sku === p.sku)
          .reduce((sum, r) => sum + r.quantity, 0),
      }))
      .sort((a, b) => b.quantity - a.quantity || a.sku.localeCompare(b.sku))
      .slice(0, 5),
  };
}
export function forecastSnapshot(
  data: DashboardData,
  rows: ForecastRow[],
  options: ForecastOptions,
  scope: ForecastScope,
  id: string,
  now: string,
): ForecastSnapshot {
  const view = forecastView(data, rows, options, scope);
  if (!view.rows.length) throw Error("ไม่มีผลคาดการณ์ที่บันทึกได้");
  return {
    id,
    createdAt: now,
    reference: data.dataset.intelligence?.reference ?? "legacy",
    storeId: data.store.id,
    selectedSku: scope.sku,
    selectedCategory: scope.categoryId,
    scope: { ...scope },
    options: structuredClone(options),
    rows: structuredClone(view.rows),
    totals: {
      quantity: view.quantity,
      revenue: view.revenue,
      low: view.low,
      high: view.high,
    },
    assumptions: [...new Set(view.rows.map((r) => r.assumption))],
    backtest:
      options.start <=
      new Date(Date.parse(now) + 7 * 3600000).toISOString().slice(0, 10),
  };
}
