import { loadDashboard } from "@/data/providers";
import { Workspace } from "@/components/layout/Workspace";
export default async function ActionPlanningPage() {
  return <Workspace {...await loadDashboard()} operationsPage />;
}
