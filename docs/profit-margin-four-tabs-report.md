# รายงานปรับหน้า “วิเคราะห์ต้นทุนและกำไร” และซ่อน Analytics หน้า 5–7

วันที่ 25 ตุลาคม 2569 · RetailVerse 3D

## 1. รายการไฟล์ที่แก้ไข

- `src/components/analytics/ProfitMargin.tsx` หน้ากำไรภาษาไทย แทนฟังก์ชัน Profit เดิม
- `src/components/analytics/AnalyticsWorkspace.tsx` เรียกหน้าใหม่ ใช้รายการเมนูที่เปิดให้เห็น และจัดการลิงก์แท็บ
- `src/config/analytics-modules.ts` เก็บ Internal ID เดิมครบ 7 และกำหนด visible 4 หน้า
- `src/lib/analytics/intelligence.ts` ปรับ profitScenario เดิมให้ใช้ได้เมื่อไม่มีสต็อก และแยกจำนวนขายตามสมมติฐานจากจำนวนที่สต็อกรองรับ
- `src/lib/analytics/profit-context.ts` เลือกสินค้า/คาดการณ์ ตรวจสต็อกแยก และรวมค่าแรง/สินค้าเสียหายเฉพาะช่วงและสินค้า
- `src/app/intelligence.css` รูปแบบเฉพาะหน้ากำไร
- `tests/profit-margin.test.ts` การทดสอบใหม่ 15 ข้อ

ไม่แก้ Zone A–N, Geometry, Fixture Coordinates, Provider, ไฟล์หน้า Peak Time ด้านบน หรือระบบ Operations

## 2. ปัญหาที่พบและ Root Cause

โค้ดเดิมกำหนดจำนวนขายจาก `inventoryRecommendation(...).demand` และเรียก profitScenario เฉพาะเมื่อมีผล Inventory Recommendation จึงไม่มีสต็อกแล้วไม่คำนวณกำไร แม้มีราคา ต้นทุน และจำนวนขายครบ ข้อผิดพลาดสต็อกถูกนำมาใส่ตัวแปร error เดียวกับกำไร

ค่า Review Days และสมมติฐานจาก Smart Inventory ถูกนำมาตรวจในเส้นทางเดียวกันกับกำไร หากไม่ผ่าน validation จะขัดขวางเครื่องคำนวณพื้นฐานด้วย ไม่สามารถยืนยันค่าที่ Browser ผู้ใช้มี ณ เวลาที่พบ Error ได้ จึงทดสอบจำลองทั้ง NaN, ติดลบ และเกิน 7 โดยตรง

Baseline เดิมอ้างราคา/ต้นทุนที่แก้แล้ว ทำให้การเปรียบเทียบไม่ใช่ฐานข้อมูลสินค้าเดิม ส่วนลด ค่าแรง และตัวแปรขั้นสูงบางส่วนใช้ state ร่วมข้าม SKU ขณะที่ override ราคาแยกราย SKU

## 3. การแก้ Review Days Error

กำไรพื้นฐานอ่านราคา/ต้นทุนจาก Product Master และจำนวนจาก Forecast ของ SKU โดยตรง ไม่รอ Inventory Recommendation ตรวจ Inventory แยกด้วย `profitStock` และแจ้งเหตุผลในส่วนสต็อก หาก Review Days ผิดยังคำนวณกำไรได้ ไม่แก้เป็น 0 หรือ clamp ค่าเงียบ ๆ

การทดสอบ UI: ล้างช่องรอบสั่งซื้อใน Smart Inventory แล้วไปหน้ากำไร ยังแสดงยอดขาย ฿13,690.00 กำไร ฿3,011.80 Margin 22% พร้อมคำเตือนสต็อก ไม่ขึ้นหน้าว่าง

Validation ของค่าขั้นสูง เช่น จำนวนสั่งไม่ใช่ตัวเลข ก็ไม่บล็อก KPI พื้นฐานเช่นกัน โดยใช้ profitScenario เดิมแยกประเมินข้อมูลพื้นฐาน/ขั้นสูง ไม่เพิ่มเครื่องคำนวณซ้อนหน้าเดิม

