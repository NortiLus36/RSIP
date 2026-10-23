import type { DatasetKind, Field } from "./types";
const f = (
  name: string,
  type: Field["type"],
  description: string,
  example: string,
  required = true,
): Field => ({ name, type, description, example, required });
export const datasetLabels: Record<DatasetKind, string> = {
  product: "Product Master — สินค้า",
  inventory: "Inventory — สต็อก",
  sales: "Sales — ยอดขาย",
  traffic: "Customer Traffic — การผ่านโซน",
  experience: "Customer Experience — ความพึงพอใจ",
};
export const schemas: Record<DatasetKind, Field[]> = {
  product: [
    f("sku", "text", "รหัสสินค้าไม่ซ้ำ", "G002"),
    f("productName", "text", "ชื่อสินค้า", "ข้าวทดสอบ 5 กก."),
    f("categoryId", "text", "ใช้รหัสหมวดย่อยจากรายการอ้างอิง", "cat-a-sub-1"),
    f("zoneId", "text", "โซนเดิมในแผนผัง", "A"),
    f("unit", "text", "หน่วยขาย", "ถุง"),
    f("sellingPrice", "number", "ราคาขายต่อหน่วย บาท", "100"),
    f("unitCost", "number", "ต้นทุนต่อหน่วย บาท", "60"),
    f("active", "boolean", "true / false", "true"),
  ],
  inventory: [
    f("sku", "text", "SKU ใน Product Master", "G002"),
    f("fixtureId", "text", "ชั้นวางในโซนของสินค้า", "fixture-a-01"),
    ...(
      [
        ["shelfStock", "บนชั้นวางต่อ SKU + Fixture", "0"],
        [
          "backroomStock",
          "สต็อกคลังต่อ SKU + Storage Location; ค่าซ้ำหลายชั้นต้องเท่ากันและนับครั้งเดียว",
          "100",
        ],
        ["reservedStock", "ของจองในคลัง ไม่เกิน backroomStock", "0"],
        ["incomingStock", "ของกำลังเข้าต่อสถานที่คลัง", "0"],
        ["safetyStock", "สต็อกสำรองต่อ SKU", "10"],
        ["averageDailyDemand", "ความต้องการต่อวันต่อ SKU", "5"],
        ["leadTimeDays", "ระยะเวลารอสินค้า วัน", "3"],
      ] as const
    ).map(([n, d, e]) => f(n, "number", d, e)),
    f("snapshotDate", "date", "วันที่สต็อก YYYY-MM-DD", "2026-10-23"),
    f(
      "storageLocationId",
      "text",
      "คลังโซน F; ถ้าไม่ใส่ใช้คลังแรกและแจ้งเตือน",
      "fixture-f-01",
      false,
    ),
    f(
      "incomingArrivalDays",
      "number",
      "วันคาดว่าจะถึง; ไม่ใส่ไม่หัก Incoming ในยอดแนะนำสั่ง",
      "2",
      false,
    ),
  ],
  sales: [
    f(
      "transactionId",
      "text",
      "รหัสตะกร้า; คีย์บรรทัดคือ transactionId + sku",
      "TX001",
    ),
    f(
      "transactionDateTime",
      "datetime",
      "ISO 8601 พร้อมเขตเวลา; จัดกลุ่มเวลา Asia/Bangkok",
      "2026-10-23T12:00:00+07:00",
    ),
    f("sku", "text", "รหัสสินค้า", "G002"),
    f("quantity", "number", "จำนวนขาย มากกว่า 0", "2"),
    f("unitPrice", "number", "ราคาต่อหน่วย บาท", "100"),
    f("discountAmount", "number", "ส่วนลดรวมของบรรทัด บาท", "0"),
    f(
      "netSalesAmount",
      "number",
      "quantity × unitPrice − discountAmount",
      "200",
    ),
    f("costAmount", "number", "ต้นทุนรวมบรรทัด บาท", "120"),
    f("storeId", "text", "รหัสร้านจากรายการอ้างอิง", "store-001"),
  ],
  traffic: [
    f("date", "date", "วันที่ Asia/Bangkok", "2026-10-23"),
    f("hour", "integer", "ชั่วโมง 0–23 (เริ่มช่วงชั่วโมง)", "12"),
    f("zoneId", "text", "โซน; ผลรวมการผ่านหลายโซนไม่ใช่ลูกค้าไม่ซ้ำ", "A"),
    f("customerCount", "integer", "จำนวนการเข้าชม/ผ่านโซนในชั่วโมง", "100"),
    f(
      "occupancyCount",
      "integer",
      "จำนวนคน ณ snapshot ในโซน ใช้คำนวณ Density",
      "30",
    ),
    f(
      "transactionCount",
      "integer",
      "ธุรกรรมที่นับในโซนชั่วโมงนี้ ไม่ใช่ตะกร้าไม่ซ้ำทั้งร้าน",
      "20",
    ),
  ],
  experience: [
    f("date", "date", "วันที่เก็บข้อมูล", "2026-10-23"),
    f("storeId", "text", "รหัสร้าน", "store-001"),
    ...(
      [
        ["totalResponses", "คำตอบทั้งหมด", "10"],
        ["satisfiedResponses", "คำตอบพึงพอใจ", "8"],
        ["promoters", "ผู้แนะนำ", "7"],
        ["passives", "เฉย ๆ", "2"],
        ["detractors", "ไม่แนะนำ", "1"],
        ["complaints", "ข้อร้องเรียน", "1"],
        ["totalTransactions", "ธุรกรรมสำหรับตัวหาร Complaint Rate", "100"],
      ] as const
    ).map(([n, d, e]) => f(n, "integer", d, e)),
  ],
};
