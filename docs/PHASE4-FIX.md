# Phase 4 bug fix and verification

Baseline: `ed8a37e0a0a98d2ac8c5f17f87fad27ae80959a9`, existing `feature/phase-4-heatmap-peak-time`. No Phase 5 work. The initial working-tree difference was Next's generated dev type imports in `next-env.d.ts`; the production build regenerated its normal imports. This generated file is not part of the fix.

## Findings and changes

| Reported issue | Evidence / cause | Fix or verification |
|---|---|---|
| Heatmap missing | Default activeDataLayer was Normal, intentionally rendering no overlay. There was no clear on-canvas explanation. Zone IDs, footprints, elevation and selector joins were valid. | Normal now explicitly says Heatmap is off and offers an Open Customer Density button. Product materials remain unchanged. |
| Slider appears unchanged | Pointer/keyboard events already updated shared time and selectors. Old density colors were only three constants: values inside one band looked identical. At 66% opacity, category base colors diluted the effect. | Density interpolates real values between fixed scale anchors, including changes inside a band. Opacity is 84%. Legend explains continuous colors versus threshold grouping. Sales/OOS retain categorical thresholds. No data/thresholds were fabricated. |
| Timeline clarity | Small time text and Windows native range appearance made changes hard to read. Normal also hid scene color changes. | Selected-time badge, explicit filled teal track/thumb, accessible date/time value and a Normal explanation. Existing event and timer architecture retained. |
| Theme too white | Primary mostly appeared in text and pale surfaces. | Filled active navigation/yellow underline, sidebar selected edge, toolbar border, active Inspector tabs, KPI header tint and peak badge. White cards and Kanit remain. |
| Peak correctness | Peak already derived max store entries by date, with earliest-hour ties. No hardcoded UI peak found. | Added independent noon, evening and tied-max fixtures. Browser date changes produced 19:00 on 21 Oct and 18:00 on 22 Oct. |
| Calculator uncertainty | Formulas and source isolation already worked. | Browser checked every requested calculator and reset; no formula change needed. |
| Reported automated failure | Baseline npm test in the repository passed 36, failed 0, skipped 0, Node v24.20.0. Runner: node --import tsx --test tests/*.test.ts. Pure tests need no WebGL. No failure/stack trace could be reproduced from the supplied evidence. | Added five regression tests: now 41 passed / 0 failed / 0 skipped. No tests removed/skipped; no expected values altered. Original failing command/environment remains unknown; no claim that an unobserved assertion failure was repaired. |

The earlier npm ENOENT screenshot separately shows a command run in `D:\net10\RSIP`, without package.json. The actual repository is `D:\net10\RSIP\RSIP`. It is not evidence of a failing test assertion.

## Browser A — heatmap/time

22 October, Asia/Bangkok, Customer Density:

| Hour | Store entries/hour | Occupancy snapshot | Sales THB/hour | Transactions/hour |
|---|---:|---:|---:|---:|
| 08:00 | 41 | 44 | 6,513.89 | 20 |
| 12:00 | 152 | 173 | 23,891.86 | 75 |
| 19:00 | 235 | 261 | 37,729.66 | 116 |

Floor colors changed from predominantly teal to yellow/orange. Screenshots: [08:00](phase4-fix-08.jpg), [12:00](phase4-fix-12.jpg), [19:00](phase4-fix-19.jpg). Native mouse drag moved 19:00 to 12:00 and updated Legend, hourly KPIs and Zone C Inspector: 17 occupancy, 0.12 mock people/m², THB 4,034.49 zone sales. At 19:00 Zone C showed 25 occupancy, 0.17 density, THB 5,912.10. Fixed daily cards did not change.

Play advanced 12:00 to 16:00. Pause remained at 16:00 across subsequent actions. Date changes preserved the hour and loaded the selected date. Reset returns to 08:00 and pauses. Timer cleanup/speed/endpoint tests remain; no timer change was necessary.

## Browser B/C — peak and calculators

Peak uses the same hourly provider/date/hour. Store entries count entrants; occupancy is a snapshot by exclusive zone. Sales/transactions use hourly buckets; fixed daily baseline is labeled separately. Peak/selected chart markers use derived data.

| Menu | Input | Output |
|---|---|---|
| Explore → Grocery → Grocery aisle 07 → Inventory | Demand 100, lead 3, safety 16, available 238, eligible incoming 20 | Target 316, suggested order 58, DOS 2.38 days, formula/substitution/units/explanation |
| Same Inventory | Demand 20, lead 5, safety 30, available 50, incoming 10 | Target 130, order 70, DOS 2.5 days |
| Same → Reset Demo | Click reset | Restored demand 14, lead 3, safety 16, available 238, incoming 20, order 0, DOS 17 days |
| Analytics → Retail KPI | Sales 1000, COGS 650 | GP 350 THB, GM 35% |
| Analytics → Retail Operations | OOS 2, checked 50 | 4% |
| Analytics → Customer Experience | Satisfied 92 / CSAT total 100 | 92% |
| Same → NPS | Promoters 120, passives 50, detractors 30, total 200 | 45 score; total 199 produced adjacent validation |
| Analytics → Decision Simulator | A 1000−500−100; B 700−200−50 | A 400, B 450 THB; contribution insight favored B despite lower sales |

Actual daily KPI array before/after inventory edits stayed identical: sales 284650, GP 79303.52, margin 27.86%, OOS 5.26%, traffic 1842, wait 4.5 minutes, CSAT 92.4%. Scenario drafts never write to the provider.

## Browser D and automated verification

- Sidebar fixture selection, repeat Focus Camera, Reset View, Inspector Close worked. Clicking a shelf face selected fixture-a-07 while density remained active; floor clicks selected its zone. Overlays still disable raycasting, keep depth writes off and stay at Y=0.18 above zone surface/below selection highlight. No z-fighting observed.
- Fullscreen document matched viewport 1536×639; no outer scroll. Computed body font remained Kanit and brand-primary resolved to #02ABA4. Application console: 0 errors.
- **41 tests passed, 0 failed, 0 skipped**. Added within-band colors, 08/12/19 source/color differences, noon peak, evening peak and tied peak. Existing formula, dataset, camera and timer tests retained.
- TypeScript strict PASS; ESLint PASS; production webpack build PASS with bundled Kanit. Interactive browser acceptance runs are separate from the Node tests.

## Files, limitations and delivery

Changed: lib/analytics/spatial.ts, components/scene/HeatmapLayer.tsx, components/spatial/HeatmapLegend.tsx and Timeline.tsx, app/spatial.css, tests/spatial.test.ts, README, this report and screenshots. No dependency/project/API or simulation dataset added.

Density colors saturate at the high anchor 0.4; numeric values/classifications remain available above it. Areas and hourly stock history remain synthetic. Current inventory is a separately dated snapshot. No GPU/heap profile was performed. Original reported failing environment is undiagnosed without its command/output; documented tests pass. Requested fixes/verification are complete; advanced shaders, export and persistence remain outside this fix. No Phase 5/deployment started.

Git: existing Phase 4 branch. Message: `fix: repair phase 4 heatmap timeline and tests`. Hash and push status are in the delivery chat.
