"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { dateKeyInZone, describeDateKey, shiftDateKey } from "@/lib/dates";
import { Button, Card, PageHeader } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";
import { CheckInFeed } from "./CheckInFeed";

/** How far back the day switcher goes. */
const MAX_DAYS_BACK = 30;

export function CheckInsScreen() {
  const { state, me } = useOffice();
  const [daysBack, setDaysBack] = useState(0);

  const todayKey = dateKeyInZone(state.now, me.timezone);
  const dateKey = shiftDateKey(todayKey, -daysBack);
  const label = describeDateKey(dateKey, todayKey);

  const memberById = new Map(state.members.map((member) => [member.id, member]));
  const posted = state.checkIns
    .filter((checkIn) => checkIn.date === dateKey && memberById.has(checkIn.userId))
    .sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Check-ins"
        subtitle="A quick note from everyone, once a day. No meeting needed."
      />

      <Card className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDaysBack((value) => Math.min(MAX_DAYS_BACK, value + 1))}
            disabled={daysBack >= MAX_DAYS_BACK}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Earlier
          </Button>
          <h2 aria-live="polite" className="text-center text-xl font-semibold text-ink">
            {label}
          </h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDaysBack((value) => Math.max(0, value - 1))}
            disabled={daysBack === 0}
          >
            Later
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-ink">
            {posted.length} of {state.members.length} checked in
          </p>
          {posted.length > 0 && (
            <ul className="flex flex-wrap items-center gap-1" aria-label="Checked in">
              {posted.map((checkIn) => {
                const author = memberById.get(checkIn.userId)!;
                return (
                  <li
                    key={checkIn.id}
                    title={author.displayName}
                    className="inline-flex size-8 items-center justify-center rounded-full bg-sunken"
                  >
                    <PookieAvatar avatar={author.avatar} size={28} />
                    <span className="sr-only">{author.displayName}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* Re-keyed per day so an open "Edit" form never leaks across days. */}
      <CheckInFeed key={dateKey} dateKey={dateKey} />
    </div>
  );
}
