import type { DashboardData } from "@/data/providers";
import type { ProductCatalog } from "@/types/catalog";
import type { SpatialDataset } from "@/types/spatial";
import type { RetailDataset } from "@/types/analytics";
import { snapshotFor } from "@/lib/analytics/selectors";
import { inventoryForSku } from "@/lib/analytics/catalog";
import { csat, nps, complaintRate } from "@/lib/analytics/calculators";
import { bangkokTime } from "./validate";
import type { ImportBundle, DataRow } from "./types";
const sum = (rows: DataRow[], key: string) =>
  rows.reduce((s, r) => s + Number(r[key] ?? 0), 0);
const latest = (rows: DataRow[], field: string) =>
  rows
    .map((r) => String(r[field]))
    .sort()
    .at(-1);
export function experienceTotals(rows: DataRow[]) {
  return {
    csat: csat(sum(rows, "satisfiedResponses"), sum(rows, "totalResponses")),
    nps: nps(
      sum(rows, "promoters"),
      sum(rows, "passives"),
      sum(rows, "detractors"),
    ),
    complaintRate: complaintRate(
      sum(rows, "complaints"),
      sum(rows, "totalTransactions"),
    ),
  };
}
export class DemoDataProvider {
  constructor(private data: DashboardData) {}
  getDashboard() {
    return this.data;
  }
}
export class ImportedDataProvider {
  constructor(
    private demo: DashboardData,
    private bundle: ImportBundle,
  ) {}
  getDashboard(): DashboardData {
    const { demo, bundle } = this,
      store = demo.store;
    const productRows = bundle.product?.rows;
    const products = productRows
      ? productRows.map((r) => ({
          sku: String(r.sku),
          categoryId: String(r.categoryId),
          nameTh: String(r.productName),
          nameEn: String(r.productName),
          brand: "นำเข้า",
          unit: String(r.unit),
          sellingPrice: Number(r.sellingPrice),
          unitCost: Number(r.unitCost),
          active: Boolean(r.active),
        }))
      : demo.catalog.products;
    const inventoryDate = latest(bundle.inventory?.rows ?? [], "snapshotDate");
    const stockRows = (bundle.inventory?.rows ?? []).filter(
      (r) => r.snapshotDate === inventoryDate,
    );
    const catalog: ProductCatalog = {
      categories: demo.catalog.categories,
      products,
      fixtureProducts: [],
      shelfInventory: [],
      stockLocations: [],
      planning: [],
    };
    const locations = new Set<string>(),
      plans = new Set<string>();
    for (const r of stockRows) {
      const sku = String(r.sku),
        fixtureId = String(r.fixtureId),
        updatedAt = `${r.snapshotDate}T00:00:00+07:00`;
      catalog.fixtureProducts.push({
        sku,
        fixtureId,
        displayCapacity: Number(r.shelfCapacity ?? r.shelfStock),
      });
      catalog.shelfInventory.push({
        sku,
        fixtureId,
        shelfStock: Number(r.shelfStock),
        reservedStock: 0,
        updatedAt,
      });
      const storageId = String(
          r.storageLocationId ||
            store.fixtures.find((f) => f.zoneId === "F")!.id,
        ),
        key = JSON.stringify([sku, storageId]);
      if (!locations.has(key))
        catalog.stockLocations.push({
          sku,
          fixtureId: storageId,
          backroomStock: Number(r.backroomStock),
          reservedStock: Number(r.reservedStock),
          incomingStock: Number(r.incomingStock),
          incomingArrivalDays:
            r.incomingArrivalDays === undefined
              ? 1e9
              : Number(r.incomingArrivalDays),
          updatedAt,
        });
      locations.add(key);
      if (!plans.has(sku))
        catalog.planning.push({
          sku,
          averageDailyDemand: Number(r.averageDailyDemand),
          safetyStock: Number(r.safetyStock),
          leadTimeDays: Number(r.leadTimeDays),
        });
      plans.add(sku);
    }
    const sales = (bundle.sales?.rows ?? []).map((r) => {
      const p = products.find((p) => p.sku === r.sku)!,
        category = catalog.categories.find((c) => c.id === p.categoryId)!;
      return {
        quantity: Number(r.quantity),
        transactionId: String(r.transactionId),
        hour: bangkokTime(String(r.transactionDateTime)).hour,
        date: bangkokTime(String(r.transactionDateTime)).date,
        sku: p.sku,
        fixtureId: "",
        zoneId: category.zoneId,
        categoryId: category.parentId ?? category.id,
        netSalesCents: Math.round(Number(r.netSalesAmount) * 100),
        cogsCents: Math.round(Number(r.costAmount) * 100),
        wasteCents: 0,
      };
    });
    const asOf =
      sales
        .map((r) => r.date)
        .sort()
        .at(-1) ??
      latest(bundle.experience?.rows ?? [], "date") ??
      inventoryDate ??
      latest(bundle.traffic?.rows ?? [], "date") ??
      demo.dataset.asOf;
    if (bundle.supply) {
      catalog.stockLocations.forEach((r) => {
        r.incomingStock = 0;
        r.incomingBatches = [];
      });
      for (const r of bundle.supply.rows) {
        let loc = catalog.stockLocations.find(
          (l) => l.sku === r.sku && l.fixtureId === r.storageLocationId,
        );
        if (!loc) {
          loc = {
            sku: String(r.sku),
            fixtureId: String(r.storageLocationId),
            backroomStock: 0,
            reservedStock: 0,
            incomingStock: 0,
            incomingArrivalDays: 0,
            updatedAt: asOf,
            incomingBatches: [],
          };
          catalog.stockLocations.push(loc);
        }
        const days = Math.max(
          0,
          (Date.parse(String(r.eta)) - Date.parse(inventoryDate ?? asOf)) /
            86400000,
        );
        loc.incomingStock += Number(r.quantity);
        loc.incomingBatches!.push({
          quantity: Number(r.quantity),
          arrivalDays: days,
        });
        loc.incomingArrivalDays = Math.max(
          ...loc.incomingBatches!.map((b) => b.arrivalDays),
        );
      }
    }
    const dataset: RetailDataset = {
      ...demo.dataset,
      source: "Imported",
      intelligence: {
        reference: bundleReference(bundle),
        sourceLabel: "IMPORTED DATA",
        sales: bundle.sales?.rows ?? [],
        inventory: bundle.inventory?.rows ?? [],
        calendar: bundle.calendar?.rows ?? [],
        supply: bundle.supply?.rows ?? [],
        workforce: bundle.workforce?.rows ?? [],
        feedback: bundle.feedback?.rows ?? [],
        waste: bundle.waste?.rows ?? [],
      },
      asOf,
      sales,
      checkout: [],
      actions: [],
      storeDays: (bundle.experience?.rows ?? []).map((r) => ({
        date: String(r.date),
        traffic: Number.NaN,
        transactions: Number(r.totalTransactions),
        laborHours: Number.NaN,
        laborCost: Number.NaN,
        satisfied: Number(r.satisfiedResponses),
        responses: Number(r.totalResponses),
        promoters: Number(r.promoters),
        passives: Number(r.passives),
        detractors: Number(r.detractors),
        complaints: Number(r.complaints),
      })),
      planning: catalog.planning.map((p) => ({
        sku: p.sku,
        dailyDemand: p.averageDailyDemand,
        leadTime: p.leadTimeDays,
        safetyStock: p.safetyStock,
        incomingStock: catalog.stockLocations
          .filter((r) => r.sku === p.sku)
          .reduce((s, r) => s + r.incomingStock, 0),
        arrivalDays:
          catalog.stockLocations.find((r) => r.sku === p.sku)
            ?.incomingArrivalDays ?? 1e9,
      })),
    };
    const inventory = catalog.shelfInventory.map((r) => ({
      sku: r.sku,
      shelfId: r.fixtureId,
      categoryId: products.find((p) => p.sku === r.sku)!.categoryId,
      onHand: r.shelfStock,
      reorderPoint: catalog.planning.find((p) => p.sku === r.sku)!.safetyStock,
      backroomOnHand: inventoryForSku(catalog, r.sku).backroomStock,
    }));
    const trafficRows = bundle.traffic?.rows ?? [];
    const dates = [
      ...new Set([
        ...trafficRows.map((r) => String(r.date)),
        ...sales.map((r) => r.date),
        ...(bundle.inventory?.rows ?? []).map((r) => String(r.snapshotDate)),
      ]),
    ].sort();
    const salesHours = (bundle.sales?.rows ?? []).map((r) => ({
      ...bangkokTime(String(r.transactionDateTime)),
      r,
    }));
    const presentHours = [
      ...new Set([
        ...trafficRows.map((r) => Number(r.hour)),
        ...salesHours.map((r) => r.hour),
      ]),
    ].sort((a, b) => a - b);
    const min = presentHours[0] ?? 0,
      max = presentHours.at(-1) ?? 23;
    const hours = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    const spatial: SpatialDataset = {
      source: "IMPORTED DATA",
      timezone: "Asia/Bangkok",
      dates: dates.length ? dates : [asOf],
      hours,
      mockAreaSqm: demo.spatial.mockAreaSqm,
      storeHours: [],
      zones: [],
      stock: [],
    };
    const zoneBySku = new Map(
      products.map((p) => [
        p.sku,
        catalog.categories.find((c) => c.id === p.categoryId)!.zoneId,
      ]),
    );
    const visitsByTime = new Map<string, DataRow[]>();
    for (const r of trafficRows) {
      const key = JSON.stringify([r.date, r.hour]);
      const group = visitsByTime.get(key) ?? [];
      group.push(r);
      visitsByTime.set(key, group);
    }
    const soldByZoneTime = new Map<string, typeof salesHours>();
    for (const entry of salesHours) {
      const key = JSON.stringify([
        entry.date,
        entry.hour,
        zoneBySku.get(String(entry.r.sku)),
      ]);
      const group = soldByZoneTime.get(key) ?? [];
      group.push(entry);
      soldByZoneTime.set(key, group);
    }
    const stockByDateFixture = new Map<string, DataRow[]>();
    for (const r of bundle.inventory?.rows ?? []) {
      const key = JSON.stringify([r.snapshotDate, r.fixtureId]);
      const group = stockByDateFixture.get(key) ?? [];
      group.push(r);
      stockByDateFixture.set(key, group);
    }
    for (const date of spatial.dates)
      for (const hour of hours) {
        const visits = visitsByTime.get(JSON.stringify([date, hour])) ?? [];
        if (visits.length)
          spatial.storeHours.push({
            date,
            hour,
            entries: sum(visits, "customerCount"),
          });
        for (const zone of store.zones) {
          const traffic = visits.find((r) => r.zoneId === zone.id);
          const sold =
            soldByZoneTime.get(JSON.stringify([date, hour, zone.id])) ?? [];
          if (traffic || sold.length)
            spatial.zones.push({
              date,
              hour,
              zoneId: zone.id,
              occupancy: traffic ? Number(traffic.occupancyCount) : null,
              customerCount: traffic
                ? Number(traffic.customerCount)
                : undefined,
              salesCents: sold.length
                ? sold.reduce(
                    (s, { r }) =>
                      s + Math.round(Number(r.netSalesAmount) * 100),
                    0,
                  )
                : null,
              transactions: traffic
                ? Number(traffic.transactionCount)
                : new Set(sold.map(({ r }) => r.transactionId)).size,
            });
          // Daily stock snapshots are explicitly held constant across that date's hours.
          for (const fixture of store.fixtures.filter(
            (f) => f.zoneId === zone.id,
          )) {
            const checked =
              stockByDateFixture.get(JSON.stringify([date, fixture.id])) ?? [];
            if (checked.length)
              spatial.stock.push({
                date,
                hour,
                zoneId: zone.id,
                fixtureId: fixture.id,
                checked: checked.length,
                oos: checked.filter((r) => Number(r.shelfStock) === 0).length,
              });
          }
        }
      }
    const makeSnapshot = (id: string) => {
      const snap = snapshotFor(dataset, inventory, store, id)!;
      snap.source = "Imported";
      const fixtures = new Set(
        store.fixtures
          .filter((f) => id === store.id || id === f.zoneId || id === f.id)
          .map((f) => f.id),
      );
      const checked = inventory.filter((r) => fixtures.has(r.shelfId));
      snap.metrics = snap.metrics.filter(
        (m) => !["oosRate", "traffic", "waste"].includes(m.key),
      );
      if (checked.length)
        snap.metrics.push({
          key: "oosRate",
          label: "สินค้าขาดชั้นวาง",
          value:
            (100 * checked.filter((r) => r.onHand === 0).length) /
            checked.length,
          unit: "%",
          definition: `ตำแหน่ง SKU + Fixture ที่ Shelf Stock = 0 / ตำแหน่งที่ตรวจ · ${inventoryDate}`,
          change: "",
          trend: "warning",
        });
      snap.metrics = snap.metrics.filter((m) => Number.isFinite(m.value));
      return snap;
    };
    return {
      store,
      catalog,
      inventory,
      dataset,
      spatial,
      categories: catalog.categories,
      traffic: [],
      snapshot: makeSnapshot(store.id),
      objectSnapshots: [...store.zones, ...store.fixtures].map((o) =>
        makeSnapshot(o.id),
      ),
    };
  }
}
export function bundleReference(bundle: ImportBundle) {
  let h = 2166136261;
  const s = JSON.stringify(bundle);
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return `import-${(h >>> 0).toString(16)}`;
}
export function importCoverage(bundle: ImportBundle) {
  return Object.entries(bundle).map(([kind, d]) => ({
    kind,
    rows: d!.rows.length,
    importedAt: d!.importedAt,
    from:
      d!.rows
        .map((r) =>
          String(
            r.snapshotDate ??
              r.date ??
              r.transactionDateTime ??
              r.dateTime ??
              r.eta ??
              r.startDate ??
              "",
          ),
        )
        .filter(Boolean)
        .sort()[0] ?? "—",
    to:
      d!.rows
        .map((r) =>
          String(
            r.snapshotDate ??
              r.date ??
              r.transactionDateTime ??
              r.dateTime ??
              r.eta ??
              r.endDate ??
              "",
          ),
        )
        .filter(Boolean)
        .sort()
        .at(-1) ?? "—",
  }));
}
