# รายงาน Smart Inventory UX และเมนู Analytics ภาษาไทย

วันที่ตรวจ: 25 ตุลาคม 2569 · RetailVerse 3D · ขอบเขต: Smart Inventory และป้ายเมนู Analytics 7 หน้า

## 1. ปัญหา Smart Inventory เดิม

หน้าเดิมมีคำแนะนำจาก Forecast ที่คิด Lead Time + Review Days แต่มีเครื่องคำนวณ Lead Time อย่างเดียวซ้ำอยู่ด้านล่าง จึงได้คำตอบต่างกันได้ ยอดบนชั้นรวมทุก Fixture และตาราง 12 คอลัมน์ทำให้ตัดสินใจยาก

## 2. ไฟล์ที่แก้ไข

- `src/components/analytics/SmartInventory.tsx` หน้าใหม่บนระบบเดิม
- `src/components/analytics/AnalyticsWorkspace.tsx` ป้ายภาษาไทย การเรียกหน้า และส่งสมมติฐานเดียวกันให้ Profit
- `src/lib/analytics/intelligence.ts` เครื่องคำนวณหลักและความจุราย Fixture
- `src/lib/analytics/catalog.ts` อ่านยอดสต็อกโดยไม่เรียกเครื่องคำนวณเดิมซ้ำ
- `src/lib/analytics/inventory-actions.ts` สร้างงานและตรวจงานซ้ำ
- `src/stores/intelligence.ts`, `src/types/inventory-planning.ts`, `src/types/intelligence.ts` สมมติฐานและข้อมูลงาน
- `src/lib/import/provider.ts`, `src/lib/analytics/operations.ts`, `src/types/catalog.ts` รักษาวันอ้างอิง ETA เมื่อมีรายงานพนักงาน
- `src/components/analytics/StaffHub.tsx` แสดงว่างานมาจากสินค้าคงคลังได้ และแยก PurchaseReview ออกจากรายงานนับสินค้า
- `src/app/intelligence.css` รูปแบบเฉพาะหน้าและเมนูมือถือ
- `tests/smart-inventory.test.ts` เพิ่ม 14 ข้อ

ไม่ได้แก้ตำแหน่งชั้น Geometry หรือโครงสร้าง 3D Store และไม่ได้สร้าง Provider ใหม่

## 3. วิธีแก้เครื่องคำนวณซ้ำ

นำ InventoryPlanner ตัวเก่าออกจาก Smart Inventory การ์ด ตาราง เหตุผล และ Calculation Details อ่านผลจาก `inventoryRecommendation` ชุดเดียวกันต่อ SKU ส่วน Profit อ่านสมมติฐานวางแผนเดียวกันด้วย

เครื่องจำลอง Basic Planning ใน Inspector/หน้าสำรวจเดิมยังอยู่ตามขอบเขตเดิม มีป้ายสมมติฐานของตัวเอง ไม่ใช่ผล Smart Inventory และไม่ใช่สูตร Lead + Review ของหน้านี้

## 4. สูตรการวางแผนที่ใช้

- พร้อมขาย = บนชั้นรวมทุกตำแหน่ง + คลังระดับ SKU/สถานที่ − ของจอง
- ช่วงคุ้มครอง = Lead Time + Review Days
- Demand ช่วงคุ้มครอง = ผลรวม Forecast รายวันจริงในช่วงนั้น วันที่ขาด/เกิน Horizon ใช้ค่าเฉลี่ยและแจ้งจำนวนวันที่ประมาณ
- แนะนำสั่ง = ceil(max(0, Demand ช่วงคุ้มครอง + Safety Stock − พร้อมขาย − Incoming ที่ ETA ทัน))
- เป้าหมายเติมใช้ Demand วันแรก แบ่งตามสัดส่วนความจุชั้น ปัดจำนวนแบบจัดสรรเศษให้ผลรวมตรง แล้วจัดสรรคลังที่ไม่จองให้ชั้นที่มีสินค้าน้อยก่อน ใช้คลังส่วนเดียวกันได้ครั้งเดียว
- เติมรายชั้น ≤ ช่องว่างชั้น, ความต้องการเติม และคลังไม่จองที่ยังไม่จัดสรร
- Days of Supply = พร้อมขาย / Demand เฉลี่ย; Demand = 0 แสดง N/A
- Closing เป็นประมาณการรวมช่วงที่สมมติคำแนะนำสั่งมาทันตาม Lead Time ไม่ใช่ยอดปิดที่ยืนยัน และไม่รับประกันว่าจะไม่ขาดระหว่างวัน

