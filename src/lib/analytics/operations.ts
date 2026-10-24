import type { DashboardData } from "@/data/providers";
import type { QuickReport, StaffTask } from "@/types/intelligence";
import type { ManagementAction } from "@/types/analytics";
export function validateQuickReport(
  data: DashboardData,
  r: Pick<
    QuickReport,
    | "sku"
    | "fixtureId"
    | "count"
    | "replenished"
    | "createdAt"
    | "category"
    | "note"
  >,
) {
  if (
    !data.catalog.fixtureProducts.some(
      (p) => p.sku === r.sku && p.fixtureId === r.fixtureId,
    )
  )
    throw new Error("SKU / Fixture ไม่สัมพันธ์กัน");
  if (
    !Number.isFinite(Date.parse(r.createdAt)) ||
    Date.parse(r.createdAt) > Date.now() + 60000
  )
    throw new Error("เวลารายงานไม่ถูกต้อง");
  if (
    [r.count, r.replenished].some(
      (n) => !Number.isFinite(n) || n < 0 || n > 1e6,
    ) ||
    r.note.length > 1000 ||
    !r.category
  )
    throw new Error("ข้อมูลตรวจนับไม่ถูกต้อง");
  const capacity = data.catalog.fixtureProducts.find(
    (p) => p.sku === r.sku && p.fixtureId === r.fixtureId,
  )!.displayCapacity;
  if (r.count > capacity)
    throw new Error(`ยอดนับเกิน Shelf Capacity ${capacity}`);
  if (
    r.replenished >
    data.catalog.stockLocations
      .filter((p) => p.sku === r.sku)
      .reduce((s, p) => s + p.backroomStock - p.reservedStock, 0)
  )
    throw new Error("เติมสินค้าเกินคลังที่พร้อมใช้");
  if (r.replenished > r.count)
    throw new Error("จำนวนเติมต้องไม่เกินยอดนับหลังเติม");
  const latest = data.catalog.shelfInventory.find(
    (p) => p.sku === r.sku && p.fixtureId === r.fixtureId,
  );
  if (latest && Date.parse(r.createdAt) < Date.parse(latest.updatedAt))
    throw new Error("รายงานเก่ากว่า Stock Snapshot ล่าสุด กรุณาตรวจนับใหม่");
  if (latest && r.count < latest.reservedStock)
    throw new Error("ยอดนับต่ำกว่าจำนวนที่จองไว้");
}
export function applyApprovedReports(
  base: DashboardData,
  reports: QuickReport[],
  resetAt = "",
): DashboardData {
  const ref = base.dataset.intelligence?.reference ?? "legacy";
  const chosen = reports
    .filter(
      (r) =>
        r.reference === ref &&
        r.status === "Approved" &&
        (r.reviewedAt ?? r.createdAt) > resetAt,
    )
    .sort((a, b) =>
      (a.reviewedAt ?? a.createdAt).localeCompare(b.reviewedAt ?? b.createdAt),
    );
  if (!chosen.length) return base;
  const catalog = structuredClone(base.catalog);
  const intelligence = base.dataset.intelligence
    ? structuredClone(base.dataset.intelligence)
    : undefined;
  const accepted: QuickReport[] = [];
  for (const r of chosen) {
    const pos = catalog.shelfInventory.find(
      (p) => p.sku === r.sku && p.fixtureId === r.fixtureId,
    );
    if (!pos) continue;
    // Recheck against each preceding approved movement, never overspend warehouse stock.
    try {
      validateQuickReport({ ...base, catalog }, r);
    } catch {
      continue;
    }
    accepted.push(r);
    pos.shelfStock = r.count;
    pos.updatedAt = r.createdAt;
    let transfer = r.replenished;
    for (const loc of catalog.stockLocations.filter((p) => p.sku === r.sku)) {
      const take = Math.min(transfer, loc.backroomStock - loc.reservedStock);
      loc.backroomStock -= take;
      transfer -= take;
      if (take) loc.updatedAt = r.createdAt;
    }
    // Update the active derived snapshot view, never the persisted imported bundle.
    if (intelligence) {
      const date = new Date(Date.parse(r.createdAt) + 7 * 3600000)
        .toISOString()
        .slice(0, 10);
      let raw = intelligence.inventory.find(
        (x) =>
          x.sku === r.sku &&
          x.fixtureId === r.fixtureId &&
          x.snapshotDate === date,
      );
      if (!raw) {
        const template = intelligence.inventory
          .filter((x) => x.sku === r.sku && x.fixtureId === r.fixtureId)
          .sort((a, b) =>
            String(a.snapshotDate).localeCompare(String(b.snapshotDate)),
          )
          .at(-1);
        if (template) {
          raw = { ...template, snapshotDate: date };
          intelligence.inventory.push(raw);
        }
      }
      if (raw) {
        raw.shelfStock = r.count;
        raw.isClosingSnapshot = false;
        raw.approvedReportId = r.id;
      }
      for (const loc of catalog.stockLocations.filter((l) => l.sku === r.sku)) {
        for (const row of intelligence.inventory.filter(
          (x) =>
            x.sku === r.sku &&
            x.snapshotDate === date &&
            x.storageLocationId === loc.fixtureId,
        )) {
          row.backroomStock = loc.backroomStock;
          row.reservedStock = loc.reservedStock;
        }
      }
    }
  }
  const inventory = base.inventory.map((i) => ({
    ...i,
    onHand:
      catalog.shelfInventory.find(
        (r) => r.sku === i.sku && r.fixtureId === i.shelfId,
      )?.shelfStock ?? i.onHand,
    backroomOnHand: catalog.stockLocations
      .filter((r) => r.sku === i.sku)
      .reduce((s, r) => s + r.backroomStock, 0),
  }));
  const snapshot = (s: DashboardData["snapshot"]) => {
    const fixtures = new Set(
      base.store.fixtures
        .filter(
          (f) =>
            s.objectId === base.store.id ||
            s.objectId === f.zoneId ||
            s.objectId === f.id,
        )
        .map((f) => f.id),
    );
    const rows = inventory.filter((i) => fixtures.has(i.shelfId));
    return {
      ...s,
      metrics: s.metrics.map((m) =>
        m.key === "oosRate" && rows.length
          ? {
              ...m,
              value:
                (rows.filter((r) => r.onHand === 0).length / rows.length) * 100,
              definition: "Approved Quick Report / latest stock positions",
            }
          : m,
      ),
    };
  };
  const times = accepted.map((r) => ({
    r,
    date: new Date(Date.parse(r.createdAt) + 7 * 3600000)
      .toISOString()
      .slice(0, 10),
    hour: new Date(Date.parse(r.createdAt) + 7 * 3600000).getUTCHours(),
  }));
  const stock = base.spatial.stock.map((row) => ({ ...row }));
  for (const { r, date, hour } of times) {
    if (
      !stock.some(
        (p) =>
          p.date === date && p.hour === hour && p.fixtureId === r.fixtureId,
      )
    )
      stock.push({
        date,
        hour,
        fixtureId: r.fixtureId,
        zoneId: r.zoneId,
        checked: 0,
        oos: 0,
      });
  }
  for (const row of stock) {
    const updates = times.filter(
      (t) =>
        t.r.fixtureId === row.fixtureId &&
        (t.date < row.date || (t.date === row.date && t.hour <= row.hour)),
    );
    if (!updates.length) continue;
    const positions = base.catalog.shelfInventory
      .filter((p) => p.fixtureId === row.fixtureId)
      .map((p) => ({
        ...p,
        shelfStock:
          updates.filter((t) => t.r.sku === p.sku).at(-1)?.r.count ??
          p.shelfStock,
      }));
    row.checked = positions.length;
    row.oos = positions.filter((p) => p.shelfStock === 0).length;
  }
  const spatial = {
    ...base.spatial,
    stock,
    dates: [
      ...new Set([...base.spatial.dates, ...times.map((t) => t.date)]),
    ].sort(),
    hours: [
      ...new Set([...base.spatial.hours, ...times.map((t) => t.hour)]),
    ].sort((a, b) => a - b),
  };
  return {
    ...base,
    catalog,
    dataset: { ...base.dataset, intelligence },
    inventory,
    spatial,
    snapshot: snapshot(base.snapshot),
    objectSnapshots: base.objectSnapshots.map(snapshot),
  };
}
export function taskAction(task: StaffTask): ManagementAction {
  return {
    id: task.actionId,
    zoneId: task.zoneId,
    problem: `${task.priority}: ${task.reason}`,
    owner: task.role,
    severity: task.priority === "Reinforce" ? 4 : 2,
    urgency: 4,
    impact: 3,
    status: task.status,
    critical: "none",
  };
}
