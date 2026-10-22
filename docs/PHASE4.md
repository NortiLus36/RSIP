# Phase 4 — Spatial Analytics & Design System

## Baseline and scope

Started from clean `f9758078cd1530d64c989f7f183c81ffa1f3ceb6` on `feature/phase-3-retail-analytics`. Created `feature/phase-4-heatmap-peak-time`. Phase 1–3 reports and checks were reviewed; no Phase 3 issue blocked this work. All 13 zone IDs, 51 fixture IDs, support IDs, SKU mappings, positions, original product materials, camera/selection architecture and calculator formulas remain intact.

P0 and P1 are delivered: theme/Kanit, customer density, hourly dataset, date/hour selection, peak charts, timeline play/pause/reset, legend, Inspector integration, sales/OOS layers, speed controls, Top 3 zones and context tooltip. P2 interpolation, shaders, advanced heatmap animation and video export are deferred. Animated customer movement is not implemented. No deployment or Phase 5 work was started.

## Theme and fonts

`src/app/spatial.css` supplies `--brand-primary: #02ABA4`, `--brand-accent: #FFC815`, white backgrounds, neutral text/borders and the Tailwind 4 inline font token. Navigation, selection, tabs, controls, sliders, focus rings and chart series use the new brand. Yellow marks peak/selected points; heatmaps use separate semantic palettes with explicit thresholds and gray No Data. Product/category materials retain their original visual differences. `next/font/google` loads Kanit Thai/Latin at 300/400/500/600/700 with swap and self-hosted browser assets.

The first restricted build could not fetch Google Fonts. A permitted network build then encountered a Turbopack PostCSS worker failure. Next's supported webpack build succeeded with the real Kanit font. Both npm development/build scripts now explicitly select webpack; no dependency changes or font mocks were introduced. First build requires access to Google Fonts.

## Spatial data and business definitions

`RetailDataProvider.getSpatial()` supplies one serializable dataset: **3 days, 45 store-hour rows, 585 zone-hour rows and 2,295 fixture stock-hour rows**, 20–22 October 2026, in Asia/Bangkok. Each day has hours 08–22 inclusive; final hour means 22:00–23:00. Daily profiles vary (morning lower, lunch rise, afternoon dip, evening peak). The peak function uses store entry rows and breaks ties by earliest hour; peaks are 18:00 / 19:00 / 18:00, derived rather than fixed in the UI.

| Field | Meaning |
|---|---|
| Store entries | Unique entry events within that hour, counted once at the store entrance; not a sum of zone visits |
| Zone occupancy | Synthetic exclusive-zone snapshot at the start of the hour; a customer occupies one zone in that snapshot; warehouse unknown |
| Density | Occupancy / explicit **mock** area in square metres; never claims surveyed real area |
| Sales | Sales amount during that hour in integer cents, allocated from canonical Phase 3 daily zone sales |
| Transactions | Sales-attributed transactions allocated to merchandise zones; not counted again at Checkout |
| OOS | Fixture/zone stockout checks at the selected timestamp; checked 0 => No Data; current 22 Oct 18:00 matches inventory |

Hourly sales cents, traffic and transaction sums reconcile exactly to Phase 3 daily source totals for each date. Zone daily sales reconcile separately. Daily store sales remain ฿284,650. Phase 4 extends the *synthetic reporting-window label* from 18:00 to 23:00 for the daily baseline to align with full-day hourly allocation; it does not change financial amounts. The fixed daily Store Performance strip remains separately labeled. The hourly strip, peak dashboard and spatial Inspector follow the selected time. Inventory planning remains based on its clearly dated current stock snapshot and local scenario inputs, even if the timeline is set to another date.

Customer Density uses the mock-area config, Sales Intensity displays **Sales Amount (THB/hour)** and share, and OOS uses checked-weighted aggregation rather than averaging fixture percentages. Warehouse/customer stock data that is unavailable remains gray/No Data. No real Lotus's or DDI data, customer tracking, operational forecasting or ordering is represented.

## Heatmap architecture

`HeatmapLayer` is separate from `ZoneRenderer`, `FixtureRenderer` and object-selection state. `zoneFootprint()` creates world-XZ polygon vertices from each existing floor-plan transform, including Y rotation. The current floor-plan zones are rectangles, so their polygons match those rectangular zone meshes; there is no separately hardcoded positional map or new claim of exact image geometry.

Each overlay has one memoized shape, a transparent basic material at Y=0.18 (above zone top 0.15), depth writes off and polygon offset. Raycasting is disabled on overlays, so original zone/fixture picking remains available. Selection highlights remain above them at Y=0.24; fixture wire outlines remain independent. Only color/material properties update with time; the Canvas and scene geometry are not remounted per hour. A maximum of 13 small overlays are mounted, and R3F disposes declarative resources when the layer unmounts. DPR remains capped at 1.5 and existing product instancing is preserved.

`config/heatmap.ts` owns editable density/sales/OOS thresholds and semantic colors. `HeatmapLegend` follows the selected layer/date/hour, shows units, thresholds, current min/max and No Data, collapses, and gives a hover/selection zone tooltip. Fixture tooltips explicitly use their parent-zone spatial value.

## Timeline and Inspector

