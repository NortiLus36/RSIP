"use client";
import { useState } from "react";
import type { InventoryItem } from "@/types";
import type { RetailDataset } from "@/types/analytics";
import { demoValues } from "@/lib/analytics/demos";
import { CalculatorForm } from "./CalculatorForm";
export function InventoryPlanner({
  dataset,
  items,
}: {
  dataset: RetailDataset;
  items: InventoryItem[];
}) {
  const [sku, setSku] = useState(items[0]?.sku ?? "");
  const item = items.find((i) => i.sku === sku) ?? items[0];
  if (!item || !dataset.planning.some((profile) => profile.sku === item.sku))
    return (
      <p className="empty-state">
        No Data · ไม่มีข้อมูลสินค้า/แผนเติมสินค้าสำหรับวัตถุนี้
      </p>
    );
  return (
    <>
      <label className="sku-selector">
        SKU ที่ใช้วางแผน
        <select value={item.sku} onChange={(e) => setSku(e.target.value)}>
          {items.map((i) => (
            <option key={i.sku} value={i.sku}>
              {i.sku} · {i.shelfId}
            </option>
          ))}
        </select>
      </label>
      <p className="data-period">
        Stock snapshot · {dataset.asOf} · Shelf {item.onHand} / Backroom{" "}
        {item.backroomOnHand ?? "No Data"} ชิ้น
      </p>
      <CalculatorForm
        key={item.sku}
        kind="inventory"
        defaults={demoValues("inventory", dataset, items, item.sku)}
      />
    </>
  );
}
