import type {
  DisplayStatus,
  Member,
  PresenceEntry,
} from "@/lib/data/types";

export interface ResolvedPresence {
  status: DisplayStatus;
  note: string;
  /** When the shown status was last changed; null when offline. */
  updatedAt: number | null;
}

export interface RoomMember {
  member: Member;
  presence: ResolvedPresence;
  isYou: boolean;
}

/** Order the room is laid out in, most "around" first. */
export const STATUS_ORDER: readonly DisplayStatus[] = [
  "online",
  "busy",
  "away",
  "offline",
];

const OFFLINE: ResolvedPresence = { status: "offline", note: "", updatedAt: null };

/**
 * A person can have several tabs open. The most recently updated tab wins, so
 * changing status in one tab is what everyone sees.
 */
export function latestEntryByUser(
  entries: readonly PresenceEntry[],
): Map<string, PresenceEntry> {
  const latest = new Map<string, PresenceEntry>();
  for (const entry of entries) {
    const current = latest.get(entry.userId);
    if (!current || entry.updatedAt > current.updatedAt) {
      latest.set(entry.userId, entry);
    }
  }
  return latest;
}

/** No live connection means offline, whatever status was last saved. */
export function resolvePresence(
  userId: string,
  latest: ReadonlyMap<string, PresenceEntry>,
): ResolvedPresence {
  const entry = latest.get(userId);
  if (!entry) return OFFLINE;
  return { status: entry.status, note: entry.note, updatedAt: entry.updatedAt };
}

export function buildRoom(
  members: readonly Member[],
  entries: readonly PresenceEntry[],
  currentUserId: string,
): RoomMember[] {
  const latest = latestEntryByUser(entries);
  return members.map((member) => ({
    member,
    presence: resolvePresence(member.id, latest),
    isYou: member.id === currentUserId,
  }));
}

/** Groups by status; inside a group you come first, then everyone by name. */
export function groupRoom(
  room: readonly RoomMember[],
): Record<DisplayStatus, RoomMember[]> {
  const groups: Record<DisplayStatus, RoomMember[]> = {
    online: [],
    busy: [],
    away: [],
    offline: [],
  };
  for (const entry of room) groups[entry.presence.status].push(entry);
  for (const status of STATUS_ORDER) {
    groups[status].sort((a, b) => {
      if (a.isYou !== b.isYou) return a.isYou ? -1 : 1;
      return a.member.displayName.localeCompare(b.member.displayName);
    });
  }
  return groups;
}

/** How many people are connected right now, in any status. */
export function countAround(room: readonly RoomMember[]): number {
  return room.filter((entry) => entry.presence.status !== "offline").length;
}
