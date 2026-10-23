# Data Import — implementation and acceptance report

## Scope and data flow

The existing static Next.js application now exposes **Data Management** in the top navigation (`/?view=data`). This remains a Cloudflare Pages site with no backend, SQL Server, authentication, or import API. Uploaded files are parsed locally. Only application assets are downloaded; imported file contents are not sent to any API.

P0 comprises CSV parsing, mapping, whole-file validation, preview, confirmation, product/inventory relationships, source switching, recalculation and reset. The original 59 tests plus the first 26 import tests passed before the persistence and final browser acceptance checks. P1 adds XLSX, traffic, three scenarios and IndexedDB. P2 is outside this implementation.

## Formats, limits, models and templates

- CSV UTF-8 and UTF-8 BOM: Papa Parse 5.7.0. Quoted commas/newlines are supported; malformed row widths and duplicate/empty headers are rejected.
- XLSX: read-excel-file 9.3.12. Reads the first sheet, including cached formula results; never evaluates formulas or macros. Datetime columns should be ISO text with an explicit timezone. No XLS, XLSM, encrypted workbook, formula engine, or Excel template writer is included.
- Config: `src/lib/import/types.ts`. Maximum 5 MB, 10,000 data rows, 64 columns, 2,000 characters per cell, 31-day coverage per dataset file. XLSX ZIP metadata is checked before parsing, with a 25 MB expanded-size / 1,000-entry limit and rejection of binary/macro entries.
- Five replaceable dataset types: Product Master, Inventory, Sales Transactions, Customer Traffic, Customer Experience. All fields are defined in `schema.ts` with type, requirement, explanation and example.
- Every type has a downloadable CSV template with a valid sample and a separate downloadable CSV data dictionary. The screen also lists real Store, Category/Zone and Fixture IDs from the configured floor plan. CSV exports escape formula-like values, including leading whitespace.

## Validation and transaction semantics

Required mapping and values, duplicate column mappings, finite/ranged numbers, money precision, booleans, real dates, ISO timestamps, hours 0–23, SKU/category/zone/fixture/storage references, zone relationships, negative stock, reservations, unsafe planning arithmetic, zero sales quantity, net-sale arithmetic and CX totals are validated. Unknown geometry is rejected, never created automatically.

Keys:

| Dataset | Key / interpretation |
| --- | --- |
| Product | SKU |
| Inventory display snapshot | snapshotDate + SKU + fixtureId |
| Warehouse snapshot | snapshotDate + SKU + storageLocationId |
| Planning | snapshotDate + SKU; identical parameters required across displays |
| Sales line | transactionId + SKU; a basket may have multiple different SKUs, with one timestamp/store |
| Traffic | date + hour + zoneId |
| Experience | date + storeId |

Stock totals repeated across multiple display rows must agree and are counted once per warehouse location. `reservedStock` is a warehouse reservation and cannot exceed warehouse stock. Omitted storage location uses the first configured F fixture, with a warning. Omitted incoming arrival is unknown and is excluded from eligible incoming, with a warning.

Errors block the entire selected dataset. Warnings are visible before explicit confirmation. Validation identifies row and field; no silently dropped rows or partial applies. The store revalidates at Apply time. A Product replacement cannot orphan existing imported stock/sales or change their referenced category/zone. Input-type failures are reported first; after correction, relational validation runs.

## Central provider and persistence

`DemoDataProvider`, `ImportedDataProvider` and the active source store feed the same `DashboardData` object to the explorer, 3D Inspector, inventory calculator, KPI bar, analytics, hourly charts and heatmap. All previous geometry and IDs remain unchanged. Original demo data is never mutated.

IndexedDB stores versioned raw imported datasets and the selected source. Saves are atomic: active data changes only after the write completes. Refresh and route changes restore the chosen source. Storage failures are reported. **Reset Demo** switches to the original data while retaining imported files for later switching. **Clear Imported Data** requires a checkbox and removes the imported datasets, then restores Demo. Storage is local to the browser profile and origin; localhost, production and other devices do not share datasets.

If Product Master has not been imported, the demo product master is used only as reference metadata. Missing imported **measurements** stay No Data; demo stock/sales/traffic/CX are never mixed into imported KPIs. Unplaced products remain visible but cannot focus an invented shelf; import Inventory to supply actual placements.

## KPI, inventory and 3D integration

Sales are grouped in Asia/Bangkok and summed in integer cents. The existing analytics engine computes net sales, gross profit, margin, zone/category summaries and trend. Existing daily/weekly filters are retained. Imported sales use the existing parent-category analytics convention; Product Master retains the leaf subcategory.

The latest full inventory snapshot date supplies current stock and planning. Display stock is per SKU + fixture; warehouse/reservation/incoming totals are per SKU + storage location. Available stock and eligible incoming feed the existing Suggested Order / Days of Supply formulas. OOS is explicitly the percentage of checked **SKU + fixture positions** with shelf stock zero. Warehouse availability never hides Shelf OOS. SKU Inspector metrics use SKU sales while fixture analytics stays No Data when no fixture sales were provided.

Sales files do not identify a fixture. The implementation therefore computes SKU/zone sales without inventing fixture attribution. It does not fabricate wait time, waste, labor or unique store-entry data. Imported calculator modules requiring those absent inputs show No Data; original Demo calculators remain available. Inventory Planning and imported Customer Experience use their actual imported inputs.

