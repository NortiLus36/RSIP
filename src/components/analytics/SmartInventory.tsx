"use client";
import { useState, useEffect } from "react";
import type { DashboardData } from "@/data/providers";
import type { InventoryAssumptions } from "@/types/inventory-planning";
import { useForecast, usePlanningSku } from "./useForecast";
import { useIntelligence } from "@/stores/intelligence";
import { useExplorer } from "@/stores/explorer";
import {
  inventoryRecommendation,
  fixtureCapacity,
  dateAdd,
} from "@/lib/analytics/intelligence";
import { createInventoryTask } from "@/lib/analytics/inventory-actions";
import { fullDate } from "@/lib/analytics/overview";
import { validDate } from "@/lib/import/validate";
import { KPIInfoPopover } from "./KPIInfoPopover";
import { display, Table } from "./IntelligenceUI";
function Info({ title, text }: { title: string; text: string }) {
  return (
    <span className="inventory-label">
      <span>{title}</span>
      <KPIInfoPopover
        topic={title}
        helpOverride={{
          title,
          definition: text,
          formula: text,
          inputs: "Active Dataset / SKU / Fixture และ Forecast ที่เลือก",
          interpretation: "แยกการเติมชั้นจากคำแนะนำสั่งซื้อ",
          example: "ใช้ค่าของสินค้าที่เลือกในส่วนวิธีคำนวณ",
          advice: "ตรวจสินค้าจองและวันรับสินค้าก่อนดำเนินการ",
          caution: "คำแนะนำเป็นการวางแผน ไม่ใช่การออกใบสั่งซื้อจริง",
        }}
      />
    </span>
  );
}
function Numeric({
  title,
  text,
  value,
  onChange,
  max = 1e9,
}: {
  title: string;
  text: string;
  value: number | undefined;
  onChange: (n: number) => void;
  max?: number;
}) {
  return (
    <label>
      <Info title={title} text={text} />
      <input
        aria-label={title}
        type="number"
        min={0}
        max={max}
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
export function SmartInventory({
  data,
  onExplore,
  onForecast,
}: {
  data: DashboardData;
  onExplore?: () => void;
  onForecast: () => void;
}) {
  const f = useForecast(data),
    w = useIntelligence(),
    [chosen, setSku] = usePlanningSku(data),
    [fixtureBySku, setFixtureBySku] = useState<Record<string, string>>({}),
    [filter, setFilter] = useState("all"),
    [notice, setNotice] = useState("");
  const products = data.catalog.products.filter((p) => p.active),
    sku = products.some((p) => p.sku === chosen)
      ? chosen
      : (products[0]?.sku ?? ""),
    product = products.find((p) => p.sku === sku),
    unit = product?.unit ?? "หน่วย",
    ref = f.ref,
    review = w.reviewDays[ref] ?? 1;
  useEffect(() => {
    if (sku && sku !== chosen) useIntelligence.getState().selectSku(ref, sku);
  }, [sku, chosen, ref]);
  const settings = w.planningAssumptions[ref] ?? {},
    a = settings[sku] ?? {},
    placements = data.catalog.fixtureProducts.filter((p) => p.sku === sku),
    fixture =
      placements.find((p) => p.fixtureId === fixtureBySku[sku])?.fixtureId ??
      placements[0]?.fixtureId ??
      "";
  const patch = (value: Partial<InventoryAssumptions>) => {
    w.setPlanning(ref, sku, { ...a, ...value });
    setNotice("");
  };
  const plans = products.map((p) => {
    try {
      return {
        product: p,
        plan: inventoryRecommendation(
          data,
          f.rows,
          p.sku,
          review,
          undefined,
          settings[p.sku],
        ),
        error: "",
      };
    } catch (e) {
      return { product: p, plan: null, error: String(e) };
    }
  });
  const current = plans.find((p) => p.product.sku === sku),
    r = current?.plan,
    position = r?.refills.find((p) => p.fixtureId === fixture),
    shelf = data.catalog.shelfInventory.find(
      (p) => p.sku === sku && p.fixtureId === fixture,
    ),
    warehouses = data.catalog.stockLocations.filter((p) => p.sku === sku),
    backroom = warehouses.length
      ? warehouses.reduce((sum, l) => sum + l.backroomStock, 0)
      : null;
  const selectedRows = f.rows.filter((row) => row.sku === sku),
    forecastAvailable = selectedRows.length > 0 && !f.error,
    planning = data.catalog.planning.find((p) => p.sku === sku);
  const statuses = (p: typeof r) =>
    !p
      ? ["ข้อมูลไม่เพียงพอ"]
      : [
          ...(p.replenishment > 0 ? ["เติมสินค้าขึ้นชั้น"] : []),
          ...(p.suggestedOrder > 0 ? ["ควรสั่งสินค้าเพิ่ม"] : []),
          ...(p.availableStock + p.eligibleHorizon < p.demand
            ? ["เฝ้าระวังสินค้าใกล้หมด"]
            : []),
          ...(p.hasMissingCapacity ? ["ข้อมูลความจุชั้นไม่เพียงพอ"] : []),
          ...(!p.replenishment &&
          !p.suggestedOrder &&
          !p.hasMissingCapacity &&
          p.availableStock + p.eligibleHorizon >= p.demand
            ? ["สินค้าเพียงพอ"]
            : []),
        ];
  const priority = (p: typeof r) =>
    !p
      ? 4
      : p.shelfStock === 0 && p.replenishment > 0
        ? 0
        : p.suggestedOrder > 0
          ? 1
          : p.replenishment > 0
            ? 2
            : p.availableStock + p.eligibleHorizon < p.demand
              ? 3
              : 5;
  const visible = plans
    .filter(
      (x) =>
        filter === "all" ||
        (filter === "refill" && (x.plan?.replenishment ?? 0) > 0) ||
        (filter === "order" && (x.plan?.suggestedOrder ?? 0) > 0) ||
        (filter === "risk" &&
          !!x.plan &&
          x.plan.availableStock + x.plan.eligibleHorizon < x.plan.demand) ||
        (filter === "enough" && statuses(x.plan).includes("สินค้าเพียงพอ")),
    )
    .sort(
      (x, y) =>
        priority(x.plan) - priority(y.plan) ||
        x.product.nameTh.localeCompare(y.product.nameTh),
    );
  const choose = (next: string, target?: string) => {
    setSku(next);
    setFixtureBySku((prev) => ({
      ...prev,
      [next]:
        target ??
        data.catalog.fixtureProducts.find((p) => p.sku === next)?.fixtureId ??
        "",
    }));
    setNotice("");
  };
  const focus = () => {
    if (fixture) {
      useExplorer.getState().selectSku(sku, fixture);
      onExplore?.();
    }
  };
  const task = async (type: "Replenishment" | "PurchaseReview") => {
    try {
      if (!r || !position) throw Error("ข้อมูลไม่เพียงพอ");
      const quantity =
        type === "Replenishment" ? position.replenishment : r.suggestedOrder;
      if (quantity === null) throw Error("ไม่มีข้อมูลความจุชั้น");
      const state = useIntelligence.getState();
      const { task, action } = createInventoryTask(
        data,
        f.rows,
        f.options,
        {
          sku,
          fixtureId: fixture,
          quantity,
          type,
          inventoryReference: `${ref}:${shelf?.updatedAt ?? r.stockDate}`,
          reason: `บนชั้นนี้ ${position.shelfStock} ${unit}; คลังทั้งSKU ${r.backroomStock} ${unit}; demandช่วงคุ้มครอง ${r.protection}; พร้อมขายทั้งSKU ${r.availableStock}; incomingทัน ${r.inTime}; สำรอง ${r.safetyStock}; ระยะคุ้มครอง ${r.coverageDays} วัน; ${type === "Replenishment" ? "เติมตามเป้าหมายวันแรกแบ่งตามความจุชั้น" : "สั่ง = max(0, Demandช่วงคุ้มครอง + สำรอง − พร้อมขาย − incomingทัน)"}`,
        },
        state.tasks,
        crypto.randomUUID(),
      );
      await state.save({
        tasks: [...state.tasks, task],
        actions: {
          ...state.actions,
          [ref]: [...(state.actions[ref] ?? data.dataset.actions), action],
        },
      });
      setNotice(
        type === "Replenishment"
          ? "สร้างงานเติมสินค้าใน Operations / My Tasks แล้ว"
          : "สร้างงานพิจารณาสั่งซื้อใน Operations แล้ว เป็นคำแนะนำ ยังไม่ได้ออก Purchase Order",
      );
    } catch (e) {
      setNotice(String(e));
    }
  };
  const end = selectedRows.at(-1)?.date;
  return (
    <section className="smart-inventory" aria-label="วางแผนสินค้าคงคลัง">
      <h2>วางแผนสินค้าคงคลัง</h2>
      <p>
        ตรวจสอบสินค้าคงเหลือและคำนวณจำนวนที่ควรเติมขึ้นชั้นหรือสั่งซื้อ
        เพื่อให้เพียงพอกับความต้องการที่คาดการณ์
      </p>
      {!products.length && <p>ไม่มีข้อมูลสินค้าที่ใช้งานได้ในชุดข้อมูลนี้</p>}
      <div className="inventory-fields">
        <label>
          <Info
            title="สินค้าที่ต้องการวางแผน"
            text="ชื่อและ SKU จาก Product Master ของชุดข้อมูลที่ใช้งานอยู่"
          />
          <select
            aria-label="สินค้าที่ต้องการวางแผน"
            value={sku}
            onChange={(e) => choose(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.nameTh} · {p.sku}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Info
            title="ตำแหน่งชั้นวาง (Fixture)"
            text="บนชั้นแสดงเฉพาะตำแหน่งนี้ คลังและคำแนะนำสั่งซื้อคิดรวมระดับSKUครั้งเดียว"
          />
          <select
            aria-label="ตำแหน่งชั้นวาง (Fixture)"
            value={fixture}
            disabled={!placements.length}
            onChange={(e) =>
              setFixtureBySku({ ...fixtureBySku, [sku]: e.target.value })
            }
          >
            {!placements.length && (
              <option value="">ไม่มีตำแหน่งชั้นวาง</option>
            )}
            {placements.map((p) => (
              <option key={p.fixtureId} value={p.fixtureId}>
                {data.store.fixtures.find((f) => f.id === p.fixtureId)?.name ??
                  p.fixtureId}{" "}
                · {p.fixtureId}
              </option>
            ))}
          </select>
        </label>
        <div className="inventory-forecast">
          <Info
            title="ช่วงเวลาคาดการณ์"
            text="ใช้Active Forecastจากตัวเลือกปัจจุบัน ไม่อ่านSnapshotมาแทนเงียบๆ และไม่ใช้Manual Demandเป็นยอดขายจริง"
          />
          <p>
            {forecastAvailable && end
              ? `${fullDate(f.options.start)} – ${fullDate(end)} · ${f.options.horizon} วัน`
              : "ยังไม่มีForecastที่ใช้ได้"}
            <br />
            รูปแบบ:{" "}
            {
              {
                Expected: "ปกติ",
                Conservative: "ระมัดระวัง",
                Optimistic: "ยอดขายสูง",
              }[f.options.scenario]
            }{" "}
            · Active Forecast /{" "}
            {selectedRows.some((row) => row.manual) ||
            a.dailyDemand !== undefined
              ? "SCENARIO ใช้สมมติฐาน"
              : "จากประวัติที่มี"}
            <br />
            ใช้ตัวเลือกปัจจุบัน ไม่ได้เลือก Forecast Snapshot มาแทน
          </p>
          <button onClick={onForecast}>ไปคาดการณ์ความต้องการสินค้า</button>
        </div>
      </div>
      <p className="inventory-source">
        {data.dataset.intelligence?.sourceLabel ?? data.dataset.source} ·
        Snapshot: {shelf?.updatedAt ?? "ไม่มีข้อมูล"} · {sku}
        <br />
        บนชั้น = Fixture ที่เลือก · คลัง / พร้อมขาย / คำแนะนำสั่ง = รวมทั้ง SKU
        ไม่คูณตามจำนวนชั้น
      </p>
      {(current?.error || f.error) && (
        <p role="alert">{current?.error || f.error}</p>
      )}
      <div className="inventory-kpis">
        {[
          [
            "สินค้าบนชั้น",
            shelf?.shelfStock,
            "ยอดนับล่าสุดของSKUและFixtureที่เลือก",
          ],
          [
            "สินค้าในคลังหลังร้าน",
            backroom,
            "รวมคลังระดับSKU/locationครั้งเดียว ตัวเลขนี้รวมของจอง แยกของพร้อมใช้ในวิธีคำนวณ",
          ],
          [
            "แนะนำเติมขึ้นชั้น",
            position?.replenishment,
            "min(คลังที่ไม่จองคงเหลือ, ที่ว่างบนชั้น, เป้าหมายเติม−บนชั้น) จัดสรรคลังครั้งเดียวระหว่างFixture",
          ],
          [
            "แนะนำสั่งซื้อเพิ่ม",
            r?.suggestedOrder,
            "max(0, DemandในLead+Review + Safety − Available − Incomingที่มาทัน) เป็นคำแนะนำระดับSKU",
          ],
        ].map(([title, value, text]) => (
          <article key={String(title)}>
            <Info title={String(title)} text={String(text)} />
            <strong>
              {typeof value === "number" && Number.isFinite(value)
                ? `${display(value)} ${unit}`
                : "ไม่มีข้อมูล"}
            </strong>
          </article>
        ))}
      </div>
      <div className="inventory-advice" aria-label="คำแนะนำสินค้าที่เลือก">
        <h3>คำแนะนำและเหตุผล</h3>
        {!r ? (
          <p>
            ข้อมูลไม่เพียงพอ:{" "}
            {forecastAvailable
              ? "ต้องมีSnapshotและข้อมูลวางแผนที่ใช้เป็นสต็อกเปิดได้ (ห้ามใช้สต็อกหลังวันเริ่มForecastย้อนหลัง)"
              : "ยังไม่มีForecastที่ใช้ได้ กรุณาตั้งค่าที่หน้าคาดการณ์"}
          </p>
        ) : (
          <>
            <p>{statuses(r).join(" · ")}</p>
            {position?.replenishment != null && position.replenishment > 0 && (
              <p>
                ชั้น {fixture} มี {display(position.shelfStock)} {unit} เป้าหมาย{" "}
                {display(position.target)} {unit} แนะนำเติม{" "}
                {display(position.replenishment)} {unit}{" "}
                จากคลังที่ไม่ถูกจองก่อนช่วงขาย
              </p>
            )}
            {position?.capacity === null && (
              <p>
                ไม่ทราบความจุชั้นนี้ จึงยังไม่ระบุจำนวนเติมที่แม่นยำ
                กรุณากำหนดสมมติฐานความจุในตั้งค่าขั้นสูง
              </p>
            )}
            {r.suggestedOrder > 0 && (
              <p>
                ความต้องการช่วงคุ้มครอง {display(r.protection)} + สำรอง{" "}
                {display(r.safetyStock)} มากกว่าสต็อกพร้อมขาย{" "}
                {display(r.availableStock)} + incomingทัน {display(r.inTime)}{" "}
                จึงแนะนำสั่ง {display(r.suggestedOrder)} {unit}
              </p>
            )}
            {r.suggestedOrder === 0 && (
              <p>
                พร้อมขาย {display(r.availableStock)} + incomingทัน{" "}
                {display(r.inTime)} เพียงพอกับDemandช่วงคุ้มครอง{" "}
                {display(r.protection)} + สำรอง {display(r.safetyStock)}{" "}
                จึงยังไม่ต้องสั่งเพิ่ม
              </p>
            )}
            {position?.capacity !== null && position?.replenishment === 0 && (
              <p>
                ยังไม่ต้องเติมชั้นนี้: บนชั้น {display(position.shelfStock)} /
                เป้าหมาย {display(position.target)};
                คลังที่จัดสรรได้อาจถูกจำกัดด้วยของจองหรือความจุ
                อ่านรายละเอียดการจัดสรรด้านล่าง
              </p>
            )}
            {r.extrapolated && (
              <p>
                ช่วงคุ้มครอง {r.coverageDays} วัน แต่Forecastไม่ครบ{" "}
                {r.estimatedDays} วัน ใช้ค่าเฉลี่ย {display(r.dailyDemand)}{" "}
                {unit}/วันแทนวันที่ขาด เป็นสมมติฐาน ไม่เติมวันที่ขาดเป็นศูนย์
              </p>
            )}
            {!!r.horizonEstimatedDays && (
              <p>
                ช่วงForecastมีวันที่ขาด {r.horizonEstimatedDays} วัน
                ประมาณจากค่าเฉลี่ยที่มี เป็นสมมติฐานของClosing
              </p>
            )}
            {r.openingStockAssumption && (
              <p>
                วันเริ่มแผนห่างจากSnapshot สมมติสต็อกเปิดคงเดิม
                ไม่มีข้อมูลการเคลื่อนไหวระหว่างช่วง
              </p>
            )}
          </>
        )}
      </div>
      <div className="inventory-actions">
        <button disabled={!fixture} onClick={focus}>
          ดูตำแหน่งในร้าน 3D
        </button>
        <button
          disabled={
            w.busy ||
            !w.ready ||
            !(position?.replenishment && position.replenishment > 0)
          }
          onClick={() => void task("Replenishment")}
        >
          สร้างงานเติมสินค้า
        </button>
        <button
          disabled={
            w.busy || !w.ready || !(r?.suggestedOrder && r.suggestedOrder > 0)
          }
          onClick={() => void task("PurchaseReview")}
        >
          สร้างงานพิจารณาสั่งซื้อ
        </button>
      </div>
      <p role="status" aria-live="polite">
        {notice || w.error}
      </p>
      <h3>รายการสินค้าที่ต้องดำเนินการ</h3>
      <label className="inventory-filter">
        แสดงรายการ
        <select
          aria-label="แสดงรายการ"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">ทุกสินค้า</option>
          <option value="refill">สินค้าต้องเติมชั้น</option>
          <option value="order">สินค้าต้องสั่งเพิ่ม</option>
          <option value="risk">สินค้าเสี่ยงหมด</option>
          <option value="enough">สินค้าเพียงพอ</option>
        </select>
      </label>
      <Table
        headers={[
          "สินค้า",
          "โซน",
          "คงเหลือพร้อมขาย",
          "ความต้องการคาดการณ์",
          "แนะนำเติม",
          "แนะนำสั่ง",
          "สถานะ",
          "ดำเนินการ",
        ]}
      >
        {visible.map((x) => {
          const plan = x.plan,
            place = plan?.refills
              .filter((p) => (p.replenishment ?? 0) > 0)
              .sort(
                (a, b) => (b.replenishment ?? 0) - (a.replenishment ?? 0),
              )[0]?.fixtureId;
          return (
            <tr key={x.product.sku} aria-selected={sku === x.product.sku}>
              <td>
                <button onClick={() => choose(x.product.sku, place)}>
                  {x.product.nameTh}
                  <br />
                  {x.product.sku}
                </button>
              </td>
              <td>
                {data.catalog.categories.find(
                  (c) => c.id === x.product.categoryId,
                )?.zoneId ?? "ไม่มีข้อมูล"}
              </td>
              <td>
                {plan
                  ? `${display(plan.availableStock)} ${x.product.unit}`
                  : "ไม่มีข้อมูล"}
              </td>
              <td>
                {plan
                  ? `${display(plan.demand)} ${x.product.unit}`
                  : "ไม่มีข้อมูล"}
              </td>
              <td>
                {plan && !plan.hasMissingCapacity
                  ? `${display(plan.replenishment)} ${x.product.unit}`
                  : "ข้อมูลไม่ครบ"}
              </td>
              <td>
                {plan
                  ? `${display(plan.suggestedOrder)} ${x.product.unit}`
                  : "ไม่มีข้อมูล"}
              </td>
              <td>{statuses(plan).join(" · ")}</td>
              <td>
                <button onClick={() => choose(x.product.sku, place)}>
                  ดูคำแนะนำ
                </button>
              </td>
            </tr>
          );
        })}
      </Table>
      <p>
        เติมในตารางเป็นยอดรวมงานเติมทุกชั้นที่จัดสรรคลังร่วมกันแล้ว
        ส่วนการ์ดด้านบนเป็นเฉพาะชั้นที่เลือก ·
        สั่งเพิ่มคิดระดับSKUเพียงครั้งเดียว
      </p>
      <details className="inventory-advanced">
        <summary>ตั้งค่าการวางแผนขั้นสูง (ไม่จำเป็น)</summary>
        <p>
          ค่าเริ่มต้นจากDatasetและForecast; การแก้ในส่วนนี้เป็นSCENARIOของSKUนี้
          ไม่เปลี่ยนยอดนับจริงหรือไฟล์นำเข้า
        </p>
        <div className="inventory-fields">
          <Numeric
            title="ระยะเวลารอสินค้า (วัน)"
            text="จำนวนวันรอคำสั่งซื้อใหม่ ข้อมูลจากแผนSKU"
            value={a.leadTimeDays ?? planning?.leadTimeDays}
            max={365}
            onChange={(leadTimeDays) => patch({ leadTimeDays })}
          />
          <Numeric
            title="รอบการสั่งซื้อ (วัน)"
            text="จำนวนวันทบทวน0–7 ช่วงคุ้มครอง=วันรอ+รอบสั่งซื้อ"
            value={a.reviewDays ?? review}
            max={7}
            onChange={(reviewDays) => patch({ reviewDays })}
          />
          <Numeric
            title={`สินค้าสำรอง (${unit})`}
            text="สำรองนอกเหนือจากDemandในช่วงคุ้มครอง"
            value={a.safetyStock ?? planning?.safetyStock}
            onChange={(safetyStock) => patch({ safetyStock })}
          />
          <Numeric
            title={`ความจุชั้นวาง (${unit})`}
            text="ความจุFixtureที่เลือก หากไม่มีข้อมูลไม่ใช้ยอดคงเหลือเดาความจุ"
            value={
              a.capacities?.[fixture] ??
              position?.capacity ??
              fixtureCapacity(data, sku, fixture) ??
              undefined
            }
            onChange={(capacity) =>
              patch({ capacities: { ...a.capacities, [fixture]: capacity } })
            }
          />
          <label className="inventory-toggle">
            <input
              type="checkbox"
              checked={a.incomingQuantity !== undefined}
              onChange={(e) => {
                const next = { ...a };
                if (e.target.checked) {
                  next.incomingQuantity = r?.incomingStock ?? 0;
                  next.incomingEta =
                    r?.batches.filter((b) => b.eta).at(-1)?.eta ??
                    f.options.start;
                } else {
                  delete next.incomingQuantity;
                  delete next.incomingEta;
                }
                w.setPlanning(ref, sku, next);
              }}
            />
            กำหนดสินค้าระหว่างขนส่งเอง
          </label>
          {a.incomingQuantity !== undefined && (
            <>
              <Numeric
                title={`จำนวนสินค้าระหว่างขนส่ง (${unit})`}
                text="แทนรายการIncomingเดิมทั้งSKU ไม่บวกซ้ำ และนับเมื่อETAทัน"
                value={a.incomingQuantity}
                onChange={(incomingQuantity) => patch({ incomingQuantity })}
              />
              <label>
                <Info
                  title="วันที่คาดว่าจะได้รับสินค้า"
                  text="เปรียบเทียบวันที่รับจริงกับวันสุดท้ายของช่วงคุ้มครอง / horizon"
                />
                <input
                  aria-label="วันที่คาดว่าจะได้รับสินค้า"
                  type="date"
                  value={a.incomingEta ?? ""}
                  onInput={(e) => patch({ incomingEta: e.currentTarget.value })}
                />
              </label>
            </>
          )}
          <label className="inventory-toggle">
            <input
              type="checkbox"
              checked={a.dailyDemand !== undefined}
              onChange={(e) => {
                const next = { ...a };
                if (e.target.checked) next.dailyDemand = r?.dailyDemand ?? 0;
                else delete next.dailyDemand;
                w.setPlanning(ref, sku, next);
              }}
            />
            ปรับสมมติฐานความต้องการต่อวัน
          </label>
          {a.dailyDemand !== undefined && (
            <Numeric
              title={`ความต้องการเฉลี่ยต่อวัน (${unit})`}
              text="SCENARIOแทนจำนวนรายวันในแผนนี้ ไม่เขียนทับForecastหรือActual"
              value={a.dailyDemand}
              onChange={(dailyDemand) => patch({ dailyDemand })}
            />
          )}
        </div>
        <button
          disabled={w.busy}
          onClick={async () => {
            try {
              const state = useIntelligence.getState();
              await state.save({
                planningAssumptions: {
                  ...state.planningAssumptions,
                  [ref]: { ...state.planningAssumptions[ref], [sku]: {} },
                },
              });
              setNotice(
                "คืนค่าการวางแผนของสินค้าที่เลือกแล้ว ไม่เปลี่ยนDatasetหรือForecast Snapshot",
              );
            } catch (e) {
              setNotice(String(e));
            }
          }}
        >
          คืนค่าการวางแผน
        </button>
      </details>
      <details className="inventory-calculation">
        <summary>ดูวิธีคำนวณและสมมติฐาน</summary>
        {r ? (
          <>
            <dl>
              {[
                [
                  "ความต้องการเฉลี่ยต่อวัน",
                  `${display(r.dailyDemand)} ${unit}/วัน`,
                ],
                [
                  "ช่วงคุ้มครอง",
                  `${r.leadTimeDays} + ${r.reviewDays} = ${r.coverageDays} วัน`,
                ],
                [
                  "ช่วงวันที่คุ้มครอง",
                  r.coverageDays
                    ? `${fullDate(f.options.start)} – ${fullDate(dateAdd(f.options.start, r.coverageDays - 1))}`
                    : "0 วัน",
                ],
                [
                  "ความต้องการช่วงคุ้มครอง",
                  `${display(r.protection)} ${unit} · ประมาณส่วนขาด ${r.estimatedDays} วัน`,
                ],
                ["สินค้าสำรอง", `${display(r.safetyStock)} ${unit}`],
                ["สินค้าจองรวม", `${display(r.reservedStock)} ${unit}`],
                [
                  "สต็อกพร้อมขายทั้งSKU",
                  `${display(r.shelfStock)} + ${display(r.backroomStock)} − ${display(r.reservedStock)} = ${display(r.availableStock)} ${unit}`,
                ],
                ["Incoming ที่มาทัน", `${display(r.inTime)} ${unit}`],
                [
                  "แนะนำสั่งซื้อเพิ่ม",
                  `ceil(max(0, ${display(r.protection)} + ${display(r.safetyStock)} − ${display(r.availableStock)} − ${display(r.inTime)})) = ${display(r.suggestedOrder)} ${unit}`,
                ],
                [
                  "จำนวนวันขายที่สต็อกรองรับ",
                  r.daysOfSupply === null
                    ? "N/A · Demand = 0"
                    : `${display(r.availableStock)} / ${display(r.dailyDemand)} = ${display(r.daysOfSupply)} วัน`,
                ],
                [
                  "ประมาณคงเหลือปิดช่วง",
                  `${display(r.closing)} ${unit} · สต็อกเปิด + incomingทันhorizon + คำแนะนำสั่งที่leadทัน − demand; ไม่ใช่ยอดปิดที่ยืนยัน`,
                ],
              ].map(([title, text]) => (
                <div key={title}>
                  <dt>
                    <Info title={title} text={text} />
                  </dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <p>
              นโยบายเติม: ใช้Demandวันแรกแบ่งตามสัดส่วนความจุชั้น
              จัดสรรคลังไม่จองให้ชั้นที่ว่างก่อน ไม่มีการใช้คลังก้อนเดียวซ้ำ ·
              Incomingไม่ทราบETAไม่นำมาหัก · ประมาณClosingรวมช่วง
              ไม่รับประกันว่าจะไม่ขาดระหว่างวัน
            </p>
            <Table
              headers={["Fixture", "บนชั้น", "ความจุ", "เป้าหมาย", "แนะนำเติม"]}
            >
              {r.refills.map((p) => (
                <tr key={p.fixtureId}>
                  <td>{p.fixtureId}</td>
                  <td>{display(p.shelfStock)}</td>
                  <td>
                    {p.capacity === null ? "ไม่ทราบ" : display(p.capacity)}
                  </td>
                  <td>{p.capacity === null ? "ไม่ทราบ" : display(p.target)}</td>
                  <td>
                    {p.replenishment === null
                      ? "ไม่ทราบ"
                      : display(p.replenishment)}
                  </td>
                </tr>
              ))}
            </Table>
            <Table headers={["Incoming", "วันที่คาดรับ", "ทันช่วงคุ้มครอง"]}>
              {r.batches.map((b, i) => (
                <tr key={i}>
                  <td>
                    {display(b.quantity)} {unit}
                  </td>
                  <td>
                    {validDate(b.eta) ? fullDate(b.eta) : "ไม่ทราบวันรับ"}
                  </td>
                  <td>
                    {b.eta &&
                    r.coverageDays > 0 &&
                    b.eta <= dateAdd(f.options.start, r.coverageDays - 1)
                      ? "ทัน"
                      : "ไม่นับ"}
                  </td>
                </tr>
              ))}
            </Table>
          </>
        ) : (
          <p>
            ยังไม่มีข้อมูลคำนวณครบ กรุณาตรวจForecast,Snapshotและข้อมูลแผนSKU
          </p>
        )}
      </details>
    </section>
  );
}
