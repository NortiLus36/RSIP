import Papa from "papaparse";
import {
  importLimits,
  type ParsedTable,
  type ColumnMapping,
  type DatasetKind,
} from "./types";
import { schemas } from "./schema";

export function tableFromRows(input: unknown[][]): ParsedTable {
  const rows = input.map((r) =>
    r.map((v) =>
      v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").trim(),
    ),
  );
  while (rows.length && rows.at(-1)!.every((v) => !v)) rows.pop();
  if (rows.length < 2)
    throw new Error("ไฟล์ต้องมี Header และข้อมูลอย่างน้อย 1 แถว");
  const headers = rows.shift()!;
  if (headers.length > importLimits.columns || rows.length > importLimits.rows)
    throw new Error("เกินขีดจำกัด 10,000 แถว / 64 คอลัมน์");
  if (
    headers.some((h) => !h) ||
    new Set(headers.map((h) => h.toLowerCase())).size !== headers.length
  )
    throw new Error("Header ว่างหรือซ้ำกัน");
  rows.forEach((r, i) => {
    if (r.length !== headers.length)
      throw new Error(`แถว ${i + 2}: จำนวนคอลัมน์ไม่ตรง Header`);
    if (r.some((v) => v.length > importLimits.cellLength))
      throw new Error(`แถว ${i + 2}: ค่ายาวเกิน 2,000 ตัวอักษร`);
  });
  return { headers, rows, warnings: [] };
}
export function parseCsv(text: string): ParsedTable {
  if (/^\s*</.test(text) || /\x00/.test(text))
    throw new Error("เนื้อหาไม่ใช่ CSV UTF-8");
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });
  if (result.errors.length)
    throw new Error(`CSV ไม่ถูกต้อง: ${result.errors[0].message}`);
  return tableFromRows(result.data);
}
export function checkWorkbook(bytes: Uint8Array) {
  if (
    bytes[0] !== 0x50 ||
    bytes[1] !== 0x4b ||
    bytes[2] !== 3 ||
    bytes[3] !== 4
  )
    throw new Error("เนื้อหาไม่ใช่ XLSX");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let total = 0,
    count = 0,
    workbook = false;
  for (let i = 0; i + 46 <= bytes.length; i++)
    if (view.getUint32(i, true) === 0x02014b50) {
      const length = view.getUint16(i + 28, true),
        extra = view.getUint16(i + 30, true),
        comment = view.getUint16(i + 32, true);
      const name = new TextDecoder().decode(
        bytes.subarray(i + 46, i + 46 + length),
      );
      if (/vbaProject|\.bin$/i.test(name))
        throw new Error("ไม่รับ Macro หรือไฟล์ binary ใน Workbook");
      workbook ||= name === "xl/workbook.xml";
      total += view.getUint32(i + 24, true);
      count++;
      i += 45 + length + extra + comment;
    }
  if (!workbook || !count || total > importLimits.expandedBytes || count > 1000)
    throw new Error("Workbook ไม่ถูกต้องหรือขนาดเมื่อแตกไฟล์เกิน 25 MB");
}
export async function parseUpload(file: File): Promise<ParsedTable> {
  if (!file.size || file.size > importLimits.fileBytes)
    throw new Error("ไฟล์ว่างหรือขนาดเกิน 5 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.csv$/i.test(file.name)) {
    if (
      file.type &&
      ![
        "text/csv",
        "text/plain",
        "application/vnd.ms-excel",
        "application/octet-stream",
      ].includes(file.type)
    )
      throw new Error("ชนิดไฟล์ CSV ไม่ถูกต้อง");
    return parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  }
  if (!/\.xlsx$/i.test(file.name))
    throw new Error("รองรับเฉพาะ .csv และ .xlsx");
  checkWorkbook(bytes);
  const { readSheet } = await import("read-excel-file/browser");
  const cells = await readSheet(file);
  const width = cells[0]?.length ?? 0;
  const table = tableFromRows(
    cells.map((r) =>
      Array.from({ length: Math.max(width, r.length) }, (_, i) => r[i] ?? ""),
    ),
  );
  table.warnings.push(
    "อ่านเฉพาะ Sheet แรก และค่าที่ Excel บันทึกไว้ ไม่ประเมินสูตรหรือ Macro",
  );
  return table;
}
export function autoMapping(
  kind: DatasetKind,
  headers: string[],
): ColumnMapping {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
  return Object.fromEntries(
    schemas[kind].map((f) => [
      f.name,
      headers.find((h) => norm(h) === norm(f.name)) ?? "",
    ]),
  );
}
export function safeCsv(headers: string[], rows: unknown[][]) {
  return (
    "\uFEFF" +
    Papa.unparse(
      { fields: headers, data: rows },
      { escapeFormulae: /^[\s]*[=+\-@\t\r]/ },
    )
  );
}
