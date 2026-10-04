import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ReportsShell } from "@/components/reports/shell";
import { ReportsProvider } from "@/components/reports/context";

export const Route = createFileRoute("/reports")({
  component: () => (
    <ReportsProvider>
      <ReportsShell><Outlet /></ReportsShell>
    </ReportsProvider>
  ),
});
