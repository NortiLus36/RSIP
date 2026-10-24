"use client";

import { useEffect } from "react";
import { useExplorer } from "@/stores/explorer";
import { useSearchParams } from "next/navigation";
import type { DashboardData } from "@/data/providers";
import { Workspace } from "./Workspace";

export function HomeWorkspace(data: DashboardData) {
  const params = useSearchParams();
  const view = params.get("view"),
    focus = params.get("focus");
  useEffect(() => {
    if (
      focus &&
      [...data.store.zones, ...data.store.fixtures].some((x) => x.id === focus)
    )
      useExplorer.getState().select(focus);
  }, [focus, data.store]);
  const initialTab =
    view === "analytics"
      ? "Analytics"
      : view === "data"
        ? "Data Management"
        : view === "peak"
          ? "Peak Time"
          : "Explore";

  return <Workspace key={initialTab} {...data} initialTab={initialTab} />;
}
