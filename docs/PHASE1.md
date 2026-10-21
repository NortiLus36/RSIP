# Phase 1 delivery — 21 October 2026

The actual repository root is `D:\net10\RSIP\RSIP` (nested inside the supplied workspace). It was an empty Git repository with no commits; origin matched `https://github.com/NortiLus36/RSIP.git`. No existing application was overwritten.

## Completed

Next.js App Router/strict TypeScript foundation; responsive Thai-first dashboard; A–M explorer plus support areas; search, groups and selection inspector; client-only R3F/Drei scene, orthographic orbit/zoom/pan, approximate floor and boundary, representative fixtures, labels/grid/reset/auto rotate; six store KPI cards; hourly traffic chart; provider abstraction; store, zone, fixture, shelf, category, transform, KPI, inventory and traffic models; analytics/simulation interfaces; run documentation and integrity tests.

Layout: white navbar above a navy-accented enterprise workspace; explorer on left; light gray scene dominates the center; toolbar floats above scene; inspector appears on the right on explorer selection; KPI cards and mock-source disclosure sit below. Small screens use a collapsible explorer and a two-column KPI grid.

## Editable floor plan

Coordinates are **approximate arbitrary scene units**, not meters. X increases right, Z increases toward the entrance, Y increases vertically. Zone markers are 0.15 high (Y center 0.075). Fixtures derive their placement from their parent zone. Boundary vertices: `(-16,22), (16,22), (16,-25), (5,-25), (-16,-14)`.

| ID  | Zone                   |   X |    Z | Width | Depth | Placement                     |
| --- | ---------------------- | --: | ---: | ----: | ----: | ----------------------------- |
| A   | Grocery                |  -1 |   -4 |    16 |    10 | Main central sales floor      |
| B   | Snacks & Confectionery |  -3 |    6 |    12 |     9 | Central lower sales floor     |
| C   | Fresh Food             |  -1 |  -11 |    16 |     3 | Behind grocery                |
| D   | Frozen & Chilled       | -12 |   -6 |     5 |    12 | Upper left                    |
| E   | Beverages              | -12 |    4 |     5 |     7 | Left middle                   |
| F   | Backroom               |   2 |  -17 |    13 |     6 | Rear under diagonal boundary  |
| G   | Home & Living          | -12 |   11 |     5 |     6 | Lower left                    |
| H   | Health & Beauty        |   5 |    4 |     7 |     5 | Right of snacks               |
| I   | Baby & Kids            |   5 |    9 |     7 |     4 | Below health & beauty         |
| J   | Pet Care               |   5 | 13.5 |     7 |     4 | Below baby & kids             |
| K   | Deli & Bakery          |  11 |   -4 |     6 |     6 | Upper right sales floor       |
| L   | Checkout               |  -2 |   18 |    23 |     4 | Front of store                |
| M   | Clothing & Apparel     |  -3 | 13.5 |    12 |     4 | Below snacks, before checkout |

Support IDs and center `(X,Z)`: `support-loading` (13,-20), `support-cold` (10,-13), `support-staff` (8,-23), `support-office` (12,1.5), `support-service` (12,5), `support-first-aid` (12,8.5), `support-restroom` (12,12), `support-baby` (12,15.5), `support-atm` (12,19), `support-entrance` (-3,21), `support-exit` (3,21). Sizes and all transforms are editable in the same configuration.

## Mock definitions

Period: 21 October 2026, 00:00–18:00 UTC+7. Net sales (THB) exclude discounts/returns; gross margin (%) is gross profit divided by net sales; OOS (%) is unavailable shelf SKUs divided by total SKUs; traffic (people) counts entrants; checkout wait (minutes) averages queue-to-service time; CSAT (%) is satisfied responses divided by all responses. Waste and gross profit are also present for future analysis. Hourly traffic sums to the store traffic snapshot. Zone monetary weights sum to 100%; shelf records are representative suballocations rather than a complete merchandise model. F/L merchandise sales are zero; shared service KPI values are illustrative placeholders. All changes versus prior period are synthetic display values.

## Deferred to Phase 2

Detailed aisle/shelf geometry, checkout counters, refrigerators, scene picking, camera focus and richer highlights. No backend/database or full calculator/simulation engine was built. Theme toggle and English localization are optional future work. No source, imagery or models were copied from the reference website.

## Verification and Git

- `npm run typecheck`: PASS (strict TypeScript).
- `npm run lint`: PASS, no errors or warnings.
- `npm test`: PASS, 3/3 data integrity and provider tests.
- `npm run build`: PASS, Next.js 16.4.2 production build with static `/` and not-found routes.
- `npm audit --omit=dev`: zero vulnerabilities. Full audit: five high advisories in the ESLint development dependency chain; see README. No forced downgrade was applied.
- Production browser check in Chrome: floor and A–M labels rendered; fixture search and selection retained after clearing search; Zone M inspector displayed source/period/KPIs; labels, grid, auto rotation, camera reset, drag orbit and wheel zoom exercised; Analytics displayed hourly traffic. Fresh final tab had no app console errors, including no hydration errors, after the interaction sequence. Third-party wallet-extension warnings were excluded from app findings.
- Responsive check at 390 × 844: collapsible explorer, mobile canvas and two-column KPI layout; desktop viewport restored afterwards. Right-button pan is provided by OrbitControls but was not separately exercised through the browser automation API.
- Fixed an initial DOM-label mounting issue observed during browser QA by deferring label portals until Canvas had committed. The final fresh tab rendered all A–M labels and label toggling produced no errors.
- Screenshot: [Desktop dashboard](phase1-desktop.jpg). Map labels use compact IDs by default and expand for a selected zone. Very close support-area labels may still overlap at distant zoom.
- Git branch: `feature/phase-1-foundation`; commit message: `feat: initialize retailverse 3d foundation`. Commit hash and actual push result are reported in the delivery chat because a commit cannot embed its own hash. No force push or main-branch changes.

If authentication prevents the authorized push, run `git push -u origin feature/phase-1-foundation` from the repository after signing into GitHub. README documents setup, folder structure and dependency versions.
