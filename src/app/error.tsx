"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fallback">
      <h1>โหลดข้อมูลไม่สำเร็จ</h1>
      <button onClick={reset}>ลองอีกครั้ง</button>
    </main>
  );
}
