import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadDashboard } from "../src/data/providers";
import {
  parseCsv,
  tableFromRows,
  autoMapping,
  safeCsv,
  parseUpload,
  checkWorkbook,
} from "../src/lib/import/parse";
import { validateImport, bangkokTime } from "../src/lib/import/validate";
import {
  sampleRows,
  scenarioBundle,
  templateCsv,
  dictionaryCsv,
} from "../src/lib/import/templates";
import { schemas } from "../src/lib/import/schema";
import {
  ImportedDataProvider,
  DemoDataProvider,
  experienceTotals,
} from "../src/lib/import/provider";
import { inventoryForSku } from "../src/lib/analytics/catalog";
import { peakHour, zoneAt, hourlySeries } from "../src/lib/analytics/spatial";
import {
  currentRows,
  salesTotals,
  trendChart,
} from "../src/lib/analytics/selectors";
import {
  datasetKinds,
  type DatasetKind,
  type DataRow,
  type ImportBundle,
} from "../src/lib/import/types";

const demoPromise = loadDashboard();
async function validate(
  kind: DatasetKind,
  rows?: DataRow[],
  bundle: ImportBundle = {},
) {
  const demo = await demoPromise;
  const headers = schemas[kind].map((f) => f.name);
  const table = tableFromRows([
    headers,
    ...(rows ?? sampleRows(kind, demo)).map((r) =>
      headers.map((h) => r[h] ?? ""),
    ),
  ]);
  return validateImport(
    kind,
    table,
    autoMapping(kind, headers),
    bundle,
    demo.store,
    demo.catalog,
  );
}
test("CSV parses UTF-8 Thai, BOM, quoted commas/newlines without changing values", () => {
  const t = parseCsv('\uFEFFsku,productName\r\nG1,"ข้าว, ไทย\n5 กก."');
  assert.equal(t.rows[0][1], "ข้าว, ไทย\n5 กก.");
});
test("empty, malformed and duplicate-header CSVs are rejected", () => {
  for (const text of [
    "",
    "sku",
    "sku,sku\n1,2",
    "sku,name\n1,2,3",
    'sku,name\n1,"unfinished',
    "<html>not csv</html>",
    "sku\n\x00",
  ])
    assert.throws(() => parseCsv(text));
});
test("wrong file types, fake xlsx, oversized and invalid UTF-8 inputs are rejected", async () => {
  for (const file of [
    new File(["abc"], "file.exe"),
    new File(["sku\n1"], "file.xlsx"),
    new File([], "empty.csv"),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.csv"),
    new File([new Uint8Array([255, 254])], "bad.csv"),
    new File(["sku\n1"], "fake.csv", { type: "image/png" }),
  ])
    await assert.rejects(() => parseUpload(file));
});
test("CSV file parser accepts a UTF-8 BOM upload", async () => {
  const table = await parseUpload(
    new File(["\uFEFFsku,name\nG1,ข้าว"], "ok.csv", { type: "text/csv" }),
  );
  assert.equal(table.rows.length, 1);
});
test("CSV export escapes formula injection even after whitespace", () => {
  const csv = safeCsv(
    ["name"],
    [['=HYPERLINK("x")'], [" +SUM(1,2)"], ["@cmd"], ["ปกติ"]],
  );
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes("' +SUM"));
  assert.ok(csv.includes("'@cmd"));
});
test("all five templates have real headers, samples and data dictionaries", async () => {
  const demo = await demoPromise;
  for (const kind of datasetKinds) {
    const t = parseCsv(templateCsv(kind, demo));
    assert.deepEqual(
      t.headers,
      schemas[kind].map((f) => f.name),
    );
    assert.equal(t.rows.length, 1);
    assert.ok(dictionaryCsv(kind).includes("Required"));
  }
});
test("column mapping supports custom names and rejects missing/duplicate mapping", async () => {
  const demo = await demoPromise,
    table = parseCsv("Code,Title\nG1,ข้าว");
  const v = validateImport(
    "product",
    table,
    { sku: "Code", productName: "Code" },
    {},
    demo.store,
    demo.catalog,
  );
  assert.ok(v.errors > 0);
  assert.ok(v.issues.some((i) => i.field === "productName" && i.row === 1));
});
test("valid product maps to the existing subcategory and zone without changing geometry", async () => {
  const r = await validate("product");
  assert.equal(r.errors, 0);
});
test("missing SKU, duplicate SKU, negative price and unknown category/zone fail atomically", async () => {
  const demo = await demoPromise,
    base = sampleRows("product", demo)[0];
  for (const patch of [
    { sku: "" },
    { sellingPrice: -1 },
    { zoneId: "ZZ" },
    { categoryId: "missing" },
    { categoryId: demo.catalog.categories.find((c) => !c.parentId)!.id },
    { active: "maybe" },
    { unitCost: Infinity },
  ])
    assert.ok((await validate("product", [patched(base, patch)])).errors > 0);
  assert.ok((await validate("product", [base, base])).errors > 0);
});
test("inventory rejects missing SKU, invalid fixture/zone/location, negative stock and reserved overflow", async () => {
  const demo = await demoPromise,
    bundle = scenarioBundle("oos", demo),
    base = bundle.inventory!.rows[0];
  for (const patch of [
    { sku: "UNKNOWN" },
    { fixtureId: "bad" },
    { fixtureId: "fixture-b-01" },
    { storageLocationId: "fixture-a-01" },
    { shelfStock: -1 },
    { reservedStock: 101 },
    { snapshotDate: "2026-02-30" },
  ])
    assert.ok(
      (await validate("inventory", [patched(base, patch)], bundle)).errors > 0,
    );
});
test("duplicate snapshot, conflicting warehouse and inconsistent SKU planning fail", async () => {
  const demo = await demoPromise,
    bundle = scenarioBundle("oos", demo),
    r = bundle.inventory!.rows[0];
  assert.ok((await validate("inventory", [r, r], bundle)).errors > 0);
  assert.ok(
    (
      await validate(
        "inventory",
        [r, { ...r, fixtureId: "fixture-a-02", backroomStock: 99 }],
        bundle,
      )
    ).errors > 0,
  );
  assert.ok(
    (
      await validate(
        "inventory",
        [r, { ...r, fixtureId: "fixture-a-02", safetyStock: 11 }],
        bundle,
      )
    ).errors > 0,
  );
});
test("one SKU on two fixtures counts warehouse and incoming only once", async () => {
  const demo = await demoPromise,
    bundle = scenarioBundle("oos", demo),
    r = bundle.inventory!.rows[0];
  bundle.inventory!.rows = [
    r,
    { ...r, fixtureId: "fixture-a-02", shelfStock: 5 },
  ];
  const v = await validate("inventory", bundle.inventory!.rows, bundle);
  assert.equal(v.errors, 0);
  bundle.inventory!.rows = v.rows;
  const active = new ImportedDataProvider(demo, bundle).getDashboard();
  const stock = inventoryForSku(active.catalog, "G002");
  assert.equal(stock.shelfStock, 5);
  assert.equal(stock.backroomStock, 100);
  assert.equal(stock.availableStock, 105);
  assert.equal(
    active.snapshot.metrics.find((m) => m.key === "oosRate")!.value,
    50,
  );
});
test("product replacement rejects orphaned inventory/sales and changed category", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo),
    r = b.product!.rows[0];
  assert.ok((await validate("product", [{ ...r, sku: "NEW" }], b)).errors > 0);
  assert.ok(
    (
      await validate(
        "product",
        [
          {
            ...r,
            categoryId: demo.catalog.categories.find(
              (c) => c.zoneId === "B" && c.parentId,
            )!.id,
            zoneId: "B",
          },
        ],
        b,
      )
    ).errors > 0,
  );
});
test("sales basket key is transactionId + SKU; duplicated line and conflicting dates fail", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo),
    r = b.sales!.rows[0];
  assert.ok((await validate("sales", [r, r], b)).errors > 0);
  for (const patch of [
    { quantity: 0 },
    { quantity: -1 },
    { netSalesAmount: 201 },
    { transactionDateTime: "not-a-date" },
    { transactionDateTime: "2026-02-30T12:00:00+07:00" },
    { storeId: "bad" },
    { unitPrice: 1.001 },
  ])
    assert.ok((await validate("sales", [patched(r, patch)], b)).errors > 0);
});
test("traffic validates duplicate date/hour/zone and counts, including midnight hours", async () => {
  const demo = await demoPromise,
    r = sampleRows("traffic", demo)[0];
  for (const patch of [
    { hour: 24 },
    { hour: 1.5 },
    { occupancyCount: -1 },
    { date: "2026-13-01" },
    { customerCount: "bad" },
  ])
    assert.ok((await validate("traffic", [patched(r, patch)])).errors > 0);
  assert.equal((await validate("traffic", [{ ...r, hour: 0 }])).errors, 0);
  assert.ok((await validate("traffic", [r, r])).errors > 0);
});
test("experience validates NPS totals, CSAT responses, zero denominators and dates", async () => {
  const demo = await demoPromise,
    r = sampleRows("experience", demo)[0];
  assert.ok(
    (await validate("experience", [{ ...r, promoters: 10 }])).errors > 0,
  );
  assert.ok(
    (await validate("experience", [{ ...r, satisfiedResponses: 11 }])).errors >
      0,
  );
  const zero = {
    ...r,
    totalResponses: 0,
    satisfiedResponses: 0,
    promoters: 0,
    passives: 0,
    detractors: 0,
    totalTransactions: 0,
  };
  const v = await validate("experience", [zero]);
  assert.equal(v.errors, 0);
  assert.ok(v.warnings > 0);
  assert.deepEqual(experienceTotals(v.rows), {
    csat: null,
    nps: null,
    complaintRate: null,
  });
});
test("warning-only data can apply, error data never modifies the original bundle", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo),
    before = JSON.stringify(b);
  const r = await validate(
    "inventory",
    [
      {
        ...b.inventory!.rows[0],
        storageLocationId: "",
        incomingStock: 10,
        incomingArrivalDays: "",
      },
    ],
    b,
  );
  assert.equal(r.errors, 0);
  assert.ok(r.warnings >= 2);
  await validate("inventory", [{ ...b.inventory!.rows[0], shelfStock: -1 }], b);
  assert.equal(JSON.stringify(b), before);
});
test("import → dashboard recalculates exact cents, profit and margin", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo),
    d = new ImportedDataProvider(demo, b).getDashboard();
  assert.deepEqual(salesTotals(currentRows(d.dataset)), {
    sales: 200,
    cogs: 120,
    grossProfit: 80,
    waste: 0,
  });
  assert.equal(
    d.snapshot.metrics.find((m) => m.key === "grossMargin")!.value,
    40,
  );
  assert.equal(
    d.snapshot.metrics.find((m) => m.key === "netSales")!.value,
    200,
  );
  assert.equal(trendChart(d.dataset, {}, true).length, 1);
});
test("import → inspector uses same catalog, OOS and calculator inputs as dashboard", async () => {
  const demo = await demoPromise,
    d = new ImportedDataProvider(
      demo,
      scenarioBundle("oos", demo),
    ).getDashboard();
  assert.equal(
    d.objectSnapshots
      .find((s) => s.objectId === "fixture-a-01")!
      .metrics.find((m) => m.key === "oosRate")!.value,
    100,
  );
  const inv = inventoryForSku(d.catalog, "G002");
  assert.equal(inv.suggestedOrder, 0);
  assert.equal(inv.daysOfSupply, 20);
  assert.equal(d.catalog.products[0].nameTh, "ข้าวทดสอบ 5 กก.");
  assert.equal(d.store, demo.store);
});
test("import → heatmap uses occupancy, separate footfall, actual imported dates and computed peak", async () => {
  const demo = await demoPromise,
    d = new ImportedDataProvider(
      demo,
      scenarioBundle("peak", demo),
    ).getDashboard();
  assert.deepEqual(d.spatial.dates, ["2026-10-23"]);
  assert.equal(peakHour(d.spatial, "2026-10-23"), 18);
  assert.equal(zoneAt(d.spatial, "2026-10-23", 18, "A").occupancy, 80);
  assert.equal(
    zoneAt(d.spatial, "2026-10-23", 18, "A").density,
    80 / demo.spatial.mockAreaSqm.A,
  );
  assert.equal(
    hourlySeries(d.spatial, "2026-10-23", "A").find((r) => r.hour === 18)!
      .entries,
    500,
  );
  assert.equal(zoneAt(d.spatial, "2026-10-23", 9, "A").occupancy, null);
  assert.equal(zoneAt(d.spatial, "2026-10-23", 18, "A").oosRate, 100);
});
test("all three scenario datasets pass real validation and compute different stock insights", async () => {
  const demo = await demoPromise;
  for (const name of ["oos", "peak", "overstock"] as const) {
    const b = scenarioBundle(name, demo);
    for (const k of datasetKinds)
      assert.equal(
        (await validate(k, b[k]!.rows, b)).errors,
        0,
        `${name}/${k}`,
      );
  }
  const d = new ImportedDataProvider(
    demo,
    scenarioBundle("overstock", demo),
  ).getDashboard();
  assert.equal(inventoryForSku(d.catalog, "G002").daysOfSupply, 300);
});
test("replace dataset discards old values; reset demo restores exact original provider values", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo),
    baseline = JSON.stringify(demo);
  new ImportedDataProvider(demo, b).getDashboard();
  b.sales!.rows = [
    { ...b.sales!.rows[0], netSalesAmount: 100, costAmount: 60, quantity: 1 },
  ];
  assert.equal(
    new ImportedDataProvider(demo, b)
      .getDashboard()
      .snapshot.metrics.find((m) => m.key === "netSales")!.value,
    100,
  );
  assert.equal(
    JSON.stringify(new DemoDataProvider(demo).getDashboard()),
    baseline,
  );
});
test("missing imported data stays No Data, never borrows demo sales/traffic/stock", async () => {
  const demo = await demoPromise,
    d = new ImportedDataProvider(demo, {
      product: scenarioBundle("oos", demo).product,
    }).getDashboard();
  assert.equal(d.snapshot.metrics.length, 0);
  assert.equal(d.dataset.sales.length, 0);
  assert.equal(d.spatial.zones.length, 0);
  assert.equal(d.catalog.shelfInventory.length, 0);
  assert.equal(d.dataset.source, "Imported");
});
test("customer experience recalculates CSAT NPS complaint rate from imported counts", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo);
  assert.deepEqual(experienceTotals(b.experience!.rows), {
    csat: 80,
    nps: 60,
    complaintRate: 10,
  });
});
test("dates group in Asia/Bangkok, not the uploader's system timezone", () => {
  assert.deepEqual(bangkokTime("2026-10-22T19:00:00Z"), {
    date: "2026-10-23",
    hour: 2,
  });
});
test("XLSX signature, expanded limits, safe cached formula values and worksheet parse", async () => {
  const bytes = new Uint8Array(
    await readFile(new URL("./fixtures/import-products.xlsx", import.meta.url)),
  );
  checkWorkbook(bytes);
  const { readSheet } = await import("read-excel-file/node");
  const rows = await readSheet(Buffer.from(bytes));
  const table = tableFromRows(rows);
  assert.equal(table.rows[0][0], "G002");
  assert.equal(table.rows[0][5], "100");
  const demo = await demoPromise;
  assert.equal(
    validateImport(
      "product",
      table,
      autoMapping("product", table.headers),
      {},
      demo.store,
      demo.catalog,
    ).errors,
    0,
  );
  const bomb = bytes.slice();
  const v = new DataView(bomb.buffer);
  for (let i = 0; i + 46 < bomb.length; i++)
    if (v.getUint32(i, true) === 0x02014b50) {
      v.setUint32(i + 24, 0x7fffffff, true);
      break;
    }
  assert.throws(() => checkWorkbook(bomb));
});

