"use client";
import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Warehouse,
  MapPin,
} from "lucide-react";
import { ZoneIcon } from "@/components/shared/ZoneIcon";
import type { Store } from "@/types";
import type { ProductCatalog } from "@/types/catalog";
import { useExplorer } from "@/stores/explorer";
export function StoreExplorer({
  store,
  catalog,
}: {
  store: Store;
  catalog: ProductCatalog;
}) {
  const [query, setQuery] = useState("");
  const [zonesOpen, setZonesOpen] = useState(true),
    [supportOpen, setSupportOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { selectedId, selectedSku, select, selectSku } = useExplorer();
  const q = query.toLowerCase().trim();
  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expand = (id: string) => setExpanded((s) => new Set(s).add(id));
  const matches = (value: string) => value.toLowerCase().includes(q);
  const productMatches = (sku: string) => {
    const p = catalog.products.find((p) => p.sku === sku);
    return p && matches(`${p.sku} ${p.nameTh} ${p.nameEn} ${p.brand}`);
  };
  const visible = store.zones.filter(
    (z) =>
      matches(`${z.id} ${z.name} ${z.nameTh}`) ||
      catalog.products.some(
        (p) =>
          productMatches(p.sku) &&
          catalog.categories.some(
            (c) => c.id === p.categoryId && c.zoneId === z.id,
          ),
      ) ||
      catalog.categories.some(
        (c) => c.zoneId === z.id && matches(`${c.nameTh} ${c.nameEn}`),
      ),
  );
  const support = store.supportAreas.filter((s) =>
    matches(`${s.id} ${s.name} ${s.nameTh}`),
  );
  return (
    <aside className="sidebar">
      <div className="sidebar-title">
        <span>Store Explorer</span>
        <span className="tiny-label">01</span>
      </div>
      <p className="sidebar-subtitle">หมวดหมู่ → หมวดย่อย → สินค้า</p>
      <label className="search">
        <Search size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาหมวด / สินค้า / SKU..."
          aria-label="ค้นหาหมวดหมู่หรือสินค้า"
        />
      </label>
      <button
        className="group-title"
        aria-expanded={zonesOpen}
        onClick={() => setZonesOpen(!zonesOpen)}
      >
        {zonesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>แผนกและพื้นที่ปฏิบัติงาน</span>
        <b>{store.zones.length}</b>
      </button>
      <div className="zone-list">
        {(zonesOpen || q) &&
          visible.map((z) => {
            const zoneOpen = expanded.has(z.id) || !!q;
            const zoneMatch = matches(`${z.id} ${z.name} ${z.nameTh}`);
            const fixtures = store.fixtures.filter((f) => f.zoneId === z.id);
            const subcategories = catalog.categories.filter(
              (c) => c.zoneId === z.id && c.parentId,
            );
            const zoneProducts = catalog.products.filter((p) =>
              catalog.categories.some(
                (c) => c.id === p.categoryId && c.zoneId === z.id,
              ),
            );
            const renderProducts = (categoryId?: string) => {
              const category = catalog.categories.find(
                (c) => c.id === categoryId,
              );
              const categoryMatch =
                category && matches(`${category.nameTh} ${category.nameEn}`);
              return zoneProducts
                .filter((p) => !categoryId || p.categoryId === categoryId)
                .filter(
                  (p) =>
                    !q || zoneMatch || categoryMatch || productMatches(p.sku),
                )
                .map((p, index) => {
                  const placement = catalog.fixtureProducts.find(
                    (m) =>
                      m.sku === p.sku &&
                      fixtures.some((f) => f.id === m.fixtureId),
                  );
                  return (
                    <button
                      className={`sku-tree-row ${selectedSku === p.sku ? "selected" : ""}`}
                      key={p.sku}
                      onClick={() =>
                        placement && selectSku(p.sku, placement.fixtureId)
                      }
                      aria-pressed={selectedSku === p.sku}
                    >
                      <span className="sku-tree-number" aria-hidden="true">
                        {index + 1}.
                      </span>
                      <span>{p.nameTh}</span>
                    </button>
                  );
                });
            };
            return (
              <div key={z.id}>
                <div className="tree-line">
                  <button
                    className="tree-toggle"
                    aria-label={`เปิดหมวดย่อย ${z.nameTh}`}
                    aria-expanded={zoneOpen}
                    onClick={() => toggle(z.id)}
                  >
                    {zoneOpen ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </button>
                  <button
                    className={`zone-row ${selectedId === z.id ? "selected" : ""}`}
                    onClick={() => {
                      select(z.id);
                      expand(z.id);
                    }}
                    aria-pressed={selectedId === z.id}
                  >
                    <span
                      className="zone-letter"
                      style={{ background: z.color + "45", color: "#34435b" }}
                    >
                      <ZoneIcon zoneId={z.id} size={19} />
                    </span>
                    <span>
                      <strong>{z.nameTh}</strong>
                    </span>
                  </button>
                </div>
                {zoneOpen &&
                  (subcategories.length
                    ? subcategories.map((c) => {
                        if (
                          q &&
                          !zoneMatch &&
                          !matches(`${c.nameTh} ${c.nameEn}`) &&
                          !zoneProducts.some(
                            (p) =>
                              p.categoryId === c.id && productMatches(p.sku),
                          )
                        )
                          return null;
                        return (
                          <div className="subcategory-tree" key={c.id}>
                            <button
                              className="subcategory-toggle"
                              aria-expanded={expanded.has(c.id) || !!q}
                              onClick={() => toggle(c.id)}
                            >
                              {expanded.has(c.id) || q ? (
                                <ChevronDown size={12} />
                              ) : (
                                <ChevronRight size={12} />
                              )}{" "}
                              {c.nameTh}
                            </button>
                            {(expanded.has(c.id) || q) && renderProducts(c.id)}
                          </div>
                        );
                      })
                    : renderProducts())}
              </div>
            );
          })}
      </div>
      <button
        className="group-title support-title"
        aria-expanded={supportOpen}
        onClick={() => setSupportOpen(!supportOpen)}
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
          <small>ข้อมูลสังเคราะห์สำหรับ Portfolio</small>
        </div>
        <span className="status-dot" />
      </div>
    </aside>
  );
}