ไม่มีความจุจริงจะไม่เดาความจุจากยอดบนชั้น; ไม่มี Forecast/Stock ที่ใช้เป็นยอดเปิดจะไม่สร้างคำแนะนำเทียม Snapshot หลังวันเริ่ม Forecast ไม่ถูกใช้ย้อนหลัง

## 5. การแก้ Info Icon

ใช้ Label ร่วมกับปุ่มข้อมูลใน wrapper เดียว กำหนด inline-flex, gap 6px, nowrap และปุ่ม 20×20px ไม่หด เปิด Dialog ด้วยเมาส์/Enter ได้ และปิดด้วย Escape ได้ ใช้ KPIInfoPopover เดิมที่แสดงเหนือแถบเวลา

ตรวจ DOM และภาพจริง Desktop 1280×900 / Mobile 390×844: ปุ่มกว้าง 20px, gap 6px, nowrap; Dialog มือถือกว้าง 350.4px สูง 496.2px อยู่ภายในจอ

## 6. UX ใหม่และชื่อภาษาไทยทั้ง 7 Tabs

1. ภาพรวมผลการดำเนินงาน
2. คาดการณ์ความต้องการสินค้า
3. วางแผนสินค้าคงคลัง
4. วิเคราะห์ต้นทุนและกำไร
5. วิเคราะห์ช่วงเวลาเร่งด่วนและกำลังคน
6. ประสบการณ์และปัญหาลูกค้า
7. สรุปและประเมินผลการดำเนินงาน

คง Internal IDs/Routes เดิม ตรวจคลิกครบทั้ง 7 บน Desktop/Mobile แล้ว หน้าอื่นยังเป็นหน้าเดิม เมนูมือถือเลื่อนแนวนอนได้

Smart Inventory มีตัวเลือกสินค้า/Fixture ช่วง Forecast แบบอ่านอย่างเดียว การ์ด 4 ตัว คำแนะนำที่แสดงเติมและสั่งพร้อมกันได้ ตาราง 8 คอลัมน์พร้อมตัวกรองและเลือกแถว ส่วนขั้นสูง/สูตรปิดไว้เริ่มต้น ปุ่มคืนค่าทำเฉพาะสมมติฐานของ SKU ที่เลือกและบันทึกใน Workflow เดิม

## 7. Forecast / Inventory Integration

ใช้ Active Dataset, shared SKU selection และ Active Forecast จากตัวเลือกปัจจุบัน แจ้งชัดว่าไม่ได้แอบนำ Snapshot เก่ามาแทน Manual fallback/สมมติฐานรายวันมีป้าย SCENARIO

ทดสอบนำเข้า CSV จริงผ่าน Data Management บน localhost: SKU MOCK-SKU-001 อยู่ fixture-a-01 จำนวน 0 และ fixture-a-02 จำนวน 7; คลังเดียว 100 และจอง 10 ซ้ำในสองแถว ผ่าน Validation 2/2 ไม่มี Error/Warning สลับ Fixture แล้วการ์ดบนชั้นเปลี่ยน 0 → 7 แต่คลังคง 100 พร้อมขายรวม = 0 + 7 + 100 − 10 = 97 เติมชั้นแรก 4 ชั้นสอง 0 ไม่ใช้คลังซ้ำ

ไฟล์ Product ทดสอบรอบแรกใช้ Category ID ไม่ตรง จึงถูก Validation ปฏิเสธโดยไม่เปิดใช้ข้อมูล จากนั้นทดสอบ Inventory กับ Product Master เดิมที่ถูกต้อง

