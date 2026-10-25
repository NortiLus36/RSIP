# รายงานซ่อน Operations จาก Top Navigation

วันที่ 25 ตุลาคม 2569 · RetailVerse 3D

## 1. ไฟล์ที่แก้ไข

- `src/config/navigation.ts` เพิ่มค่าเปิด/ปิดการแสดงเมนู
- `src/components/layout/Workspace.tsx` แสดงลิงก์ Operations ตาม Config
- `src/app/enhancement.css` ให้ปุ่มสุดท้ายยังแสดงบนมือถือ ไม่ซ่อน Data Management ตามตำแหน่ง
- `src/components/analytics/SmartInventory.tsx` เพิ่มข้อความว่างาน Operations เป็นฟีเจอร์เพิ่มเติม พร้อมลิงก์เดิม โดยไม่แก้สูตรหรือ Workflow

ไม่ได้แก้/ลบ Operations Components, Route, Stores, Types, Hooks, Utilities, Data Models, Persistence, Forecast, Inventory หรือ Profit Calculations และไม่ได้แตะ Floor Plan/Camera/Zone/Fixture

## 2. วิธีซ่อน Operations จาก Navbar

ใช้ Conditional Rendering รอบ Link เดิมใน Main navigation เหลือ Explore | Peak Time | Analytics | Data Management ตามลำดับ ไม่มีลิงก์หรือ Active Indicator ของ Operations ค้างอยู่ใน Navbar รวมถึงเมื่อเปิดหน้า Operations โดยตรง

พบ CSS เดิมซ่อน `button:last-child` บนมือถือ เมื่อซ่อน Link Operations ปุ่ม Data Management จะกลายเป็นตัวสุดท้าย จึงกำหนดให้แสดงปุ่มนั้นโดยตรงใน stylesheet ลำดับหลัง การมองเห็นเมนูใช้ Config ไม่ขึ้นกับตำแหน่งปุ่ม รักษา Logo, Store, Data Source, สีและโครง Navbar เดิม

## 3. Feature Flag / Config ที่ใช้

`src/config/navigation.ts`: `showOperationsInNavigation = false`

ค่าเดียวนี้ควบคุมการแสดงเมนู และข้อความแนะนำฟีเจอร์เพิ่มเติมใน Smart Inventory การสร้างงานเดิมยังอยู่ ไม่ปิด Integration

## 4. วิธีเปิด Operations กลับมาในอนาคต

เปลี่ยน `showOperationsInNavigation` เป็น `true` ในไฟล์ Config แล้ว Build/Deploy ใหม่ เมนูเดิมและ Active Indicator จะกลับมาโดยไม่ต้องกู้ Component หรือข้อมูล

## 5. ผลการตรวจ Analytics 4 Tabs

PASS ผ่าน UI: ภาพรวมผลการดำเนินงาน, คาดการณ์ความต้องการสินค้า, วางแผนสินค้าคงคลัง, วิเคราะห์ต้นทุนและกำไร ยังมี 4 รายการตามเดิม Config หน้า 5–7 และ Components เดิมไม่ได้แก้ไข

เปิด Forecast และ Smart Inventory ผ่าน UI ได้ การ์ดแสดงตาม Active Dataset/สมมติฐานเดิม ไม่มีการ Reset ข้อมูลเพื่อทำให้ผลผ่าน

Navbar Desktop 1280×900 และ Mobile 390×844 แสดง 4 เมนูจริง ทุกปุ่มมีขนาดมากกว่า 0; มือถือ document scrollWidth = viewport width = 390px เปิด Explore, Peak Time Analytics, Analytics และ Data Management ได้ ลิงก์โลโก้กลับ Explore ได้

## 6. ผลการทดสอบ Direct URL

PASS: คลิกลิงก์ `/operations/action-planning/` จาก Smart Inventory แล้วเปิด Staff Hub เดิมได้ ไม่มี Redirect ครบ Action Planning, My Tasks, Quick Report, Digital Learning, Feedback & Pain Points

My Tasks ยังมีงานเดิมที่บันทึกไว้ 2 งานจาก IndexedDB สลับ Store Manager → Store Staff แล้วกรองเหลืองานของพนักงาน จากนั้นคืน Store Manager ตามเดิม Navbar บนหน้า Operations มีเพียง 4 เมนูทั้งมือถือและ Desktop

ไม่พบลิงก์เสียในเส้นทางที่ตรวจ และ Console ของแท็บทดสอบไม่มี Error ที่บันทึกไว้

## 7. ผล TypeScript / Tests / Build

- TypeScript: PASS
- ESLint: PASS
- Tests: PASS 191/191, failed 0, skipped 0
- Production Build: PASS รวมหน้า `/operations/action-planning` ที่ยัง Export ตามเดิม
- หลังแก้ CSS มือถือ Build ใหม่ผ่านอีกครั้ง และตรวจ UI จาก Build สุดท้ายแล้ว

## 8. Git Commit และ Push Status

Branch: `fix/hide-operations-navigation`

Application commit: `a3af8905a0a11394672eb75af3925e61432d6f74`

ส่งขึ้นสาขางานและ `feature/phase5-product-inventory` แล้วแบบ fast-forward ไม่มี force push

Cloudflare Pages: **completed / success** ([Deployment](https://dash.cloudflare.com/?to=/865862ff8df66a060eedaf05759a2dcf/pages/view/rsip/245768a9-0cc9-4443-982b-afd18bd36ed8))

ตรวจ [เว็บไซต์จริง](https://rsip.pages.dev/) หลัง Reload: Main navigation มีเพียง Explore, Peak Time, Analytics, Data Management และไม่มี Link Operations ใน DOM ทั้ง Desktop/Mobile; Analytics ยังมี 4 Tabs มือถือไม่มี overflow เปิด [Operations ผ่าน URL ตรง](https://rsip.pages.dev/operations/action-planning/) ได้พร้อมเมนูระบบงานเดิม และ Console หน้าเว็บรุ่นใหม่ไม่มี Error ที่ถูกบันทึก

บันทึกภาพ `four-navigation-production.png` และ `four-navigation-production-mobile.png` ในพื้นที่ภาพของงาน รายงานนี้ส่งขึ้นสาขางานตามหลัง Application commit โดย production คงรุ่นแอปที่ตรวจสำเร็จแล้ว

## 9. Known Limitations

- ซ่อนเฉพาะเมนู ไม่ได้ปิด Route หรือเพิ่มระบบสิทธิ์ตามขอบเขตที่ขอ
- ตรวจลิงก์และหน้าจอในเส้นทางที่ระบุ ไม่ได้ Crawl ทุก URL ของเว็บไซต์
- ไม่ได้นำเข้า CSV/Excel ใหม่ผ่าน UI ซ้ำในรอบนี้ ระบบ Import ไม่ถูกแก้ และชุดทดสอบเดิมผ่านครบ
- การตรวจ Responsive ใช้ขนาด 1280×900 และ 390×844 ไม่ได้อ้างว่าทดสอบทุกอุปกรณ์
