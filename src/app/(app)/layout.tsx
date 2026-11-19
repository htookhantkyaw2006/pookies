import type { ReactNode } from "react";
import { OfficeProvider } from "@/lib/data/react";
import { GameShell } from "@/components/shell/GameShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <OfficeProvider>
      <GameShell>{children}</GameShell>
    </OfficeProvider>
  );
}
