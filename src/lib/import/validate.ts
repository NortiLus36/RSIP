import type { Store } from "@/types";
import type { ProductCatalog } from "@/types/catalog";
import { schemas } from "./schema";
import {
  type ColumnMapping,
  type DatasetKind,
  type ImportBundle,
  type DataRow,
  type Issue,
  type ParsedTable,
  importLimits,
} from "./types";

export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + "T00:00:00Z")) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value
  );
}
export function bangkokTime(value: string) {
  const date = new Date(Date.parse(value) + 7 * 3600000);
  return { date: date.toISOString().slice(0, 10), hour: date.getUTCHours() };
}
export function validateImport(
  kind: DatasetKind,
  table: ParsedTable,
  mapping: ColumnMapping,
  bundle: ImportBundle,
  store: Store,
  demo: ProductCatalog,
) {
  const issues: Issue[] = [];
  const add = (
    row: number,
    field: string,
    message: string,
    level: Issue["level"] = "error",
  ) => issues.push({ row, field, message, level });
  const used = new Set<string>();
  for (const field of schemas[kind]) {
    const col = mapping[field.name];
    if (field.required && !col)
      add(1, field.name, "ยังไม่ได้จับคู่ Required Field");
    if (col && !table.headers.includes(col))
      add(1, field.name, "ไม่พบคอลัมน์ที่เลือก");
    if (col && used.has(col))
      add(1, field.name, "ห้ามใช้คอลัมน์เดียวกับหลาย Field");
    if (col) used.add(col);
  }
  const rows: DataRow[] = table.rows.map((values, i) => {
    const row: DataRow = {};
    for (const f of schemas[kind]) {
      const raw = values[table.headers.indexOf(mapping[f.name])] ?? "";
      if (!raw) {
        if (f.required) add(i + 2, f.name, "ห้ามว่าง");
        continue;
      }
      if (f.type === "number" || f.type === "integer") {
        const n = Number(raw);
        if (
          !/^\d+(\.\d+)?$/.test(raw) ||
          !Number.isFinite(n) ||
          n < 0 ||
          n > 1e9 ||
          (f.type === "integer" && !Number.isInteger(n))
        )
          add(
            i + 2,
            f.name,
            "ต้องเป็นตัวเลขไม่ติดลบ ไม่เกิน 1,000,000,000 ตามชนิดที่ระบุ",
          );
        if (
          [
            "sellingPrice",
            "unitCost",
            "unitPrice",
            "discountAmount",
            "netSalesAmount",
            "costAmount",
          ].includes(f.name) &&
          !Number.isInteger(Math.round(n * 10000) / 100)
        )
          add(i + 2, f.name, "จำนวนเงินรองรับทศนิยมไม่เกิน 2 ตำแหน่ง");
        row[f.name] = n;
        if (
          f.type === "number" &&
          raw.includes(".") &&
          raw.split(".")[1].length > 6
        )
          add(i + 2, f.name, "จำนวนทั่วไปใช้ทศนิยมไม่เกิน 6 ตำแหน่ง");
      } else if (f.type === "boolean") {
        if (!["true", "false", "1", "0"].includes(raw.toLowerCase()))
          add(i + 2, f.name, "ใช้ true / false หรือ 1 / 0");
        row[f.name] = ["true", "1"].includes(raw.toLowerCase());
      } else {
        row[f.name] = raw;
        if (f.type === "date" && !validDate(raw))
          add(i + 2, f.name, "วันที่ต้องเป็น YYYY-MM-DD และมีอยู่จริง");
        if (
          f.type === "datetime" &&
          (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
            raw,
          ) ||
            !validDate(raw.slice(0, 10)) ||
            !Number.isFinite(Date.parse(raw)) ||
            Number(raw.slice(11, 13)) > 23 ||
            Number(raw.slice(14, 16)) > 59 ||
            Number(raw.slice(17, 19)) > 59)
        )
          add(
            i + 2,
            f.name,
            "ใช้ ISO DateTime ที่มีเขตเวลา เช่น 2026-10-23T12:00:00+07:00",
          );
      }
    }
    return row;
  });
  if (!rows.length || rows.length > importLimits.rows)
    add(1, "file", "ต้องมี 1–10,000 แถว");
  if (issues.some((i) => i.level === "error")) return summary(rows, issues);
  const dates = rows
    .map((r) =>
      String(r.snapshotDate ?? r.date ?? r.transactionDateTime ?? "").slice(
        0,
        10,
      ),
    )
    .filter(Boolean)
    .sort();
  if (
    dates.length &&
    (Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / 86400000 >=
      importLimits.coverageDays
  )
    add(1, "date", "MVP รองรับช่วงข้อมูลไม่เกิน 31 วันต่อไฟล์");
  const products =
    kind === "product"
      ? rows
      : (bundle.product?.rows ??
        demo.products.map((p) => ({
          sku: p.sku,
          categoryId: p.categoryId,
          zoneId: demo.categories.find((c) => c.id === p.categoryId)!.zoneId,
        })));
  const seen = new Set<string>(),
    stockLocations = new Map<string, string>(),
    plans = new Map<string, string>(),
    transactions = new Map<string, string>();
  rows.forEach((r, i) => {
    const num = i + 2;
    const product = products.find((p) => p.sku === r.sku);
    if (["inventory", "sales", "supply", "waste"].includes(kind) && !product)
      add(num, "sku", "SKU ไม่มีใน Product Master ปัจจุบัน");
    if (r.zoneId && !store.zones.some((z) => z.id === r.zoneId))
      add(num, "zoneId", "Zone ID ไม่มีในแผนผัง");
    if (r.storeId && r.storeId !== store.id)
      add(num, "storeId", `รหัสร้านต้องเป็น ${store.id}`);
    let key = "";
    if (kind === "supply") {
      key = JSON.stringify([r.sku, r.storageLocationId, r.eta]);
      if (
        !store.fixtures.some(
          (f) => f.id === r.storageLocationId && f.zoneId === "F",
        )
      )
        add(num, "storageLocationId", "ต้องเป็นคลังโซน F");
    }
    if (kind === "workforce") {
      key = JSON.stringify([r.date, r.hour, r.zoneId]);
      if (Number(r.hour) > 23) add(num, "hour", "ชั่วโมง 0–23");
      if (Number(r.productiveMinutes) <= 0 || Number(r.productiveMinutes) > 60)
        add(num, "productiveMinutes", "นาทีทำงานจริงต้องมากกว่า 0 ไม่เกิน 60");
    }
    if (kind === "feedback") {
      key = String(r.caseId);
      if (!["Open", "In progress", "Done"].includes(String(r.status)))
        add(num, "status", "ใช้ Open / In progress / Done");
      if (Number(r.severity) < 1 || Number(r.severity) > 5)
        add(num, "severity", "Severity 1–5");
      if (r.status === "Done" && !r.resolvedAt)
        add(num, "resolvedAt", "Done ต้องมีเวลาปิดเคส");
      if (
        r.resolvedAt &&
        Date.parse(String(r.resolvedAt)) < Date.parse(String(r.dateTime))
      )
        add(num, "resolvedAt", "เวลาปิดต้องไม่ก่อนรายงาน");
    }
    if (kind === "calendar") {
      key = JSON.stringify([r.eventId, r.sku ?? ""]);
      if (String(r.startDate) > String(r.endDate))
        add(num, "endDate", "วันจบต้องไม่ก่อนเริ่ม");
      if (!["festival", "promotion", "preparation"].includes(String(r.kind)))
        add(num, "kind", "festival / promotion / preparation");
      if (r.sku && !products.some((p) => p.sku === r.sku))
        add(num, "sku", "SKU ไม่อยู่ใน Product Master");
      if (Number(r.discountPct ?? 0) > 100 || Number(r.upliftPct) > 1000)
        add(num, "upliftPct", "Uplift สูงสุด 1000% / Discount สูงสุด 100%");
    }
    if (kind === "waste") key = JSON.stringify([r.date, r.sku]);
    if (kind === "product") {
      key = String(r.sku);
      const previous =
        bundle.product?.rows.find((p) => p.sku === r.sku) ??
        demo.products
          .filter((p) => p.sku === r.sku)
          .map((p) => ({
            categoryId: p.categoryId,
            zoneId: demo.categories.find((c) => c.id === p.categoryId)!.zoneId,
          }))[0];
      if (
        !demo.categories.some(
          (c) => c.id === r.categoryId && c.parentId && c.zoneId === r.zoneId,
        )
      )
        add(num, "categoryId", "ใช้หมวดย่อยเดิม และ Zone ต้องตรงกับหมวด");
      if (Number(r.unitCost) > Number(r.sellingPrice))
        add(num, "unitCost", "ต้นทุนสูงกว่าราคาขาย", "warning");
      for (const k of ["inventory", "sales"] as const)
        if (
          bundle[k]?.rows.some((dep) => dep.sku === r.sku) &&
          previous &&
          (previous.zoneId !== r.zoneId || previous.categoryId !== r.categoryId)
        )
          add(
            num,
            "categoryId",
            "มีข้อมูลสต็อก/ขายอ้างอิงอยู่ ต้องล้างข้อมูลนำเข้าก่อนเปลี่ยนโซนหรือหมวด SKU",
          );
    }
    if (kind === "inventory") {
      if (
        r.shelfCapacity !== undefined &&
        Number(r.shelfCapacity) < Number(r.shelfStock)
      )
        add(num, "shelfCapacity", "Capacity ต้องไม่น้อยกว่าสต็อกบนชั้น");
      if (
        Number(r.averageDailyDemand) * Number(r.leadTimeDays) +
          Number(r.safetyStock) >
        Number.MAX_SAFE_INTEGER
      )
        add(
          num,
          "leadTimeDays",
          "ผลคำนวณ Target Stock เกินขอบเขตตัวเลขที่ปลอดภัย",
        );
      const fixture = store.fixtures.find((f) => f.id === r.fixtureId);
      if (!fixture) add(num, "fixtureId", "Fixture ID ไม่มีอยู่จริง");
      else if (
        fixture.zoneId !== product?.zoneId ||
        ["F", "L"].includes(fixture.zoneId)
      )
        add(num, "fixtureId", "ชั้นวางไม่สัมพันธ์กับโซนของสินค้า");
      const location =
        r.storageLocationId || store.fixtures.find((f) => f.zoneId === "F")!.id;
      if (!r.storageLocationId)
        add(
          num,
          "storageLocationId",
          `ใช้คลังเริ่มต้น ${location} และนับครั้งเดียวต่อ SKU + สถานที่`,
          "warning",
        );
      if (!store.fixtures.some((f) => f.id === location && f.zoneId === "F"))
        add(
          num,
          "storageLocationId",
          "Storage Location ต้องเป็น Fixture โซน F",
        );
      if (Number(r.reservedStock) > Number(r.backroomStock))
        add(num, "reservedStock", "ของจองคลังต้องไม่เกิน Backroom Stock");
      key = JSON.stringify([r.snapshotDate, r.sku, r.fixtureId]);
      const locationKey = JSON.stringify([r.snapshotDate, r.sku, location]);
      const value = JSON.stringify([
        r.backroomStock,
        r.reservedStock,
        r.incomingStock,
        r.incomingArrivalDays,
      ]);
      if (
        stockLocations.has(locationKey) &&
        stockLocations.get(locationKey) !== value
      )
        add(
          num,
          "backroomStock",
          "ค่าคลังของ SKU + สถานที่ + วันเดียวกันขัดแย้งกัน",
        );
      stockLocations.set(locationKey, value);
      const planKey = JSON.stringify([r.snapshotDate, r.sku]);
      const planValue = JSON.stringify([
        r.safetyStock,
        r.averageDailyDemand,
        r.leadTimeDays,
      ]);
      if (plans.has(planKey) && plans.get(planKey) !== planValue)
        add(
          num,
          "averageDailyDemand",
          "ค่าแผนของ SKU วันเดียวกันต้องเท่ากันทุกชั้น",
        );
      plans.set(planKey, planValue);
      if (Number(r.incomingStock) > 0 && r.incomingArrivalDays === undefined)
        add(
          num,
          "incomingArrivalDays",
          "ไม่ระบุวันถึง: ไม่นำ Incoming มาหักยอดแนะนำสั่ง",
          "warning",
        );
    }
    if (kind === "sales") {
      key = JSON.stringify([r.transactionId, r.sku]);
      const value = JSON.stringify([r.transactionDateTime, r.storeId]);
      if (
        transactions.has(String(r.transactionId)) &&
        transactions.get(String(r.transactionId)) !== value
      )
        add(num, "transactionId", "ตะกร้าเดียวกันต้องใช้เวลาและร้านเดียวกัน");
      transactions.set(String(r.transactionId), value);
      if (Number(r.quantity) <= 0)
        add(num, "quantity", "จำนวนขายต้องมากกว่า 0; MVP ไม่รับรายการคืน");
      if (
        Math.abs(
          Math.round(
            (Number(r.quantity) * Number(r.unitPrice) -
              Number(r.discountAmount)) *
              100,
          ) - Math.round(Number(r.netSalesAmount) * 100),
        ) > 1
      )
        add(
          num,
          "netSalesAmount",
          "ยอดสุทธิไม่ตรง quantity × unitPrice − discountAmount",
        );
    }
    if (kind === "traffic") {
      key = JSON.stringify([r.date, r.hour, r.zoneId]);
      if (Number(r.hour) > 23) add(num, "hour", "ชั่วโมงต้องเป็น 0–23");
    }
    if (kind === "experience") {
      key = JSON.stringify([r.date, r.storeId]);
      if (Number(r.satisfiedResponses) > Number(r.totalResponses))
        add(num, "satisfiedResponses", "มากกว่าคำตอบทั้งหมด");
      if (
        Number(r.promoters) + Number(r.passives) + Number(r.detractors) !==
        Number(r.totalResponses)
      )
        add(
          num,
          "totalResponses",
          "Promoters + Passives + Detractors ต้องเท่ากับ Total Responses",
        );
      if (!r.totalResponses || !r.totalTransactions)
        add(num, "totalResponses", "ตัวหารเป็นศูนย์ แสดง No Data", "warning");
    }
    if (seen.has(key))
      add(
        num,
        kind === "product" ? "sku" : "compositeKey",
        "คีย์ซ้ำภายในชุดข้อมูล",
      );
    seen.add(key);
  });
  if (kind === "product")
    for (const k of ["inventory", "sales", "supply", "waste", "calendar"] as const)
      bundle[k]?.rows.forEach((r, i) => {
        if (r.sku && !rows.some((p) => p.sku === r.sku))
          add(
            i + 2,
            `${k}.sku`,
            "การแทนที่ Product จะทำให้ข้อมูลที่นำเข้าเดิมขาดความสัมพันธ์",
          );
      });
  if (kind === "sales")
    add(
      1,
      "fixtureId",
      "Sales ไม่มี Fixture: จัดยอดขายตาม SKU/โซนเท่านั้น ไม่เดายอดขายแต่ละชั้น",
      "warning",
    );
  if (kind === "traffic")
    add(
      1,
      "customerCount",
      "ผลรวมเป็นการผ่านโซน อาจนับคนซ้ำ ไม่ใช่ลูกค้าเข้าร้านที่ไม่ซ้ำ",
      "warning",
    );
  return summary(rows, issues);
}
function summary(rows: DataRow[], issues: Issue[]) {
  const invalid = new Set(
    issues.filter((i) => i.level === "error" && i.row > 1).map((i) => i.row),
  );
  const errors = issues.filter((i) => i.level === "error").length;
  return {
    rows,
    issues,
    total: rows.length,
    valid: issues.some((i) => i.level === "error" && i.row === 1)
      ? 0
      : rows.length - invalid.size,
    invalid: invalid.size,
    errors,
    warnings: issues.filter((i) => i.level === "warning").length,
  };
}