## 4. UI/UX ใหม่ของ Profit & Margin

ชื่อหน้าและข้อความหลักเป็นภาษาไทย แบ่งเป็น เลือกสินค้าและต้นทาง → ทดลองปรับตัวแปร → สรุปผลการเงิน → ส่วนขั้นสูงและสูตรที่ยุบไว้

ช่องหลัก 4 ช่อง: จำนวนขาย ราคาขาย ส่วนลด และต้นทุน การ์ด 4 ตัว: ยอดขาย กำไรขั้นต้น อัตรากำไร และกำไรต่อหน่วย มีตารางเปรียบเทียบ 3 รายการพร้อมส่วนต่าง +/− และ Bar Chart เพียง 1 กราฟ

สมมติฐานแยกตาม SKU/แหล่งคาดการณ์/Reference เมื่อเปลี่ยนสินค้าไม่เอา Forecast ของสินค้าเก่ามาใช้ ปุ่มคืนค่าทำเฉพาะค่าทดลองของ SKU/แหล่งที่เลือก ไม่ Reset Dataset หรือไฟล์นำเข้า

## 5. สูตรการเงินที่ใช้จริง

- ราคาหลังส่วนลด = ราคา × (1 − ส่วนลด/100)
- จำนวนที่ต้องการขาย = จำนวนตั้งต้น × (1 + ยอดเพิ่ม/100) ส่วนลดไม่เดาว่าจำนวนขายเพิ่มเอง
- ยอดขาย = จำนวนที่ต้องการขาย × ราคาหลังส่วนลด
- ต้นทุนสินค้าที่ขาย = จำนวนที่ต้องการขาย × ต้นทุนต่อหน่วย
- กำไรขั้นต้น = ยอดขาย − ต้นทุนสินค้าที่ขาย
- Margin = กำไรขั้นต้น / ยอดขาย × 100; ยอดขาย 0 แสดง N/A
- กำไรต่อหน่วย = ราคาหลังส่วนลด − ต้นทุนต่อหน่วย
- กำไรหลังค่าใช้จ่าย = กำไรขั้นต้น − จำนวนเสียหาย×ต้นทุน − ค่าแรงเพิ่ม − ค่าโปรโมชั่น − ค่าใช้จ่ายอื่น
- เงินลงทุน = จำนวนสั่ง×ต้นทุน แสดงแยก ไม่หักซ้ำจากกำไร
- จำนวนขายตามสต็อก = min(Demand, max(0, สต็อกพร้อมขาย + Incoming ทันช่วง + สั่งเพิ่มที่มาทัน − เสียหาย))
- คงเหลือคาดการณ์ = สินค้ารวมที่มาทัน − จำนวนที่ขายได้ตามสต็อก − เสียหายที่สต็อกรองรับ ไม่ต่ำกว่า 0; แสดงส่วนขาดแยก
- จำนวนขายเพื่อรักษากำไรเดิม = max(0, (กำไรเดิม + ค่าใช้จ่ายเพิ่ม + ต้นทุนเสียหาย) / กำไรต่อหน่วยใหม่); ถ้ากำไรต่อหน่วยไม่บวกแสดง N/A เป็นจุดคุ้มทุนโปรโมชั่นเทียบฐานเดิมเชิงทฤษฎี ไม่ยืนยันว่าจะขายได้จริง

ตัวอย่างที่ทดสอบ: 68 บาท ทุน 53.72 ลด 2% → ราคาสุทธิ 66.64 กำไรต่อหน่วย 12.92 Margin 19.39% จำนวนขาย 100 → ยอดขาย 6,664 กำไร 1,292 เพิ่มค่าแรง 100 → Contribution 1,192 กำไรขั้นต้นยัง 1,292

## 6. การเชื่อม Forecast และ Inventory

