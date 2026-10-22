"use client";
import { useState } from "react";
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
export function Workspace(data: DashboardData) {
  const [sidebar, setSidebar] = useState(true);
  const [tab, setTab] = useState("Explore");
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
          {["Explore", "Peak Time", "Analytics", "Operations"].map((t) => (
            <button
              key={t}
              className={tab === t ? "active" : ""}
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
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
        {sidebar && <StoreExplorer store={data.store} />}
        <section className="main-area">
          <div
            className={`scene-card ${selected ? (drawerCollapsed ? "drawer-is-collapsed" : "drawer-is-open") : ""}`}
          >
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
                  <small>SPATIAL ANALYTICS · PHASE 04</small>
                </div>
              </div>
              <SceneToolbar />
              <HeatmapLegend store={data.store} data={data.spatial} />
              <div className="scene-bottom">
                <span>
                  <i /> {data.store.zones.length} ZONES ·{" "}
                  {data.store.fixtures.length} FIXTURES
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
                  <AnalyticsWorkspace
                    key={tab}
                    data={data}
                    operations={tab === "Operations"}
                  />
                )}
              </div>
            )}
          </div>
          <Timeline data={data.spatial} />
          <BottomDashboard
            snapshot={data.snapshot}
            expanded={expanded}
            onToggle={() => setExpanded(!expanded)}
          />
          <div className="workspace-disclosure">
            ข้อมูลสังเคราะห์ทั้งหมด · ไม่ใช่ระบบหรือข้อมูลจริงของ Lotus&apos;s ·
            แปลนโดยประมาณ
          </div>
        </section>
      </div>
    </main>
  );
}
