import { test } from "node:test";
import assert from "node:assert/strict";
import * as calc from "../src/lib/analytics/calculators";
import { validateDraft } from "../src/lib/analytics/validation";
import {
  calculatorFields,
  calculateModule,
} from "../src/lib/analytics/modules";
import {
  currentRows,
  salesTotals,
  categoryChart,
  trendChart,
  snapshotFor,
  rowsFor,
} from "../src/lib/analytics/selectors";
import { analyticsDataset, inventory } from "../src/data/mock";
import { floorPlan } from "../src/config/floor-plan";
import { groupSales } from "../src/lib/analytics/exploration";
import {
  contributionInsight,
  prioritizeActions,
} from "../src/lib/analytics/insights";
const close = (actual: number | null, expected: number) =>
  assert.ok(
    actual !== null && Math.abs(actual - expected) < 1e-8,
    `${actual} != ${expected}`,
  );
test("gross profit/margin and sales estimate reflect inputs, including a loss", () => {
  assert.equal(calc.grossProfit(1000, 650), 350);
  close(calc.grossMargin(1000, 650), 35);
  assert.equal(calc.grossProfit(100, 150), -50);
  assert.equal(calc.grossMargin(100, 150), -50);
  assert.equal(calc.grossMargin(0, 50), null);
  assert.equal(calc.estimatedSales(100, 100, 20), 2000);
  assert.equal(calc.estimatedSales(100, 0, 20), 0);
  assert.throws(() => calc.estimatedSales(100, 101, 20));
});
test("inventory order accounts for eligible incoming and never orders negative quantities", () => {
  assert.deepEqual(calc.inventoryPlan(10, 5, 20, 15, 10, 3), {
    leadTimeDemand: 50,
    targetStock: 70,
    eligibleIncoming: 10,
    suggestedOrder: 45,
    daysOfSupply: 1.5,
  });
  assert.equal(calc.inventoryPlan(10, 5, 20, 15, 10, 6).suggestedOrder, 55);
  assert.equal(calc.inventoryPlan(10, 5, 20, 100, 50).suggestedOrder, 0);
  assert.equal(calc.inventoryPlan(0, 5, 20, 0, 0).daysOfSupply, null);
  assert.equal(calc.inventoryPlan(0, 0, 0, 0, 0).suggestedOrder, 0);
  assert.equal(calc.inventoryPlan(10, 5, 20, 15, 10, 5).eligibleIncoming, 10);
});
test("OOS boundaries and denominator zero are explicit", () => {
  assert.equal(calc.oosRate(0, 0), null);
  assert.equal(calc.oosRate(0, 10), 0);
  assert.equal(calc.oosRate(10, 10), 100);
  close(calc.oosRate(2, 50), 4);
  assert.throws(() => calc.oosRate(11, 10));
  assert.throws(() => calc.oosRate(0.5, 10));
});
test("CSAT validates respondent counts", () => {
  assert.equal(calc.csat(0, 0), null);
  assert.equal(calc.csat(0, 100), 0);
  assert.equal(calc.csat(100, 100), 100);
  assert.equal(calc.csat(92, 100), 92);
  assert.throws(() => calc.csat(10, 9));
});
test("NPS is a signed score with consistent totals", () => {
  assert.equal(calc.nps(100, 0, 0), 100);
  assert.equal(calc.nps(0, 0, 100), -100);
  assert.equal(calc.nps(0, 100, 0), 0);
  assert.equal(calc.nps(0, 0, 0), null);
  assert.equal(calc.nps(120, 50, 30, 200), 45);
  assert.throws(() => calc.nps(120, 50, 30, 199));
  assert.throws(() => calc.nps(-1, 0, 1));
});
test("complaints, waste and labor formulas handle zero denominators", () => {
  assert.equal(calc.complaintRate(3, 2000), 1.5);
  assert.equal(calc.complaintRate(0, 0), null);
  assert.equal(calc.complaintRate(2, 1), 2000);
  assert.equal(calc.wasteRatio(20, 1000), 2);
  assert.equal(calc.wasteRatio(1, 0), null);
  assert.equal(calc.salesPerLaborHour(1000, 10), 100);
  assert.equal(calc.salesPerLaborHour(0, 0), null);
  assert.equal(calc.laborCostRate(200, 1000), 20);
  assert.equal(calc.laborCostRate(1, 0), null);
});
test("incremental contribution can favor lower sales, tie, or produce a loss", () => {
  assert.equal(calc.incrementalContribution(25000, 17000, 4000), 4000);
  assert.equal(calc.incrementalContribution(18000, 9000, 2000), 7000);
  assert.equal(calc.incrementalContribution(0, 0, 0), 0);
  assert.equal(calc.incrementalContribution(100, 200, 50), -150);
});
for (const invalid of [-1, NaN, Infinity, -Infinity])
  test(`invalid numeric input ${String(invalid)} never leaks non-finite results`, () => {
    assert.throws(() => calc.grossProfit(invalid, 0));
    assert.throws(() => calc.grossMargin(100, invalid));
    assert.throws(() => calc.inventoryPlan(invalid, 1, 1, 1, 1));
    assert.throws(() => calc.oosRate(invalid, 10));
    assert.throws(() => calc.csat(invalid, 10));
    assert.throws(() => calc.complaintRate(invalid, 10));
    assert.throws(() => calc.incrementalContribution(1, 1, invalid));
  });
