# Phase 5 final delivery — 22 October 2026

This project is an independent portfolio demonstration using synthetic data. It is not affiliated with or endorsed by Lotus's.

## Delivery status

P0 catalog/inventory integration, UI information alignment, Thai charts, data integrity, regression checks and portfolio documentation are implemented. Existing P1 environment and operations features are retained and checked. P2 bulk catalog expansion beyond representative examples, SKU-specific 3D models, advanced animation and advanced analytics are deferred. No production deployment was performed.

Branch: `feature/phase5-product-inventory`, based on `fccc89d` (including the preceding label-stacking fix). Final commit/push identity is reported in the chat and available through `git log -1`.

## Product model and counts

| Zone | Retail subcategories | SKUs |
|---|---:|---:|
| A Grocery | 6 | 10 |
| B Snacks | 4 | 4 |
| C Fresh Food | 4 | 5 |
| D Frozen & Chilled | 3 | 4 |
| E Beverages | 4 | 4 |
| G Home & Living | 3 | 3 |
| H Health & Beauty | 4 | 4 |
| I Baby & Kids | 3 | 3 |
| J Pet Care | 3 | 3 |
| K Deli & Bakery | 3 | 3 |
| M Clothing | 3 | 5 |
| N Electronics | 4 | 4 |
| Total retail | 44 | 52 |

Twelve root retail categories plus 44 subcategories have stable parent/zone links. There are 52 fixture-product mappings, 52 shelf positions, 52 warehouse locations and 52 planning profiles. Backroom F stores the same merchandise SKUs in `fixture-f-01` or `fixture-f-02`; its former two warehouse-only demonstration SKUs are removed. Checkout L has six transaction-producing counters and no artificial products. Existing merchandise SKU codes, including MOCK-SKU-007, remain stable.

`Product` carries SKU, leaf category, Thai/English fictional name, fictional brand, selling unit, selling price, unit cost and active state. `FixtureProduct` carries display capacity. `ShelfInventory` owns shelf/reserved quantities by SKU + fixture. `StockLocation` owns warehouse/reserved/incoming quantities and arrival by SKU + warehouse fixture. `ProductPlanning` holds average daily demand, safety stock and lead-time days. The old inventory endpoint is a compatibility projection of these records, not a second source to edit. Sales retain root category IDs; catalog product leaf IDs resolve to those roots.

`getCatalog()` is added to the existing asynchronous RetailDataProvider and validates its references/quantities. These contracts can be implemented by .NET API + SQL Server later; there is no live HTTP/database integration in this phase.

`inventoryForSku()` aggregates display positions and counts each warehouse location once, subtracts reserved quantities, applies incoming arrival eligibility and reuses the existing inventory formula. A two-display SKU test proves warehouse stock is not duplicated. Current demo placements use one display and one warehouse location each, with zero reservations. Inventory summaries group by units rather than adding kilograms, bottles and bags together.

## Integration and UI

- Explorer uses existing Lucide icons, expandable subcategory/fixture/SKU branches and Thai/English/SKU search. Operational F/L retain their fixture branches.
- Zone/fixture Inspector offers category/SKU counts, shelf OOS and grouped inventory; product lists support search, subcategory and availability filters. Warehouse views show storage stock for merchandise products.
- SKU selection keeps the scene object ID as its fixture, adds independent selectedSku context, focuses that fixture and opens Inventory with product price/cost, stock, incoming, demand, Days of Supply and suggested order. Daily Inspector KPI/Analytics scoping can use the selected SKU. Ordinary zone/fixture selection clears SKU context.
- InventoryPlanner and CalculatorForm are extended, not duplicated. SKU defaults load from canonical stock/planning, including units. Scenarios never modify actual data. Arrivals with one common date use that actual date; hypothetical mixed dates use the eligible incoming total with Arrival 0 and an explicit explanatory note.
- KPIFieldHeader is shared by calculator inputs/results, KPI cards, Inspector and chart headings. Text and information button are grouped with 6px gap; units can align to the right. Label wrapping retains the information button in the same group.
- Thai sales trend, category comparison bar, composition donut and hourly charts include localized category names, tooltip series, axes, units, selected-time marker and empty states. The category bar is horizontal to fit Thai department names. Financial formulas remain unchanged.
- Configured help adds concrete explanations/examples for stock, demand, lead time, COGS, response groups and other inputs; chart help matches its actual axes and series colors. Kanit and the teal/white/yellow theme remain.
- Phone navbar now uses two rows, retaining all four navigation destinations and a visible explorer toggle. Switching views closes the phone explorer; Operations starts with its explorer closed. Popups stay within the phone viewport.

## 3D and lifecycle repairs

The 14-zone, 53-fixture store retains six checkouts, four ATM models, appliance displays, receiving-aligned cold room, carts, EAS posts, six customers and three staff. Walking is real frame-driven movement; two shoppers have attached carts. Both sliding doors open/hold/close on proximity. Existing obstacle/path tests remain.

A browser-discovered NotFoundError when leaving the Canvas for Operations was addressed by giving all Drei Html roots a dedicated portal sibling layer inside the isolated canvas container. The label roots no longer append themselves into React-owned Canvas children. Door badge text is frame-owned, with no competing React text children. No node_modules patch was applied. Fresh Operations round trips after this change logged zero errors. Labels still stay beneath dialogs and Analytics/Peak Time.

Shared geometry/materials, instancing and pixel-ratio cap `[1, 1.5]` remain. No model is created per SKU. Derived catalog rows/unit summaries are memoized; animation uses refs and frame updates. Analytics tabs retain the same mounted Canvas; Operations is a separate route. No quantitative FPS/GPU benchmark was measured.

