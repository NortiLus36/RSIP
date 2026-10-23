"use client";
import { useState } from "react";
import type { DashboardData } from "@/data/providers";
import type { CalculatorKind } from "@/lib/analytics/modules";
import { demoValues } from "@/lib/analytics/demos";
import { CalculatorForm } from "./CalculatorForm";
import { AnalyticsView } from "./AnalyticsView";
import { InventoryPlanner } from "./InventoryPlanner";
import { DataExploration } from "./DataExploration";
import { ImportedExperience } from "@/components/data/ImportedExperience";
const modules = [
  ["dashboard", "Dashboard & Charts"],
  ["retail", "Retail KPI"],
  ["exploration", "Data Exploration"],
  ["inventory", "Inventory Planning"],
  ["operations", "Retail Operations"],
  ["experience", "Customer Experience"],
  ["scenario", "Decision Simulator"],
] as const;
export function AnalyticsWorkspace({ data }: { data: DashboardData }) {
  const [module, setModule] = useState<string>("dashboard");
  return (
    <div className="analytics-workspace">
      <header>
        <div className="eyebrow">
          RETAIL INTELLIGENCE ·{" "}
          {data.dataset.source === "Imported" ? "IMPORTED DATA" : "DEMO"}
        </div>
        <h1>
          Analytics Studio{" "}
          <small>
            {data.dataset.source === "Imported"
              ? "ข้อมูลนำเข้าของ Browser นี้"
              : "ข้อมูลสังเคราะห์ · ไม่ใช่ผลการดำเนินงานจริง"}
          </small>
        </h1>
      </header>
      <nav className="module-nav" aria-label="Analytics modules">
        {modules.map(([id, name]) => (
          <button
            key={id}
            aria-pressed={module === id}
            onClick={() => setModule(id)}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="module-content">
        {data.dataset.source === "Imported" && module === "experience" ? (
          <ImportedExperience />
        ) : data.dataset.source === "Imported" &&
          ["retail", "operations", "scenario"].includes(module) ? (
          <p className="empty-state">
            No Data · Dataset นำเข้ายังไม่มีข้อมูลผู้เข้าร้านไม่ซ้ำ เวลารอ
            ค่าแรง Waste หรือแคมเปญ จึงไม่เติมค่า Demo ในเครื่องคิดเลขนี้ ใช้
            Dashboard / Inventory Planning / Customer Experience
            เพื่อดูผลจากข้อมูลนำเข้า
          </p>
        ) : module === "dashboard" ? (
          <AnalyticsView dataset={data.dataset} store={data.store} />
        ) : module === "exploration" ? (
          <DataExploration dataset={data.dataset} store={data.store} />
        ) : module === "inventory" ? (
          <InventoryPlanner
            dataset={data.dataset}
            items={data.inventory}
            catalog={data.catalog}
          />
        ) : (
          <CalculatorForm
            key={module}
            kind={module as CalculatorKind}
            period={data.dataset.asOf}
            defaults={demoValues(
              module as CalculatorKind,
              data.dataset,
              data.inventory,
            )}
          />
        )}
      </div>
    </div>
  );
}
