"use client";
import { useState } from "react";
import type { InventoryItem } from "@/types";
import type { RetailDataset } from "@/types/analytics";
import { demoValues } from "@/lib/analytics/demos";
import { CalculatorForm } from "./CalculatorForm";
import type { ProductCatalog } from "@/types/catalog";
import { inventoryForSku } from "@/lib/analytics/catalog";
export function InventoryPlanner({
  dataset,
  items,
  catalog,
  initialSku,
  onSkuChange,
}: {
  dataset: RetailDataset;
  items: InventoryItem[];
  catalog?: ProductCatalog;
  initialSku?: string | null;
  onSkuChange?: (sku: string) => void;
}) {
  const [sku, setSku] = useState(initialSku ?? items[0]?.sku ?? "");
  const [query, setQuery] = useState("");
  const item = items.find((i) => i.sku === sku) ?? items[0];
  const product = catalog?.products.find((p) => p.sku === item?.sku);
  const stock = catalog && item ? inventoryForSku(catalog, item.sku) : null;
  const plan = dataset.planning.find((p) => p.sku === item?.sku);
  const arrivals =
    catalog?.stockLocations
      .filter((r) => r.sku === item?.sku)
      .map((r) => r.incomingArrivalDays) ?? [];
  const sameArrival = new Set(arrivals).size === 1;
  if (!item || !dataset.planning.some((profile) => profile.sku === item.sku))
    return (
      <p className="empty-state">
        No Data · ไม่มีข้อมูลสินค้า/แผนเติมสินค้าสำหรับวัตถุนี้
      </p>
    );
  return (
    <>
      <label className="sku-selector">
        ค้นหาสินค้า{" "}
        <input
          aria-label="ค้นหา SKU ในแผนเติมสินค้า"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <label className="sku-selector">
        SKU ที่ใช้วางแผน
        <select
          value={item.sku}
          onChange={(e) => {
            setSku(e.target.value);
            onSkuChange?.(e.target.value);
          }}
        >
          {items
            .filter(
              (i) =>
                i.sku === item.sku ||
                `${i.sku} ${catalog?.products.find((p) => p.sku === i.sku)?.nameTh ?? ""}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((i) => (
              <option key={`${i.sku}:${i.shelfId}`} value={i.sku}>
                {catalog?.products.find((p) => p.sku === i.sku)?.nameTh} ·{" "}
                {i.sku} · {i.shelfId}
              </option>
            ))}
        </select>
      </label>
      {product && stock && (
        <section className="product-detail" aria-label="รายละเอียดสินค้า">
          <h3>{product.nameTh}</h3>
          <p>
            {product.brand} · {product.sku}
          </p>
          <dl>
            <dt>หมวดสินค้า</dt>
            <dd>
              {
                catalog?.categories.find((c) => c.id === product.categoryId)
                  ?.nameTh
              }
            </dd>
            <dt>ราคาขาย / ต้นทุนต่อ{product.unit}</dt>
            <dd>
              {product.sellingPrice.toLocaleString("th-TH")} /{" "}
              {product.unitCost.toLocaleString("th-TH")} บาท
            </dd>
            <dt>บนชั้น / คลังหลังร้าน</dt>
            <dd>
              {stock.shelfStock} / {stock.backroomStock} {product.unit}
            </dd>
            <dt>จองแล้ว / พร้อมใช้</dt>
            <dd>
              {stock.reservedStock} / {stock.availableStock} {product.unit}
            </dd>
            <dt>กำลังเข้า</dt>
            <dd>
              {stock.incomingStock} {product.unit}
            </dd>
            <dt>ความต้องการเฉลี่ยต่อวัน</dt>
            <dd>
              {plan?.dailyDemand} {product.unit}/วัน
            </dd>
            <dt>Days of Supply / แนะนำสั่ง</dt>
            <dd>
              {stock.daysOfSupply == null
                ? "N/A"
                : stock.daysOfSupply.toFixed(2)}{" "}
              วัน / {stock.suggestedOrder} {product.unit}
            </dd>
          </dl>
          <p className="form-hint">
            {dataset.source === "Imported" ? "IMPORTED DATA" : "Actual mock"} ·
            คลังรวมจากสถานที่จัดเก็บระดับ SKU ครั้งเดียว ·
            ไม่รวมของจองในสต็อกพร้อมใช้
          </p>
        </section>
      )}
      <p className="data-period">
        Stock snapshot ·{" "}
        {catalog?.shelfInventory
          .find((r) => r.sku === item.sku)
          ?.updatedAt.slice(0, 10) ?? dataset.asOf}{" "}
        · Shelf {item.onHand} / Backroom {item.backroomOnHand ?? "No Data"}{" "}
        {product?.unit ?? "ชิ้น"}
      </p>
      <CalculatorForm
        key={item.sku}
        kind="inventory"
        productUnit={product?.unit}
        defaults={
          stock && plan
            ? {
                demand: plan.dailyDemand,
                leadTime: plan.leadTime,
                safety: plan.safetyStock,
                available: stock.availableStock,
                incoming: sameArrival
                  ? stock.incomingStock
                  : stock.eligibleIncoming,
                arrival: sameArrival ? arrivals[0] : 0,
              }
            : demoValues("inventory", dataset, items, item.sku)
        }
      />
      {stock && !sameArrival && (
        <p className="form-hint">
          Incoming เริ่มต้นนับเฉพาะ {stock.eligibleIncoming} {product?.unit}{" "}
          ที่มาทัน Lead Time จากทั้งหมด {stock.incomingStock}; Arrival = 0
          เป็นยอดที่คัดเงื่อนไขแล้ว สามารถเปลี่ยนเพื่อจำลองใหม่ได้
        </p>
      )}
    </>
  );
}
