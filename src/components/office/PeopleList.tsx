"use client";

import { CircleCheck, Clock, Footprints } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { clockInZone, dateKeyInZone } from "@/lib/dates";
import { STATUS_ORDER, buildRoom, groupRoom } from "@/lib/presence/derive";
import { getWorldEngine } from "@/lib/world/instance";
import { STATUS_META, StatusAvatar } from "@/components/ui/status";

/**
 * Everyone in the workspace as a plain list, grouped by status. It carries
 * the same information as the map (for anyone who can't or would rather not
 * use it) and lets you walk straight over to someone.
 */
export function PeopleList() {
  const { state, me } = useOffice();
  const groups = groupRoom(buildRoom(state.members, state.presence, state.currentUserId));
  const todayKey = dateKeyInZone(state.now, me.timezone);
  const checkedIn = new Set(
    state.checkIns.filter((checkIn) => checkIn.date === todayKey).map((checkIn) => checkIn.userId),
  );

  const walkOver = (userId: string) => {
    getWorldEngine().walkToEntity(userId);
    document.getElementById("office-world")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="flex flex-col gap-4">
      {STATUS_ORDER.map((status) => {
        const people = groups[status];
        if (people.length === 0) return null;
        const meta = STATUS_META[status];
        return (
          <section key={status} aria-labelledby={`people-${status}`}>
            <h3
              id={`people-${status}`}
              className="mb-1 flex items-center gap-2 px-1 text-sm font-semibold text-ink"
            >
              <span aria-hidden="true" className={`size-2.5 rounded-full ${meta.dot}`} />
              {meta.section}
              <span className="font-bold text-ink-soft">{people.length}</span>
            </h3>
            <ul className="flex flex-col">
              {people.map(({ member, presence, isYou }) => (
                <li key={member.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                  <StatusAvatar avatar={member.avatar} status={presence.status} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] leading-tight font-bold text-ink">
                      {member.displayName}
                      {isYou && <span className="ml-1 font-semibold text-brand-ink">(you)</span>}
                    </p>
                    <p className="truncate text-sm leading-tight font-semibold text-ink-soft">
                      <span className={`font-bold ${meta.ink}`}>{meta.label}</span>
                      {presence.note && <> · {presence.note}</>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs font-bold text-ink-soft empty:hidden">
                      {member.timezone !== me.timezone && (
                        <span className="inline-flex items-center gap-1">
                          <Clock aria-hidden="true" className="size-3" />
                          <span className="sr-only">Local time</span>
                          {clockInZone(state.now, member.timezone)}
                        </span>
                      )}
                      {checkedIn.has(member.id) && (
                        <span className="inline-flex items-center gap-1 text-online-ink">
                          <CircleCheck aria-hidden="true" className="size-3" />
                          Checked in
                        </span>
                      )}
                    </p>
                  </div>
                  {!isYou && presence.status !== "offline" && (
                    <button
                      type="button"
                      onClick={() => walkOver(member.id)}
                      aria-label={`Walk over to ${member.displayName}`}
                      title="Walk over"
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand-ink"
                    >
                      <Footprints aria-hidden="true" className="size-5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
