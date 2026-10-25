"use client";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { DashboardData } from "@/data/providers";
import type { ForecastOptions } from "@/types/intelligence";
import { useForecast } from "./useForecast";
import { useIntelligence } from "@/stores/intelligence";
import { useExplorer } from "@/stores/explorer";
import { forecastScenarioFactors } from "@/lib/analytics/intelligence";
import {
  categoryPath,
  scopeForSku,
  scopeProducts,
  forecastView,
  forecastSnapshot,
  type ForecastScope,
} from "@/lib/analytics/forecast-view";
import { validDate } from "@/lib/import/validate";
import { compactDate, fullDate } from "@/lib/analytics/overview";
import { KPIInfoPopover } from "./KPIInfoPopover";
import { money, display, Table } from "./IntelligenceUI";
const labels = {
  Conservative: "ระมัดระวัง (Conservative)",
  Expected: "ปกติ (Expected)",
  Optimistic: "ยอดขายสูง (Optimistic)",
};
const descriptions = {
  Conservative: "สมมติว่าความต้องการต่ำกว่ากรณีฐาน",
  Expected: "ใช้ค่าคาดการณ์จากประวัติและปฏิทินที่มีอยู่",
  Optimistic: "สมมติว่าความต้องการเพิ่มขึ้นจากกรณีฐาน",
};
function Label({
  title,
  detail,
  formula = detail,
}: {
  title: string;
  detail: string;
  formula?: string;
}) {
  return (
    <span className="intel-label">
      <span>{title}</span>
      <KPIInfoPopover
        topic={title}
        helpOverride={{
          title,
          definition: detail,
          formula,
          inputs: "ชุดข้อมูลที่ใช้งานอยู่และขอบเขตหมวด / SKU ที่เลือก",
          interpretation: "ผลเป็นแบบจำลองคาดการณ์ แยกจากยอดขายจริง",
          example: formula,
          advice: "ตรวจช่วงวันที่และความเพียงพอของประวัติก่อนบันทึก",
          caution:
            "ช่วงต่ำ–สูง ±20% เป็นสมมติฐาน ไม่ใช่ช่วงความเชื่อมั่นทางสถิติ",
        }}
      />
    </span>
  );
}
function NumberField({
  title,
  detail,
  value,
  onChange,
  min = 0,
  max = 10000,
}: {
  title: string;
  detail: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label>
      <Label title={title} detail={detail} />
      <input
        type="number"
        aria-label={title}
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ""}
        onInput={(e) =>
          onChange(
            e.currentTarget.value === "" ? NaN : Number(e.currentTarget.value),
          )
        }
      />
    </label>
  );
}
export function DemandForecast({ data }: { data: DashboardData }) {
  const f = useForecast(data),
    s = useIntelligence();
  const [initial] = useState(() => {
    const w = useIntelligence.getState(),
      e = useExplorer.getState();
    const sku =
      e.selectedSku && e.skuSelectedAt > (w.selectionAt[f.ref] ?? 0)
        ? e.selectedSku
        : w.selection[f.ref];
    try {
      return {
        scope: sku ? scopeForSku(data, sku) : { categoryId: "", sku: "" },
        error: "",
      };
    } catch (error) {
      return {
        scope: { categoryId: "", sku: sku ?? "" },
        error: String(error),
      };
    }
  });
  const [scope, setScope] = useState<ForecastScope>(initial.scope),
    [selectionError, setSelectionError] = useState(initial.error),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (initial.scope.sku && !initial.error) {
      const state = useIntelligence.getState();
      if (state.selection[f.ref] !== initial.scope.sku)
        state.selectSku(f.ref, initial.scope.sku);
    }
  }, [f.ref, initial]);
  let view: ReturnType<typeof forecastView> | undefined,
    products: DashboardData["catalog"]["products"] = [],
    error = f.error || selectionError;
  try {
    products = scopeProducts(data, { ...scope, sku: "" });
    if (!error) view = forecastView(data, f.rows, f.options, scope);
  } catch (e) {
    error = String(e);
  }
  const categories = data.catalog.categories.filter((c) =>
    data.catalog.products.some(
      (p) =>
        (p.active && p.categoryId === c.id) ||
        (p.active &&
          data.catalog.categories.some(
            (child) => child.id === p.categoryId && child.parentId === c.id,
          )),
    ),
  );
  const categoryName = (id: string) => {
    try {
      return (
        categoryPath(data, id)
          .map((c) => c.nameTh)
          .join(" › ") || "ไม่มีหมวด (Unmapped)"
      );
    } catch {
      return "ไม่มีหมวด (Unmapped)";
    }
  };
  const changeCategory = (categoryId: string) => {
    setScope({ categoryId, sku: "" });
    setSelectionError("");
    setNotice("");
    s.selectSku(f.ref, "");
  };
  const changeSku = (sku: string) => {
    setNotice("");
    setSelectionError("");
    if (!sku) {
      setScope({ ...scope, sku: "" });
      s.selectSku(f.ref, "");
      return;
    }
    try {
      const next = scopeForSku(data, sku);
      setScope({ categoryId: scope.categoryId || next.categoryId, sku });
      s.selectSku(f.ref, sku);
    } catch (e) {
      setScope({ ...scope, sku });
      setSelectionError(String(e));
    }
  };
  const scopeName = scope.sku
    ? (data.catalog.products.find((p) => p.sku === scope.sku)?.nameTh ??
      scope.sku)
    : scope.categoryId
      ? `ทุกสินค้าในหมวด ${categoryName(scope.categoryId)}`
      : "ทุกสินค้าในร้าน";
  const end = view?.daily.at(-1)?.date;
  const save = async () => {
    try {
      if (error) throw Error(error);
      const snapshot = forecastSnapshot(
        data,
        f.rows,
        f.options,
        scope,
        crypto.randomUUID(),
        new Date().toISOString(),
      );
      await s.save({
        snapshots: [...useIntelligence.getState().snapshots, snapshot],
      });
      setNotice(
        `บันทึกผลคาดการณ์แล้ว: ${view!.products.length} SKU / ${snapshot.rows.length} รายการรายวัน ดูต่อได้ที่ Performance Review`,
      );
    } catch (e) {
      setNotice(String(e));
    }
  };
  const override = (kind: "festival" | "promotion") => {
    const modeKey = kind === "festival" ? "festivalMode" : "promotionMode",
      pctKey = kind === "festival" ? "festivalPct" : "promotionPct";
    const title =
      kind === "festival"
        ? "การปรับยอดขายช่วงเทศกาล"
        : "การปรับยอดขายจากโปรโมชั่น";
    return (
      <div className="forecast-override" key={kind}>
        <label>
          <Label
            title={title}
            detail="ใช้ค่าปฏิทินอัตโนมัติ หรือกำหนดเปอร์เซ็นต์แทนเฉพาะวันและ SKU ที่มีรายการปฏิทินประเภทนั้น 0% ในโหมดกำหนดเองคือไม่เพิ่มยอด"
          />
          <select
            aria-label={title}
            value={f.options[modeKey]}
            onChange={(e) =>
              f.setOptions({
                [modeKey]: e.target.value as "calendar" | "manual",
              })
            }
          >
            <option value="calendar">ใช้ค่าจากปฏิทินอัตโนมัติ</option>
            <option value="manual">กำหนดเอง</option>
          </select>
        </label>
        {f.options[modeKey] === "manual" && (
          <NumberField
            title={`${title} (%)`}
            detail="0% หมายถึงไม่มีการเพิ่มยอด ไม่ย้อนกลับไปใช้ค่าปฏิทิน รองรับ 0–10,000% ตามกติกาโมเดลเดิม"
            value={f.options[pctKey]}
            onChange={(n) => f.setOptions({ [pctKey]: n })}
          />
        )}
      </div>
    );
  };
  return (
    <section className="demand-forecast" aria-label="คาดการณ์ความต้องการสินค้า">
      <h2>คาดการณ์ความต้องการสินค้า</h2>
      <p>
        วิเคราะห์ข้อมูลยอดขายย้อนหลังเพื่อประมาณจำนวนสินค้าที่คาดว่าจะขายในช่วงเวลาที่กำหนด
        และนำผลไปวางแผนสต็อกและกำไร
      </p>
      <div className="forecast-main-fields">
        <label>
          <Label
            title="หมวดสินค้า"
            detail="เลือกทั้งร้าน หมวดหลัก หรือหมวดย่อยจาก Product Master รายการสินค้าจะเปลี่ยนตามหมวด"
          />
          <select
            aria-label="หมวดสินค้า"
            value={scope.categoryId}
            onChange={(e) => changeCategory(e.target.value)}
          >
            <option value="">ทุกหมวดสินค้า</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryName(c.id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Label
            title="สินค้าที่ต้องการคาดการณ์"
            detail="เลือกทุกสินค้าในหมวด หรือ SKU รายตัว หมวดและสินค้าใช้ความสัมพันธ์เดียวกัน"
          />
          <select
            aria-label="สินค้าที่ต้องการคาดการณ์"
            value={scope.sku}
            onChange={(e) => changeSku(e.target.value)}
          >
            <option value="">
              {scope.categoryId ? "ทุกสินค้าในหมวดที่เลือก" : "ทุกสินค้า"}
            </option>
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.nameTh} · {p.sku}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Label
            title="วันที่เริ่มคาดการณ์"
            detail="ค่าเริ่มต้นคือวันถัดจากยอดขายล่าสุดที่มีจำนวนขายใช้งานได้ ต้องอยู่หลังวันที่ใช้ข้อมูลย้อนหลัง"
          />
          <input
            aria-label="วันที่เริ่มคาดการณ์"
            type="date"
            value={f.options.start}
            onInput={(e) => f.setOptions({ start: e.currentTarget.value })}
          />
          <small>
            {validDate(f.options.start)
              ? fullDate(f.options.start)
              : "กรุณาเลือกวันที่"}
          </small>
        </label>
        <NumberField
          title="จำนวนวันที่คาดการณ์"
          detail="จำนวนวันปฏิทินต่อเนื่อง รวมวันเริ่มต้น รองรับ 1–7 วัน"
          min={1}
          max={7}
          value={f.options.horizon}
          onChange={(horizon) => f.setOptions({ horizon })}
        />
        <label>
          <Label
            title="รูปแบบการคาดการณ์"
            detail="ใช้ตัวคูณจากโมเดลเดิม: ระมัดระวัง 0.85 / ปกติ 1 / ยอดขายสูง 1.15"
          />
          <select
            aria-label="รูปแบบการคาดการณ์"
            value={f.options.scenario}
            onChange={(e) =>
              f.setOptions({
                scenario: e.target.value as ForecastOptions["scenario"],
              })
            }
          >
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <small>
            {descriptions[f.options.scenario]} · ตัวคูณ{" "}
            {forecastScenarioFactors[f.options.scenario]}
          </small>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <section
        className="forecast-results"
        aria-label="สรุปความต้องการสินค้าที่คาดการณ์"
      >
        <h3>สรุปความต้องการสินค้าที่คาดการณ์</h3>
        <p className="forecast-context">
          <strong>{scopeName}</strong>
          <br />
          {end
            ? `${fullDate(f.options.start)} – ${fullDate(end)}`
            : "ยังไม่มีช่วงคาดการณ์ที่ใช้ได้"}
          <br />
          {data.dataset.intelligence?.sourceLabel ?? data.dataset.source} ·
          FORECAST / SCENARIO · เป็นการคาดการณ์ ไม่ใช่ยอดขายจริง
        </p>
        <div className="forecast-summary">
          {[
            [
              "จำนวนสินค้าที่คาดว่าจะขาย (หน่วย)",
              view ? `${display(view.quantity)} หน่วย` : "ไม่มีข้อมูล",
              "รวมจำนวนคาดการณ์ของ SKU / วันในขอบเขตที่เลือก",
            ],
            [
              "ยอดขายคาดการณ์ (บาท)",
              money(view?.revenue),
              "จำนวนคาดการณ์ × ราคาปัจจุบันของแต่ละ SKU จาก Product Master แล้วรวมยอด",
            ],
            [
              "เปลี่ยนแปลงจากช่วงฐาน (%)",
              view?.change != null
                ? `${view.change.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                : "คำนวณไม่ได้ (N/A)",
              "(จำนวนคาดการณ์ − ผลรวมฐานก่อนใส่ปัจจัย) ÷ ฐาน × 100; ฐานเป็นศูนย์แสดง N/A",
            ],
            [
              "ช่วงคาดการณ์ต่ำ–สูง (หน่วย)",
              view
                ? `${display(view.low)}–${display(view.high)} หน่วย`
                : "ไม่มีข้อมูล",
              "รวมขอบต่ำและสูงราย SKU ±20% เป็นสมมติฐาน ไม่ใช่ช่วงความเชื่อมั่นของยอดรวม",
            ],
          ].map(([title, value, detail]) => (
            <article key={title}>
              <Label title={title} detail={detail} />
              <strong>{value}</strong>
            </article>
          ))}
        </div>
        <p>
          {view
            ? `ข้อมูลย้อนหลังที่ใช้ในกราฟ ${view.historyDays} วัน · ${view.products.length} SKU · ${f.options.manual ? "ใช้จำนวนขายที่กำหนดเองต่อ SKU ต่อวัน" : view.assumed ? `ประวัติไม่พอตามเกณฑ์: ${view.assumed}/${view.rows.length} รายการ SKU/วัน ใช้สมมติฐานจากแผนสินค้า แก้ได้ในตั้งค่าขั้นสูง` : "มีประวัติวันประเภทเดียวกันอย่างน้อย 2 วันต่อรายการตามเกณฑ์โมเดล"}`
            : "ไม่มีผลคาดการณ์ที่ใช้ได้"}
        </p>
        <button
          className="forecast-save"
          disabled={s.busy || !s.ready || !!error || !view?.rows.length}
          onClick={() => void save()}
        >
          บันทึกผลคาดการณ์
        </button>
        <p role="status" aria-live="polite">
          {notice || s.error}
        </p>
      </section>
      <details className="forecast-advanced">
        <summary>ตั้งค่าขั้นสูง (ไม่จำเป็น)</summary>
        <p>
          ใช้ฐานวันเดียวกันในสัปดาห์ย้อนหลังไม่เกิน 4 ครั้ง
          ตัดผลปฏิทินในอดีตก่อนใส่ปัจจัยเป้าหมายเพียงครั้งเดียว
          ค่าชุดเดียวกันส่งต่อ Smart Inventory / Profit &amp; Margin / Workforce
        </p>
        <div className="forecast-advanced-fields">
          <label>
            <Label
              title="ใช้ข้อมูลย้อนหลังถึงวันที่"
              detail="ไม่ใช้ยอดขายหลังวันที่นี้สร้างฐาน หากทดสอบย้อนหลังต้องเลือกวันก่อนเริ่มคาดการณ์"
            />
            <input
              aria-label="ใช้ข้อมูลย้อนหลังถึงวันที่"
              type="date"
              value={f.options.cutoff}
              onInput={(e) => f.setOptions({ cutoff: e.currentTarget.value })}
            />
          </label>
          <label className="forecast-toggle">
            <input
              type="checkbox"
              checked={f.options.manual}
              onChange={(e) => f.setOptions({ manual: e.target.checked })}
            />
            ใช้สมมติฐานยอดขายเอง
          </label>
          {f.options.manual && (
            <>
              <NumberField
                title="จำนวนขายเฉลี่ยต่อ SKU ต่อวัน"
                detail="เช่น 10 หมายถึง 10 หน่วยต่อ SKU ต่อวัน ไม่ใช่ 10 หน่วยรวมทั้งหมวดหรือทั้งร้าน"
                value={f.options.baseDemand}
                onChange={(baseDemand) => f.setOptions({ baseDemand })}
              />
              <NumberField
                title="ปรับยอดขายวันเสาร์–อาทิตย์ (%)"
                detail="ใช้เฉพาะวันที่เป็นเสาร์หรืออาทิตย์ในโหมดกำหนดเอง เช่น 20 คือเพิ่มจากวันปกติ 20%"
                value={f.options.weekendPct}
                onChange={(weekendPct) => f.setOptions({ weekendPct })}
              />
            </>
          )}
          {override("festival")}
          {override("promotion")}
        </div>
        <p>
          ปรับเทศกาล/โปรโมชั่นเฉพาะวันและ SKU ที่มีเหตุการณ์ประเภทนั้นในปฏิทิน
          หากไม่มีรายการตรงช่วงจะไม่มีผล · ประวัติน้อยกว่า 2
          วันประเภทเดียวกันใช้แผนสินค้าเป็นสมมติฐาน แม้ไม่ได้เปิดกำหนดเอง ·
          ข้อมูลสังเคราะห์ 25 วันยังไม่พอรับรองความแม่นยำเชิงฤดูกาล
        </p>
      </details>
      <h3>ยอดขายย้อนหลังเทียบกับความต้องการที่คาดการณ์</h3>
      <p>
        หน่วยสินค้า / วัน · ใช้ประวัติถึง{" "}
        {validDate(f.options.cutoff)
          ? fullDate(f.options.cutoff)
          : "วันที่ไม่ถูกต้อง"}{" "}
        เท่านั้น · วันที่ขาดไม่เติมยอดเป็นศูนย์ · แถบช่วงต่ำ–สูงเป็นสมมติฐาน
      </p>
      {view?.rows.length ? (
        <div
          className="forecast-chart"
          role="img"
          aria-label="กราฟจำนวนขายย้อนหลังและจำนวนคาดการณ์รายวัน"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={view.chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => compactDate(String(d))}
                fontSize={10}
              />
              <YAxis
                width={52}
                label={{
                  value: "หน่วย",
                  position: "insideLeft",
                  angle: -90,
                  style: { textAnchor: "middle" },
                }}
              />
              <Tooltip labelFormatter={(d) => fullDate(String(d))} />
              <Legend />
              <Area
                dataKey="range"
                name="ช่วงต่ำ–สูง (หน่วย)"
                stroke="none"
                fill="#02aba4"
                fillOpacity={0.15}
                connectNulls={false}
              />
              <Line
                dataKey="actual"
                name="ประวัติย้อนหลัง (หน่วย)"
                stroke="#748596"
                connectNulls={false}
              />
              <Line
                dataKey="forecast"
                name="คาดการณ์ (หน่วย)"
                stroke="#02aba4"
                strokeDasharray="5 3"
                connectNulls={false}
              />
              <ReferenceLine
                x={f.options.start}
                stroke="#bb8500"
                strokeDasharray="3 3"
                label={{
                  value: "เริ่มคาดการณ์",
                  position: "insideTopRight",
                  fontSize: 10,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p>ไม่มีข้อมูลสำหรับกราฟ</p>
      )}
      {!scope.sku && !!view?.rows.length && (
        <>
          <h3>5 สินค้าที่คาดว่าจะขายดีที่สุด</h3>
          <p>{scopeName} · เรียงตามจำนวนคาดการณ์รวมในช่วงวันที่เลือก</p>
          <Table headers={["สินค้า / SKU", "จำนวนคาดการณ์ (หน่วย)"]}>
            {view.top.map((r) => (
              <tr key={r.sku}>
                <td>
                  {r.name}
                  <br />
                  {r.sku}
                </td>
                <td>{display(r.quantity)}</td>
              </tr>
            ))}
          </Table>
        </>
      )}
      <h3>รายละเอียดคาดการณ์รายวัน</h3>
      <p>
        {scopeName} · ผลรวม {view ? display(view.quantity) : "ไม่มีข้อมูล"}{" "}
        หน่วย / {money(view?.revenue)} · ตารางเลื่อนดูรายละเอียดแต่ละ SKU ได้
      </p>
      <Table
        headers={[
          "วันที่",
          "สินค้า / SKU",
          "หมวดสินค้า",
          "จำนวนคาดการณ์ (หน่วย)",
          "ช่วงคาดการณ์ต่ำ–สูง",
          "ยอดขายคาดการณ์ (บาท)",
          "ข้อมูลย้อนหลังที่ใช้",
        ]}
      >
        {view?.rows.map((r) => (
          <tr key={r.date + r.sku}>
            <td>{fullDate(r.date)}</td>
            <td>
              {data.catalog.products.find((p) => p.sku === r.sku)?.nameTh}
              <br />
              {r.sku}
            </td>
            <td>
              {categoryName(
                data.catalog.products.find((p) => p.sku === r.sku)!.categoryId,
              )}
            </td>
            <td>{display(r.quantity)}</td>
            <td>
              {r.low}–{r.high}
            </td>
            <td>{money(r.revenue)}</td>
            <td>
              {r.manual
                ? "สมมติฐานผู้ใช้ / แผนสินค้า"
                : `ประวัติ ${r.samples} วันประเภทเดียวกัน`}
              <details>
                <summary>สมมติฐาน</summary>
                {r.assumption}
              </details>
            </td>
          </tr>
        ))}
      </Table>
      <details className="forecast-calendar">
        <summary>ปฏิทินธุรกิจและปัจจัยที่มีผลต่อยอดขาย</summary>
        <p>
          ปฏิทินยังใช้คำนวณอัตโนมัติแม้พับเก็บอยู่ ·{" "}
          {data.dataset.source === "Mock"
            ? "ข้อมูลสังเคราะห์ อัตราปรับยอดขายเป็นสมมติฐาน ไม่ใช่ผลวัดจริง"
            : "ใช้แถวปฏิทินจากไฟล์นำเข้า ไม่เติมปฏิทิน Demo"}
        </p>
        <Table
          headers={[
            "เหตุการณ์",
            "วันเริ่ม",
            "วันสิ้นสุด",
            "สินค้า / หมวดที่ได้รับผล",
            "ปรับยอดขาย (%)",
            "ที่มา",
          ]}
        >
          {data.dataset.intelligence?.calendar.map((e, i) => (
            <tr key={i}>
              <td>{String(e.name)}</td>
              <td>{fullDate(String(e.startDate))}</td>
              <td>{fullDate(String(e.endDate))}</td>
              <td>
                {e.sku
                  ? `${e.sku} · ${categoryName(data.catalog.products.find((p) => p.sku === e.sku)?.categoryId ?? "")}`
                  : "ทุกสินค้า"}
              </td>
              <td>{display(Number(e.upliftPct))}%</td>
              <td>
                {String(
                  e.source ||
                    (data.dataset.source === "Mock"
                      ? "ปฏิทิน Demo / อัตราปรับเป็นสมมติฐาน"
                      : "ไฟล์ปฏิทินนำเข้า"),
                )}
              </td>
            </tr>
          ))}
        </Table>
        {!data.dataset.intelligence?.calendar.length && (
          <p>ไม่มีข้อมูลปฏิทินในชุดข้อมูลนี้</p>
        )}
      </details>
    </section>
  );
}
