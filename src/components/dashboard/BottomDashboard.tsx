"use client";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { KpiSnapshot, KpiKey } from "@/types";
import { formatMetric, formatPeriod } from "@/lib/analytics";
import { KPIFieldHeader } from "@/components/analytics/KPIFieldHeader";
const keys: KpiKey[] = [
  "netSales",
  "grossProfit",
  "grossMargin",
  "oosRate",
  "traffic",
  "waitTime",
  "csat",
];
export function BottomDashboard({
  snapshot,
  expanded,
  onToggle,
}: {
  snapshot: KpiSnapshot;
  expanded: boolean;
  onToggle: () => void;
}) {
  const netSales = snapshot.metrics.find((metric) => metric.key === "netSales");
  return (
    <section
      className={`bottom-dashboard ${expanded ? "expanded" : "collapsed"}`}
      aria-label="Store KPI dashboard"
    >
      <header>
        <div>
          <strong>Store Performance · {keys.length} KPIs</strong>
          {!expanded && (
            <span className="compact-sales">
              Net Sales{" "}
              {netSales
                ? formatMetric(netSales.value, netSales.unit)
                : "No Data"}
            </span>
          )}
          <small>
            DEMO · {formatPeriod(snapshot.period)} · OOS = stock snapshot
          </small>
        </div>
        <button
          aria-label={expanded ? "Collapse dashboard" : "Expand dashboard"}
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          <span>{expanded ? "ย่อ" : "ขยาย"}</span>
        </button>
      </header>
      <div className="store-kpis">
        {keys.map((key) => {
          const m = snapshot.metrics.find((m) => m.key === key);
          return (
            <article key={key} title={m?.definition}>
              <KPIFieldHeader label={m?.label ?? key} topic={key} />
              <output data-store-kpi={key}>
                {m ? formatMetric(m.value, m.unit) : "No Data"}
                <small>
                  {m?.unit === "people"
                    ? " คน"
                    : m?.unit === "minutes"
                      ? " นาที"
                      : ""}
                </small>
              </output>
              {expanded && <small>{m?.definition}</small>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
