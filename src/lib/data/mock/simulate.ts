import { dateKeyInZone } from "@/lib/dates";
import { latestEntryByUser } from "@/lib/presence/derive";
import type { CheckIn, Member, OfficeState, PresenceStatus } from "../types";

/**
 * Makes the sample office feel alive: every so often one teammate changes
 * status, steps away, comes back or posts a check-in. Never touches you.
 */

const NOTES: Record<PresenceStatus, string[]> = {
  online: ["", "Around if you need me", "Reviewing pull requests", "Happy to pair", "Writing docs", ""],
  busy: ["Deep work until 3", "In a customer call", "Heads-down on the release", "Recording a demo", "Sprint planning"],
  away: ["At lunch", "Coffee run", "Stretching my legs", "School run, back at 4", "Dentist, back soon"],
};

const CHECK_IN_IDEAS: Array<{ yesterday: string; today: string; blockers: string }> = [
  { yesterday: "Wrapped up the feedback from Tuesday's review.", today: "Polishing the onboarding screens.", blockers: "" },
  { yesterday: "Cleared my inbox and the support backlog.", today: "Planning next week's priorities.", blockers: "" },
  { yesterday: "Finished the tracking plan.", today: "Wiring up the new dashboard numbers.", blockers: "Need a quick decision on naming." },
  { yesterday: "Sorted the supplier contracts.", today: "Monthly numbers, then invoices.", blockers: "" },
];

const STATUSES: PresenceStatus[] = ["online", "busy", "away"];

export function simulateStep(
  state: OfficeState,
  random: () => number,
  makeId: () => string,
): OfficeState {
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

  const others = state.members.filter((member) => member.id !== state.currentUserId);
  if (others.length === 0) return state;

  const latest = latestEntryByUser(state.presence);
  const connected = others.filter((member) => latest.has(member.id));
  const offline = others.filter((member) => !latest.has(member.id));
  const roll = random();

  if (roll < 0.12 && connected.length > 3) {
    const leaving = pick(connected);
    return {
      ...state,
      presence: state.presence.filter((entry) => entry.userId !== leaving.id),
    };
  }

  if (roll < 0.27 && offline.length > 0) {
    return setPresence(state, pick(offline), "online", "");
  }

  if (roll < 0.4) {
    const me = state.members.find((member) => member.id === state.currentUserId);
    const todayKey = dateKeyInZone(state.now, me?.timezone ?? "UTC");
    const waiting = connected.filter(
      (member) =>
        !state.checkIns.some((c) => c.userId === member.id && c.date === todayKey),
    );
    if (waiting.length > 0) {
      const author = pick(waiting);
      const idea = pick(CHECK_IN_IDEAS);
      const checkIn: CheckIn = {
        id: makeId(),
        userId: author.id,
        date: todayKey,
        ...idea,
        createdAt: state.now,
        updatedAt: state.now,
      };
      return { ...state, checkIns: [...state.checkIns, checkIn] };
    }
  }

  if (connected.length === 0) return state;
  const mover = pick(connected);
  const current = latest.get(mover.id)?.status ?? mover.status;
  const next = pick(STATUSES.filter((status) => status !== current));
  return setPresence(state, mover, next, pick(NOTES[next]));
}

function setPresence(
  state: OfficeState,
  member: Member,
  status: PresenceStatus,
  note: string,
): OfficeState {
  const connectionId = `${member.id}-tab`;
  return {
    ...state,
    members: state.members.map((m) =>
      m.id === member.id
        ? { ...m, status, statusNote: note, statusUpdatedAt: state.now }
        : m,
    ),
    presence: [
      ...state.presence.filter((entry) => entry.userId !== member.id),
      { userId: member.id, connectionId, status, note, updatedAt: state.now },
    ],
  };
}
