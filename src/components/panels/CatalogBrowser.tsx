"use client";
import { useMemo, useState } from "react";
import type { DashboardData } from "@/data/providers";
import { useExplorer } from "@/stores/explorer";
import { inventoryForSku } from "@/lib/analytics/catalog";

export function CatalogBrowser({
  data,
  objectId,
}: {
  data: DashboardData;
  objectId: string;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [availability, setAvailability] = useState("");
  const { catalog, store } = data;
  const backroom =
    objectId === "F" ||
    store.fixtures.some((f) => f.id === objectId && f.zoneId === "F");
  const rows = useMemo(
    () =>
      catalog.products.flatMap((p) => {
        const placements = catalog.fixtureProducts.filter(
          (m) => m.sku === p.sku,
        );
        const match = backroom
          ? catalog.stockLocations.some(
              (r) =>
                r.sku === p.sku &&
                (objectId === "F" || r.fixtureId === objectId),
            )
          : placements.some(
              (m) =>
                m.fixtureId === objectId ||
                store.fixtures.some(
                  (f) => f.id === m.fixtureId && f.zoneId === objectId,
                ),
            );
        if (!match) return [];
        const local = catalog.shelfInventory.filter(
          (r) =>
            r.sku === p.sku &&
            (r.fixtureId === objectId ||
              store.fixtures.some(
                (f) => f.id === r.fixtureId && f.zoneId === objectId,
              )),
        );
        const stock = inventoryForSku(catalog, p.sku),
          shelfStock = local.reduce((s, r) => s + r.shelfStock, 0);
        const warehouse = catalog.stockLocations
          .filter(
            (r) =>
              r.sku === p.sku && (objectId === "F" || r.fixtureId === objectId),
          )
          .reduce((s, r) => s + r.backroomStock, 0);
        return [
          {
            p,
            stock,
            shelfStock,
            warehouse,
            fixtureId:
              placements.find(
                (m) =>
                  m.fixtureId === objectId ||
                  store.fixtures.some(
                    (f) => f.id === m.fixtureId && f.zoneId === objectId,
                  ),
              )?.fixtureId ?? placements[0].fixtureId,
          },
        ];
      }),
    [catalog, store, objectId, backroom],
  );
  const scopedCategories = catalog.categories.filter((c) =>
    rows.some((r) => r.p.categoryId === c.id),
  );
  const filtered = rows.filter(
    (r) =>
      (!category || r.p.categoryId === category) &&
      (!availability ||
        (availability === "oos" ? r.shelfStock === 0 : r.shelfStock > 0)) &&
      `${r.p.sku} ${r.p.nameTh} ${r.p.nameEn} ${r.p.brand}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  const totals = useMemo(
    () =>
      Object.entries(Object.groupBy(rows, (r) => r.p.unit)).map(
        ([unit, items]) => ({
          unit,
          shelf: items!.reduce((s, r) => s + r.shelfStock, 0),
          backroom: items!.reduce(
            (s, r) => s + (backroom ? r.warehouse : r.stock.backroomStock),
            0,
          ),
        }),
      ),
    [rows, backroom],
  );
  if (!rows.length) return null;
  return (
    <section className="catalog-browser" aria-label="สินค้าและสินค้าคงเหลือ">
      <h3>
        {backroom
          ? "คลังหลังร้าน · เก็บ SKU จากแผนกขาย"
          : "สินค้าและสินค้าคงเหลือ"}
      </h3>
      <p>
        {rows.length} SKU ·{" "}
        {!backroom &&
          `ขาดชั้น ${rows.filter((r) => r.shelfStock === 0).length} SKU · `}
        {scopedCategories.length} หมวดย่อย
      </p>
      <ul className="subcategory-summary">
        {scopedCategories.map((c) => (
          <li key={c.id}>{c.nameTh}</li>
        ))}
      </ul>
      {totals.map((t) => (
        <p key={t.unit} className="data-period">
          {t.unit}: บนชั้น {t.shelf} / คลัง {t.backroom}
        </p>
      ))}
      <label>
        ค้นหาสินค้า
        <input
          aria-label="ค้นหาสินค้าใน Inspector"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="catalog-filters">
        <label>
          หมวดย่อย
          <select
            aria-label="กรองหมวดย่อยสินค้า"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {scopedCategories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.nameTh}
              </option>
            ))}
          </select>
        </label>
        {!backroom && (
          <label>
            สถานะ
            <select
              aria-label="กรองสถานะสินค้า"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              <option value="oos">ขาดชั้น (OOS)</option>
              <option value="available">มีบนชั้น</option>
            </select>
          </label>
        )}
      </div>
      <div className="product-list">
        {filtered.map((r) => (
          <button
            key={r.p.sku}
            className="product-row"
            onClick={() =>
              useExplorer.getState().selectSku(r.p.sku, r.fixtureId)
            }
          >
            <strong>{r.p.nameTh}</strong>
            <small>
              {r.p.sku} · {r.p.unit}
            </small>
            <span>
              {backroom
                ? `คลัง ${r.warehouse}`
                : `บนชั้น ${r.shelfStock} · คลัง ${r.stock.backroomStock}`}{" "}
              {r.p.unit}
            </span>
            {!backroom && (
              <b className={r.shelfStock === 0 ? "oos" : "available"}>
                {r.shelfStock === 0 ? "ขาดชั้น (OOS)" : "มีสินค้าบนชั้น"}
              </b>
            )}
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">ไม่พบสินค้าที่ตรงกับตัวกรอง</p>
      )}
    </section>
  );
}
