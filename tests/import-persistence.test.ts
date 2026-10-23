import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { loadDashboard } from "../src/data/providers";
import { readSaved } from "../src/lib/import/persistence";
import { templateCsv } from "../src/lib/import/templates";
import { parseCsv, autoMapping } from "../src/lib/import/parse";
import { useDataSource } from "../src/stores/data-source";
test("IndexedDB apply/replace, error rejection, source switching, refresh recovery and clear are atomic", async () => {
  const demo = await loadDashboard(),
    s = useDataSource;
  await s.getState().hydrate(demo);
  assert.equal(s.getState().source, "demo");
  const table = parseCsv(templateCsv("product", demo)),
    mapping = autoMapping("product", table.headers);
  await s.getState().apply("product", table, mapping, "products.csv", demo);
  assert.equal((await readSaved())?.bundle.product?.rows[0].sku, "G002");
  assert.equal(s.getState().source, "imported");
  const before = JSON.stringify(s.getState().bundle);
  const invalid = { ...table, rows: [...table.rows, table.rows[0]] };
  await assert.rejects(() =>
    s.getState().apply("product", invalid, mapping, "bad.csv", demo),
  );
  assert.equal(JSON.stringify(s.getState().bundle), before);
  assert.equal(JSON.stringify((await readSaved())!.bundle), before);
  const replacement = {
    ...table,
    rows: table.rows.map((r) => r.map((v, i) => (i === 0 ? "REPLACED" : v))),
  };
  await s
    .getState()
    .apply("product", replacement, mapping, "replacement.csv", demo);
  assert.equal(s.getState().bundle.product!.rows.length, 1);
  assert.equal(s.getState().bundle.product!.rows[0].sku, "REPLACED");
  // Simulate a fresh mount after refresh: only persisted state restores the active source.
  s.setState({ source: "demo", bundle: {}, hydrated: false });
  await s.getState().hydrate(demo);
  assert.equal(s.getState().source, "imported");
  assert.equal(s.getState().bundle.product!.rows[0].sku, "REPLACED");
  await s.getState().save("demo", s.getState().bundle);
  assert.equal((await readSaved())!.source, "demo");
  assert.ok(s.getState().bundle.product);
  await s.getState().save("imported", s.getState().bundle);
  assert.equal(s.getState().source, "imported");
  await s.getState().save("demo", {});
  assert.deepEqual((await readSaved())!.bundle, {});
});
