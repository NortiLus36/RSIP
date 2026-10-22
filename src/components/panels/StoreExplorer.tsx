"use client";
import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Warehouse,
  MapPin,
  Box,
  ShoppingBasket,
  Cookie,
  Apple,
  Snowflake,
  GlassWater,
  House,
  Heart,
  Baby,
  PawPrint,
  Sandwich,
  CreditCard,
  Shirt,
  Tv,
} from "lucide-react";
import type { Store } from "@/types";
import type { ProductCatalog } from "@/types/catalog";
import { useExplorer } from "@/stores/explorer";
const icons = {
  A: ShoppingBasket,
  B: Cookie,
  C: Apple,
  D: Snowflake,
  E: GlassWater,
  F: Warehouse,
  G: House,
  H: Heart,
  I: Baby,
  J: PawPrint,
  K: Sandwich,
  L: CreditCard,
  M: Shirt,
  N: Tv,
};
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
      store.fixtures.some(
        (f) =>
          f.zoneId === z.id &&
          (matches(`${f.id} ${f.name}`) ||
            catalog.fixtureProducts.some(
              (m) => m.fixtureId === f.id && productMatches(m.sku),
            )),
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
      <p className="sidebar-subtitle">โซน → หมวดย่อย → ชั้นวาง → สินค้า</p>
      <label className="search">
        <Search size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาโซน / หมวด / SKU..."
          aria-label="Search zones and fixtures"
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
            const Icon = icons[z.id as keyof typeof icons] ?? Box;
            const zoneOpen = expanded.has(z.id) || !!q;
            const zoneMatch = matches(`${z.id} ${z.name} ${z.nameTh}`);
            const fixtures = store.fixtures.filter((f) => f.zoneId === z.id);
            const subcategories = catalog.categories.filter(
              (c) => c.zoneId === z.id && c.parentId,
            );
            const renderFixture = (
              f: Store["fixtures"][number],
              categoryId?: string,
            ) => {
              const key = `${categoryId ?? z.id}:${f.id}`;
              const all = catalog.fixtureProducts
                .filter((m) => m.fixtureId === f.id)
                .map((m) => catalog.products.find((p) => p.sku === m.sku)!)
                .filter((p) => !categoryId || p.categoryId === categoryId);
              const products = all.filter(
                (p) =>
                  !q ||
                  zoneMatch ||
                  matches(`${f.id} ${f.name}`) ||
                  matches(
                    catalog.categories.find((c) => c.id === p.categoryId)
                      ?.nameTh ?? "",
                  ) ||
                  productMatches(p.sku),
              );
              if (
                q &&
                !zoneMatch &&
                !matches(`${f.id} ${f.name}`) &&
                !products.length
              )
                return null;
              return (
                <div key={key} className="tree-fixture">
                  <div className="tree-line">
                    <button
                      className="tree-toggle"
                      aria-label={`เปิดสินค้า ${f.id} ${categoryId ?? ""}`}
                      aria-expanded={expanded.has(key) || !!q}
                      onClick={() => toggle(key)}
                    >
                      {expanded.has(key) || q ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                    </button>
                    <button
                      className={`fixture-row ${selectedId === f.id ? "selected" : ""}`}
                      aria-pressed={selectedId === f.id}
                      onClick={() => {
                        select(f.id);
                        expand(key);
                      }}
                    >
                      <Box size={12} />
                      <span>
                        {f.name}
                        <small>{f.id}</small>
                      </span>
                    </button>
                  </div>
                  {(expanded.has(key) || q) &&
                    products.map((p) => (
                      <button
                        className={`sku-tree-row ${selectedSku === p.sku ? "selected" : ""}`}
                        key={p.sku}
                        onClick={() => selectSku(p.sku, f.id)}
                        aria-pressed={selectedSku === p.sku}
                      >
                        <span>
                          {p.nameTh}
                          <small>{p.sku}</small>
                        </span>
                      </button>
                    ))}
                </div>
              );
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
                      <Icon size={19} />
                    </span>
                    <span>
                      <strong>{z.name}</strong>
                      <small>{z.nameTh}</small>
                    </span>
                  </button>
                </div>
                {zoneOpen &&
                  (subcategories.length
                    ? subcategories.map((c) => {
                        const fs = fixtures.filter((f) =>
                          catalog.fixtureProducts.some(
                            (m) =>
                              m.fixtureId === f.id &&
                              catalog.products.some(
                                (p) => p.sku === m.sku && p.categoryId === c.id,
                              ),
                          ),
                        );
                        if (
                          q &&
                          !zoneMatch &&
                          !matches(`${c.nameTh} ${c.nameEn}`) &&
                          !fs.some(
                            (f) =>
                              matches(`${f.id} ${f.name}`) ||
                              catalog.fixtureProducts.some(
                                (m) =>
                                  m.fixtureId === f.id &&
                                  catalog.products.some(
                                    (p) =>
                                      p.sku === m.sku &&
                                      p.categoryId === c.id &&
                                      productMatches(p.sku),
                                  ),
                              ),
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
                            {(expanded.has(c.id) || q) &&
                              fs.map((f) => renderFixture(f, c.id))}
                          </div>
                        );
                      })
                    : fixtures.map((f) => renderFixture(f)))}
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
