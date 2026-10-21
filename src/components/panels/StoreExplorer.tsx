"use client";
import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Warehouse,
  MapPin,
  Box,
} from "lucide-react";
import type { Store } from "@/types";
import { useExplorer } from "@/stores/explorer";
export function StoreExplorer({ store }: { store: Store }) {
  const [query, setQuery] = useState("");
  const [zonesOpen, setZonesOpen] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);
  const { selectedId, select } = useExplorer();
  const q = query.toLowerCase().trim();
  const visible = store.zones.filter((z) =>
    [
      z.id,
      z.name,
      z.nameTh,
      ...store.fixtures
        .filter((f) => f.zoneId === z.id)
        .map((f) => `${f.id} ${f.name}`),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
  const support = store.supportAreas.filter((s) =>
    `${s.id} ${s.name} ${s.nameTh}`.toLowerCase().includes(q),
  );
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <span>Store Explorer</span>
        <span className="tiny-label">01</span>
      </div>
      <p className="sidebar-subtitle">พื้นที่และองค์ประกอบภายในร้าน</p>
      <label className="search">
        <Search size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาโซน / Fixture..."
          aria-label="Search zones and fixtures"
        />
        <kbd>⌕</kbd>
      </label>
      <button
        className="group-title"
        onClick={() => setZonesOpen(!zonesOpen)}
        aria-expanded={zonesOpen}
      >
        {zonesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>แผนกสินค้า</span>
        <b>{store.zones.length}</b>
      </button>
      <div className="zone-list">
        {(zonesOpen || q) &&
          visible.map((z) => (
            <div key={z.id}>
              <button
                className={`zone-row ${selectedId === z.id ? "selected" : ""}`}
                onClick={() => select(z.id)}
                aria-pressed={selectedId === z.id}
              >
                <span
                  className="zone-letter"
                  style={{ background: z.color + "45", color: "#34435b" }}
                >
                  {z.id}
                </span>
                <span>
                  <strong>{z.name}</strong>
                  <small>{z.nameTh}</small>
                </span>
                <span className="row-dot" style={{ background: z.color }} />
              </button>
              {(selectedId === z.id ||
                store.fixtures.some(
                  (f) => f.id === selectedId && f.zoneId === z.id,
                ) ||
                q) &&
                store.fixtures
                  .filter((f) => f.zoneId === z.id)
                  .map((f) => (
                    <button
                      className={`fixture-row ${selectedId === f.id ? "selected" : ""}`}
                      key={f.id}
                      onClick={() => select(f.id)}
                    >
                      <Box size={12} />
                      {f.id}
                    </button>
                  ))}
            </div>
          ))}
      </div>
      <button
        className="group-title support-title"
        onClick={() => setSupportOpen(!supportOpen)}
        aria-expanded={supportOpen}
      >
        {supportOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>พื้นที่สนับสนุน</span>
        <b>{store.supportAreas.length}</b>
      </button>
      {(supportOpen || q) &&
        support.map((s) => (
          <button
            key={s.id}
            className={`support-row ${selectedId === s.id ? "selected" : ""}`}
            onClick={() => select(s.id)}
          >
            <MapPin size={13} />
            {s.nameTh}
          </button>
        ))}
      {q && !visible.length && !support.length && (
        <p className="empty">ไม่พบรายการที่ค้นหา</p>
      )}
      <div className="sidebar-bottom">
        <Warehouse size={18} />
        <div>
          <strong>Demo environment</strong>
          <small>ข้อมูลจำลองสำหรับ Portfolio</small>
        </div>
        <span className="status-dot" />
      </div>
    </aside>
  );
}
