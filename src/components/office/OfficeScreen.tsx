"use client";

import { useOffice } from "@/lib/data/react";
import { greetingForHour, hourInZone, longDateInZone } from "@/lib/dates";
import { buildRoom, countAround } from "@/lib/presence/derive";
import { WorldView } from "@/components/world/WorldView";
import { OfficeMenu } from "./OfficeMenu";
import { OfficeSidePanel } from "./OfficeSidePanel";
import { StatusControl } from "./StatusControl";

/** The office: the map fills the screen and everything else floats over it. */
export function OfficeScreen() {
  const { state, me } = useOffice();
  const firstName = me.displayName.split(" ")[0];
  const greeting = greetingForHour(hourInZone(state.now, me.timezone));
  const room = buildRoom(state.members, state.presence, state.currentUserId);
  const around = countAround(room);

  return (
    <WorldView
      menu={<OfficeMenu />}
      greeting={
        <div className="sr-only max-w-full rounded-2xl bg-surface/95 px-4 py-2 shadow-lift backdrop-blur sm:not-sr-only">
          <h1 className="truncate text-lg leading-tight font-semibold tracking-tight text-ink sm:text-xl">
            {`${greeting}, ${firstName}`}
          </h1>
          <p className="truncate text-xs font-semibold text-ink-soft sm:text-sm">
            <span className="hidden sm:inline">{longDateInZone(state.now, me.timezone)} · </span>
            <span className="font-bold text-ink">
              {around} of {room.length} in the office
            </span>
          </p>
        </div>
      }
      status={<StatusControl />}
      renderPanel={(close) => <OfficeSidePanel onClose={close} />}
    />
  );
}
