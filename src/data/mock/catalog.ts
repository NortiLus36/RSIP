import { floorPlan } from "@/config/floor-plan";
import type { ProductCatalog, Product, CatalogCategory } from "@/types/catalog";

type Seed = [string, string, string, number, string[]];
// Fictional brands; units describe a sellable SKU (fresh produce is sold per kg).
const seeds: Record<string, Seed[]> = {
  A: [
    ["ข้าวสาร", "Rice", "ถุง", 185, ["ข้าวหอมมะลิ 5 กก.", "ข้าวขาว 5 กก."]],
    [
      "บะหมี่กึ่งสำเร็จรูป",
      "Instant noodles",
      "แพ็ก",
      36,
      ["บะหมี่กึ่งสำเร็จรูป รสต้มยำ", "บะหมี่กึ่งสำเร็จรูป รสหมูสับ"],
    ],
    [
      "น้ำมันพืช",
      "Cooking oil",
      "ขวด",
      55,
      ["น้ำมันปาล์ม 1 ลิตร", "น้ำมันถั่วเหลือง 1 ลิตร"],
    ],
    [
      "เครื่องปรุงรส",
      "Seasoning",
      "ขวด",
      29,
      ["น้ำปลา 700 มล.", "ซอสปรุงรส 700 มล."],
    ],
    [
      "อาหารกระป๋อง",
      "Canned food",
      "กระป๋อง",
      25,
      ["ปลากระป๋องซอสมะเขือเทศ 155 กรัม"],
    ],
    ["น้ำตาล / แป้ง", "Sugar and flour", "ถุง", 28, ["น้ำตาลทราย 1 กก."]],
  ],
  B: [
    ["มันฝรั่งทอด", "Potato chips", "ถุง", 22, ["มันฝรั่งทอดรสเกลือ"]],
    ["ขนมอบ", "Biscuits", "กล่อง", 35, ["บิสกิตธัญพืช"]],
    ["ช็อกโกแลต", "Chocolate", "แท่ง", 32, ["ช็อกโกแลตนม"]],
    ["ลูกอม", "Candy", "ถุง", 18, ["ลูกอมผลไม้"]],
  ],
  C: [
    ["ผัก", "Vegetables", "กิโลกรัม", 45, ["คะน้าสด"]],
    ["ผลไม้", "Fruit", "กิโลกรัม", 65, ["ส้มสายน้ำผึ้ง"]],
    ["เนื้อสัตว์", "Meat", "กิโลกรัม", 95, ["เนื้อไก่สด"]],
    ["ไข่", "Eggs", "แพ็ก", 68, ["ไข่ไก่ 10 ฟอง"]],
  ],
  D: [
    ["นม", "Milk", "กล่อง", 22, ["นมสด 250 มล."]],
    ["โยเกิร์ต", "Yogurt", "ถ้วย", 15, ["โยเกิร์ตรสธรรมชาติ"]],
    ["อาหารแช่แข็ง", "Frozen meals", "แพ็ก", 49, ["เกี๊ยวแช่แข็ง 250 กรัม"]],
  ],
  E: [
    ["น้ำดื่ม", "Water", "แพ็ก", 45, ["น้ำดื่ม 600 มล. 6 ขวด"]],
    ["น้ำอัดลม", "Soft drinks", "ขวด", 18, ["น้ำอัดลมรสส้ม 450 มล."]],
    ["ชา", "Tea", "ขวด", 20, ["ชาเขียว 500 มล."]],
    ["กาแฟ", "Coffee", "กระป๋อง", 18, ["กาแฟพร้อมดื่ม 180 มล."]],
  ],
  G: [
    ["น้ำยาซักผ้า", "Laundry", "ถุง", 69, ["น้ำยาซักผ้า 700 มล."]],
    ["น้ำยาล้างจาน", "Dishwashing", "ขวด", 35, ["น้ำยาล้างจาน 500 มล."]],
    [
      "อุปกรณ์ทำความสะอาด",
      "Cleaning tools",
      "ชิ้น",
      89,
      ["ไม้ถูพื้นหัวไมโครไฟเบอร์"],
    ],
  ],
  H: [
    ["แชมพู", "Shampoo", "ขวด", 99, ["แชมพูสมุนไพร 350 มล."]],
    ["สบู่", "Soap", "ก้อน", 25, ["สบู่กลิ่นดอกไม้"]],
    ["ยาสีฟัน", "Toothpaste", "หลอด", 59, ["ยาสีฟันมิ้นต์ 100 กรัม"]],
    ["เครื่องสำอาง", "Cosmetics", "ชิ้น", 129, ["ลิปบาล์มบำรุงริมฝีปาก"]],
  ],
  I: [
    ["ผ้าอ้อม", "Diapers", "แพ็ก", 229, ["ผ้าอ้อมเด็กไซซ์ M 24 ชิ้น"]],
    ["นมเด็ก", "Infant milk", "กล่อง", 249, ["ผลิตภัณฑ์นมสำหรับเด็ก 400 กรัม"]],
    ["ของใช้เด็ก", "Baby essentials", "แพ็ก", 49, ["สำลีเด็ก 100 แผ่น"]],
  ],
  J: [
    ["อาหารสุนัข", "Dog food", "ถุง", 119, ["อาหารสุนัข 1 กก."]],
    ["อาหารแมว", "Cat food", "ถุง", 129, ["อาหารแมว 1 กก."]],
    ["ทรายแมว", "Cat litter", "ถุง", 99, ["ทรายแมว 5 ลิตร"]],
  ],
  K: [
    ["ขนมปัง", "Bread", "ถุง", 39, ["ขนมปังโฮลวีต 400 กรัม"]],
    ["เค้ก", "Cake", "ชิ้น", 45, ["เค้กวานิลลา"]],
    [
      "อาหารพร้อมรับประทาน",
      "Ready meals",
      "กล่อง",
      55,
      ["ข้าวผัดผักพร้อมรับประทาน"],
    ],
  ],
  M: [
    ["เสื้อยืด", "T-shirts", "ตัว", 199, ["เสื้อยืดผ้าฝ้าย"]],
    ["กางเกง", "Trousers", "ตัว", 399, ["กางเกงลำลอง"]],
    ["รองเท้า", "Shoes", "คู่", 499, ["รองเท้าผ้าใบ"]],
  ],
  N: [
    ["โทรทัศน์", "Television", "เครื่อง", 7990, ["โทรทัศน์ LED 43 นิ้ว"]],
    ["ตู้เย็น", "Refrigerator", "เครื่อง", 6990, ["ตู้เย็น 2 ประตู 7 คิว"]],
    ["ไมโครเวฟ", "Microwave", "เครื่อง", 1990, ["ไมโครเวฟ 20 ลิตร"]],
    [
      "เครื่องใช้ไฟฟ้าขนาดเล็ก",
      "Small appliances",
      "เครื่อง",
      690,
      ["เครื่องปั่นน้ำผลไม้ 1.5 ลิตร"],
    ],
  ],
};
export const categoryCostRatios: Record<string, number> = {
  A: 0.78,
  B: 0.72,
  C: 0.79,
  D: 0.77,
  E: 0.8,
  G: 0.72,
  H: 0.63,
  I: 0.74,
  J: 0.75,
  K: 0.6,
  M: 0.58,
  N: 0.82,
};
const categories: CatalogCategory[] = [];
const products: Product[] = [];
const catalog: ProductCatalog = {
  categories,
  products,
  fixtureProducts: [],
  shelfInventory: [],
  stockLocations: [],
  planning: [],
};
const asOf = "2026-10-22T18:00:00+07:00";
const oldFixtures = floorPlan.fixtures.filter(
  (f) => !["checkout", "trolley", "pallet"].includes(f.kind),
);
for (const z of floorPlan.zones.filter((z) => seeds[z.id])) {
  categories.push({
    id: z.categoryId,
    zoneId: z.id,
    name: z.nameTh,
    nameTh: z.nameTh,
    nameEn: z.name,
    description: z.description,
  });
  seeds[z.id].forEach((seed, i) =>
    categories.push({
      id: `${z.categoryId}-sub-${i + 1}`,
      parentId: z.categoryId,
      zoneId: z.id,
      name: seed[0],
      nameTh: seed[0],
      nameEn: seed[1],
      description: `หมวด${seed[0]} · สินค้าสมมติ`,
    }),
  );
  const fixtures = oldFixtures.filter((f) => f.zoneId === z.id);
  const add = (
    fi: number,
    si: number,
    name: string,
    sku: string,
    legacyIndex: number,
  ) => {
    const seed = seeds[z.id][si],
      f = fixtures[fi];
    const shelfStock =
      legacyIndex === 0 || legacyIndex === 10 ? 0 : 40 + legacyIndex * 7;
    const backroomStock = 90 + legacyIndex * 11;
    products.push({
      sku,
      categoryId: `${z.categoryId}-sub-${si + 1}`,
      nameTh: name,
      nameEn: `${seed[1]} demo ${products.length + 1}`,
      brand: "บ้านเวิร์ส",
      unit: seed[2],
      sellingPrice: seed[3],
      unitCost: Math.round(seed[3] * categoryCostRatios[z.id] * 100) / 100,
      active: true,
    });
    catalog.fixtureProducts.push({
      sku,
      fixtureId: f.id,
      displayCapacity: Math.max(100, shelfStock + 20),
    });
    catalog.shelfInventory.push({
      sku,
      fixtureId: f.id,
      shelfStock,
      reservedStock: 0,
      updatedAt: asOf,
    });
    catalog.stockLocations.push({
      sku,
      fixtureId: `fixture-f-0${(products.length % 2) + 1}`,
      backroomStock,
      reservedStock: 0,
      incomingStock: 20,
      incomingArrivalDays: 2,
      updatedAt: asOf,
    });
    catalog.planning.push({
      sku,
      averageDailyDemand: 8 + (legacyIndex % 12),
      safetyStock: 15 + (legacyIndex % 5),
      leadTimeDays: 3 + (legacyIndex % 3),
    });
  };
  fixtures.forEach((f, fi) => {
    let si = fi % seeds[z.id].length;
    if (z.id === "M")
      si = f.kind === "shoes" ? 2 : f.kind === "folded" ? 1 : fi % 2;
    const seed = seeds[z.id][si];
    const duplicate = products.some(
      (p) => p.categoryId === `${z.categoryId}-sub-${si + 1}`,
    );
    const name = seed[4][duplicate && seed[4].length > 1 ? 1 : 0];
    const legacyIndex = oldFixtures.findIndex((item) => item.id === f.id);
    add(
      fi,
      si,
      name,
      `MOCK-SKU-${String(legacyIndex + 1).padStart(3, "0")}`,
      legacyIndex,
    );
  });
  seeds[z.id].forEach((seed, si) =>
    seed[4].forEach((name) => {
      if (!products.some((p) => p.nameTh === name))
        add(
          si % fixtures.length,
          si,
          name,
          `DEMO-${z.id}-${si + 1}-${seed[4].indexOf(name) + 1}`,
          oldFixtures.length + products.length,
        );
    }),
  );
}
export const productCatalog = catalog;
