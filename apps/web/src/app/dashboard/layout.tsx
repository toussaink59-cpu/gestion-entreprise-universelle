import type { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { isInvoiceModuleEnabled } from "@/lib/features";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell invoicesEnabled={isInvoiceModuleEnabled()}>
      {children}
    </DashboardShell>
  );
}
