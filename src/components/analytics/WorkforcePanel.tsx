"use client";
import { useState } from "react";
import type { DashboardData } from "@/data/providers";
import { useForecast } from "./useForecast";
import { useSpatial } from "@/stores/spatial";
import { useExplorer } from "@/stores/explorer";
import { useIntelligence } from "@/stores/intelligence";
import { fullDate } from "@/lib/analytics/overview";
import { dateAdd, monday, workforcePlan } from "@/lib/analytics/intelligence";
import { forecastSpatial } from "@/lib/analytics/workforce";
import { taskAction } from "@/lib/analytics/operations";
import { display, Field, Table, Stats } from "./IntelligenceUI";
export function WorkforcePanel({
  data,
  onExplore,
}: {
  data: DashboardData;
  onExplore?: () => void;
}) {
  const f = useForecast(data),
    sp = useSpatial(),
    s = useIntelligence();
  const [date, setDate] = useState(
      data.spatial.zones
        .filter((r) => r.occupancy !== null)
        .map((r) => r.date)
        .sort()
        .at(-1) ?? "2026-10-23",
    ),
    [zone, setZone] = useState(data.store.zones[0].id),
    [hour, setHour] = useState(18),
    [minutes, setMinutes] = useState(45),
    [staff, setStaff] = useState(1),
    [cost, setCost] = useState(80),
    [service, setService] = useState(0.4),
    [restock, setRestock] = useState(15),
    [notice, setNotice] = useState("");
  if (!date || !Number.isFinite(Date.parse(date)))
    return (
      <label>
        กรุณาเลือกวันที่
        <input
          type="date"
          value={date}
          onInput={(e) => setDate(e.currentTarget.value)}
        />
      </label>
    );
  let forecast: ReturnType<typeof forecastSpatial> | undefined,
    error = f.error;
  try {
    if (!f.error) forecast = forecastSpatial(data, f.options);
  } catch (e) {
    error = String(e);
  }
  const day =
      sp.mode === "Forecast"
        ? forecast?.dates.includes(sp.selectedDate)
          ? sp.selectedDate
          : f.options.start
        : date,
    active = sp.mode === "Forecast" ? forecast : data.spatial,
    rows = active?.zones.filter((r) => r.date === day) ?? [],
    current = rows.find((r) => r.zoneId === zone && r.hour === hour);
  const wf = data.dataset.intelligence?.workforce.find(
    (r) => r.date === day && r.hour === hour && r.zoneId === zone,
  );
  const visits =
    sp.mode === "Historical"
      ? (current?.customerCount ?? current?.occupancy)
      : current?.occupancy;
  const forecastUnits =
    f.rows
      .filter((r) => r.date === day && r.zoneId === zone)
      .reduce((s, r) => s + r.quantity, 0) /
    Math.max(1, data.spatial.hours.length);
  const workload =
    visits == null
      ? null
      : visits * service +
        restock +
        (sp.mode === "Forecast" ? forecastUnits * 0.3 : 0);
  let plan: ReturnType<typeof workforcePlan> | undefined;
  try {
    if (workload !== null) plan = workforcePlan(workload, minutes, staff, cost);
  } catch (e) {
    error = String(e);
  }
  const rank = data.store.zones
    .map((z) => {
      const peak = active?.zones
        .filter(
          (r) =>
            r.zoneId === z.id &&
            r.date >= monday(day) &&
            r.date <= dateAdd(monday(day), 6) &&
            r.occupancy !== null,
        )
        .sort((a, b) => b.occupancy! - a.occupancy!)[0];
      const units = peak
        ? f.rows
            .filter((r) => r.date === peak.date && r.zoneId === z.id)
            .reduce((sum, r) => sum + r.quantity, 0) /
          Math.max(1, data.spatial.hours.length)
        : 0;
      const load = !peak
        ? null
        : (sp.mode === "Historical"
            ? (peak.customerCount ?? peak.occupancy!)
            : peak.occupancy!) *
            service +
          restock +
          (sp.mode === "Forecast" ? units * 0.3 : 0);
      let recommendation: ReturnType<typeof workforcePlan> | undefined;
      try {
        if (load !== null)
          recommendation = workforcePlan(load, minutes, staff, cost);
      } catch {
        /* Invalid inputs shown by planner above. */
      }
      return {
        id: z.id,
        name: z.nameTh,
        peak,
        load,
        recommendation,
        categories: data.catalog.categories
          .filter((c) => c.zoneId === z.id && !c.parentId)
          .map((c) => c.nameTh)
          .join(", "),
      };
    })
    .sort((a, b) => (b.peak?.occupancy ?? -1) - (a.peak?.occupancy ?? -1));
  const weekStart = monday(date);
  const weeks = Array.from({ length: 21 }, (_, i) => ({
    date: dateAdd(weekStart, i - 7),
    kind:
      i < 7
        ? "Previous Week · Historical"
        : i < 14
          ? "Current Week · Historical"
          : "Next Week · FORECAST",
    future: i >= 14,
  }));
  const focus = () => {
    sp.setLayer("density");
    useSpatial.setState({
      selectedDate: day,
      selectedHour: hour,
      playing: false,
    });
    useExplorer.getState().select(zone);
    onExplore?.();
  };
  const task = async () => {
    try {
      if (!plan) throw new Error("No Data");
      const id = crypto.randomUUID(),
        t = {
          id,
          actionId: `work-${id}`,
          reference: f.ref,
          date: day,
          hour,
          zoneId: zone,
          role: "Store Staff",
          laborCost: plan.cost,
          priority: plan.level,
          status: "Open" as const,
          reason: `${sp.mode}: ${display(workload)} workload minutes / ${minutes} productive minutes; required ${plan.required}, available ${staff}, additional ${plan.additional}`,
        };
      await s.save({
        tasks: [...s.tasks, t],
        actions: {
          ...s.actions,
          [f.ref]: [
            ...(s.actions[f.ref] ?? data.dataset.actions),
            taskAction(t),
          ],
        },
      });
      setNotice("สร้างงานใน Operations / My Tasks แล้ว");
    } catch (e) {
      setNotice(String(e));
    }
  };
  return (
    <section>
      <h2>Peak Time & Workforce</h2>
      <p>
        Historical = ข้อมูลจริงในชุดข้อมูล · Forecast = ประมาณ Occupancy
        จากวันเดียวกันในสัปดาห์ ไม่ใช่จำนวนผู้เข้าร้านไม่ซ้ำ ·
        พื้นที่แต่ละโซนใช้ฐานเดิม
      </p>
      <div className="intel-fields">
        <label>
          โหมด
          <select
            value={sp.mode}
            onChange={(e) => sp.setMode(e.target.value as typeof sp.mode)}
          >
            <option>Historical</option>
            <option>Forecast</option>
          </select>
        </label>
        {sp.mode === "Forecast" && (
          <label>
            วันที่ Forecast
            <select
              value={day}
              onChange={(e) =>
                useSpatial.getState().setTime(e.target.value, hour)
              }
            >
              {forecast?.dates.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          วันที่ Historical
          <input
            type="date"
            value={date}
            onInput={(e) => setDate(e.currentTarget.value)}
          />
        </label>
        <label>
          Zone
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {data.store.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nameTh}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hour
          <select
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
          >
            {data.spatial.hours.map((h) => (
              <option key={h} value={h}>
                {h}:00
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Service min/person (assumption)"
          value={service}
          onChange={setService}
        />
        <Field
          label="Restocking workload minutes"
          value={restock}
          onChange={setRestock}
        />
        <Field
          label="Productive min/staff/hour"
          value={minutes}
          max={60}
          min={1}
          onChange={setMinutes}
        />
        <Field label="Available staff" value={staff} onChange={setStaff} />
        <Field label="Hourly cost THB" value={cost} onChange={setCost} />
        <button
          disabled={!wf}
          onClick={() => {
            if (wf) {
              setMinutes(Number(wf.productiveMinutes));
              setStaff(Number(wf.staffAvailable));
              setCost(Number(wf.hourlyCost));
              setService(Number(wf.serviceMinutes));
            }
          }}
        >
          ใช้ Workforce ที่นำเข้า
        </button>
      </div>
      <p>
        SCENARIO · Capacity และ Service เป็นสมมติฐาน · Occupancy เป็นคนพร้อมกัน
        ใช้เป็น proxy ภาระงาน ไม่ใช่จำนวนเข้าร้านไม่ซ้ำ
      </p>
      <p>
        Selected Cell: {fullDate(day)} · {hour}:00–{hour + 1}:00 · Zone {zone} ·
        Occupancy {display(current?.occupancy)} คนพร้อมกัน · Pass-through{" "}
        {display(current?.customerCount)} ครั้งผ่าน ·{" "}
        {sp.mode === "Forecast"
          ? "FORECAST"
          : data.dataset.intelligence?.sourceLabel}
      </p>
      <p>
        วันที่แสดง {day} · Workforce{" "}
        {wf ? "มีข้อมูล กดใช้เพื่อแทนสมมติฐาน" : "No Data ใช้สมมติฐานที่กรอก"} ·
        Forecast เพิ่มภาระเติมสินค้าจาก Forecast units ÷ ชั่วโมงเปิดร้าน × 0.3
        นาที/ชิ้น (สมมติฐาน) · Required = ceil(workload / productive minutes) ·
        Additional = max(0, required − available)
      </p>
      <p role="alert">{error || notice}</p>
      <Stats
        items={[
          ["Workload min", workload],
          ["Required staff", plan?.required],
          ["Additional staff", plan?.additional],
          ["Extra labor THB/hour", plan?.cost],
        ]}
      />
      <p>
        {plan?.level ?? "No Data"} · Monitor = ไม่มีคนเพิ่ม / Standby = เพิ่ม 1
        / Reinforce = เพิ่ม ≥2
      </p>
      <button onClick={focus} disabled={!current}>
        Focus Zone / Hour ใน 3D
      </button>{" "}
      <button onClick={task} disabled={!plan || s.busy}>
        สร้างงาน Operations
      </button>
      <h3>Day × Hour · {zone} · เลือกช่องเพื่อดูใน 3D</h3>
      <div className="intel-table">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              {data.spatial.hours.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map(({ date: d, kind, future }) => (
              <tr key={d}>
                <td>
                  {kind}
                  <br />
                  {fullDate(d)}
                </td>
                {data.spatial.hours.map((h) => {
                  const r = (
                    future ? forecast?.zones : data.spatial.zones
                  )?.find(
                    (r) => r.date === d && r.zoneId === zone && r.hour === h,
                  );
                  return (
                    <td key={h}>
                      <button
                        title={`${fullDate(d)} ${h}:00–${h + 1}:00 · Zone ${zone} · Occupancy ${display(r?.occupancy)} คนพร้อมกัน · ${kind}`}
                        style={{
                          background:
                            r?.occupancy == null
                              ? "#eee"
                              : `rgba(0,170,166,${Math.min(1, 0.1 + r.occupancy / 50)})`,
                        }}
                        onClick={() => {
                          sp.setMode(future ? "Forecast" : "Historical");
                          useSpatial.setState({
                            selectedDate: d,
                            selectedHour: h,
                            playing: false,
                          });
                          if (!future) setDate(d);
                          setHour(h);
                          sp.setLayer("density");
                          useExplorer.getState().select(zone);
                        }}
                        disabled={!r}
                      >
                        {display(r?.occupancy)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>
        Zone ranking · {sp.mode} · {monday(day)} – {dateAdd(monday(day), 6)}
      </h3>
      <Table
        headers={[
          "Zone",
          "Category (ไม่ใช่ density รายหมวด)",
          "Peak Day / Hour",
          "Occupancy คนพร้อมกัน",
          "Workload นาที",
          "SCENARIO Action",
        ]}
      >
        {rank.map((r) => (
          <tr key={r.id}>
            <td>
              <button
                onClick={() => {
                  setZone(r.id);
                  useExplorer.getState().select(r.id);
                }}
              >
                {r.name}
              </button>
            </td>
            <td>{r.categories || "No Data"}</td>
            <td>
              {r.peak
                ? `${fullDate(r.peak.date)} ${r.peak.hour}:00–${r.peak.hour + 1}:00`
                : "No Data"}
            </td>
            <td>{display(r.peak?.occupancy)}</td>
            <td>{display(r.load)}</td>
            <td>{r.recommendation?.level ?? "No Data"}</td>
          </tr>
        ))}
      </Table>
      <p>
        Forecast ที่ประวัติไม่พอ = No Data · สี 3D และ Time Explorer ใช้ spatial
        ชุดเดียวกับโหมดที่เลือก · ไม่มีการย้ายชั้นหรือขยายพื้นที่ร้าน
      </p>
    </section>
  );
}
