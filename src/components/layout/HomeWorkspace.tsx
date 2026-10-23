"use client";

import { useSearchParams } from "next/navigation";
import type { DashboardData } from "@/data/providers";
import { Workspace } from "./Workspace";

export function HomeWorkspace(data: DashboardData) {
  const view = useSearchParams().get("view");
  const initialTab =
    view === "analytics"
      ? "Analytics"
      : view === "peak"
        ? "Peak Time"
        : "Explore";

  return <Workspace key={initialTab} {...data} initialTab={initialTab} />;
}
