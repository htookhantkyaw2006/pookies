"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { STATUS_META } from "@/components/ui/status";
import { StatusNote } from "./StatusNote";
import { StatusPicker } from "./StatusPicker";

/** Your status as a small pill over the map; opens the picker and note. */
export function StatusControl() {
  const { me } = useOffice();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[me.status];
  const Icon = meta.icon;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="status-popover"
        aria-label={`Your status: ${meta.label}${me.statusNote ? `, ${me.statusNote}` : ""}. Change it`}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex min-h-11 max-w-[min(18rem,calc(100vw-9rem))] items-center gap-2 rounded-full py-1 pr-3 pl-1.5 text-sm font-bold shadow-lift backdrop-blur transition-colors ${meta.soft} ${meta.ink} hover:brightness-95`}
      >
        <span
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-white ${meta.dot}`}
        >
          <Icon aria-hidden="true" className="size-4" strokeWidth={2.6} />
        </span>
        <span className="shrink-0">{meta.label}</span>
        {me.statusNote && (
          <span className="hidden truncate font-semibold opacity-80 sm:inline">· {me.statusNote}</span>
        )}
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id="status-popover"
          className="absolute top-full right-0 z-[3000] mt-2 flex w-[min(20rem,calc(100vw-1.5rem))] cursor-auto flex-col gap-4 rounded-card border border-line bg-surface p-4 shadow-lift select-text"
        >
          <StatusPicker />
          <StatusNote />
        </div>
      )}
    </div>
  );
}
