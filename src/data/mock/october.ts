import type { DashboardData } from "@/data/providers";
import type { DataRow, ImportBundle, DatasetKind } from "@/lib/import/types";
import { ImportedDataProvider } from "@/lib/import/provider";
export const festivalSource =
  "https://www.tatnews.org/2026/10/thailand-celebrates-vegetarian-festival-2026-across-the-country/";
export function octoberBundle(demo: DashboardData): ImportBundle {
  const products: DataRow[] = demo.catalog.products.map((p) => ({
    sku: p.sku,
    productName: p.nameTh,
    categoryId: p.categoryId,
    zoneId: demo.catalog.categories.find((c) => c.id === p.categoryId)!.zoneId,
    unit: p.unit,
    sellingPrice: p.sellingPrice,
    unitCost: p.unitCost,
    active: p.active,
  }));
  const veg: [string, string, string, number, number][] = [
    ["A", "เส้นหมี่เจ", "แพ็ก", 35, 22],
    ["A", "บะหมี่เจ", "แพ็ก", 45, 29],
    ["A", "เห็ดหอมแห้ง", "ถุง", 89, 56],
    ["A", "ซีอิ๊วเจ", "ขวด", 39, 25],
    ["A", "โปรตีนเกษตรชนิดแห้ง", "ถุง", 49, 30],
    ["C", "เต้าหู้ขาว", "แพ็ก", 28, 17],
    ["C", "ผักสดรวมเจ", "แพ็ก", 35, 20],
    ["C", "เห็ดสดรวม", "แพ็ก", 45, 27],
    ["D", "อาหารเจแช่แข็ง", "แพ็ก", 59, 37],
    ["D", "โปรตีนพืชแช่เย็น", "แพ็ก", 69, 43],
    ["E", "นมถั่วเหลืองเจ", "กล่อง", 18, 11],
    ["E", "น้ำเต้าหู้เจ", "ขวด", 22, 13],
    ["K", "ข้าวผัดเจพร้อมรับประทาน", "กล่อง", 55, 31],
  ];
  veg.forEach(([zoneId, productName, unit, sellingPrice, unitCost], i) =>
    products.push({
      sku: `VEG-${String(i + 1).padStart(3, "0")}`,
      zoneId,
      productName,
      unit,
      sellingPrice,
      unitCost,
      active: true,
      categoryId: demo.catalog.categories.find(
        (c) => c.zoneId === zoneId && c.parentId,
      )!.id,
    }),
  );
  const calendar: DataRow[] = products
    .filter((p) => String(p.sku).startsWith("VEG-"))
    .flatMap((p, i) => [
      {
        eventId: "VEG2026",
        startDate: "2026-10-10",
        endDate: "2026-10-18",
        name: "กินเจ 10–18 ต.ค. (ททท.)",
        kind: "festival",
        sku: p.sku,
        upliftPct: 60 + (i % 3) * 20,
        discountPct: 0,
      },
      {
        eventId: "PREP-VEG",
        startDate: "2026-10-08",
        endDate: "2026-10-09",
        name: "เตรียมซื้อก่อนกินเจ (สมมติ)",
        kind: "preparation",
        sku: p.sku,
        upliftPct: 25,
        discountPct: 0,
      },
    ]);
  const sales: DataRow[] = [],
    inventory: DataRow[] = [],
    traffic: DataRow[] = [],
    experience: DataRow[] = [],
    workforce: DataRow[] = [];
  const locations = new Map(
    demo.catalog.fixtureProducts.map((p) => [p.sku, p.fixtureId]),
  );
  for (let day = 1; day <= 23; day++) {
    const date = `2026-10-${String(day).padStart(2, "0")}`,
      weekday = new Date(date + "T00:00:00Z").getUTCDay(),
      weekend = weekday === 0 || weekday === 6,
      peak = weekend ? 12 : 18;
    products.forEach((p, i) => {
      const isVeg = String(p.sku).startsWith("VEG-"),
        event =
          isVeg && day >= 10 && day <= 18
            ? 1 + (60 + ((i - 52) % 3) * 20) / 100
            : isVeg && day >= 8 && day <= 9
              ? 1.25
              : 1;
      const demand = Math.max(
        1,
        Math.round(
          (isVeg ? 8 : (i % 9) + 2) *
            (weekend ? 1.35 : 1) *
            (1 + day * 0.006) *
            event *
            (1 + (((day + i) % 5) - 2) * 0.06),
        ),
      );
      const fixtureId =
        locations.get(String(p.sku)) ??
        demo.store.fixtures.find((f) => f.zoneId === p.zoneId)!.id;
      const shelf =
          day === 23 && i % 11 === 0 ? 0 : Math.max(2, demand * 2 - (i % 7)),
        backroom = isVeg && day > 18 ? demand * 18 : 40 + demand * 3;
      inventory.push({
        sku: p.sku,
        fixtureId,
        shelfStock: shelf,
        shelfCapacity: Math.max(100, demand * 4),
        backroomStock: backroom,
        reservedStock: 0,
        incomingStock: 10,
        safetyStock: 8,
        averageDailyDemand: isVeg ? 8 : (i % 9) + 2,
        leadTimeDays: 2,
        snapshotDate: date,
        storageLocationId: "fixture-f-01",
        incomingArrivalDays: 2,
      });
      for (let n = 0; n < 4; n++) {
        const quantity =
          n === 3
            ? demand - Math.floor(demand / 4) * 3
            : Math.floor(demand / 4);
        if (!quantity) continue;
        const hour = [10, 12, 16, 18][n],
          discount = day === 17 && i % 4 === 0 ? 0.05 : 0;
        sales.push({
          transactionId: `OCT-${day}-${i}-${n}`,
          transactionDateTime: `${date}T${hour}:00:00+07:00`,
          sku: p.sku,
          quantity,
          unitPrice: p.sellingPrice,
          discountAmount:
            Math.round(quantity * Number(p.sellingPrice) * discount * 100) /
            100,
          netSalesAmount:
            Math.round(
              quantity * Number(p.sellingPrice) * (1 - discount) * 100,
            ) / 100,
          costAmount: Math.round(quantity * Number(p.unitCost) * 100) / 100,
          storeId: demo.store.id,
        });
      }
    });
    for (let hour = 8; hour <= 22; hour++)
      for (const [i, z] of demo.store.zones.entries()) {
        const count = Math.round(
          (10 + (i % 5) * 3) *
            (hour === peak ? 2.5 : hour === 12 || hour === 18 ? 1.7 : 0.65) *
            (weekend ? 1.3 : 1) *
            (day >= 10 && day <= 18 && ["A", "C", "D", "E", "K"].includes(z.id)
              ? 1.35
              : 1) *
            (1 + day * 0.003),
        );
        traffic.push({
          date,
          hour,
          zoneId: z.id,
          customerCount: count,
          occupancyCount: Math.round(count * (0.35 + (i % 3) * 0.05)),
          transactionCount: sales.filter(
            (r) =>
              String(r.transactionDateTime).startsWith(`${date}T${hour}`) &&
              products.find((p) => p.sku === r.sku)?.zoneId === z.id,
          ).length,
        });
        workforce.push({
          date,
          hour,
          zoneId: z.id,
          staffAvailable: hour === peak ? 1 : 2,
          productiveMinutes: 45,
          hourlyCost: 80,
          serviceMinutes: 0.4,
        });
      }
    const totalTransactions = new Set(
      sales
        .filter((r) => String(r.transactionDateTime).startsWith(date))
        .map((r) => r.transactionId),
    ).size;
    experience.push({
      date,
      storeId: demo.store.id,
      totalResponses: 50,
      satisfiedResponses: 40 + (day % 7),
      promoters: 30 + (day % 5),
      passives: 12 - (day % 5),
      detractors: 8,
      complaints: day % 4,
      totalTransactions,
    });
  }
  const wrap = (rows: DataRow[]) => ({
    rows,
    fileName: "SYNTHETIC DEMO DATA · October 2026",
    importedAt: "2026-10-23T23:59:00+07:00",
  });
  const b: ImportBundle = {};
  for (const [kind, rows] of Object.entries({
    product: products,
    inventory,
    sales,
    traffic,
    experience,
    workforce,
    calendar,
  }))
    b[kind as DatasetKind] = wrap(rows);
  return b;
}
export function octoberDashboard(legacy: DashboardData): DashboardData {
  const b = octoberBundle(legacy),
    d = new ImportedDataProvider(legacy, b).getDashboard();
  d.dataset.source = "Mock";
  d.dataset.intelligence!.reference = "october-2026-v2";
  d.dataset.intelligence!.sourceLabel =
    "SYNTHETIC DEMO DATA · 1–23 October 2026";
  d.dataset.actions = legacy.dataset.actions;
  d.spatial.source = "DEMO DATA";
  // Synthetic arrivals are assigned to exactly one first zone, so demo store entries are not duplicated across zones.
  d.dataset.storeDays.forEach((day) => {
    day.traffic = d.spatial.storeHours
      .filter((r) => r.date === day.date)
      .reduce((s, r) => s + r.entries, 0);
    day.laborHours = 8 * 14;
    day.laborCost = day.laborHours * 80;
  });
  for (const s of [d.snapshot, ...d.objectSnapshots]) s.source = "Mock";
  d.snapshot.metrics.push({
    key: "traffic",
    label: "ผู้เข้าร้านจำลอง",
    value: d.dataset.storeDays.find((r) => r.date === d.dataset.asOf)!.traffic,
    unit: "people",
    definition: "Synthetic: แต่ละ entry ถูกกำหนดโซนแรกเพียงหนึ่งโซน",
    change: "",
    trend: "good",
  });
  return d;
}
