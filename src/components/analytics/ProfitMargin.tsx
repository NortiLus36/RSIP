"use client";
import { useEffect, useState } from "react";
import type { DashboardData } from "@/data/providers";
import { useForecast, usePlanningSku } from "./useForecast";
import { useIntelligence } from "@/stores/intelligence";
import { profitScenario } from "@/lib/analytics/intelligence";
import {
  profitSource,
  profitStock,
  matchingLabor,
  matchingWaste,
} from "@/lib/analytics/profit-context";
import { fullDate } from "@/lib/analytics/overview";
import { KPIInfoPopover } from "./KPIInfoPopover";
import { Chart, display, money, Table } from "./IntelligenceUI";

type Draft = Partial<
  Record<
    | "price"
    | "cost"
    | "demand"
    | "discount"
    | "uplift"
    | "order"
    | "labor"
    | "campaign"
    | "wasteUnits"
    | "other",
    number
  >
> & { manual?: boolean; orderInTime?: boolean };
function Help({
  title,
  formula,
  note = "ค่าทดลองแยกจากข้อมูลจริง ไม่แก้ข้อมูลสินค้า",
}: {
  title: string;
  formula: string;
  note?: string;
}) {
  return (
    <span className="profit-label">
      <span>{title}</span>
      <KPIInfoPopover
        topic={title}
        helpOverride={{
          title,
          definition: note,
          formula,
          inputs: "สินค้าและช่วงคาดการณ์ที่เลือก รวมค่าทดลองปัจจุบัน",
          interpretation: "ยอดเงินแสดงเป็นบาท; รายได้ศูนย์แสดงอัตรากำไร N/A",
          example:
            "ราคา 68 ลด 2% = 66.64 บาท; ทุน 53.72 เหลือกำไรต่อหน่วย 12.92 บาท",
          advice: "ตรวจสมมติฐานจำนวนขายและความเพียงพอของสินค้าก่อนนำแผนไปใช้",
          caution: "เป็นการจำลอง ไม่ใช่ยอดขายจริงหรือคำสั่งซื้อ",
        }}
      />
    </span>
  );
}
function Input({
  title,
  formula,
  value,
  onChange,
  max = 1e9,
  disabled = false,
}: {
  title: string;
  formula: string;
  value: number | undefined;
  onChange: (v: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <label>
      <Help title={title} formula={formula} />
      <input
        type="number"
        aria-label={title}
        min={0}
        max={max}
        step="any"
        disabled={disabled}
        value={value !== undefined && Number.isFinite(value) ? value : ""}
        onInput={(e) =>
          onChange(
            e.currentTarget.value === "" ? NaN : Number(e.currentTarget.value),
          )
        }
      />
    </label>
  );
}
const signed = (n: number | null | undefined, suffix = "บาท") =>
  n == null
    ? "ไม่มีฐานเปรียบเทียบ"
    : `${n >= 0 ? "+" : "−"}${display(Math.abs(n))} ${suffix}`;
export function ProfitMargin({ data }: { data: DashboardData }) {
  const f = useForecast(data),
    w = useIntelligence(),
    [chosen, setSku] = usePlanningSku(data);
  const products = data.catalog.products.filter((p) => p.active);
  const sku = products.some((p) => p.sku === chosen)
    ? chosen
    : (products[0]?.sku ?? "");
  useEffect(() => {
    if (sku && sku !== chosen) setSku(sku);
  }, [sku, chosen, setSku]);
  const [snapshotId, setSnapshotId] = useState("");
  const snapshots = w.snapshots.filter(
    (s) => s.reference === f.ref && s.storeId === data.store.id,
  );
  const snapshot = snapshots.find((s) => s.id === snapshotId);
  const options = snapshot?.options ?? f.options;
  const source = profitSource(data, snapshot?.rows ?? f.rows, sku, options);
  const product = source.product,
    unit = product?.unit ?? "หน่วย";
  const scope = `${f.ref}:${sku}:${snapshot?.id ?? "active"}:${source.forecastReference}`;
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draft = drafts[scope] ?? {};
  const patch = (p: Draft) =>
    setDrafts((old) => ({ ...old, [scope]: { ...old[scope], ...p } }));
  const stock = profitStock(
    data,
    source.rows,
    sku,
    w.reviewDays[f.ref] ?? 1,
    w.planningAssumptions[f.ref]?.[sku],
  );
  const rec = stock.plan;
  const labor = matchingLabor(w.tasks, f.ref, sku, options.start, source.end);
  const waste = matchingWaste(data, sku, options.start, source.end);
  const manual = draft.manual ?? false;
  const input = {
    price: draft.price ?? product?.sellingPrice ?? NaN,
    cost: draft.cost ?? product?.unitCost ?? NaN,
    demand: manual
      ? (draft.demand ?? source.quantity ?? NaN)
      : (source.quantity ?? NaN),
    discount: draft.discount ?? 0,
    uplift: draft.uplift ?? 0,
    order: draft.order ?? rec?.suggestedOrder ?? 0,
    labor: draft.labor ?? labor,
    campaign: draft.campaign ?? 0,
    wasteUnits: draft.wasteUnits ?? waste,
    other: draft.other ?? 0,
    available: rec ? rec.availableStock + rec.eligibleHorizon : null,
    orderInTime:
      draft.orderInTime ?? (!!rec && rec.leadTimeDays <= rec.horizon),
    constrainStock: false,
  };
  let result: ReturnType<typeof profitScenario> | undefined,
    advanced: ReturnType<typeof profitScenario> | undefined,
    advancedError = "",
    baseline: ReturnType<typeof profitScenario> | undefined,
    error = "";
  try {
    if (product && source.quantity !== null)
      baseline = profitScenario({
        ...input,
        available: null,
        price: product.sellingPrice,
        cost: product.unitCost,
        demand: source.quantity,
        discount: 0,
        uplift: 0,
        order: 0,
        labor: 0,
        campaign: 0,
        wasteUnits: 0,
        other: 0,
      });
  } catch {
    /* Scenario errors are reported below; baseline never inherits edited prices. */
  }
  try {
    if (product && (manual || source.quantity !== null))
      result = profitScenario({
        ...input,
        available: null,
        order: 0,
        labor: 0,
        campaign: 0,
        wasteUnits: 0,
        other: 0,
        baselineContribution: baseline?.grossProfit,
      });
  } catch {
    error =
      "กรุณากรอกค่าทดลองเป็นตัวเลขไม่ติดลบ ส่วนลดต้องอยู่ระหว่าง 0–100% และผลลัพธ์ต้องไม่เกินขอบเขตที่รองรับ";
  }
  if (result) {
    try {
      advanced = profitScenario({
        ...input,
        baselineContribution: baseline?.grossProfit,
      });
    } catch {
      advancedError =
        "ตรวจค่าขั้นสูง: จำนวนสั่ง ค่าใช้จ่าย และสินค้าเสียหายต้องเป็นตัวเลขไม่ติดลบ กำไรพื้นฐานยังคำนวณได้";
    }
  }
  const category = data.catalog.categories.find(
    (c) => c.id === product?.categoryId,
  );
  const stockWarning =
    rec && advanced?.shortfall
      ? `จำนวนที่ต้องการขาย ${display(advanced.desired)} ${unit} มากกว่าจำนวนที่รองรับได้ตามสต็อก ${display(advanced.sellable)} ${unit} ผลกำไรหลักสมมติขายได้ครบตามความต้องการ`
      : stock.warning;
  const cards = [
    [
      "ยอดขายคาดการณ์",
      result?.revenue,
      "จำนวนขายหลังปรับยอดเพิ่ม × ราคาขายหลังส่วนลด",
      "money",
    ],
    [
      "กำไรขั้นต้น",
      result?.grossProfit,
      "ยอดขายคาดการณ์ − จำนวนขาย × ต้นทุนต่อหน่วย",
      "money",
    ],
    [
      "อัตรากำไรขั้นต้น (%)",
      result?.margin,
      "กำไรขั้นต้น ÷ ยอดขายคาดการณ์ × 100; รายได้ศูนย์ = N/A",
      "percent",
    ],
    [
      "กำไรขั้นต้นต่อหน่วย",
      result?.unitProfit,
      "ราคาขาย × (1 − ส่วนลด ÷ 100) − ต้นทุนต่อหน่วย",
      "money",
    ],
  ] as const;
  return (
    <section className="profit-margin" aria-label="วิเคราะห์ต้นทุนและกำไร">
      <h2>วิเคราะห์ต้นทุนและกำไร</h2>
      <p>
        ทดลองปรับราคาขาย ส่วนลด และจำนวนสินค้าที่คาดว่าจะขาย เพื่อประเมินยอดขาย
        กำไรขั้นต้น และความคุ้มค่าของแผน
      </p>
      <h3>เลือกสินค้าและข้อมูลต้นทาง</h3>
      <div className="profit-source-grid">
        <label>
          <Help
            title="สินค้า"
            formula="เลือกสินค้าเพื่ออ่านราคา ต้นทุน และคาดการณ์เฉพาะรหัสสินค้านั้น"
          />
          <select
            aria-label="สินค้า"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.nameTh} · {p.sku}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Help
            title="แหล่งคาดการณ์"
            formula="ใช้ผลคาดการณ์ปัจจุบัน หรือผลที่บันทึกในชุดข้อมูลเดียวกัน"
          />
          <select
            aria-label="แหล่งคาดการณ์"
            value={snapshot?.id ?? ""}
            onChange={(e) => setSnapshotId(e.target.value)}
          >
            <option value="">ผลคาดการณ์ปัจจุบัน</option>
            {snapshots.map((s, i) => (
              <option value={s.id} key={s.id}>
                ผลที่บันทึก {i + 1} · {s.options.start} · {s.options.horizon}{" "}
                วัน
              </option>
            ))}
          </select>
        </label>
      </div>
      {!product && (
        <p role="alert">ไม่มีข้อมูลสินค้าที่ใช้งานได้ในชุดข้อมูลนี้</p>
      )}
      <div className="profit-source-note" aria-label="ข้อมูลสินค้าต้นทาง">
        <strong>
          {product?.nameTh ?? "ไม่มีข้อมูลสินค้า"} ·{" "}
          {category?.nameTh ?? "ไม่มีข้อมูลหมวด"}
        </strong>
        <p>
          ราคาจากข้อมูลสินค้า {money(product?.sellingPrice)} · ต้นทุน{" "}
          {money(product?.unitCost)} ต่อ{unit}
          <br />
          {source.end
            ? `${fullDate(options.start)} – ${fullDate(source.end)}`
            : "ไม่มีช่วงคาดการณ์ที่ถูกต้อง"}{" "}
          · จำนวนจากคาดการณ์{" "}
          {source.quantity === null
            ? "ไม่มีข้อมูล"
            : `${display(source.quantity)} ${unit}`}
          <br />
          {snapshot
            ? `ผลที่บันทึกวันที่ ${snapshot.createdAt.slice(0, 10)} · อ้างอิง ${snapshot.id.slice(-8)}`
            : "ใช้ผลคาดการณ์ปัจจุบัน"}{" "}
          · {data.dataset.intelligence?.sourceLabel ?? data.dataset.source}
        </p>
      </div>
      {snapshotId && !snapshot && (
        <p role="status">
          ไม่พบผลคาดการณ์ที่บันทึก จึงกลับมาใช้ผลคาดการณ์ปัจจุบัน
        </p>
      )}
      <h3>ทดลองปรับตัวแปร</h3>
      <p className="profit-scenario">
        SCENARIO · สมมติขายได้ครบตามจำนวนที่กำหนด
        ตรวจความเพียงพอของสินค้าแยกต่างหากด้านล่าง
        ไม่เปลี่ยนยอดขายจริงหรือข้อมูลสินค้า
      </p>
      <label className="profit-toggle">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) =>
            patch({
              manual: e.target.checked,
              demand: e.target.checked ? (source.quantity ?? 0) : undefined,
            })
          }
        />
        กำหนดจำนวนขายเอง
      </label>
      {source.quantity === null && !manual && (
        <p role="status">
          ยังไม่มีคาดการณ์ของสินค้านี้ เปิด “กำหนดจำนวนขายเอง” เพื่อทดลองกำไรได้
        </p>
      )}
      <div className="profit-input-grid">
        <Input
          title={`จำนวนที่คาดว่าจะขาย (${unit})`}
          formula="จำนวนจากคาดการณ์ของสินค้าที่เลือก หรือค่าที่กำหนดเอง"
          value={
            manual
              ? (draft.demand ?? source.quantity ?? 0)
              : (source.quantity ?? undefined)
          }
          disabled={!manual && source.quantity === null}
          onChange={(demand) => patch({ demand, manual: true })}
        />
        <Input
          title="ราคาขายต่อหน่วย (บาท)"
          formula="ราคาตั้งต้นจากข้อมูลสินค้า ปรับทดลองได้โดยไม่เขียนทับ"
          value={input.price}
          onChange={(price) => patch({ price })}
        />
        <Input
          title="ส่วนลด (%)"
          formula="ราคาหลังลด = ราคาขาย × (1 − ส่วนลด ÷ 100)"
          value={input.discount}
          max={100}
          onChange={(discount) => patch({ discount })}
        />
        <Input
          title="ต้นทุนต่อหน่วย (บาท)"
          formula="ต้นทุนขาย = จำนวนขาย × ต้นทุนต่อหน่วย ไม่รวมต้นทุนสินค้าที่ยังไม่ขาย"
          value={input.cost}
          onChange={(cost) => patch({ cost })}
        />
      </div>
      <button onClick={() => setDrafts((old) => ({ ...old, [scope]: {} }))}>
        คืนค่าเดิมจากข้อมูลสินค้า
      </button>
      {error && <p role="alert">{error}</p>}
      {stockWarning && (
        <p className="profit-warning" role="status">
          {stockWarning}
        </p>
      )}
      {!snapshot && f.error && (
        <p className="profit-warning">
          คาดการณ์ปัจจุบันใช้ไม่ได้: {f.error.replace("Error: ", "")} ·
          ยังใช้จำนวนขายที่กำหนดเองได้
        </p>
      )}
      <h3>สรุปผลทางการเงิน</h3>
      <div className="profit-kpis">
        {cards.map(([title, value, formula, format]) => (
          <article key={title}>
            <Help title={title} formula={formula} />
            <strong>
              {value == null
                ? format === "percent" && result
                  ? "N/A"
                  : "ยังไม่มีผลคำนวณ"
                : format === "money"
                  ? money(value)
                  : `${display(value)}%`}
            </strong>
          </article>
        ))}
      </div>
      {result && (
        <p>
          จำนวนขายที่ใช้จำลอง {display(result.desired)} {unit} · ราคาหลังส่วนลด{" "}
          {money(result.effectivePrice)} · กำไรต่อหน่วยเปลี่ยนจากข้อมูลสินค้า{" "}
          {signed(
            product
              ? result.unitProfit - (product.sellingPrice - product.unitCost)
              : null,
          )}
        </p>
      )}
      <h3>ก่อนปรับเทียบกับหลังปรับ</h3>
      <p>
        ก่อนปรับใช้ราคาและต้นทุนจากข้อมูลสินค้า รวมจำนวนจากแหล่งคาดการณ์เดิม
        ส่วนลดไม่ทำให้จำนวนขายเพิ่มเอง ต้องระบุสมมติฐานยอดเพิ่มแยก
      </p>
      <Table headers={["รายการ", "ก่อนปรับ", "หลังปรับ", "ส่วนต่าง"]}>
        {(
          [
            ["ยอดขายคาดการณ์", baseline?.revenue, result?.revenue, false],
            ["กำไรขั้นต้น", baseline?.grossProfit, result?.grossProfit, false],
            ["อัตรากำไรขั้นต้น", baseline?.margin, result?.margin, true],
          ] as const
        ).map(([name, b, s, pct]) => (
          <tr key={name}>
            <td>{name}</td>
            <td>{b == null ? "N/A" : pct ? `${display(b)}%` : money(b)}</td>
            <td>{s == null ? "N/A" : pct ? `${display(s)}%` : money(s)}</td>
            <td>
              {signed(
                b == null || s == null ? null : s - b,
                pct ? "จุดเปอร์เซ็นต์" : "บาท",
              )}
            </td>
          </tr>
        ))}
      </Table>
      {baseline && result && (
        <Chart
          rows={[
            {
              date: "ยอดขาย",
              ก่อนปรับ: baseline.revenue,
              หลังปรับ: result.revenue,
            },
            {
              date: "กำไรขั้นต้น",
              ก่อนปรับ: baseline.grossProfit,
              หลังปรับ: result.grossProfit,
            },
          ]}
          keys={["ก่อนปรับ", "หลังปรับ"]}
        />
      )}
      <details className="profit-advanced">
        <summary>ตั้งค่าขั้นสูง (ไม่จำเป็น)</summary>
        {advancedError && <p role="alert">{advancedError}</p>}
        <p>
          ยอดเพิ่มและค่าใช้จ่ายเป็นสมมติฐาน ไม่ปรับยอดจริง
          ค่าแรงเริ่มต้นรวมเฉพาะงานกำลังคนที่มีสินค้าและช่วงวันตรงกัน{" "}
          {money(labor)}; ไม่กระจายค่าแรงทั้งโซนให้สินค้าโดยไม่มีหลักฐาน
          สินค้าเสียหายจากข้อมูลช่วงเดียวกัน {display(waste)} {unit}{" "}
          นำมาเป็นสมมติฐาน ไม่ถือเป็นยอดเสียหายอนาคตที่ยืนยัน
          ค่าใช้จ่ายอื่นเริ่มที่ 0 เมื่อยังไม่มีรายการแผน
        </p>
        <div className="profit-input-grid">
          <Input
            title="คาดว่ายอดขายเพิ่ม (%)"
            formula="จำนวนขายที่ต้องการ = จำนวนตั้งต้น × (1 + ยอดเพิ่ม ÷ 100) เป็นสมมติฐานแยกจากส่วนลด"
            value={input.uplift}
            onChange={(uplift) => patch({ uplift })}
          />
          <Input
            title={`จำนวนที่วางแผนสั่งซื้อเพิ่ม (${unit})`}
            formula="เริ่มต้นจากคำแนะนำสต็อกของสินค้าและช่วงที่เลือก ไม่ใช่คำสั่งซื้อจริง"
            value={input.order}
            onChange={(order) => patch({ order })}
          />
          <Input
            title="ค่าแรงเพิ่มเติม (บาท)"
            formula="หักจากกำไรหลังค่าใช้จ่าย ไม่หักกำไรขั้นต้น"
            value={input.labor}
            onChange={(labor) => patch({ labor })}
          />
          <Input
            title="ค่าใช้จ่ายโปรโมชั่น (บาท)"
            formula="หักจากกำไรหลังค่าใช้จ่าย ไม่หักกำไรขั้นต้น"
            value={input.campaign}
            onChange={(campaign) => patch({ campaign })}
          />
          <Input
            title={`สินค้าเสียหาย (${unit})`}
            formula="แยกจำนวนเสียหายจากจำนวนขาย ต้นทุนเสียหาย = จำนวนเสียหาย × ต้นทุน ไม่หักซ้ำในต้นทุนขาย"
            value={input.wasteUnits}
            onChange={(wasteUnits) => patch({ wasteUnits })}
          />
          <Input
            title="ค่าใช้จ่ายอื่น (บาท)"
            formula="ค่าใช้จ่ายเพิ่มเติมที่ยังไม่รวมในช่องอื่น"
            value={input.other}
            onChange={(other) => patch({ other })}
          />
        </div>
        <label className="profit-toggle">
          <input
            type="checkbox"
            checked={input.orderInTime}
            onChange={(e) => patch({ orderInTime: e.target.checked })}
          />
          สมมติสินค้าที่สั่งเพิ่มมาทันสิ้นช่วงคาดการณ์
        </label>
        <p>ตรวจสต็อกแบบรวมช่วง ยังไม่รับประกันลำดับขายและรับสินค้ารายวัน</p>
        {rec ? (
          <p>
            สต็อกเปิดงวดพร้อมขาย {display(rec.availableStock)} {unit} ณ{" "}
            {fullDate(rec.stockDate)} · สินค้าระหว่างขนส่งที่มาทันช่วง{" "}
            {display(rec.eligibleHorizon)} {unit} · แนะนำสั่งจากแผน{" "}
            {display(rec.suggestedOrder)} {unit}
            {rec.openingStockAssumption
              ? " · วันเริ่มแผนห่างจากยอดตรวจนับ สมมติยอดเปิดคงเดิม"
              : ""}
            {rec.forecastAssumption ? " · แผนสต็อกใช้สมมติฐานความต้องการ" : ""}
          </p>
        ) : (
          <p>
            ยังไม่ได้ตรวจสอบความเพียงพอของสินค้า
            ไม่มีการยืนยันยอดสต็อกหรือเงินลงทุน
          </p>
        )}
        {advanced && (
          <dl className="profit-results">
            {(
              [
                [
                  "เงินลงทุนซื้อสินค้าเพิ่ม",
                  advanced.investment === null
                    ? "ยังประเมินไม่ได้"
                    : money(advanced.investment),
                  "จำนวนสั่งซื้อ × ต้นทุน แสดงแยก ไม่หักซ้ำจากกำไร",
                ],
                [
                  "สินค้าคงเหลือคาดการณ์",
                  advanced.closing === null
                    ? "ยังประเมินไม่ได้"
                    : `${display(advanced.closing)} ${unit}`,
                  "พร้อมขาย + สินค้าระหว่างขนส่งทันช่วง + คำแนะนำสั่งที่มาทัน − จำนวนขายได้ตามสต็อก − สินค้าเสียหาย ไม่ใช่ยอดปิดยืนยัน",
                ],
                [
                  "จำนวนที่ขายได้ตามสต็อก",
                  advanced.sellable === null
                    ? "ยังไม่ได้ตรวจสอบ"
                    : `${display(advanced.sellable)} ${unit}`,
                  "min(ความต้องการ, max(0, สินค้ารวมที่มาทัน − เสียหาย))",
                ],
                [
                  "กำไรหลังค่าใช้จ่ายเพิ่มเติม",
                  money(advanced.contribution),
                  "กำไรขั้นต้น − ต้นทุนเสียหาย − ค่าแรงเพิ่ม − โปรโมชั่น − ค่าใช้จ่ายอื่น; สมมติขายได้ครบ",
                ],
                [
                  "จำนวนขายเพื่อรักษากำไรเดิม",
                  baseline && advanced.breakEvenQuantity !== null
                    ? `${display(advanced.breakEvenQuantity)} ${unit}`
                    : "N/A",
                  "(กำไรเดิม + ค่าใช้จ่ายเพิ่ม + ต้นทุนเสียหาย) ÷ กำไรต่อหน่วยใหม่; เชิงทฤษฎี อาจเกินสต็อก",
                ],
              ] as const
            ).map(([title, value, formula]) => (
              <div key={title}>
                <dt>
                  <Help title={title} formula={formula} />
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </details>
      <details className="profit-details">
        <summary>ดูสูตรและรายละเอียดข้อมูล</summary>
        <p>
          ข้อมูลอ้างอิง: {f.ref} · สินค้า {sku} · คาดการณ์{" "}
          {source.forecastReference}
          {snapshot
            ? ` · ผลบันทึก ${snapshot.id} · อ้างอิง ${snapshot.reference}`
            : " · ผลคาดการณ์ปัจจุบัน"}
        </p>
        <p>
          ช่วง {options.start} – {source.end ?? "ไม่มีข้อมูล"} ·{" "}
          {source.assumed || manual
            ? "SCENARIO ใช้สมมติฐานจำนวนขาย"
            : "จำนวนจากประวัติและปฏิทินของชุดข้อมูล"}{" "}
          · รูปแบบ{" "}
          {
            {
              Expected: "ปกติ",
              Conservative: "ระมัดระวัง",
              Optimistic: "ยอดขายสูง",
            }[options.scenario]
          }
        </p>
        {result && (
          <div className="profit-formulas">
            <p>
              ราคาหลังส่วนลด = {display(input.price)} × (1 −{" "}
              {display(input.discount)} ÷ 100) = {money(result.effectivePrice)}
            </p>
            <p>
              จำนวนขายหลังปรับ = {display(input.demand)} × (1 +{" "}
              {display(input.uplift)} ÷ 100) = {display(result.desired)} {unit}
            </p>
            <p>
              ยอดขาย = {display(result.desired)} ×{" "}
              {display(result.effectivePrice)} = {money(result.revenue)}
            </p>
            <p>
              ต้นทุนสินค้าที่ขาย = {display(result.desired)} ×{" "}
              {display(input.cost)} = {money(result.cogs)}
            </p>
            <p>
              กำไรขั้นต้น = {money(result.revenue)} − {money(result.cogs)} ={" "}
              {money(result.grossProfit)}
            </p>
            <p>
              อัตรากำไร = {money(result.grossProfit)} ÷ {money(result.revenue)}{" "}
              × 100 ={" "}
              {result.margin === null
                ? "N/A (ยอดขายเป็นศูนย์)"
                : `${display(result.margin)}%`}
            </p>
            <p>
              กำไรหลังค่าใช้จ่าย = {money(result.grossProfit)} −{" "}
              {money(advanced?.wasteLoss)} − {money(input.labor)} −{" "}
              {money(input.campaign)} − {money(input.other)} ={" "}
              {advanced ? money(advanced.contribution) : "ตรวจค่าขั้นสูง"}
            </p>
          </div>
        )}
      </details>
    </section>
  );
}
