"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Box, PanelLeftClose, PanelLeftOpen, FlaskConical } from "lucide-react";
import type { DashboardData } from "@/data/providers";
import { useExplorer } from "@/stores/explorer";
import { StoreExplorer } from "@/components/panels/StoreExplorer";
import { ObjectInspector } from "@/components/panels/ObjectInspector";
import { SceneHost } from "@/components/scene/SceneHost";
import { SceneToolbar } from "@/components/scene/SceneToolbar";
import { BottomDashboard } from "@/components/dashboard/BottomDashboard";
import { AnalyticsWorkspace } from "@/components/analytics/AnalyticsWorkspace";
import { Timeline } from "@/components/spatial/Timeline";
import { HeatmapLegend } from "@/components/spatial/HeatmapLegend";
import { PeakAnalytics } from "@/components/spatial/PeakAnalytics";
import { StaffHub } from "@/components/analytics/StaffHub";
import { useIntelligence } from "@/stores/intelligence";
import { useForecast } from "@/components/analytics/useForecast";
import { applyApprovedReports } from "@/lib/analytics/operations";
import { forecastSpatial } from "@/lib/analytics/workforce";
import { useDataSource } from "@/stores/data-source";
import {
  DemoDataProvider,
  ImportedDataProvider,
  importCoverage,
} from "@/lib/import/provider";
import { DataManagement } from "@/components/data/DataManagement";
export function Workspace(
  props: DashboardData & { operationsPage?: boolean; initialTab?: string },
) {
  const { operationsPage = false, initialTab = "Explore" } = props;
  const demo = useMemo<DashboardData>(() => ({ ...props }), [props]);
  const { source, bundle, revision, hydrate } = useDataSource();
  useEffect(() => {
    void hydrate(demo);
  }, [hydrate, demo]);
  const base = useMemo(
    () =>
      source === "demo"
        ? new DemoDataProvider(demo).getDashboard()
        : new ImportedDataProvider(demo, bundle).getDashboard(),
    [source, bundle, demo],
  );
  const workflow = useIntelligence();
  const hydrateWorkflow = workflow.hydrate;
  const mode = useSpatial((s) => s.mode);
  useEffect(() => {
    void hydrateWorkflow();
  }, [hydrateWorkflow]);
  const updated = useMemo(
    () =>
      applyApprovedReports(
        base,
        workflow.reports,
        workflow.reportResetAt[
          base.dataset.intelligence?.reference ?? "legacy"
        ],
      ),
    [base, workflow.reports, workflow.reportResetAt],
  );
  const forecast = useForecast(updated);
  const active = useMemo(() => {
    if (mode !== "Forecast") return updated;
    if (forecast.error)
      return {
        ...updated,
        spatial: {
          ...updated.spatial,
          source: "FORECAST" as const,
          zones: [],
          stock: [],
          storeHours: [],
        },
      };
    return { ...updated, spatial: forecastSpatial(updated, forecast.options) };
  }, [updated, mode, forecast.error, forecast.options]);
  useEffect(() => {
    useSpatial.getState().configure(active.spatial.dates, active.spatial.hours);
  }, [revision, active.spatial]);
  useEffect(() => {
    useExplorer.getState().select(null, false);
  }, [revision]);
  return (
    <WorkspaceBody
      {...active}
      historicalSpatial={updated.spatial}
      forecastError={forecast.error}
      operationsPage={operationsPage}
      initialTab={initialTab}
      demoData={demo}
      revision={revision}
    />
  );
}
import { useSpatial } from "@/stores/spatial";
function WorkspaceBody({
  operationsPage = false,
  initialTab = "Explore",
  demoData,
  revision,
  historicalSpatial,
  forecastError,
  ...data
}: DashboardData & {
  operationsPage?: boolean;
  initialTab?: string;
  demoData: DashboardData;
  revision: number;
  historicalSpatial: DashboardData["spatial"];
  forecastError: string;
}) {
  const { source, bundle, hydrated, error } = useDataSource();
  const router = useRouter();
  const [sidebar, setSidebar] = useState(
    !operationsPage && initialTab === "Explore",
  );
  const [tab, setTab] = useState(initialTab);
  const [expanded, setExpanded] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const selected = useExplorer((s) => s.selectedId);
  return (
    <main className="workspace phase3">
      <header className="navbar">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <Box size={23} />
          </span>
          <span>
            RetailVerse <b>3D</b>
            <small>SMART STORE DIGITAL TWIN</small>
          </span>
        </Link>
        <button
          className="square-button nav-explorer-toggle"
          aria-label="Toggle explorer"
          onClick={() => setSidebar(!sidebar)}
        >
          <PanelLeftOpen size={16} />
        </button>
        <div className="store-switch">
          <span className="status-dot" />
          {data.store.name}
        </div>
        <nav aria-label="Main navigation">
          {["Explore", "Peak Time", "Analytics", "Data Management"].map((t) => (
            <button
              key={t}
              className={!operationsPage && tab === t ? "active" : ""}
              aria-pressed={!operationsPage && tab === t}
              onClick={() => {
                if (window.matchMedia("(max-width: 800px)").matches)
                  setSidebar(false);
                if (operationsPage) {
                  router.push(
                    t === "Explore"
                      ? "/"
                      : `/?view=${t === "Analytics" ? "analytics" : t === "Data Management" ? "data" : "peak"}`,
                  );
                } else setTab(t);
              }}
            >
              {t}
            </button>
          ))}
          <Link
            className={operationsPage ? "active" : ""}
            aria-current={operationsPage ? "page" : undefined}
            href="/operations/action-planning"
          >
            Operations
          </Link>
        </nav>
        <div className="nav-end">
          <span className="demo-badge">
            <FlaskConical size={12} />
            {source === "demo" ? "DEMO DATA" : "IMPORTED DATA"}
          </span>
          <span className="avatar">RV</span>
        </div>
      </header>
      <div className="body-layout">
        {sidebar && <StoreExplorer store={data.store} catalog={data.catalog} />}
        <section className="main-area">
          <div
            className="data-source-status"
            aria-label="Dataset source and coverage"
          >
            {!hydrated
              ? "กำลังโหลดข้อมูล Browser…"
              : source === "demo"
                ? (data.dataset.intelligence?.sourceLabel ??
                  "SYNTHETIC DEMO DATA")
                : `IMPORTED DATA · Sales ${bundle.sales ? data.dataset.asOf : "No Data"} · สต็อก ${
                    bundle.inventory?.rows
                      .map((r) => String(r.snapshotDate))
                      .sort()
                      .at(-1) ?? "No Data"
                  } · ประเภทที่ไม่ได้นำเข้า = No Data`}
            {source === "imported" && (
              <details>
                <summary>Data Coverage / Last Imported</summary>
                {importCoverage(bundle).map((c) => (
                  <p key={c.kind}>
                    {c.kind}: {c.rows} แถว · {c.from}–{c.to} · Last Imported{" "}
                    {new Date(c.importedAt).toLocaleString("th-TH")}
                  </p>
                ))}
                <p>
                  Traffic = การผ่านโซน อาจนับคนซ้ำ · Occupancy = คน ณ snapshot ·
                  Stock เป็นฐานรายวัน ไม่ใช่การเคลื่อนไหวรายชั่วโมง · Sales
                  ไม่มี Fixture จึงไม่เดายอดขายต่อชั้น
                </p>
              </details>
            )}
            {error && <span role="alert">{error}</span>}
            {forecastError && (
              <span role="alert">
                Forecast ใช้ไม่ได้: {forecastError} · แก้สมมติฐานที่ Demand
                Forecast
              </span>
            )}
          </div>
          <div
            className={`scene-card ${selected ? (drawerCollapsed ? "drawer-is-collapsed" : "drawer-is-open") : ""}`}
          >
            {operationsPage ? (
              <div className="analytics-overlay operations-page">
                <span className="eyebrow">
                  OPERATIONS · {source === "demo" ? "DEMO" : "IMPORTED DATA"}
                </span>
                <StaffHub data={data} />
              </div>
            ) : (
              <>
                <div className="scene-viewport">
                  <SceneHost store={data.store} spatial={data.spatial} />
                  <div className="workspace-overlay">
                    <button
                      className="square-button"
                      aria-label="Toggle explorer panel"
                      onClick={() => setSidebar(!sidebar)}
                    >
                      {sidebar ? (
                        <PanelLeftClose size={17} />
                      ) : (
                        <PanelLeftOpen size={17} />
                      )}
                    </button>
                    <div>
                      <strong>{data.store.name}</strong>
                      <small>ข้อมูลร้านและสินค้า</small>
                    </div>
                  </div>
                  <SceneToolbar />
                  <HeatmapLegend store={data.store} data={data.spatial} />
                  <div className="scene-bottom">
                    <span>
                      <i /> {data.store.zones.length} ZONES ·{" "}
                      {data.store.fixtures.length} FIXTURES · ตัวละครจำลองแยกจาก
                      KPI
                    </span>
                    <span>ลาก: หมุน · ล้อเมาส์: ซูม · คลิกขวา/ลูกศร: แพน</span>
                  </div>
                </div>
                <ObjectInspector
                  data={data}
                  collapsed={drawerCollapsed}
                  onCollapse={() => setDrawerCollapsed(!drawerCollapsed)}
                />
                {tab !== "Explore" && (
                  <div
                    key={tab}
                    className={`analytics-overlay ${tab === "Data Management" ? "data-page" : ""}`}
                  >
                    <button
                      className="analytics-back"
                      aria-label="Return to Explore"
                      onClick={() => setTab("Explore")}
                    >
                      ← Explore
                    </button>
                    {tab === "Data Management" ? (
                      <DataManagement demo={demoData} data={data} />
                    ) : tab === "Peak Time" ? (
                      <PeakAnalytics data={data.spatial} store={data.store} />
                    ) : (
                      <AnalyticsWorkspace
                        key={`${tab}:${revision}`}
                        data={{ ...data, spatial: historicalSpatial }}
                        onExplore={() => setTab("Explore")}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {!operationsPage && <Timeline data={data.spatial} />}
          {!operationsPage && (
            <BottomDashboard
              snapshot={data.snapshot}
              expanded={expanded}
              onToggle={() => setExpanded(!expanded)}
            />
          )}
          <div className="workspace-disclosure">
            {source === "demo"
              ? "ข้อมูลสังเคราะห์ทั้งหมด"
              : "ข้อมูลนำเข้าเก็บเฉพาะ Browser นี้"}{" "}
            · ไม่ใช่ระบบหรือข้อมูลจริงของ Lotus&apos;s · แปลนโดยประมาณ
          </div>
        </section>
      </div>
    </main>
  );
}
