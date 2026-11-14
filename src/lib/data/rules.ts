import type {
  ActionResult,
  CheckInInput,
  Invite,
  Member,
  Role,
} from "./types";

/**
 * Business rules shared by every data source. The database enforces the same
 * rules later; keeping them here lets the UI explain a refusal before it tries.
 */

export const NOTE_MAX = 80;
export const NAME_MAX = 40;
export const WORKSPACE_NAME_MAX = 40;
export const CHECKIN_FIELD_MAX = 500;
export const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const BOARD_MAX = 80;

const HOUR_MS = 60 * 60 * 1000;
/** Plants look fresh for a day after watering and thirsty after three. */
export const PLANT_FRESH_MS = 24 * HOUR_MS;
export const PLANT_THIRSTY_MS = 72 * HOUR_MS;

export type PlantMood = "fresh" | "fine" | "thirsty";

export function plantMood(wateredAt: number | undefined, now: number): PlantMood {
  if (wateredAt === undefined) return "thirsty";
  const age = now - wateredAt;
  if (age < PLANT_FRESH_MS) return "fresh";
  return age < PLANT_THIRSTY_MS ? "fine" : "thirsty";
}

/** Emoji other browsers may show over someone: anything else is ignored. */
export const SHARED_EMOTES: readonly string[] = ["☕", "💧"];

const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

/** Single line, no leading/trailing space, capped in length. */
export function cleanLine(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Multi-line text: keeps line breaks, trims the ends, capped in length. */
export function cleanText(value: string, max: number): string {
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

export function validateName(name: string, label: string, max: number): ActionResult {
  const cleaned = cleanLine(name, max + 1);
  if (cleaned.length === 0) return fail(`${label} can't be empty.`);
  if (cleaned.length > max) return fail(`${label} can be at most ${max} characters.`);
  return OK;
}

export function validateCheckIn(input: CheckInInput): ActionResult {
  if (cleanText(input.today, CHECKIN_FIELD_MAX).length === 0) {
    return fail("Add a line about what you're doing today.");
  }
  for (const value of [input.yesterday, input.today, input.blockers]) {
    if (value.trim().length > CHECKIN_FIELD_MAX) {
      return fail(`Keep each answer under ${CHECKIN_FIELD_MAX} characters.`);
    }
  }
  return OK;
}

function adminCount(members: readonly Member[]): number {
  return members.filter((member) => member.role === "admin").length;
}

export function canChangeRole(
  members: readonly Member[],
  actorId: string,
  targetId: string,
  role: Role,
): ActionResult {
  const actor = members.find((member) => member.id === actorId);
  const target = members.find((member) => member.id === targetId);
  if (!actor || actor.role !== "admin") return fail("Only admins can change roles.");
  if (!target) return fail("That person is no longer in the workspace.");
  if (target.role === "admin" && role === "member" && adminCount(members) === 1) {
    return fail("A workspace needs at least one admin. Make someone else an admin first.");
  }
  return OK;
}

export function canRemoveMember(
  members: readonly Member[],
  actorId: string,
  targetId: string,
): ActionResult {
  const actor = members.find((member) => member.id === actorId);
  const target = members.find((member) => member.id === targetId);
  if (!actor || actor.role !== "admin") return fail("Only admins can remove people.");
  if (!target) return fail("That person is no longer in the workspace.");
  if (target.id === actor.id) return fail("You can't remove yourself from the workspace.");
  if (target.role === "admin" && adminCount(members) === 1) {
    return fail("A workspace needs at least one admin.");
  }
  return OK;
}

export type InviteState = "active" | "expired" | "revoked";

export function inviteState(invite: Invite, now: number): InviteState {
  if (invite.revokedAt !== null) return "revoked";
  if (invite.expiresAt <= now) return "expired";
  return "active";
}