## Data and reconciliation

Current daily sales remain ฿284,650. Splitting fixture facts across 52 SKU rows preserves sales cents and changes derived gross profit rounding by ฿0.04 to ฿77,254.00. Margin is about 27.14%. Shelf OOS is 2/52 (about 3.85%). A shelf stockout remains OOS even with warehouse availability. Inventory is a point-in-time snapshot; a SKU may have daily sales before becoming out of stock at that snapshot.

Three days × 15 hourly buckets × 14 zones = 630 zone-hour rows. Hourly sales/traffic/transactions reconcile with daily facts; actual snapshot/selected-hour/scenario state remain distinct. All dates/hours, density, sales and OOS layers keep the existing provider source. Demand and financial facts are illustrative independently generated mock inputs, not a real forecasting or inventory movement ledger.

## Verification

Baseline on fccc89d: 49 tests passed, optimized build passed. Final unit suite: 58 passed, 0 failed, 0 skipped. No old tests were deleted or skipped. TypeScript and optimized build passed; ESLint passed with zero errors and zero warnings.

New tests cover retail zone/category/SKU relationships, uniqueness, fixture mappings, operational storage/transactions, duplicate and missing references, invalid/non-finite/negative stock, reservations, multi-display aggregation, late incoming, demand zero, immutable aggregation, provider identity, sales/chart/hour reconciliation and SKU selection state. Existing gross profit/margin, CSAT/NPS, contribution, invalid-input, camera, path, heatmap, peak and timeline tests remain.

Browser checks on the local optimized preview:

1. Grocery → ข้าวสาร → fixture-a-01 → MOCK-SKU-001 opens ข้าวหอมมะลิ 5 กก. Shelf 0, warehouse 90 bags, incoming 20, demand 8, lead time 3, safety 15. Demand 100 produces Suggested Order 205 and Days of Supply 0.9. Demand 0 gives N/A; Reset Demo restores 8 and 11.25 days. Store sales stay ฿284,650.
2. Grocery inventory shows 10 SKUs, six subcategories and one shelf OOS. Subcategory rice + OOS filters retain only jasmine rice; unmatched search gives a clear empty state. Global search for ไมโครเวฟ opens only its matching tree and selects MOCK-SKU-043 with appliance units/prices/stock.
3. Reused KPI input titles and information icons have a computed 6px gap. COGS and chart help show meaning, formula, inputs, example, interpretation and caution; Escape closes them. Dialogs cover 3D labels.
4. Thai bar/donut/trend rendered with Thai category labels and units; chart help matches horizontal bar axes.
5. Density at 22 October 08:00 shows 41 entrants, 50 occupancy, ฿6,495.33 sales and 20 transactions. Sales and OOS legends switch correctly. Selecting 21 October 22:00 shows the distinct daily peak 19:00. Playback at 5× advances while collapsed and stops at 22:00; expand preserves state.
6. All nine character label projections changed between observations. Door OPEN and CLOSED states were observed. Existing fixture/route geometry and unit tests cover retained models and safe paths. Camera rotation, wheel zoom and focus were exercised; static zone-label projections changed with rotation and focus returned to the selected SKU fixture.
7. Operations add/edit a rice replenishment action, set Done, filter zone/status and select ascending priority. Its normal score is 9; critical items remain in a separate table and local-only disclosure stays visible.
8. At phone 390×844, all four navbar destinations fit (Operations right edge about 378px), document width remains 390px, switching to Analytics closes the explorer, and a help dialog spans x=20–370px. Desktop also has no outer horizontal overflow. Temporary viewport overrides are reset after QA.
9. A fresh tab after the label portal fix completed Explore/Analytics/Operations round trips with zero console errors; earlier candidate cleanup errors were investigated and repaired, not suppressed.

Screenshots: [SKU](phase5-sku.jpg), [Thai charts](phase5-analytics.jpg), [KPI spacing](phase5-kpi-headers.jpg), [phone](phase5-mobile.jpg).

## Files changed

New: `src/types/catalog.ts`, `src/data/mock/catalog.ts`, `src/lib/analytics/catalog.ts`, `components/panels/CatalogBrowser.tsx`, `components/analytics/KPIFieldHeader.tsx`, `components/scene/SceneHtml.tsx`, `tests/catalog.test.ts`, this report and browser evidence.

Updated: catalog-derived inventory/sales and provider, explorer state/tree, ObjectInspector, InventoryPlanner/CalculatorForm, AnalyticsWorkspace/View/Charts, daily dashboard, hourly/Inspector charts and timeline wording, help configuration, Workspace navigation, styles, SceneHost and existing Html consumers, README. The original floor geometry, fixture models, calculation formulas and operation business rules are retained.

## Limits and deployment readiness

All important P0 acceptance items are implemented; P2 detail/scale enhancements remain deferred. The sample catalog is representative, not a complete retail assortment. Action Planning is local state and resets when leaving/reloading. No actual inventory edits, purchase orders, external assignments, authentication, live .NET API, SQL Server or ERP connections exist. Advanced continuous crowd avoidance and KPI-driven queues are deferred. Models/floor plans are stylized; FPS has not been benchmarked.

The optimized frontend is ready for a local portfolio demonstration. Use the README ten-step flow and setup/build commands. A supported Next.js/Node host is needed for the server-rendered main route. Real operational deployment needs a separate persistence, authentication, security/dependency and real-data integration effort. Nothing has been deployed to production.
