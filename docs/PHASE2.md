# Phase 2 — Interactive Isometric 3D Store

Built on the existing Phase 1 commit (`e971fa3`) in `D:\net10\RSIP\RSIP`. Origin was fetched and the Phase 1 branch fast-forward check reported already up to date. Work is on `feature/phase-2-interactive-3d`; no reset, force push, new project or backend was used.

## Components and architecture

- Replaced basic StoreScene blocks with StoreEnvironment, StoreFloor, StoreWalls, ZoneRenderer, FixtureRenderer, InteractiveObject, SelectionHighlight, CameraController and SceneLabels. SceneHost retains client-only loading and error/WebGL fallbacks.
- Added SceneAssets, which owns shared geometry/materials and their disposal. InstancedParts renders repeated frames, products, fruit, cartons, garments and shoes. Instance GPU buffers have explicit cleanup; local hit-test/outline geometry uses R3F disposal.
- Added memoized ProductShelf, ProduceBins, Refrigerator, WarehouseRack, CheckoutCounter, ClothingRack, BakeryCounter and SmallDisplay families. The last handles pallets, trolley, folded clothing and shoes. Models are reused by fixture kind, not duplicated per aisle.
- Extended the existing Fixture kind union/description, inventory model and Zustand explorer store. There is one canonical `selectedId`, with `hoveredId` and focus/reset request counters; no parallel selection model.
- Updated ObjectInspector, StoreExplorer, SceneToolbar and Workspace. KPI and stock data are passed through the existing asynchronous RetailDataProvider. No new packages were installed.

## Completed zones

| Zone                 | Fixtures | Model details                                                                         |
| -------------------- | -------: | ------------------------------------------------------------------------------------- |
| A Grocery            |        7 | Long parallel aisles, posts, four shelf levels, colored products                      |
| B Snacks             |        4 | Wide multilevel snack displays                                                        |
| C Fresh Food         |        5 | Wooden produce bins with instanced fruit                                              |
| D Frozen & Chilled   |        4 | Multilevel refrigerated cabinets, transparent doors, handles                          |
| E Beverages          |        3 | Bottle displays                                                                       |
| F Backroom           |        5 | Two warehouse racks, two stock pallets and a wheeled trolley                          |
| G Home & Living      |        2 | Shelves with varied-height household boxes                                            |
| H Health & Beauty    |        2 | Cosmetic bottle displays                                                              |
| I Baby & Kids        |        2 | Baby-product shelves                                                                  |
| J Pet Care           |        2 | Pet-product packs/boxes                                                               |
| K Deli & Bakery      |        2 | Wooden/glass bakery counters and bread display                                        |
| L Checkout           |        8 | Counter bodies, conveyor belts and POS screens                                        |
| M Clothing & Apparel |        5 | Three clothes racks with sleeves/hanging garments, folded-clothes table, shoe shelves |

Total: **51 interactive fixtures**, all 13 zones and the existing 11 support/entrance areas. Phase 1 zone positions, zone sizes and boundary vertices are unchanged. `config/fixtures.ts` stores repetition counts, dimensions, local offsets and spacing; all derived footprints fit their original zones and do not overlap. New fixture heights include model extents. Checkout fixture depth leaves space within Zone L for later queue visualization; no queue simulation was added.

## Interaction and camera

Hover sets a pointer cursor, footprint/outline and name/ID tooltip; leaving clears hover. Scene clicks resolve explicit object IDs, select and stop propagation, update Sidebar/Inspector and retain the current view. Drag movements are excluded from click selection. Sidebar selection requests smooth focus, including repeated selection of the same object. Inspector provides Focus Camera, Reset View and Close. Empty floor/ground clicks clear selection without a reset.

