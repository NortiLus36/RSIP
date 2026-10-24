# Retail Intelligence — Stage 0 audit

- [x] Existing Next.js App Router static export: `/`, `/operations/action-planning/`. Reuse deployment and Workspace; no new top-level route/menu.
- [x] Five navigation items; existing Analytics seven-tab container. Replace its contents with business workflow modules while retaining useful calculators/charts.
- [x] Import CSV/XLSX, mapping, whole-file validation, IndexedDB, active provider and reset. Extend schemas additively; keep version-1 stored bundles compatible.
- [x] Catalog, multi-fixture stock, warehouse deduplication, actual sales cents, traffic/occupancy and 90 automated tests. Preserve all existing tests.
- [x] R3F StoreScene/SceneHost, camera, A–N transforms, fixtures, Inspector, OOS, density, Timeline. Geometry files will not change.
- [x] ActionPlanning currently component-local. Reuse it with controlled persistent actions; add Staff Hub inside Operations.
- [ ] Stage 1: October 1–23 synthetic rows, vegetarian SKUs on existing fixtures, event calendar, quantity/transaction identity, additive supply/workforce/feedback/calendar/waste inputs.
- [ ] Stage 2: aligned Bangkok weeks, explainable frozen forecasts, inventory recommendations and supply-constrained profit.
- [ ] Stage 3: weekday/hour forecast occupancy, workload/capacity staff recommendations, historical/forecast spatial mode.
- [ ] Stage 4: shared tasks, approved quick reports, feedback/CX, learning, roles, performance review of immutable snapshots.
- [ ] Stage 5: scoped Data Management spacing and bottom clearance, desktop/mobile QA, tests/type/lint/build, deployment verification.

Primary calendar source: TAT, https://www.tatnews.org/2026/10/thailand-celebrates-vegetarian-festival-2026-across-the-country/ (10–18 October 2026). October 9 may be ceremonial/early preparation in some local calendars; this demo uses October 8–9 as preparation and October 10–18 as the stated demand event. Demand factors are synthetic assumptions, not TAT statistics.

Expected changed areas: types, import schemas/validation/provider, a new pure intelligence engine and October generator, persistent browser workflow store, existing analytics container, Staff Hub, scoped stylesheet and acceptance tests. No floor-plan or fixture transforms will be edited.
