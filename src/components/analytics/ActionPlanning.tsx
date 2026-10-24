"use client";
import { useState } from "react";
import type { Store } from "@/types";
import type { ManagementAction } from "@/types/analytics";
import { priorityScore } from "@/lib/analytics/calculators";
import { prioritizeActions } from "@/lib/analytics/insights";
export function ActionPlanning({
  store,
  initialActions,
  controlledActions,
  onActionsChange,
}: {
  store: Store;
  initialActions: ManagementAction[];
  controlledActions?: ManagementAction[];
  onActionsChange?: (actions: ManagementAction[]) => void;
}) {
  const [localActions, setLocalActions] = useState(initialActions);
  const actions = controlledActions ?? localActions;
  const setActions = (
    update:
      ManagementAction[] | ((a: ManagementAction[]) => ManagementAction[]),
  ) => {
    const next = typeof update === "function" ? update(actions) : update;
    if (onActionsChange) onActionsChange(next);
    else setLocalActions(next);
  };
  const [problem, setProblem] = useState("");
  const [owner, setOwner] = useState("");
  const [zone, setZone] = useState(store.zones[0].id);
  const [critical, setCritical] =
    useState<ManagementAction["critical"]>("none");
  const [scores, setScores] = useState({
    severity: "3",
    urgency: "3",
    impact: "3",
  });
  const [status, setStatus] = useState<ManagementAction["status"]>("Open");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [zoneFilter, setZoneFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ascending, setAscending] = useState(false);
  const edit = (a: ManagementAction) => {
    setEditing(a.id);
    setProblem(a.problem);
    setOwner(a.owner);
    setZone(a.zoneId);
    setCritical(a.critical);
    setStatus(a.status);
    setScores({
      severity: String(a.severity),
      urgency: String(a.urgency),
      impact: String(a.impact),
    });
    setError("");
  };
  const add = () => {
    try {
      const severity = Number(scores.severity),
        urgency = Number(scores.urgency),
        impact = Number(scores.impact);
      priorityScore(severity, urgency, impact);
      if (!problem.trim() || !owner.trim())
        throw new Error("กรุณาระบุ Problem และ Owner");
      const updated: ManagementAction = {
        id: editing ?? `action-local-${crypto.randomUUID()}`,
        problem: problem.trim(),
        zoneId: zone,
        severity,
        urgency,
        impact,
        owner: owner.trim(),
        status,
        critical,
      };
      setActions((a) =>
        editing
          ? a.map((item) => (item.id === editing ? updated : item))
          : [...a, updated],
      );
      setEditing(null);
      setProblem("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ข้อมูลไม่ถูกต้อง");
    }
  };
  const { critical: criticalItems, normal } = prioritizeActions(
    actions.filter(
      (a) =>
        (!zoneFilter || a.zoneId === zoneFilter) &&
        (!statusFilter || a.status === statusFilter),
    ),
  );
  if (ascending) normal.reverse();
  const table = (items: ManagementAction[], isCritical = false) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Problem</th>
            <th>Zone</th>
            <th>Severity</th>
            <th>Urgency</th>
            <th>Business Impact</th>
            <th>{isCritical ? "Critical" : "Priority Score"}</th>
            <th>Owner</th>
            <th>Status</th>
            <th>แก้ไข</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id}>
              <td>{a.problem}</td>
              <td>{a.zoneId}</td>
              <td>{a.severity}</td>
              <td>{a.urgency}</td>
              <td>{a.impact}</td>
              <td>
                {isCritical
                  ? a.critical.toUpperCase()
                  : `${a.severity} + ${a.urgency} + ${a.impact} = ${priorityScore(a.severity, a.urgency, a.impact)}`}
              </td>
              <td>{a.owner}</td>
              <td>
                <select
                  aria-label={`Status ${a.id}`}
                  value={a.status}
                  onChange={(e) =>
                    setActions((all) =>
                      all.map((item) =>
                        item.id === a.id
                          ? {
                              ...item,
                              status: e.target
                                .value as ManagementAction["status"],
                            }
                          : item,
                      ),
                    )
                  }
                >
                  {["Open", "In progress", "Done"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="text-button"
                  onClick={() => edit(a)}
                  aria-label={`Edit ${a.id}`}
                >
                  แก้ไข
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <p className="empty-state">ไม่มีรายการ</p>}
    </div>
  );
  return (
    <section>
      <h2>Management Action Planning</h2>
      <p className="scenario-note">
        กฎจำลองสำหรับ Portfolio ไม่ใช่เกณฑ์จริงของ Lotus&apos;s หรือ DDI ·
        {onActionsChange
          ? "บันทึกใน Browser นี้ผ่าน IndexedDB"
          : "เก็บเฉพาะ session ของหน้าจอนี้"}
      </p>
      <div className="action-form">
        <label>
          Problem
          <input value={problem} onChange={(e) => setProblem(e.target.value)} />
        </label>
        <label>
          Owner
          <input value={owner} onChange={(e) => setOwner(e.target.value)} />
        </label>
        <label>
          Zone
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {store.zones.map((z) => (
              <option key={z.id}>{z.id}</option>
            ))}
          </select>
        </label>
        {(["severity", "urgency", "impact"] as const).map((k) => (
          <label key={k}>
            {k === "impact"
              ? "Business Impact"
              : k === "severity"
                ? "Severity"
                : "Urgency"}{" "}
            (1–5)
            <input
              inputMode="numeric"
              value={scores[k]}
              onChange={(e) =>
                setScores((s) => ({ ...s, [k]: e.target.value }))
              }
            />
          </label>
        ))}
        <label>
          Incident Type
          <select
            value={critical}
            onChange={(e) =>
              setCritical(e.target.value as ManagementAction["critical"])
            }
          >
            <option value="none">Normal</option>
            <option value="safety">Safety Critical</option>
            <option value="legal">Legal Critical</option>
          </select>
        </label>
        <label>
          Initial Status
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ManagementAction["status"])
            }
          >
            {["Open", "In progress", "Done"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <button className="primary-button" onClick={add}>
        {editing ? "บันทึกการแก้ไข" : "เพิ่ม Action"}
      </button>
      {editing && (
        <button
          className="text-button"
          onClick={() => {
            setEditing(null);
            setProblem("");
            setError("");
          }}
        >
          ยกเลิกการแก้ไข
        </button>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="analytics-filters">
        <label>
          กรอง Zone
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
          >
            <option value="">ทุก Zone</option>
            {store.zones.map((z) => (
              <option key={z.id}>{z.id}</option>
            ))}
          </select>
        </label>
        <label>
          กรอง Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            {["Open", "In progress", "Done"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          เรียง Priority
          <select
            value={ascending ? "asc" : "desc"}
            onChange={(e) => setAscending(e.target.value === "asc")}
          >
            <option value="desc">คะแนนสูงก่อน</option>
            <option value="asc">คะแนนต่ำก่อน</option>
          </select>
        </label>
      </div>
      <h3>Safety / Legal Critical · แยกจากคะแนนปกติ</h3>
      <p className="form-hint">
        ต้องประเมินและรับผิดชอบแยก ไม่ลดลำดับด้วยคะแนนรวม
      </p>
      {table(criticalItems, true)}
      <h3>Normal Actions · Severity + Urgency + Business Impact</h3>
      {table(normal)}
    </section>
  );
}
