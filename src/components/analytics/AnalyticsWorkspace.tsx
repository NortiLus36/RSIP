"use client";
import { useState } from "react";
import type { DashboardData } from "@/data/providers";
import type { CalculatorKind } from "@/lib/analytics/modules";
import { demoValues } from "@/lib/analytics/demos";
import { CalculatorForm } from "./CalculatorForm";
import { AnalyticsView } from "./AnalyticsView";
import { InventoryPlanner } from "./InventoryPlanner";
import { DataExploration } from "./DataExploration";
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
        <div className="eyebrow">RETAIL INTELLIGENCE · DEMO</div>
        <h1>
          Analytics Studio{" "}
          <small>ข้อมูลสังเคราะห์ · ไม่ใช่ผลการดำเนินงานจริง</small>
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
        {module === "dashboard" ? (
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