test("import limits bound date coverage and unsafe inventory math", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo),
    r = b.inventory!.rows[0];
  assert.ok(
    (
      await validate(
        "inventory",
        [{ ...r, averageDailyDemand: 1e9, leadTimeDays: 1e9 }],
        b,
      )
    ).errors > 0,
  );
  assert.ok(
    (await validate("inventory", [{ ...r, averageDailyDemand: 0.0000001 }], b))
      .errors > 0,
  );
  const t = sampleRows("traffic", demo)[0];
  assert.ok(
    (await validate("traffic", [t, { ...t, date: "2026-11-24" }])).errors > 0,
  );
});
test("stock-only import computes OOS without sales, including previous dated snapshots", async () => {
  const demo = await demoPromise,
    b = scenarioBundle("oos", demo);
  b.inventory!.rows.push({
    ...b.inventory!.rows[0],
    snapshotDate: "2026-10-22",
    shelfStock: 5,
  });
  delete b.sales;
  delete b.traffic;
  const d = new ImportedDataProvider(demo, b).getDashboard();
  assert.equal(d.snapshot.metrics.find((m) => m.key === "oosRate")!.value, 100);
  assert.equal(zoneAt(d.spatial, "2026-10-22", 18, "A").oosRate, 0);
  assert.equal(zoneAt(d.spatial, "2026-10-23", 18, "A").oosRate, 100);
  assert.ok(!d.snapshot.metrics.some((m) => m.key === "netSales"));
});
test("imported sales retain parent category filters used by the existing analytics dashboard", async () => {
  const demo = await demoPromise,
    d = new ImportedDataProvider(
      demo,
      scenarioBundle("oos", demo),
    ).getDashboard();
  assert.equal(
    salesTotals(currentRows(d.dataset, { categoryId: "category-a" })).sales,
    200,
  );
});
test("replacing the reference demo product master cannot break already imported fixtures", async () => {
  const demo = await demoPromise,
    original = demo.catalog.products[0],
    row = sampleRows("product", demo)[0];
  const b: ImportBundle = {
    inventory: {
      rows: [{ ...sampleRows("inventory", demo)[0], sku: original.sku }],
      fileName: "stock",
      importedAt: new Date().toISOString(),
    },
  };
  const other = demo.catalog.categories.find(
    (c) => c.zoneId === "B" && c.parentId,
  )!;
  assert.ok(
    (
      await validate(
        "product",
        [{ ...row, sku: original.sku, zoneId: "B", categoryId: other.id }],
        b,
      )
    ).errors > 0,
  );
});
function patched(base: DataRow, patch: Partial<DataRow>): DataRow {
  const result = { ...base };
  for (const [k, v] of Object.entries(patch))
    if (v !== undefined) result[k] = v;
  return result;
}