ใช้ Active Forecast หรือ Snapshot ที่เลือกซึ่งต้องอยู่ใน Store/Dataset เดียวกัน ตรวจ SKU และช่วงวันครบ Horizon; ไม่มีหรือขาดวันแสดงไม่มีข้อมูล สามารถเปิด “กำหนดจำนวนขายเอง” ได้ ข้อมูลอ้างอิงเต็มอยู่ในส่วนรายละเอียด ส่วนหลักแสดงวันที่/หมายเลขอ้างอิงสั้น

Inventory ใช้เครื่องคำนวณ Smart Inventory เดิมกับ SKU/ช่วงที่เลือกและสมมติฐานปัจจุบัน ค่าแรงรวมเฉพาะงานกำลังคนที่มี SKU, Reference และวันตรงกัน ไม่ปันค่าแรงทั้งโซนให้ทุกสินค้า สินค้าเสียหายใช้เฉพาะ SKU/วันตรงกันและระบุเป็นสมมติฐาน ไม่ใช้ยอดเสียหายจริงของอีกช่วงมาแทนอนาคต

การ์ดกำไรเป็น SCENARIO สมมติขายได้ครบตามความต้องการ ส่วนสต็อกตรวจแยกพร้อมเตือนเมื่อรองรับได้ไม่ครบ ไม่มี Inventory จะยังคำนวณกำไร แต่ Investment/Closing/Sellable ไม่แสดงเป็นตัวเลขยืนยัน

ทดสอบ Imported Data ที่มีสต็อกเฉพาะข้าว แล้วเลือกไข่ซึ่งไม่มี Inventory: ราคา/ต้นทุนเปลี่ยนเป็น 68/53.72 และยังคำนวณ Margin ได้ ส่วนสต็อกแจ้งยังไม่ได้ตรวจสอบ ทดสอบ Forecast ไม่ถูกต้องจนไม่มีผล แล้วเปิด Manual Quantity 10 ถุง ยังได้ยอดขาย 1,850 กำไร 407

ทดสอบสร้าง Snapshot บน Demo และเลือกในหน้ากำไร: ไข่ 86 แพ็ก ใช้ราคา/ทุนเดิม ลด 2% ยอดขายก่อน 5,848 → หลัง 5,731.04 กำไรก่อน 1,228.08 → หลัง 1,111.12 ส่วนต่าง −116.96 และ Margin ลด 1.61 จุดเปอร์เซ็นต์

## 7. การแก้ Info Icon

Label และปุ่มอยู่ใน wrapper เดียว ใช้ inline-flex, align-items:center, gap 6px, nowrap และปุ่ม 20×20 ไม่หด Reuse KPIInfoPopover เดิม พร้อมสูตรภาษาไทย เปิดด้วย Mouse/Enter ปิดด้วย Escape ได้

ตรวจหน้าจอ Desktop 1280×900 และ Mobile 390×844: 21 Label ที่เปิดแสดงมีปุ่มกว้าง 20px จุดกึ่งกลางตรงกับหัวข้อทุกจุด (ต่าง 0px) เอกสารกว้าง 390px ไม่ล้นแนวนอน Dialog อยู่ในจอที่ x20/y173.9 กว้าง 350.4 สูง 496.2px และอยู่เหนือ Time Explorer

## 8. วิธีซ่อนหน้า 5–7

ใช้ `analyticsModules` เก็บ ID/Label ครบ 7 รายการ แต่ `visibleAnalyticsModules` แสดงเพียง 4 รายการ ผ่าน `visible: false` สำหรับหน้า 5–7 เก็บ WorkforcePanel, CustomerPanel และ Review รวมถึงเงื่อนไขเรียกและ Integration เดิมทั้งหมด

`resolveAnalyticsTab` คืนหน้าภาพรวมสำหรับ ID ที่ซ่อน/ไม่รู้จัก รองรับ query `analyticsTab` และ alias `tab` แล้ว normalize URL ที่ซ่อนกลับหน้าภาพรวม ไม่ Render Component ของแท็บที่ซ่อน เดิมไม่มี Analytics tab ที่ persist ใน Workflow จึงไม่ได้ลบ/แปลง Forecast Snapshot หรือข้อมูลเก่า

