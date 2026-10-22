# Store enhancement — 22 October 2026

P0 and P1 are implemented on `feature/store-enhancement-ui-refinement`. No Phase 5, backend or deployment was added. All analytics and people are synthetic demonstrations.

## Layout and models

- Original A–M zone transforms remain unchanged. Removed Office, Customer Service, First Aid and Baby Care support rooms. The product department Baby & Kids remains.
- Six checkout fixtures retain IDs `fixture-l-01` through `fixture-l-06`. Removed checkout 07/08; transaction allocation now derives from the actual checkout count.
- Cold Room at (18, -20) aligns with Loading Dock at (13, -20). A receiving/cold/fresh process line describes the flow.
- Added Zone N Electronics & Appliances with TV, fridge, microwave and small-appliance display fixtures. It participates in explorer, inventory, daily provider totals, hourly heatmaps and Inspector.
- Four generic green/purple/red/teal ATM cabinets include screens, keypads, card slots, cash slots and signs. Four parked carts, two moving shopper carts and four EAS posts leave the entrance corridors clear.
- Store boundary extends right/front to accommodate the retained facilities and entrance circulation; entry and exit move to the new front edge. Current scene has 14 zones, 53 fixtures and 7 support areas.

## Animation and performance design

`StoreActivity`, `CharacterModel` and `ShoppingCart` provide six customers and three staff (cashier, restocker and floor staff). Configured waypoints are routed through a static A* navigation grid inflated by actor/cart clearance. Route direction drives facing and basic arm/leg walking. Moving carts are children of their shopper rigs. Basic priority yielding reduces actor overlap; this is not a crowd or queue simulator.

Two sliding glass doors open on nearby people, retain a short hold and close after the detection area clears. The independent People pause freezes people and doors without modifying time or business data. Animation uses imperative frame updates and refs, shared geometry/materials and instanced repeated parts; no per-frame React state or geometry allocation. Static route tests sample every 0.1 scene unit against fixture, room, ATM, gate, door-post and parked-cart footprints. No device-independent FPS guarantee or GPU benchmark was measured.

## UI and analytics

Navbar uses teal `#02ABA4`, white text and yellow `#FFC815` for 3D. Kanit remains bundled through Next font. Time Explorer controls remain mounted while their container collapses; timer/date/hour/speed survive. Camera only reframes on explicit reset/focus, so changing canvas height preserves view.

`KPIInfoPopover` uses configurable `kpi-help.ts` definitions for meaning, formula, inputs/axes/colors, interpretation, example, recommendation and caution. It covers calculator inputs/results, KPI cards, daily Inspector metrics and important charts. Dialog supports Escape, focus restoration, a contained scroll area and keyboard focus trapping.

`/operations/action-planning` is a standalone route linked by Operations. Add/edit, inline status, Zone/Status filters and ascending/descending priority are supported. Safety/legal critical actions remain separate from normal summed scores. Edits are local to the mounted page and reset after leaving/reloading; there is no task persistence or external assignment.

`next.config.ts` sets the supported `devIndicators: false` option.

## Data changes

Daily net sales remain ฿284,650. Electronics receives 3% of category allocation taken from apparel (13% to 10%). Different category COGS changes derived gross profit to ฿77,254.04 (about 27.14%); values are recalculated from canonical cents, not frozen placeholders. There are 44 representative inventory records, including two backroom-only SKUs: shelf OOS is 2/42 (about 4.76%). Six-checkout weighted wait is about 4.3 minutes. Existing merchandise IDs, including A07 / MOCK-SKU-007, remain stable. Hourly zone rows increase to 630 (14 zones × 15 buckets × 3 days). All sales/traffic/transaction reconciliation tests pass.

## Validation

- Baseline: 41 tests passed before changes. Final: 49 pass, 0 fail, 0 skipped. Existing tests were retained; expected zone and spatial-row counts were updated for N.
- TypeScript, ESLint and optimized production build checked. A sandboxed build twice hit Windows EPERM when a worker created a generated `_not-found` output directory; rerunning the authorized build with broader filesystem permission resolved it. The agent preview was stopped during rebuilds; the user's development server was preserved.
- Browser: N sidebar focus and four appliance models; daily/hourly Inspector data; four colored ATM models; moving customers/staff, attached carts and OPEN/CLOSED/CLOSING door states; People pause leaves actor projections stable.
- Collapsed Timeline while playing at 18:00, expanded at 22:00 with endpoint stop. Static label separation remained (-261.5604, 202.2202) pixels before/after (rounding tolerance), confirming unchanged camera scale/orientation.
- Added a Zone N action, set Done, filtered by Zone/Status, edited/saved it, sorted normal scores 9/10/12 ascending while the score-3 safety item remained in the critical table.
- Density layer at 08:00 updated selected-hour data (41 entrants, 50 occupancy, ฿6,495.33 sales, 20 transactions); Peak Time loaded with daily peak 18:00 and included N in its busiest-zone chart. Thai chart dialog displayed all seven fields.
- Final-build A07 Inventory browser regression: MOCK-SKU-007 retained; changing Daily Demand from 14 to 100 produced Suggested Order 58 and Days of Supply 2.38 while store net sales stayed ฿284,650.
- Fresh production browser console had zero errors during these checks. A prior development navigation emitted Drei Html/React root-unmount warnings; no corresponding production error was observed. Development server startup also had a localhost/font compilation delay. No package internals were patched.
- At desktop width 1536, document scroll width equalled viewport and Kanit was active. Scene and Inspector have intentional internal regions; no outer horizontal scrollbar appeared.

Screenshots: [ATM models](enhancement-atm.jpg), [entrance and people](enhancement-entrance.jpg), [action planning](enhancement-operations.jpg).

## Files and extension points

Layout/data: `config/floor-plan.ts`, `fixtures.ts`, `store-environment.ts`, `data/mock/analytics.ts`, shared types. Scene: `EnvironmentAssets`, `ElectronicsDisplay`, activity components, `lib/scene/navigation.ts`, scene assets/rendering/toolbar and independent environment store. UI: Workspace/routes, Timeline, CameraController, ActionPlanning, KPIInfoPopover/help configuration, calculator/card/chart/Inspector integrations and `app/enhancement.css`. Tests: new enhancement coverage and updated floor-plan/spatial expectations. README and this report describe current behavior.

P2 advanced crowd avoidance, KPI-driven queue behavior and detailed character animation remain deferred. Models are stylized approximate assets. Basic routes avoid static objects; actor yielding is deliberately simpler than continuous collision physics.

## Follow-up: scene label stacking

Character, ATM and environment Html labels used Drei's large depth-based z-indices, which escaped above the KPI dialog and analytics page overlays. The canvas container now establishes an isolated stacking context at z-index 0. All scene labels stay beneath controls, Inspector, Analytics/Peak Time and portaled dialogs while the mounted scene preserves its camera and animation state. No label visibility toggle or unmount is required when switching pages.

Verified the Gross Profit popup, Peak Time and Analytics visually with all nine actor labels still mounted behind them. Returning to Explore restores the visible scene. Optimized build including TypeScript passed; a fresh-tab Explore → Peak Time → Analytics → Explore cycle logged zero errors. Evidence: [popup](label-layer-popup.jpg), [Peak Time](label-layer-peak.jpg), [Analytics](label-layer-analytics.jpg).
