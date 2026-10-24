# Analytics audit — baseline
Code inspection 24 October 2026. Browser verification pending.

| Page | Initial status | Evidence / repair |
|---|---|---|
| Overview | PARTIAL | Shared date engine exists; reset/context labels absent. |
| Forecast | PARTIAL | Forecast-only bars; no history/category/baseline summary. |
| Inventory | BUG | Incoming days measured from snapshot, compared to forecast horizon without date offset. |
| Profit | PARTIAL | Investment separate; no price/cost/quantity scenario input or margin comparison. |
| Workforce | PARTIAL | Three dates rather than full weeks; no weekly zone peak details. |
| Customer | BUG | No filters/case updates; feedback lacks dataset scope. |
| Review | PARTIAL | Frozen snapshots exist; duplicate legacy actual logic; no variance percent/export. |

Existing provider, persistence, imports and geometry retained. Final report records verified results and remaining limits.
