"use client";

import type { ReactNode } from "react";
import { OfficeScreen } from "@/components/office/OfficeScreen";
import { OfficeDoor } from "./OfficeDoor";

/**
 * The frame around every in-office screen: the game, edge to edge and always
 * running, with the current page (check-ins, profile, admin) opening over it.
 * Before you're in an office, the lobby fills the screen instead.
 */
export function GameShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <OfficeDoor framed>
        <main className="relative flex min-h-0 w-full flex-1 flex-col">
          <OfficeScreen />
        </main>
      </OfficeDoor>
      {/* Always rendered, so every page can be prerendered; each one waits for the office itself. */}
      {children}
    </div>
  );
}