test("overflow and invalid draft strings are rejected before display", () => {
  assert.throws(() => calc.inventoryPlan(1e308, 1e308, 0, 0, 0));
  assert.throws(() => calc.estimatedSales(Number.MAX_SAFE_INTEGER, 100, 1e308));
  for (const input of ["", " ", "abc", "NaN", "Infinity", "1e999", "-1"]) {
    const result = validateDraft({ sales: input }, [
      { key: "sales", label: "Sales", unit: "THB" },
    ]);
    assert.equal(result.valid, false, input);
  }
  assert.equal(
    validateDraft(
      { conversion: "101" },
      calculatorFields.retail.filter((f) => f.key === "conversion"),
    ).valid,
    false,
  );
  assert.equal(
    validateDraft(
      { oos: ".5" },
      calculatorFields.operations.filter((f) => f.key === "oos"),
    ).valid,
    false,
  );
  assert.equal(
    validateDraft({ sales: "0" }, [
      { key: "sales", label: "Sales", unit: "THB" },
    ]).values.sales,
    0,
  );
});
test("all result modules derive values rather than returning fixed mock results", () => {
  const a = calculateModule("scenario", {
    salesA: 100,
    cogsA: 50,
    costA: 10,
    salesB: 70,
    cogsB: 20,
    costB: 5,
  });
  assert.equal(a[0].value, 40);
  assert.equal(a[1].value, 45);
  const b = calculateModule("scenario", {
    salesA: 200,
    cogsA: 50,
    costA: 10,
    salesB: 70,
    cogsB: 20,
    costB: 5,
  });
  assert.equal(b[0].value, 140);
});
test("daily/weekly charts, pivots and snapshots reconcile to exact sales cents", () => {
  for (const weekly of [false, true]) {
    const rows = currentRows(analyticsDataset, {}, weekly);
    const total = salesTotals(rows);
    const chart = categoryChart(rows, floorPlan);
    close(
      chart.reduce((s, r) => s + r.sales, 0),
      total.sales,
    );
    for (const group of ["zoneId", "categoryId", "sku"] as const)
      assert.equal(
        groupSales(rows, group).reduce((s, g) => s + g.salesCents, 0),
        Math.round(total.sales * 100),
      );
  }
  const today = currentRows(analyticsDataset);
  const storeSnapshot = snapshotFor(
    analyticsDataset,
    inventory,
    floorPlan,
    floorPlan.id,
  )!;
  close(
    storeSnapshot.metrics.find((m) => m.key === "netSales")!.value,
    salesTotals(today).sales,
  );
  for (const z of floorPlan.zones) {
    const snapshot = snapshotFor(analyticsDataset, inventory, floorPlan, z.id)!;
    const expected = salesTotals(
      currentRows(analyticsDataset, { zoneId: z.id }),
    );
    assert.equal(
      snapshot.metrics.find((m) => m.key === "netSales")?.value,
      expected.sales || undefined,
    );
  }
  close(trendChart(analyticsDataset).at(-1)!.sales, salesTotals(today).sales);
});
test("fixture/zone/SKU IDs join the existing provider graph without aliases", () => {
  for (const row of analyticsDataset.sales) {
    const fixture = floorPlan.fixtures.find((f) => f.id === row.fixtureId)!;
    const item = inventory.find((i) => i.sku === row.sku)!;
    assert.equal(fixture.zoneId, row.zoneId);
    assert.equal(item.shelfId, fixture.id);
    assert.equal(item.categoryId, row.categoryId);
  }
  assert.equal(rowsFor(analyticsDataset, { fixtureId: "missing" }).length, 0);
  assert.equal(
    snapshotFor(analyticsDataset, inventory, floorPlan, "missing"),
    undefined,
  );
  assert.ok(
    snapshotFor(
      analyticsDataset,
      inventory,
      floorPlan,
      "fixture-l-01",
    )!.metrics.some((m) => m.key === "waitTime"),
  );
  assert.equal(
    snapshotFor(analyticsDataset, inventory, floorPlan, "fixture-f-01")!.metrics
      .length,
    0,
  );
});
test("priority scores validate range independently of critical escalation", () => {
  assert.equal(calc.priorityScore(1, 1, 1), 3);
  assert.equal(calc.priorityScore(5, 5, 5), 15);
  for (const n of [0, 6, NaN, 0.5])
    assert.throws(() => calc.priorityScore(n, 1, 1));
  assert.ok(
    analyticsDataset.actions.some(
      (a) =>
        a.critical !== "none" &&
        calc.priorityScore(a.severity, a.urgency, a.impact) === 3,
    ),
  );
});
test("business insights do not rank critical incidents by normal scores or mutate the dataset", () => {
  const before = JSON.stringify(analyticsDataset.actions);
  const sorted = prioritizeActions(analyticsDataset.actions);
  assert.equal(sorted.critical[0].id, "action-003");
  assert.equal(sorted.normal[0].id, "action-001");
  assert.equal(JSON.stringify(analyticsDataset.actions), before);
  assert.match(contributionInsight(400, 450), /^B/);
  assert.match(contributionInsight(400, 400), /เท่ากัน/);
  assert.equal(
    validateDraft({ sales: "1e100" }, [
      { key: "sales", label: "Sales", unit: "THB" },
    ]).valid,
    false,
  );
});
