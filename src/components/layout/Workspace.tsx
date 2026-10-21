"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Box,
  ChevronDown,
  Bell,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  FlaskConical,
} from "lucide-react";
import type {
  Store,
  KpiSnapshot,
  HourlyTraffic,
  ProductCategory,
} from "@/types";
import { StoreExplorer } from "@/components/panels/StoreExplorer";
import { ObjectInspector } from "@/components/panels/ObjectInspector";
import { SceneHost } from "@/components/scene/SceneHost";
import { SceneToolbar } from "@/components/scene/SceneToolbar";
import {
  BottomDashboard,
  TrafficChart,
} from "@/components/dashboard/BottomDashboard";
export function Workspace({
  store,
  snapshot,
  traffic,
  categories,
  objectSnapshots,
}: {
  store: Store;
  snapshot: KpiSnapshot;
  traffic: HourlyTraffic[];
  categories: ProductCategory[];
  objectSnapshots: KpiSnapshot[];
}) {
  const [sidebar, setSidebar] = useState(true);
  const [tab, setTab] = useState("Explore");
  return (
    <main className="workspace">
      <header className="navbar">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <Box size={24} />
          </span>
          <span>
            RetailVerse <b>3D</b>
            <small>SMART STORE DIGITAL TWIN</small>
          </span>
        </Link>
        <div className="store-switch">
          <span className="status-dot" />
          {store.name}
          <ChevronDown size={13} />
        </div>
        <nav aria-label="Main navigation">
          {["Explore", "Operations", "Analytics"].map((t) => (
            <button
              className={tab === t ? "active" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <button disabled title="Coming in a future phase">
            Simulation <span>SOON</span>
          </button>
        </nav>
        <div className="nav-end">
          <span className="demo-badge">
            <FlaskConical size={12} /> DEMO
          </span>
          <span className="avatar">RV</span>
        </div>
      </header>
      <div className={`body-layout ${sidebar ? "" : "collapsed"}`}>
        {sidebar && <StoreExplorer store={store} />}
        <section className="main-area">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                WORKSPACE <span>/</span> {tab.toUpperCase()}
              </div>
              <h1>
                {tab === "Explore"
                  ? "สำรวจร้านค้า"
                  : tab === "Operations"
                    ? "ภาพรวมการดำเนินงาน"
                    : "วิเคราะห์ภาพรวม"}{" "}
                <span>Store overview</span>
              </h1>
            </div>
            <div className="heading-actions">
              <span className="data-status">
                <i /> ข้อมูลจำลอง
              </span>
              <button
                className="square-button"
                aria-label="Toggle explorer"
                onClick={() => setSidebar(!sidebar)}
              >
                {sidebar ? (
                  <PanelLeftClose size={17} />
                ) : (
                  <PanelLeftOpen size={17} />
                )}
              </button>
            </div>
          </div>
          <div className="scene-card">
            <div className="scene-caption">
              <span className="scene-icon">
                <LayoutGrid size={16} />
              </span>
              <div>
                <strong>Demo Store 001</strong>
                <small>แปลนร้านค้า · มุมมองไอโซเมตริก</small>
              </div>
              <span className="phase-badge">PHASE 01</span>
            </div>
            <SceneHost store={store} />
            <SceneToolbar />
            <ObjectInspector
              store={store}
              categories={categories}
              snapshots={objectSnapshots}
            />
            <div className="scene-bottom">
              <span>
                <i /> 3D EXPLORER <b>•</b> {store.zones.length} ZONES
              </span>
              <span>ลากเพื่อหมุน · เลื่อนเพื่อซูม · คลิกขวาเพื่อแพน</span>
            </div>
            <div className="compass">
              <span>N</span>
              <div>↑</div>
            </div>
          </div>
          {tab === "Analytics" ? (
            <TrafficChart traffic={traffic} />
          ) : (
            <div className="insight-strip">
              <span className="insight-icon">
                <Bell size={15} />
              </span>
              <p>
                <strong>
                  {tab === "Operations"
                    ? "Operations preview"
                    : "สำรวจพื้นที่ร้านค้าได้ในมุมมองเดียว"}
                </strong>
                <span>
                  {tab === "Operations"
                    ? "ข้อมูลจำลองสำหรับการเตรียมงานวิเคราะห์ · ระบบปฏิบัติการเต็มรูปแบบจะพัฒนาใน Phase ถัดไป"
                    : "เลือกแผนกจากรายการด้านซ้าย เพื่อดูรายละเอียดและตัวชี้วัดจำลอง"}
                </span>
              </p>
              <ArrowUpRight size={18} />
            </div>
          )}
          <BottomDashboard snapshot={snapshot} />
          <footer>
            <span>
              RetailVerse 3D <b>·</b> Portfolio project
            </span>
            <span>
              ข้อมูลสังเคราะห์ทั้งหมด · ไม่ใช่ระบบหรือข้อมูลจริงของ Lotus&apos;s{" "}
              <b>·</b> ตำแหน่งแปลนโดยประมาณ
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
