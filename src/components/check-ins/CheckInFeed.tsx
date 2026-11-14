"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { dateKeyInZone } from "@/lib/dates";
import { Button, Card } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";
import { CheckInCard } from "./CheckInCard";
import { CheckInComposer } from "./CheckInComposer";

/**
 * Everyone's check-ins for one day, newest first. For today it also holds
 * your own composer (or your entry with an Edit button).
 */
export function CheckInFeed({ dateKey }: { dateKey: string }) {
  const { state, me } = useOffice();
  const [editing, setEditing] = useState(false);

  const todayKey = dateKeyInZone(state.now, me.timezone);
  const isToday = dateKey === todayKey;
  const memberById = new Map(state.members.map((member) => [member.id, member]));
  const entries = state.checkIns
    .filter((checkIn) => checkIn.date === dateKey && memberById.has(checkIn.userId))
    .sort((a, b) => b.createdAt - a.createdAt);
  const mine = entries.find((checkIn) => checkIn.userId === me.id);
  const others = entries.filter((checkIn) => checkIn.userId !== me.id);

  return (
    <div className="flex flex-col gap-3">
      {isToday && !mine && (
        <Card className="border-brand/40 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft">
              <PookieAvatar avatar={me.avatar} size={34} />
            </span>
            <div>
              <h3 className="font-display text-base leading-tight font-semibold text-ink">
                Your check-in
              </h3>
              <p className="text-xs font-semibold text-ink-soft">
                Two minutes, once a day. Your team sees it straight away.
              </p>
            </div>
          </div>
          <CheckInComposer />
        </Card>
      )}

      {mine &&
        (isToday && editing ? (
          <Card className="border-brand/40 p-4">
            <h3 className="mb-3 font-display text-base font-semibold text-ink">
              Edit today&apos;s check-in
            </h3>
            <CheckInComposer existing={mine} onDone={() => setEditing(false)} />
          </Card>
        ) : (
          <CheckInCard
            checkIn={mine}
            author={me}
            isYou
            now={state.now}
            action={
              isToday ? (
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil aria-hidden="true" className="size-3.5" />
                  Edit
                </Button>
              ) : undefined
            }
          />
        ))}

      {others.map((checkIn) => (
        <CheckInCard
          key={checkIn.id}
          checkIn={checkIn}
          author={memberById.get(checkIn.userId)!}
          isYou={false}
          now={state.now}
        />
      ))}

      {entries.length === 0 && !isToday && (
        <Card className="p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">A quiet day</p>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Nobody posted a check-in on this day.
          </p>
        </Card>
      )}
      {others.length === 0 && isToday && (
        <p className="px-2 text-center text-sm font-semibold text-ink-soft">
          No one else has checked in yet today.
        </p>
      )}
    </div>
  );
}