ทดสอบลิงก์ตรงทั้ง Peak Time & Workforce, Customer Experience และ Performance Review กลับหน้าภาพรวมจริงครบทั้งสาม เมนู Top Navigation ยังมี 5 รายการ และ Peak Time ด้านบนยังอยู่

## 9. ผล Regression Test

รุ่นสุดท้ายผ่าน **191/191 Tests** (176 เดิม + 15 ใหม่), fail 0, skipped 0, cancelled 0 รวมกรณี Waste ตาม SKU/วันเพิ่มแล้ว TypeScript และ ESLint ผ่าน

UI ตรวจแล้ว: เปลี่ยน SKU/ราคา/ส่วนลด/จำนวน/ค่าแรง, Reset, ไม่มี Inventory, ไม่มี Forecast+Manual, ค่าสต็อกผิดไม่บล็อกกำไร, ค่าขั้นสูงผิดไม่บล็อกกำไร, Snapshot, เปรียบเทียบฐาน, Mouse/Keyboard, Desktop/Mobile, Hidden Links ทั้งสาม

Regression หน้าจอ: Peak Time Analytics เปิดจากเมนูบนได้ Data Management → Dataset Manager ยังมี Imported Inventory 2 แถวเก็บไว้ครบขณะใช้ Demo และ Operations เปิด Action Planning / My Tasks / Feedback & Pain Points ได้ ไม่ส่งข้อความหรือสร้างงานจริงเพิ่มระหว่างตรวจรอบนี้

ตรวจรุ่นสุดท้ายเพิ่ม: ลิงก์ตรงหน้ากำไรเปิดได้ รายได้ 0 แสดง Margin N/A ขาดทุนมีเครื่องหมายลบ Review Days = 8 แสดงคำเตือนภาษาไทยเฉพาะสต็อกแต่กำไรไข่ยังเป็น 1,228.08 / 21% ทดลอง Demand 10,000 เทียบสต็อกที่ขายได้ 127 แพ็กมีคำเตือนชัด และ Closing 0 โดยแสดงส่วนขาด ไม่แอบอ้างว่าขายได้ทั้งหมด คืนค่าทดสอบแล้ว Console แท็บทดสอบไม่มี Error ที่ถูกบันทึก

## 10. Production Build

Static Production Build รุ่นสุดท้าย **PASS** ครบ `/`, `/_not-found`, `/operations/action-planning` หลังปรับ Waste/คำเตือนภาษาไทย ไม่ข้าม TypeScript/Lint/Tests

## 11. Git Commit / Push Status

Branch: `fix/profit-thai-four-tabs` · Production branch: `feature/phase5-product-inventory`

Application commit: `2fc7f215bb114397fb1e61a03a54cc7a4e595506` ส่งขึ้นทั้งสาขางานและ production branch แล้วแบบ fast-forward ไม่ force push

