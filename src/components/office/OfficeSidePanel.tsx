"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { dateKeyInZone } from "@/lib/dates";
import { CheckInFeed } from "@/components/check-ins/CheckInFeed";
import { PeopleList } from "./PeopleList";

type Tab = "people" | "check-ins";

/** Floating over the map: who's here, and what everyone is doing today. */
export function OfficeSidePanel({ onClose }: { onClose: () => void }) {
  const { state, me } = useOffice();
  const [tab, setTab] = useState<Tab>("people");
  const todayKey = dateKeyInZone(state.now, me.timezone);
  const postedToday = state.checkIns.filter((checkIn) => checkIn.date === todayKey).length;

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "people", label: "People", count: state.members.length },
    { id: "check-ins", label: "Check-ins", count: postedToday },
  ];

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 p-2">
        <div role="tablist" aria-label="Office panel" className="grid flex-1 grid-cols-2 rounded-full bg-sunken p-1">
          {tabs.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`office-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`office-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={`min-h-9 rounded-full px-3 text-sm font-bold transition-colors ${
                  selected ? "bg-surface text-ink shadow-card" : "text-ink-soft hover:text-ink"
                }`}
              >
                {item.label}
                <span className="ml-1.5 font-bold text-ink-soft">{item.count}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide panel"
          title="Hide panel"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-3 pb-3">
        {tab === "people" ? (
          <div role="tabpanel" id="office-panel-people" aria-labelledby="office-tab-people">
            <PeopleList />
          </div>
        ) : (
          <div
            role="tabpanel"
            id="office-panel-check-ins"
            aria-labelledby="office-tab-check-ins"
            className="flex flex-col gap-3"
          >
            <CheckInFeed dateKey={todayKey} />
            <Link
              href="/check-ins"
              className="inline-flex items-center gap-1 self-end px-1 text-sm font-bold text-brand-ink underline-offset-2 hover:underline"
            >
              Earlier days
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
