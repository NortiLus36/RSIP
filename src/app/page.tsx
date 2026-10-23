import { Suspense } from "react";
import { loadDashboard } from "@/data/providers";
import { HomeWorkspace } from "@/components/layout/HomeWorkspace";
export default async function Home() {
  const data = await loadDashboard();
  return (
    <Suspense fallback={<p role="status">กำลังเตรียมข้อมูลร้าน...</p>}>
      <HomeWorkspace {...data} />
    </Suspense>
  );
}
