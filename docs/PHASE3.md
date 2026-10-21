# Phase 3 — Retail Analytics, Calculators & UI Refinement

## Recorded Phase 2 baseline

- Repository root: `D:\net10\RSIP\RSIP`; origin matches `https://github.com/NortiLus36/RSIP.git`.
- Starting commit: `0f806c0fec6be1e49564f164b0d9d30a30fe4a46` on `feature/phase-2-interactive-3d`, initially clean. Fetch/fast-forward check reported already up to date. Phase 2's recorded checks were TypeScript/lint/build and seven tests passing.
- Preserved App Router, strict TypeScript, Tailwind, R3F/Drei, Zustand scene selection, 13 zones, 51 fixtures, 11 support areas, all SKU/object IDs and floor-plan positions. No compatibility aliases are needed because no IDs were renamed.
- Previous main-area minimum heights, headings, scroll containers and overlapping inspector are visible in [Phase 2 evidence](phase2-apparel.jpg). The previous financial/zone snapshots contained illustrative copied ratios and rounded per-fixture allocations. Phase 3 replaces those with aggregations.

## UI changes

Explore uses the full `100dvh` shell with a fixed navbar and no document scroll. The explorer and drawer content scroll internally. The heading moved into a small canvas overlay. Desktop reserves actual viewport space for a 342px drawer (325px on narrower desktop/tablet widths), so model focus no longer aims behind a floating panel. Camera framing now uses its actual remaining viewport, without subtracting drawer width twice.

Drawer header/actions/tabs remain fixed while its content scrolls. Overview / Inventory / Analytics switch without losing the selected object. Collapse/expand and Close are functional. Mobile uses a separately allocated bottom drawer, and its explorer is toggled from the fixed navbar. Tablet retains usable internal scroll areas. The store KPI strip has compact and expanded states; expanded displays Net Sales, Gross Profit, Gross Margin, OOS, Traffic, Wait Time and CSAT from the provider.

## Delivered modules

| Module                          | Status / behavior                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Retail KPI & Business Analytics | Working estimated sales, GP and GM with validation, units, formulas and substitution                                                  |
| Dashboard & Visualization       | Reusable KPIStatCard, sales Line chart, category Bar chart, composition Donut; daily/rolling-weekly and zone/category/fixture filters |
| Data Exploration                | Zone/category/SKU grouping, sales sort, zone/time filters, search and reconciled summary row                                          |
| Inventory Planning              | SKU-linked demand/lead time/safety/available/incoming/arrival form; target, order and DOS; zero demand => N/A                         |
| Retail Operations               | Working OOS, waste-to-sales, sales/labor hour and labor-cost percentage                                                               |
| Customer Experience             | Working CSAT, signed NPS score, complaint rate per 1,000 transactions; consistent respondent totals                                   |
| Decision Simulator              | Live A/B contribution results and Bar chart; business insight compares contribution rather than automatically preferring higher sales |
| Management Action Planning      | Add local actions and update status; normal score sorting; Safety/Legal Critical queue explicitly separate                            |

All P0 and P1 features are implemented. P2 advanced chart animation, report export, advanced forms and custom chart configuration remain deferred; no fake buttons or fixed scenario results were added.

## Data and business definitions

`RetailDataProvider.getAnalytics()` supplies a canonical dataset of 532 SKU/day sales facts (38 sales SKUs × 14 days, 9–22 October 2026), 40 current inventory records, planning assumptions, store-day context and checkout records. The two warehouse-only SKUs have no merchandise sales. Values are synthetic; there is no real Lotus's or DDI data or scoring standard.

Sales/COGS/waste facts use integer cents so fixture -> zone -> store, chart bars and pivot summaries reconcile. Current daily sales remain **฿284,650**. GP is now **฿79,303.52**, derived from the category-specific synthetic COGS. Store OOS is now **2 / 38 = 5.26%** because two explicit shelf stockouts are represented. These intentionally replace Phase 2's generic GP/margin/OOS placeholders. Backroom stock may be available while the shelf remains out of stock.

Store and Inspector daily cards use 22 October 2026, 00:00–18:00 UTC+7. Financial weekly views sum the last seven demo days. Historical charts show their own daily/7-day bucket windows; no pie chart is used for time series. OOS remains a current stock snapshot, not an average of zone percentages. Checkout wait is weighted by transactions; checkout objects do not get unrelated inventory calculators. Missing financial KPI or stock records display No Data rather than fabricated zero sales.

Draft inputs remain local React state. No calculator updates the provider dataset, scene selection or camera. Division by zero returns null/N/A. Validation handles empty strings, negatives, nonnumeric/non-finite inputs, unsafe numeric ranges, percentage bounds and mismatched NPS/CSAT/OOS counts. NPS is −100 to +100 **score**, not percent. Complaint counts are events and may exceed transactions. Incoming delivery counts only when usable within the specified lead time. Planning assumes constant demand and does not implement reorder cycle/MOQ, variable supplier lead time, demand variability or partial delivery timing.

