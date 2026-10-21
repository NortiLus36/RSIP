import { loadDashboard } from "@/data/providers";
import { Workspace } from "@/components/layout/Workspace";
export default async function Home() {
  return <Workspace {...await loadDashboard()} />;
}
