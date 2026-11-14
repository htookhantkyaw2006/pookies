import type { ReactNode } from "react";
import { OfficeProvider } from "@/lib/data/react";
import { AppShell } from "@/components/shell/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <OfficeProvider>
      <AppShell>{children}</AppShell>
    </OfficeProvider>
  );
}