## Files and architecture

- `src/types/analytics.ts`: facts, planning, context, filters, action and chart contracts.
- `src/lib/analytics/`: pure calculators, input validation, module definitions, provider-derived demo inputs, source aggregation/filtering, pivot grouping and business insights.
- `src/data/mock/{analytics,inventory,traffic,index}.ts`: canonical synthetic records, stable identities and derived snapshots. `data/providers/index.ts` exposes them without UI mock imports.
- `src/components/analytics/`: CalculatorForm, InventoryPlanner, AnalyticsView/KPIStatCard, chart components, AnalyticsWorkspace, DataExploration and ActionPlanning.
- `src/app/workspace.css`, layout/Workspace, panels/ObjectInspector and dashboard/BottomDashboard: fullscreen shell, tabbed drawer and compact/expanded KPIs.
- `CameraController.tsx`: only viewport-focus budgeting changed; the existing scene/model/selection implementation remains intact.
- `tests/analytics.test.ts`: formula, validation, business insight and data reconciliation coverage. Existing provider tests now verify checkout wait data and explicit empty financial metrics for backroom objects.

Analytics math and selectors import neither R3F nor React. Charts/forms are separate from scene rendering. Repeated 3D products still use Phase 2 instancing/shared resources; no per-frame calculator input updates were introduced. No new dependencies, backend, database, secrets or credentials were added.

## Verification evidence

- TypeScript strict check: PASS.
- ESLint: PASS.
- Unit tests: **24/24 PASS**. Includes GP/GM/loss, order/arrival/DOS, OOS, CSAT, NPS, complaint rate, labor/waste, contribution, zeros/boundaries/invalids/overflow, immutable insight/action partitioning, pivot/chart/snapshot reconciliation and existing scene configuration contracts.
- Production build: PASS, Next.js 16.4.2 static `/` and not-found routes.
- Browser acceptance in Chrome: fullscreen layout, drawer and sidebar scroll, tab/selection preservation, live calculator results, dataset filters, chart/summary agreement, action creation/status and responsive layouts exercised.
- Desktop document dimensions equaled its viewport (1536×639); mobile 390×844 and tablet 1024×768 also matched their document width/height. No outer vertical/horizontal scroll was needed. Tablet sidebar scroll height 1300 vs client height 704; drawer content 1194 vs client height 250 demonstrated internal scrolling.
- Grocery A07 maps to `MOCK-SKU-007`. Demand 14 -> 100 changed suggested order 0 -> **58**, DOS -> **2.38 days**. Demand 0 gave N/A DOS. Empty demand showed an adjacent error. Reset Demo restored inputs. Camera label coordinates were unchanged before/after editing, and all store KPI values were unchanged.
- Retail inputs sales 1000 / COGS 650 gave GP **350** and GM **35%**. OOS 2/50 gave **4%**. CSAT 92/100 gave **92%**; NPS 120/50/30 gave **45 score**, and declared total 199 triggered validation.
- Scenario A 1000−500−100 gave **400**; B 700−200−50 gave **450**. The business insight favored B on contribution despite lower sales.
- A07 daily filtered chart and SKU pivot both showed sales **7,319.58**, COGS **5,709.27**, GP **1,610.31**. Checkout 01 showed wait **3.8 minutes** and no inventory form.
- Final production preview at `http://127.0.0.1:3001`: rendered all 13 zone labels and the 3D model; browser error log contained **0 errors**, including no hydration errors. Third-party browser-extension warnings were excluded from application findings.
- Native canvas drag rotated the model; clicking the adjacent shelf selected `fixture-a-06` and updated the drawer. This verifies scene picking and rotation after the layout changes. Production A07 demand 100 again calculated order 58 and DOS 2.38 without changing store sales.
- Screenshots: [fullscreen workspace and seven KPIs](phase3-workspace.jpg), [selected fixture inventory calculation](phase3-inventory.jpg), [analytics dashboard](phase3-analytics.jpg).

## Limits and Phase 4 proposal

Data is a representative synthetic catalog, not a full operational model. Global chart filters are independent of scene selection; Inspector charts follow the selected object. Global module drafts/action edits are session-local and reset when leaving that screen; Inspector inventory drafts survive tab switches but reset when object/SKU changes. There is no server persistence, real ordering/task assignment, Excel engine or report upload/export. Phase 2's approximate geometry and distant-label overlap remain.

Proposed Phase 4 work: agree API/storage contracts and scenario persistence, add exports, improve accessibility/form navigation and broaden device/performance testing. Forecast sophistication and any heatmap/peak-time simulation require a separate explicit scope. **Heatmap and Peak Time Simulation have not been started.** Existing dependency versions and previously documented dev-tool audit caveats remain unchanged.

## Git delivery

Branch: `feature/phase-3-retail-analytics`. Required commit message: `feat: implement retail analytics and interactive calculators`. Actual commit hash and push result are reported in the delivery chat. No force push or main-branch changes.
