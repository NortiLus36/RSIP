"use client";
import { useMemo, useState } from "react";
import type { DashboardData } from "@/data/providers";
import {
  datasetKinds,
  type DatasetKind,
  type ParsedTable,
  type ColumnMapping,
} from "@/lib/import/types";
import { datasetLabels, schemas } from "@/lib/import/schema";
import { parseUpload, autoMapping, tableFromRows } from "@/lib/import/parse";
import { validateImport } from "@/lib/import/validate";
import {
  templateCsv,
  dictionaryCsv,
  scenarioBundle,
} from "@/lib/import/templates";
import { importCoverage, experienceTotals } from "@/lib/import/provider";
import { inventoryForSku } from "@/lib/analytics/catalog";
import { useIntelligence } from "@/stores/intelligence";
import { useSpatial } from "@/stores/spatial";
import { useDataSource } from "@/stores/data-source";

const tabs = [
  "Import Data",
  "Data Preview",
  "Validation Results",
  "Dataset Manager",
  "Download Templates",
];
function download(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DataManagement({
  demo,
  data,
}: {
  demo: DashboardData;
  data: DashboardData;
}) {
  const [tab, setTab] = useState(tabs[0]),
    [kind, setKind] = useState<DatasetKind>("product");
  const [table, setTable] = useState<ParsedTable | null>(null),
    [mapping, setMapping] = useState<ColumnMapping>({}),
    [fileName, setFileName] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [parsing, setParsing] = useState(false),
    [problems, setProblems] = useState(false),
    [confirmed, setConfirmed] = useState(false),
    [clearConfirmed, setClearConfirmed] = useState(false);
  const state = useDataSource();
  async function restoreDemo(clear = false) {
    try {
      const w = useIntelligence.getState(),
        ref = demo.dataset.intelligence?.reference ?? "legacy";
      const nextOptions = { ...w.options };
      delete nextOptions[ref];
      await w.save({
        reportResetAt: { ...w.reportResetAt, [ref]: new Date().toISOString() },
        options: nextOptions,
      });
      await state.save("demo", clear ? {} : state.bundle);
      useSpatial.getState().setMode("Historical");
      setClearConfirmed(false);
      reset();
      setNotice(
        "กลับข้อมูลจำลอง 1–23 ต.ค. แล้ว · เก็บ Forecast/Reports แต่ไม่นำรายงานก่อน Reset มาปรับสต็อกซ้ำ",
      );
    } catch (e) {
      setError(String(e));
    }
  }

  const result = useMemo(
    () =>
      table
        ? validateImport(
            kind,
            table,
            mapping,
            state.bundle,
            demo.store,
            demo.catalog,
          )
        : null,
    [kind, table, mapping, state.bundle, demo],
  );
  const busy = parsing || state.busy || !state.hydrated;
  const reset = () => {
    setTable(null);
    setMapping({});
    setConfirmed(false);
    setError("");
    setFileName("");
  };
  async function upload(file?: File) {
    if (!file || busy) return;
    reset();
    setNotice("");
    setParsing(true);
    try {
      const parsed = await parseUpload(file);
      setTable(parsed);
      setMapping(autoMapping(kind, parsed.headers));
      setFileName(file.name);
      setTab(tabs[0]);
    } catch (e) {
      setError(String(e));
    } finally {
      setParsing(false);
    }
  }
  async function apply() {
    if (!table || !confirmed || !result || result.errors || busy) return;
    try {
      await state.apply(kind, table, mapping, fileName, demo);
      setNotice(
        `นำเข้า ${result.total} แถวสำเร็จ · ${result.warnings} Warning · Dashboard และ 3D ใช้ข้อมูลชุดใหม่แล้ว`,
      );
      reset();
      setTab("Dataset Manager");
    } catch (e) {
      setError(String(e));
    }
  }
  async function scenario(name: "oos" | "peak" | "overstock") {
    try {
      const bundle = scenarioBundle(name, demo);
      for (const k of datasetKinds) {
        const rows = bundle[k]!.rows,
          headers = schemas[k].map((f) => f.name),
          t = tableFromRows([
            headers,
            ...rows.map((r) => headers.map((h) => r[h] ?? "")),
          ]);
        const v = validateImport(
          k,
          t,
          autoMapping(k, headers),
          bundle,
          demo.store,
          demo.catalog,
        );
        if (v.errors)
          throw new Error(
            v.issues
              .filter((i) => i.level === "error")
              .map((i) => i.message)
              .join("; "),
          );
        bundle[k]!.rows = v.rows;
      }
      await state.save("imported", bundle);
      reset();
      setNotice(
        `โหลด Scenario ${name} แล้ว (แทนที่ข้อมูลนำเข้าทุกประเภทใน Scenario)`,
      );
    } catch (e) {
      setError(String(e));
    }
  }
  const coverage = importCoverage(state.bundle);
  const shown =
    table?.rows
      .map((values, i) => ({ values, row: i + 2 }))
      .filter(
        (r) => !problems || result?.issues.some((i) => i.row === r.row),
      ) ?? [];
  const cx = experienceTotals(state.bundle.experience?.rows ?? []);
  const metric = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v)
      ? "No Data"
      : v.toLocaleString("th-TH", { maximumFractionDigits: 2 });
  return (
    <div className="data-management">
      <header>
        <div className="eyebrow">DATA MANAGEMENT</div>
        <h1>จัดการข้อมูล</h1>
        <p>
          ไฟล์ประมวลผลและเก็บใน Browser นี้ผ่าน IndexedDB ไม่อัปโหลดไป Server
          และไม่แชร์กับคนอื่น ใช้ข้อมูลสาธารณะหรือที่ได้รับอนุญาตเท่านั้น
        </p>
      </header>
      <nav className="module-nav" aria-label="Data management tabs">
        {tabs.map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {(error || state.error) && (
        <p className="import-error" role="alert">
          {error || state.error}
        </p>
      )}
      {notice && (
        <p className="import-success" role="status">
          {notice}
        </p>
      )}
      {busy && (
        <p role="status">
          {parsing ? "กำลังอ่านไฟล์…" : "กำลังโหลด/บันทึกข้อมูลใน Browser…"}
        </p>
      )}
      {tab === "Import Data" && (
        <section>
          <label>
            ประเภทข้อมูล{" "}
            <select
              aria-label="Dataset type"
              value={kind}
              disabled={busy}
              onChange={(e) => {
                setKind(e.target.value as DatasetKind);
                reset();
              }}
            >
              {datasetKinds.map((k) => (
                <option key={k} value={k}>
                  {datasetLabels[k]}
                </option>
              ))}
            </select>
          </label>
          <div
            className="upload-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files[0]);
            }}
          >
            <strong>ลากไฟล์มาวาง หรือเลือกไฟล์</strong>
            <p>
              CSV UTF-8 / UTF-8 BOM / XLSX · ไม่เกิน 5 MB, 10,000 แถว, 64
              คอลัมน์ · Replace ประเภทที่เลือกทั้งชุด
            </p>
            <input
              aria-label="Upload dataset"
              type="file"
              accept=".csv,.xlsx"
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <button
            onClick={() =>
              download(
                `${kind === "experience" ? "customer_experience" : kind}_template.csv`,
                templateCsv(kind, demo),
              )
            }
          >
            ดาวน์โหลด Template ประเภทนี้
          </button>
          {table && (
            <>
              <h2>Column Mapping · {fileName}</h2>
              <p>{table.rows.length} แถว · จับคู่ครบแล้วกดตรวจสอบก่อนนำเข้า</p>
              <div className="mapping-grid">
                {schemas[kind].map((f) => (
                  <label key={f.name}>
                    {f.name} {f.required ? "*" : "(Optional)"}
                    <select
                      aria-label={`Map ${f.name}`}
                      value={mapping[f.name] ?? ""}
                      onChange={(e) => {
                        setMapping({ ...mapping, [f.name]: e.target.value });
                        setConfirmed(false);
                      }}
                    >
                      <option value="">ไม่จับคู่</option>
                      {table.headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                    <small>{f.description}</small>
                  </label>
                ))}
              </div>
              <button
                className="primary-button"
                onClick={() => setTab("Validation Results")}
              >
                ตรวจสอบข้อมูล
              </button>
              <button onClick={reset}>Cancel</button>
            </>
          )}
        </section>
      )}
      {(tab === "Validation Results" || tab === "Data Preview") &&
        (table && result ? (
          <section>
            <h2>
              {fileName} · {datasetLabels[kind]}
            </h2>
            <div className="validation-summary">
              <span>
                Total Rows <b>{result.total}</b>
              </span>
              <span>
                Valid Rows <b>{result.valid}</b>
              </span>
              <span>
                Invalid Rows <b>{result.invalid}</b>
              </span>
              <span>
                Errors <b>{result.errors}</b>
              </span>
              <span>
                Warnings <b>{result.warnings}</b>
              </span>
            </div>
            {table.warnings.map((w) => (
              <p className="import-warning" key={w}>
                {w}
              </p>
            ))}
            {tab === "Validation Results" ? (
              <>
                <div className="import-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ระดับ</th>
                        <th>แถว</th>
                        <th>Field</th>
                        <th>รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.issues.slice(0, 200).map((i, n) => (
                        <tr key={n}>
                          <td>{i.level}</td>
                          <td>{i.row}</td>
                          <td>{i.field}</td>
                          <td>{i.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  แสดงข้อผิดพลาด/คำเตือนสูงสุด 200 รายการ ·
                  ไม่มีการนำเข้าแถวใดหากพบ Error
                </p>
                <button
                  className="primary-button"
                  onClick={() => setTab("Data Preview")}
                >
                  ดู Preview ก่อนยืนยัน
                </button>
                <button onClick={() => setTab("Import Data")}>
                  แก้ Column Mapping
                </button>
              </>
            ) : (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={problems}
                    onChange={(e) => setProblems(e.target.checked)}
                  />
                  แสดงเฉพาะแถวที่มีปัญหา
                </label>
                <div className="import-table">
                  <table>
                    <thead>
                      <tr>
                        <th>แถวไฟล์</th>
                        {table.headers.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.slice(0, 100).map((r) => (
                        <tr key={r.row}>
                          <td>{r.row}</td>
                          {r.values.map((v, i) => (
                            <td key={i}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p>
                  แสดง {Math.min(shown.length, 100)} จาก {shown.length} แถว ·
                  ตรวจสอบและนำเข้าทั้ง {result.total} แถว
                </p>
                <label className="import-confirm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={!!result.errors || busy}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  ฉันตรวจ Preview และ Warning แล้ว ยืนยันแทนที่ Dataset
                  ประเภทนี้ทั้งหมด
                </label>
                <button
                  className="primary-button"
                  disabled={!confirmed || !!result.errors || busy}
                  onClick={() => void apply()}
                >
                  Confirm Import
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    reset();
                    setTab("Import Data");
                  }}
                >
                  Cancel
                </button>
              </>
            )}
          </section>
        ) : (
          <p className="empty-state">
            ยังไม่มีไฟล์ Preview ให้เลือกไฟล์ใน Import Data ก่อน
          </p>
        ))}
      {tab === "Dataset Manager" && (
        <section>
          <h2>
            Active Dataset:{" "}
            {state.source === "demo" ? "DEMO DATA" : "IMPORTED DATA"}
          </h2>
          <p>
            Original Demo เก็บแยกจากข้อมูลนำเข้า เปลี่ยนแหล่งข้อมูลทั้ง
            Dashboard / Inspector / Heatmap พร้อมกัน ·
            ข้อมูลอาจหายหากล้างข้อมูลเว็บไซต์หรือใช้โหมดส่วนตัว
          </p>
          <div className="import-actions">
            <button
              aria-label="Reset to Demo Data"
              disabled={busy}
              onClick={() => void restoreDemo()}
            >
              Reset Demo
            </button>
            <button
              disabled={busy || !coverage.length}
              onClick={() =>
                void state
                  .save("imported", state.bundle)
                  .catch((e) => setError(String(e)))
              }
            >
              ใช้ข้อมูลนำเข้าที่บันทึกไว้
            </button>
          </div>
          <div className="import-table">
            <table>
              <thead>
                <tr>
                  <th>ประเภท</th>
                  <th>จำนวนแถว</th>
                  <th>ช่วงข้อมูล</th>
                  <th>นำเข้าล่าสุด</th>
                </tr>
              </thead>
              <tbody>
                {coverage.map((c) => (
                  <tr key={c.kind}>
                    <td>{datasetLabels[c.kind as DatasetKind]}</td>
                    <td>{c.rows}</td>
                    <td>
                      {c.from} – {c.to}
                    </td>
                    <td>{new Date(c.importedAt).toLocaleString("th-TH")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            ประเภทที่ยังไม่ได้ Import = No Data ไม่เติมข้อมูล Demo ปนใน KPI ·
            ถ้ายังไม่ Import Product จะใช้ Product Master
            เดิมเป็นรายการอ้างอิงเท่านั้น
          </p>
          <h3>ข้อมูล Customer Experience นำเข้า · รวมเฉพาะช่วงที่มีข้อมูล</h3>
          <p>
            CSAT {metric(cx.csat)}% · NPS {metric(cx.nps)} · Complaint Rate{" "}
            {metric(cx.complaintRate)} ต่อ 1,000 ธุรกรรม
          </p>
          {state.source === "imported" && (
            <>
              <h3>Stock Insights · Snapshot ล่าสุด</h3>
              <ul>
                {data.catalog.planning.map((p) => {
                  const s = inventoryForSku(data.catalog, p.sku);
                  return (
                    <li key={p.sku}>
                      {p.sku}: Shelf {s.shelfStock} / Backroom {s.backroomStock}{" "}
                      · Days of Supply {metric(s.daysOfSupply)} · Suggested
                      Order {metric(s.suggestedOrder)}
                      {s.shelfStock === 0 && s.backroomStock > 0
                        ? " · Shelf OOS: ตรวจรอบเติมจากคลังก่อนสั่งซื้อ"
                        : ""}
                      {s.daysOfSupply !== undefined &&
                      s.daysOfSupply !== null &&
                      s.daysOfSupply > 30
                        ? " · Overstock: สต็อกเกิน 30 วันตาม Demand ปัจจุบัน"
                        : ""}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          <h3>Scenario Library · แทนที่ชุดนำเข้าทั้งหมด</h3>
          <div className="import-actions">
            <button disabled={busy} onClick={() => void scenario("oos")}>
              Scenario A — Shelf OOS
            </button>
            <button disabled={busy} onClick={() => void scenario("peak")}>
              Scenario B — Peak Time
            </button>
            <button disabled={busy} onClick={() => void scenario("overstock")}>
              Scenario C — Overstock
            </button>
          </div>
          <p>
            ข้อมูลจำลองจากแถวข้อมูลจริงของ Scenario ไม่ใช่ KPI สำเร็จรูป · Waste
            ใช้ข้อมูลที่นำเข้าแยกจากยอดขาย ไม่เดามูลค่าความเสียหาย
          </p>
          <label>
            <input
              type="checkbox"
              checked={clearConfirmed}
              onChange={(e) => setClearConfirmed(e.target.checked)}
            />
            ยืนยันล้างข้อมูลนำเข้าทั้งหมดใน Browser นี้
          </label>
          <button
            disabled={busy || !clearConfirmed}
            onClick={() => void restoreDemo(true)}
          >
            Clear Imported Data
          </button>
        </section>
      )}
      {tab === "Download Templates" && (
        <section>
          <h2>Templates และ Data Dictionary</h2>
          <p>
            เริ่มนำเข้า Product ก่อน Inventory / Sales · Excel ใช้ Header
            เดียวกับ CSV และ Sheet แรก · Required แสดง * ในขั้น Mapping
          </p>
          {datasetKinds.map((k) => (
            <article className="template-card" key={k}>
              <h3>{datasetLabels[k]}</h3>
              <button
                onClick={() =>
                  download(
                    `${k === "experience" ? "customer_experience" : k}_template.csv`,
                    templateCsv(k, demo),
                  )
                }
              >
                Download {k} template.csv
              </button>
              <button
                onClick={() =>
                  download(`${k}_dictionary.csv`, dictionaryCsv(k))
                }
              >
                Download Data Dictionary
              </button>
              <details>
                <summary>Field / Required / Type / Example</summary>
                <div className="import-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Required</th>
                        <th>Type</th>
                        <th>คำอธิบาย</th>
                        <th>ตัวอย่าง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schemas[k].map((f) => (
                        <tr key={f.name}>
                          <td>{f.name}</td>
                          <td>{f.required ? "Required" : "Optional"}</td>
                          <td>{f.type}</td>
                          <td>{f.description}</td>
                          <td>{sampleRowsExample(k, f.name, demo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </article>
          ))}
          <h3>รหัสอ้างอิงจาก Floor Plan</h3>
          <p>
            Store ID: <code>{demo.store.id}</code>
          </p>
          <details>
            <summary>Category / Zone IDs</summary>
            <ul>
              {demo.catalog.categories
                .filter((c) => c.parentId)
                .map((c) => (
                  <li key={c.id}>
                    <code>{c.id}</code> — {c.nameTh} · Zone {c.zoneId}
                  </li>
                ))}
            </ul>
          </details>
          <details>
            <summary>Fixture IDs</summary>
            <ul>
              {demo.store.fixtures.map((f) => (
                <li key={f.id}>
                  <code>{f.id}</code> — Zone {f.zoneId} · {f.name}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}
import { sampleRows } from "@/lib/import/templates";
function sampleRowsExample(
  kind: DatasetKind,
  name: string,
  demo: DashboardData,
) {
  return String(sampleRows(kind, demo)[0][name] ?? "");
}