`stores/spatial.ts` owns activeDataLayer/date/hour/playing/speed independently from `stores/explorer.ts`. Date/hour inputs are validated against supported choices. Timeline lives outside the remaining scene viewport, preserving fullscreen layout. At 1× one discrete hour advances every 1,500 ms; 2× uses 750 ms and 5× uses 300 ms. Playback stops on reaching 22:00. Play at the last hour restarts at 08:00. Reset goes to 08:00 on the selected date. Manual time/date selection pauses playback. The effect creates one interval, returns cleanup for pause/speed change/unmount, and checks the current playing state before advancing.

Inspector Overview adds selected-hour context; Traffic adds zone occupancy/sales history. Fixture spatial sales and traffic are explicitly parent-zone values; fixture OOS is fixture-specific. Support areas show No Data. Changing time or layer neither changes selectedId nor requests a camera focus. Existing Inventory drafts survive tab/time changes. Charts highlight the selected hour with a line and yellow dot, mark the derived daily store peak and support clicking a time position to update the shared timeline. Top 3 zones rank selected-hour occupancy, not unique daily footfall.

## Files

- New: `types/spatial.ts`, `config/heatmap.ts`, `data/mock/spatial.ts`, `stores/spatial.ts`, `lib/analytics/spatial.ts`, `lib/simulation/playback.ts`.
- New UI: `components/scene/HeatmapLayer.tsx`, `components/spatial/{Timeline,HeatmapLegend,PeakAnalytics,SpatialInspector}.tsx`, `app/spatial.css`.
- Updated: provider/page-data contract, root layout/font, Workspace, SceneToolbar/SceneHost/StoreScene, Inspector, chart palette, selection colors, daily period label, npm scripts and README.
- New tests: `tests/spatial.test.ts`; earlier formula/floor/camera tests remain unchanged.

## Verification

- **36/36 tests PASS**, including 12 spatial tests: peak/ties, density, OOS, threshold boundaries, missing data, hourly/daily reconciliation, source joins, time validation, independent camera/selection, discrete endpoint, timer cleanup and footprint rotation.
- TypeScript strict and ESLint: PASS.
- Production webpack build: PASS; static `/` and not-found routes, real self-hosted Kanit.
- Browser acceptance on desktop Chrome: all four layers, noon/evening data changes, date selection, legend collapse, shared KPI/Inspector values, chart-click time selection, 5× endpoint stop, immediate pause, native shelf picking through OOS overlay and drag rotation exercised.
- At 22 Oct 12:00 Zone C: occupancy **17**, density **0.12** mock people/m², sales **4,034.49 THB**. Inspector and legend agreed; hourly store KPIs were **152 entries**, **173 occupancy**, **23,891.86 THB**, **75 transactions**.
- At 21 Oct 19:00: daily peak **19:00**, store entries **263**, sales **41,402.41 THB**, transactions **131**. Zone C sales **7,074.97 THB**, OOS **20% = 1/5**.
- Camera label coordinates before/after a time change remained `{x:640.7049560546875,y:266.5528259277344}`. A07 demand 100 still produced order **58**, DOS **2.38**, and retained the draft after timeline edits. Native canvas click selected A05 while OOS was active.
- Desktop 1536×695, tablet 1024×768 and mobile fallback 390×844 document dimensions matched their viewports. Tablet reserved a 459px canvas plus 325px drawer; sidebar scroll was 1211px inside a 704px container. Mobile explorer can be toggled to reveal the bottom drawer/controls.
- Computed body font was `Kanit, "Kanit Fallback", sans-serif`; primary token resolved to `#02aba4` and Thai/English rendered with the new font. Browser application error log was empty; unrelated extension warnings were excluded.
- Final rebuilt production preview at `http://127.0.0.1:3002/`: warehouse Traffic/Charts showed explicit No Data, the Retail KPI form still calculated sales 1000 / COGS 650 => GP 350 and GM 35%, the derived 21 Oct peak and selected-hour chart rendered correctly, and the final browser error log contained **0 errors**.

Final screenshots: [Density](phase4-density.jpg), [Peak Time](phase4-peak-time.jpg), [Tablet](phase4-tablet.jpg).

## Performance and limitations

Playback performs discrete low-frequency updates; no React state writes occur per render frame. Derived chart series and overlay colors are memoized. Timer allocation/cleanup is unit tested and browser pause/endpoint behavior was verified. No duplicate intervals were observed. A full browser memory/heap profile or measured FPS benchmark has **not** been captured, so no numerical performance or leak-free claim is made. Dataset scans are small for this three-day MVP; a real feed should add keyed indexes/windowing and profiling.

The footprints and square metres are approximate/mock, stock paths are synthetic, and data is local with no persistence or live APIs. Fixture-level traffic/sales is not invented; Inspector explicitly uses its zone context. Daily baseline panels do not switch dates with the hourly timeline. No shader interpolation, movement animation, video export or final deployment is included. Existing distant label overlap and Phase 3 export/advanced-form/persistence limitations remain. Dependency versions and prior audit caveats are unchanged; no new audit is claimed.

Phase 5 handoff: agree deployment target and accessibility/performance acceptance, profile on target devices, add data contracts/indexing and persistent scenarios if requested, verify dependency patches, and prepare portfolio/export materials. Final deployment requires an explicit instruction.

## Git delivery

Branch: `feature/phase-4-heatmap-peak-time`. Commit message: `feat: add retail heatmap and peak time analytics`. Actual hash and push status are reported in the delivery chat. No force push or history rewrite.
