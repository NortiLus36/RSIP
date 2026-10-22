import { loadDashboard } from "@/data/providers";
import { Workspace } from "@/components/layout/Workspace";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return (
    <Workspace
      {...await loadDashboard()}
      initialTab={
        view === "analytics"
          ? "Analytics"
          : view === "peak"
            ? "Peak Time"
            : "Explore"
      }
    />
  );
}