Orthographic framing derives from projected bounds and viewport size. Focus preserves the current viewing direction, shifts the target to allow room for the right inspector, and animates camera position, Orbit target and zoom together using frame-time-based interpolation. Input cancels an in-flight transition. Zoom and polar angle are constrained; the camera stays above the floor. Reset restores whole-store framing. Left drag rotates, wheel zooms, right drag pans; focused-canvas arrow keys also pan. Selecting or manually controlling the camera stops auto rotation. Toolbar labels, grid, auto rotation and walls all respond; analytics layers remain disabled.

Sales/OOS snapshots are available for merchandise fixtures. Warehouse/service fixtures without those records show `No Data`. Shelf/backroom stock comes from provider inventory; absent inventory also shows `No Data`. Mock per-fixture sales divide the parent zone allocation across its merchandise fixtures and are illustrative rounded values, not measured sales. Store/zone mock data retain the original Phase 1 period and units.

## Performance

One Canvas, pixel ratio capped at 1.5, one 2048 shadow map, low-poly geometry, shared materials/geometry, memoized fixture models and instanced repeated contents. Hover and selection updates occur on events; camera animation mutates Three.js values in useFrame without allocating geometry or setting React state each frame. Shadows are kept simple. Cleanup paths exist for shared and instance resources. No claim of an exhaustive memory-leak or cross-device FPS benchmark is made.

## Validation

TypeScript strict check, ESLint and production build pass. Seven automated tests pass: original data integrity/provider coverage plus non-overlapping in-zone fixtures, all zone/apparel kinds, camera fit/zoom limits, selection/focus/clear semantics and unavailable service KPI behavior.

Final production Chrome checks at `http://127.0.0.1:3001`:

- All 13 zone labels and 51 fixture configuration records present; detailed shelves, produce, glass cabinets, warehouse equipment, POS counters and apparel visible.
- Sidebar Zone M selection smoothly frames the clothes racks; native mouse click on the rendered rack selects `fixture-m-01`, checks the matching sidebar row and updates Inspector.
- Hover displays fixture name/ID and outline. Close clears selection. A native click on empty ground also clears Inspector and selection without requesting a reset. Reset View restores whole-store framing; focus can be requested again independently.
- Auto rotation turns off on selection. Labels hide/restore, grid and walls toggle, left drag changes orientation and wheel input changes zoom.
- Real arrow-key input pans the view; visible label X moved from 893.44 to 881.44 pixels. Right-button drag is configured explicitly but is not separately exercised by this browser tool.
- Checkout fixture Inspector displays `No Data` for sales, OOS and stock when absent. Merchandise fixture stock and KPI values come from the provider.
- Final production browser logs show zero app errors, including no hydration errors. Development hot-reload syntax/type issues encountered during edits were corrected before the production build. Unrelated wallet-extension warnings are excluded.

Screenshots: [Whole store](phase2-overview.jpg), [Zone M close-up](phase2-apparel.jpg). No changes to the reference zone positions were necessary.

## Known limits and Phase 3 boundary

- Stylized procedural models and approximate floor plan; no imported commercial assets or copied reference-site source/assets.
- Department/support labels can overlap when zoomed far out. Labels can be hidden, and objects can be focused individually.
- Inspector metadata scrolls on short screens. Models and their parts are selected at fixture level, not individual SKU level.
- No WebGL support still relies on the existing browser/scene fallback; no automatic device performance tiers or exhaustive mobile GPU benchmark.
- Right-drag pan uses standard OrbitControls mapping; the browser automation surface supports left drag only, so automated pan evidence uses actual arrow-key panning rather than claiming a right-button drag test.
- Existing development-only ESLint-chain advisories from Phase 1 remain; dependencies were not changed.
- Customers, checkout queues, density/peak-time/OOS heatmaps, traffic flow animation, AI recommendations and real backend/analytics remain deferred. Phase 3 has not been started.

## Git delivery

Branch: `feature/phase-2-interactive-3d`. Required commit message: `feat: implement interactive 3d retail store`. Exact commit hash and push outcome are reported in the delivery chat. Push is performed without force; main is not modified.