## 8. Operations / 3D Integration

ตรวจปุ่มดูตำแหน่งในร้านแล้ว Inspector เลือก SKU MOCK-SKU-001 / fixture-a-01 จริง สร้าง Replenishment 2 ถุง และ PurchaseReview 147 ถุงใน Scenario Safety Stock 200 ผ่านหน้าจอ พบงานทั้ง Action Planning และ My Tasks หลังเปลี่ยนหน้า/โหลดหน้าใหม่ งานซ้ำคำแนะนำเดิมถูกปฏิเสธ

งานเก็บ SKU ชื่อสินค้า Zone Fixture ปริมาณ หน่วย ประเภท เหตุผล Priority และ Stock/Forecast Reference ผ่าน Workflow/IndexedDB เดิม PurchaseReview ระบุชัดว่าไม่ใช่ Purchase Order และไม่มีการสั่งซื้อจริง

## 9. Test Results

PASS: TypeScript, ESLint และ Unit Tests 176/176; fail 0, skip 0 รวม 14 ข้อใหม่: ชั้นว่าง/คลังมี, คลังหมด, lead+review, horizon สั้น/วันที่ขาด, ETA ช้า/override, reserved, multi-fixture, capacity หาย, demand ศูนย์/no data, reset, invalid numeric, task metadata/dedup/persist และ Imported Provider

UI PASS: เปลี่ยน SKU, กรองรายการ, เลือกแถว sync, เปิด/ปิด Advanced, คืนค่า, อธิบายด้วยเมาส์/คีย์บอร์ด, เปิดครบ 7 เมนู Desktop/Mobile, Focus3D, สร้างงาน/งานซ้ำ/พบใน Operations และนำเข้า Stock จริงพร้อมสลับสอง Fixture

รุ่นสุดท้ายผ่าน TypeScript/ESLint/176 Tests (0 skip) และ Production Build อีกครั้งหลังแก้ปุ่มคืนค่า ตรวจ UI หลังเปลี่ยน Safety Stock เป็น 200 แล้วคืนค่าเป็น 8; โหลดหน้าใหม่ยังเป็น 8 และ Imported Fixture ทั้งสอง/คลัง 100 ยังอยู่ครบ Console ของแท็บทดสอบไม่มี Error ที่ถูกบันทึก

เปิด Advanced และ Calculation Details บนมือถือแล้วตรวจ Label 22 จุด: ปุ่มกว้าง 20px และจุดกึ่งกลางตรงหัวข้อทุกจุด (ความต่าง 0px) ความกว้างเอกสาร/จอเท่ากัน 390px ตารางอยู่ในพื้นที่เลื่อนของตัวเอง

## 10. Production Build

Production Build แบบ static export ผ่าน `/`, `/_not-found`, `/operations/action-planning` มี build รอบหนึ่งเจอ EPERM ขณะเขียนไฟล์ หลังหยุด Preview และรันใหม่ผ่าน ไม่ได้ข้าม Test หรือปิด TypeScript/ESLint เพื่อให้ผ่าน

## 11. Git Branch / Commit / Push

Branch: `fix/smart-inventory-thai-ux` · Cloudflare production branch: `feature/phase5-product-inventory`

Application commit: `09b3cebbb545c45872fb48070fabbc82f39fc174` ส่งขึ้นทั้งสองสาขาแล้วโดยไม่ force push

