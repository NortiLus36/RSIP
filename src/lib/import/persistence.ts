import type { ImportBundle } from "./types";
export interface SavedData {
  version: 1;
  source: "demo" | "imported";
  bundle: ImportBundle;
}
const dbName = "retailverse-data-v1";
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("datasets");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("เปิด IndexedDB ไม่ได้"));
    request.onblocked = () =>
      reject(new Error("โปรดปิดแท็บเว็บเก่าที่กำลังใช้ฐานข้อมูล"));
  });
}
export async function readWorkflow<T>(): Promise<T | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("datasets", "readonly")
        .objectStore("datasets")
        .get("workflow-v1");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function writeWorkflow(value: unknown) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("datasets", "readwrite");
      t.objectStore("datasets").put(value, "workflow-v1");
      t.oncomplete = () => resolve();
      t.onerror = () => reject(new Error("บันทึก Workflow ไม่สำเร็จ"));
      t.onabort = () => reject(new Error("ยกเลิก Workflow"));
    });
  } finally {
    db.close();
  }
}
export async function readSaved(): Promise<SavedData | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("datasets", "readonly")
        .objectStore("datasets")
        .get("active");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function writeSaved(value: SavedData) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("datasets", "readwrite");
      t.objectStore("datasets").put(value, "active");
      t.oncomplete = () => resolve();
      t.onerror = () => reject(new Error("บันทึกไม่สำเร็จ อาจมีพื้นที่ไม่พอ"));
      t.onabort = () => reject(new Error("ยกเลิกการบันทึก"));
    });
  } finally {
    db.close();
  }
}