Cloudflare Pages ของ Application commit: **completed / success** ([Deployment](https://dash.cloudflare.com/?to=/865862ff8df66a060eedaf05759a2dcf/pages/view/rsip/b3ef988c-6716-42bb-a227-b780698c6c3b))

ตรวจ [Production หน้ากำไร](https://rsip.pages.dev/?view=analytics&analyticsTab=Profit%20%26%20Margin) หลัง Reload: เมนูมี 4 หน้า เลือกไข่ได้ราคา 68 ทุน 53.72 จำนวน Forecast 86 ลด 2% ได้ยอดขาย 5,731.04 กำไร 1,111.12 Margin 19.39% กำไรต่อหน่วย 12.92 และส่วนต่างจากฐาน −116.96 บาท ตรงกับ Preview/Unit Test ภาพหลักฐาน `profit-margin-production.png` ในพื้นที่ภาพของงานนี้

รายงานนี้บันทึกตามหลัง Application commit และส่งขึ้นสาขางาน โดย production คง Application commit ที่ตรวจสำเร็จแล้ว

## 12. Known Limitations

- กำไรเป็นสมมติฐานว่าขายได้ครบตาม Demand ไม่ใช่ Actual; จำนวนที่สต็อกรองรับแสดงแยก ไม่รับประกันว่า ETA จะไม่ทำให้ขาดระหว่างวัน
- เมื่อไม่มี Forecast ที่ใช้ได้ แม้กรอกจำนวนเองได้ แต่ยังไม่ยืนยันแผนสต็อก/ช่วงรับสินค้า
- ค่าแรงที่มีแค่ Zone โดยไม่มี SKU ไม่ถูกนำมาใช้ทั้งก้อนเพื่อเลี่ยงนับซ้ำ
- ไม่มีเงินลงทุน/Closing ที่ยืนยันเมื่อข้อมูลสต็อกหรือแผนไม่ครบ ไม่มี MOQ/Case Pack/ภาษี/การชำระเงินหรือ PO จริง
- ค่าทดลองหน้า Profit อยู่ใน Session ของหน้า เปลี่ยนแหล่ง/Reference จะใช้ค่าทดลองของแหล่งนั้นใหม่ ปุ่มคืนค่าไม่เปลี่ยนข้อมูลต้นทาง
- ตรวจด้วยข้อมูลสังเคราะห์ Demo/Imported Test; ไม่ใช่ข้อมูลธุรกิจจริง
- ไม่ได้อ้างว่าได้ตรวจ Rendering 3D บนทุกอุปกรณ์ โค้ด Geometry/Coordinates และระบบ 3D ไม่ถูกเปลี่ยน

### ผลตาม Acceptance Criteria

| เกณฑ์ | ผล | หลักฐาน |
|---|---|---|
| Analytics 4 หน้า | PASS | Config + SSR + UI Desktop/Mobile |
| เก็บโค้ดหน้า 5–7 | PASS | ID/Component/Integration เดิมคงอยู่ เพียง visible=false |
| Peak Time ด้านบน | PASS | เปิด Peak Time Analytics ผ่าน UI |
| หน้ากำไรภาษาไทย | PASS | ชื่อหน้า Input KPI สูตร และคำเตือน |
| SKU/ข้อมูลตรงกัน | PASS | ไข่ 68/53.72 กับ Forecast 86 แพ็ก; ข้าว 185/144.30 |
| ช่องหลักเท่าที่จำเป็น | PASS | 4 ช่อง ที่เหลืออยู่ Accordion |
| Summary 4 ตัว | PASS | Revenue/GP/Margin/GP ต่อหน่วย |
| คำนวณทันที | PASS | Input ส่วนลด 2% เปลี่ยนผลทันที |
| Review Days ไม่บล็อกกำไร | PASS | NaN/−1/8 Unit และ Blank/8 UI |
| ไม่มี Inventory คำนวณได้ | PASS | Imported ไข่ไม่มีสต็อกยังได้ Margin 19.39% |
| สต็อกไม่พอมี Warning | PASS | Demand 10,000 / รองรับ 127 / Closing 0 |
| Baseline/Scenario ถูกต้อง | PASS | ฐานสินค้าเดิม และส่วนต่าง −116.96 บาท |
| Info ไม่ตกบรรทัด | PASS | 21 Label จุดกึ่งกลางตรงกัน 0px + Mouse/Enter/Escape |
| Advanced ยุบได้ | PASS | Default ปิดและเปิดทดสอบ |
| Demo/Imported/Scenario แยก | PASS | UI สองแหล่ง, Snapshot, Reset ไม่ลบ Imported |
| ไม่กระทบ 3D/Operations | PASS ในขอบเขตที่ตรวจ | ไม่แตะ Geometry/Coordinates; เปิด Staff Hub/Feedback/My Tasks ได้ |
| Tests/Build | PASS | 191/191 ไม่ skip, TypeScript/Lint และ Static Build ผ่าน |
