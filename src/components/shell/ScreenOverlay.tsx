"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useOfficeIfConnected } from "@/lib/data/react";

/**
 * A page that opens over the game, like a menu screen: check-ins, your
 * profile, the admin page. The office keeps running behind it. Escape, the
 * close button or a tap on the dimmed game takes you back.
 */
export function ScreenOverlay({ label, children }: { label: string; children: ReactNode }) {
  const router = useRouter();
  const office = useOfficeIfConnected();

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) router.push("/office");
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [router]);

  // Not in an office yet: the lobby is showing, and there's nothing to open over.
  if (!office) return null;

  return (
    <div
      data-hud
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="absolute inset-0 z-[3200] flex items-end justify-center bg-ink/30 backdrop-blur-[2px] sm:items-center sm:p-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) router.push("/office");
      }}
    >
      <div className="relative flex max-h-[92%] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] border border-line bg-canvas shadow-lift sm:max-h-full sm:rounded-[1.75rem]">
        <Link
          href="/office"
          aria-label="Back to the office"
          className="absolute top-3 right-3 z-10 inline-flex size-10 items-center justify-center rounded-full bg-surface text-ink-soft shadow-card hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" />
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
