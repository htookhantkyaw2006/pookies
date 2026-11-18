"use client";

import { MapPin } from "lucide-react";
import { OFFICE_MAP, type Zone } from "@/lib/world/map";
import { STATUS_META } from "@/components/ui/status";

/** Every room in the office: pick one and your character walks there. */
export function PlacesMenu({
  current,
  onPick,
}: {
  /** The room you're in now, so it can be marked. */
  current: Zone | null;
  onPick: (zone: Zone) => void;
}) {
  return (
    <nav
      aria-label="Places"
      className="w-64 rounded-2xl border border-line bg-surface/95 p-2 shadow-lift backdrop-blur"
    >
      <p className="px-2 pt-1 pb-2 text-sm font-bold text-ink">Go to…</p>
      <ul className="flex max-h-[min(22rem,50dvh)] flex-col overflow-y-auto">
        {OFFICE_MAP.zones.map((zone) => {
          const meta = STATUS_META[zone.status];
          const here = current?.id === zone.id;
          return (
            <li key={zone.id}>
              <button
                type="button"
                onClick={() => onPick(zone)}
                aria-current={here ? "location" : undefined}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2 text-left text-sm font-bold text-ink transition-colors hover:bg-brand-soft"
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-white ${meta.dot}`}
                >
                  <MapPin className="size-3.5" strokeWidth={2.6} />
                </span>
                <span className="min-w-0 flex-1 truncate">{zone.name}</span>
                <span className="shrink-0 text-xs font-semibold text-ink-soft">
                  {here ? "You're here" : meta.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