## Traffic, periods and CX

Density is imported occupancy divided by the existing approximate zone area, labelled as simulated area. Customer counts represent zone passages, potentially repeated across zones; they are never presented as unique store visitors. Zone charts use zone counts, and the total is labelled as summed passages. Transaction sums across zones can likewise repeat a basket.

The date selector and hour slider derive their range from imported data. Missing hours/zones show No Data. Peak comes from actual imported passage counts, with the earliest hour winning ties. Daily stock snapshots are held constant across that date's hours, explicitly disclosed; prior imported snapshot dates are available in OOS history. Imported stock coverage and sales periods are displayed separately.

The Customer Experience module supports a selected date range and computes CSAT, NPS and complaints per 1,000 transactions from aggregate counts. Zero denominators show No Data. No names, phone numbers or other personal-data fields are required.

## Scenarios

- A: G002 shelf stock 0, warehouse 100, daily demand 5, safety 10, lead time 3. Computed Shelf OOS 100%, Days of Supply 20, Suggested Order 0; recommend inspecting replenishment from the warehouse.
- B: distinct noon/evening zone counts. At 18:00, A occupancy 80 and B 40; summed passages 900; computed peak 18:00.
- C: shelf 500 + warehouse 100, daily demand 2. Computed Days of Supply 300 and an overstock insight. No invented Waste Cost/KPI.

Each scenario replaces all five imported dataset types with explicit synthetic rows, validates them, and uses the same calculation/provider path. Scenario values are not precomputed KPI outputs.

## Acceptance results

| Area | Result | Evidence |
| --- | --- | --- |
| CSV, BOM, malformed/empty/type/size/header handling | PASS | automated parser tests; real invalid and valid CSV browser uploads |
| XLSX cached values and invalid ZIP expansion | PASS | real XLSX fixture; automated Node reader/shared-table test and actual browser upload |
| Mapping / required / duplicate mappings | PASS | automated tests and browser auto-mapping |
| Preview / Error / Warning / confirmation | PASS | browser showed 0 errors for XLSX, disabled Confirm for negative stock; valid CSV confirmed |
| SKU/category/fixture/zone relationships | PASS | automated validation and atomic replacement tests |
| Multi-fixture warehouse integrity | PASS | warehouse 100 counted once across two displays; conflicting values rejected |
| Imported Dashboard and analytics | PASS | scenario sales 200, profit 80, margin 40%; no demo measurements mixed |
| Inspector / inventory calculator / OOS | PASS | browser G002 0/100 stock, DoS 20, Suggested Order 0, OOS heatmap 100% |
| Traffic / density / peak / missing data | PASS | automated selector integration; browser peak 18:00, occupancy 120, passages 900 |
| CX and zero denominators | PASS | CSAT 80%, NPS 60, complaints 10/1,000; all undefined ratios show No Data |
| IndexedDB / refresh / switching / reset / clear | PASS | automated atomic persistence test; real browser refresh restored imported state, Reset restored 284,650 and Clear removed saved import |
| Download templates and dictionaries | PASS | all five content tests; browser downloaded product_template.csv |
| Prior Phase 1–5 tests | PASS | no tests deleted or skipped |
| Advanced history, merge/upsert, multi-file atomic workflow, huge datasets | NOT IMPLEMENTED | P2, outside MVP |
| Excel template generation, XLS/XLSM, formula execution | NOT IMPLEMENTED | optional/not supported formats |

Final local checks before publication: **90 tests passed, 0 failed, 0 skipped**; `npm run typecheck` PASS; `npm run lint` PASS; `npm run build` PASS with static HTML output for `/` and `/operations/action-planning/`. The final browser build also showed SKU sales 200, profit 80, margin 40%, and OOS 100% in the same Inspector. The publication commit is recorded in the chat completion report.

## Files and verification commands

New: `src/lib/import/*` (models, schema, parsers, validation, templates/scenarios, providers, IndexedDB), `src/stores/data-source.ts`, `src/components/data/*`, `src/app/data-management.css`, `tests/data-import.test.ts`, `tests/import-persistence.test.ts`, and `tests/fixtures/import-*`.

Modified: Workspace/HomeWorkspace/navigation, source unions, spatial state/Timeline/Peak/Legend/Inspector, analytics selectors and source labels, Product Explorer, Inventory Planner and layout stylesheet imports.

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Preview the exact static output with `npm run start -- --listen 3005`.

## How to try it

1. Open Data Management → Download Templates. Download Product and Inventory templates plus their dictionaries. Keep the sample G002 values for the first trial.
2. Import Product CSV/XLSX, check Column Mapping, validate, review Data Preview, tick the confirmation and Confirm Import.
3. Repeat for Inventory, then Sales/Traffic/Customer Experience if available. Each import replaces only that type; it does not merge rows.
4. Explore → อาหารแห้ง → ข้าวสาร → ข้าวทดสอบ 5 กก. Verify its stock and calculator. Use OOS Risk / Customer Density and select an imported date/hour.
5. Dataset Manager offers the scenarios, switching back to saved imported data, Reset Demo and confirmed Clear Imported Data. Refresh to verify local persistence.

The feature branch is `feature/data-import-integration`. Publish only after verification, then fast-forward the existing Cloudflare production branch `feature/phase5-product-inventory` so its Git integration redeploys the tested commit. Never force-push.
