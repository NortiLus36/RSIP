"use client";
import { useState } from "react";
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
import { ActionPlanning } from "@/components/analytics/ActionPlanning";
export function Workspace({
  operationsPage = false,
  initialTab = "Explore",
  ...data
}: DashboardData & { operationsPage?: boolean; initialTab?: string }) {
  const router = useRouter();
  const [sidebar, setSidebar] = useState(!operationsPage);
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
          {["Explore", "Peak Time", "Analytics"].map((t) => (
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
                      : `/?view=${t === "Analytics" ? "analytics" : "peak"}`,
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
            DEMO
          </span>
          <span className="avatar">RV</span>
        </div>
      </header>
      <div className="body-layout">
        {sidebar && <StoreExplorer store={data.store} catalog={data.catalog} />}
        <section className="main-area">
          <div
            className={`scene-card ${selected ? (drawerCollapsed ? "drawer-is-collapsed" : "drawer-is-open") : ""}`}
          >
            {operationsPage ? (
              <div className="analytics-overlay operations-page">
                <span className="eyebrow">OPERATIONS · DEMO</span>
                <ActionPlanning
                  store={data.store}
                  initialActions={data.dataset.actions}
                />
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
                  <div className="analytics-overlay">
                    <button
                      className="analytics-back"
                      aria-label="Return to Explore"
                      onClick={() => setTab("Explore")}
                    >
                      ← Explore
                    </button>
                    {tab === "Peak Time" ? (
                      <PeakAnalytics data={data.spatial} store={data.store} />
                    ) : (
                      <AnalyticsWorkspace key={tab} data={data} />
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
            ข้อมูลสังเคราะห์ทั้งหมด · ไม่ใช่ระบบหรือข้อมูลจริงของ Lotus&apos;s ·
            แปลนโดยประมาณ
          </div>
        </section>
      </div>
    </main>
  );
}