Cloudflare Pages check ของ Application commit: **completed / success** ([Deployment](https://dash.cloudflare.com/?to=/865862ff8df66a060eedaf05759a2dcf/pages/view/rsip/df9fb6ab-4ee8-4b33-b6f8-572e58e8bc17))

ตรวจ [Production](https://rsip.pages.dev/?view=analytics) หลัง Reload: เมนูทั้ง 7 เป็นภาษาไทย หน้าใหม่แสดง MOCK-SKU-001 บนชั้น 0 ถุง / คลัง 49 ถุง / เติม 2 ถุง / สั่ง 0 ถุง ภาพหลักฐานอยู่ที่ `smart-inventory-production.png` ในพื้นที่ภาพของงานนี้ รายงานนี้บันทึกตามหลัง Application commit และส่งขึ้นสาขางาน; production ยังคง Application commit ที่ตรวจสำเร็จแล้ว

## 12. Known Limitations

- ปริมาณเป็นคำแนะนำ ไม่รวม MOQ/Case Pack/ข้อจำกัดงบซื้อหรือความไม่แน่นอน Supplier
- นโยบายเติมแบ่ง Demand ตามความจุ ยังไม่มีประวัติยอดขายแยกราย Fixture
- ไม่มี Forecast ของ SKU หรือข้อมูลต้นทางไม่ครบจะแสดงไม่มีข้อมูล ต้องนำเข้าหรือปรับตัวเลือก Forecast
- สต็อกล่าสุดที่ห่างจากวันเริ่มแผนสมมติยอดเปิดคงเดิมพร้อมคำเตือน ไม่ได้จำลองความเคลื่อนไหวที่ไม่มีหลักฐาน
- Workflow/ไฟล์นำเข้ายังเก็บเฉพาะ Browser ตามระบบเดิม ไม่ใช่ระบบงานร่วมกันหลายผู้ใช้
- การทดสอบหลักเป็นข้อมูลสังเคราะห์ ไม่ใช่ข้อมูลธุรกิจจริง
- แท็บ Production ที่เปิดค้างจากงานก่อนแสดง WebGL fallback อยู่เดิม จึงยืนยัน Focus/Inspector กับ Preview ในเครื่องที่แสดง 3D ได้ ไม่อ้างว่าได้ตรวจ rendering 3D ทุกอุปกรณ์บน Production

### Acceptance Criteria

| ข้อ | ผล | หลักฐาน |
|---|---|---|
| 1 เมนูไทย 7 หน้า | PASS | คลิกครบ Desktop/Mobile |
| 2 หัวข้อ Smart Inventory ไทย | PASS | หน้าจอจริง |
| 3 SKU sync | PASS | เลือกสินค้า/แถว |
| 4 หลาย Fixture | PASS | Import 2 ตำแหน่ง สลับ 0→7 |
| 5 KPI 4 ตัว | PASS | การ์ดพร้อมหน่วย |
| 6 คำแนะนำตามข้อมูล | PASS | Demo + Imported + Scenario |
| 7 เครื่องคำนวณหลักเดียว | PASS | การ์ด/ตาราง/สูตรเรียก engine เดียว |
| 8 Suggested Order ตรงกัน | PASS | ตาราง/การ์ด/แทนสูตรตรงกัน |
| 9 Info Icon | PASS | DOM + ภาพ + เมาส์/Enter/Escape |
| 10 ตารางอ่านง่าย | PASS | 8 คอลัมน์ เลื่อนภายใน |
| 11 Advanced ยุบได้ | PASS | คลิกเปิด/ปิด |
| 12 สูตรรายละเอียด | PASS | ตรวจผลแทนค่า 97 และคำสั่ง 0 |
| 13 Reset ไม่ล้าง Dataset | PASS | Unit + UI; โหลดใหม่ยังเป็น 8 และ Imported สอง Fixture ยังอยู่ |
| 14 Focus3D | PASS | Inspector ตรง SKU/Fixture |
| 15 สร้างงาน Operations | PASS | Action Planning / My Tasks |
| 16 Import เปลี่ยนตาม | PASS | CSV ผ่าน UI เปลี่ยนคลัง 49→100 |
| 17 ไม่ Stock ซ้ำ | PASS | คลัง 100 ไม่เป็น 200; จอง 10 ครั้งเดียว |
| 18 ไม่มี NaN/Infinity | PASS | Invalid numeric tests + No Data/Zero Demand |
| 19 Responsive | PASS | Desktop/Mobile + Dialog ภายในจอ |
| 20 Tests/Build | PASS | 176 ผ่าน ไม่มี skip; static build ผ่าน |
