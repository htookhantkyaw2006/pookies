import { DARTS_MAX_SCORE } from "@/lib/games/darts";
import { SNACK_MAX_SCORE } from "@/lib/games/snackCatch";
import {
  GAMES,
  PHOTO_BACKDROPS,
  PHOTO_POSES,
  type Photo,
  type PhotoPose,
  type ActionResult,
  type CheckInInput,
  type GameId,
  type GameScore,
  type Invite,
  type Member,
  type Role,
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
export const SHARED_EMOTES: readonly string[] = ["☕", "💧", "🫧", "📸", "🎯", "🕹️"];

const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

/** The highest score a round of each game can possibly reach. The database checks the same. */
export const GAME_MAX: Record<GameId, number> = { snack: SNACK_MAX_SCORE, darts: DARTS_MAX_SCORE };

export const GAME_NAMES: Record<GameId, string> = { snack: "Snack Catch", darts: "Darts" };

export function validateScore(game: string, score: number): ActionResult {
  if (!(GAMES as readonly string[]).includes(game)) return fail("That isn't a game here.");
  if (!Number.isInteger(score) || score < 0 || score > GAME_MAX[game as GameId]) {
    return fail("That score doesn't look right.");
  }
  return OK;
}

/** Keeps your best: returns the list with this score added, if it beats your old one. */
export function withScore(
  scores: readonly GameScore[],
  entry: GameScore,
): GameScore[] {
  const old = scores.find((item) => item.game === entry.game && item.userId === entry.userId);
  if (old && old.score >= entry.score) return [...scores];
  return [...scores.filter((item) => item !== old), entry];
}

/** The best scores in one game, highest first (earlier wins a tie). */
export function topScores(
  scores: readonly GameScore[],
  game: GameId,
  count = 5,
): GameScore[] {
  return scores
    .filter((item) => item.game === game)
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, count);
}

/** Up to four people fit in the booth; the wall keeps the newest twelve photos. */
export const PHOTO_MAX_PEOPLE = 4;
export const PHOTO_WALL_SIZE = 12;
/** One photo every few seconds each, so the wall can't be flooded. */
export const PHOTO_GAP_MS = 5000;

export function validatePhoto(
  backdrop: string,
  peopleIds: readonly string[],
  me: string,
  members: readonly Member[],
): ActionResult {
  if (!(PHOTO_BACKDROPS as readonly string[]).includes(backdrop)) return fail("Pick a backdrop.");
  if (peopleIds.length === 0 || peopleIds.length > PHOTO_MAX_PEOPLE) {
    return fail(`The booth fits one to ${PHOTO_MAX_PEOPLE} people.`);
  }
  if (new Set(peopleIds).size !== peopleIds.length) return fail("Everyone only fits in once.");
  if (!peopleIds.includes(me)) return fail("Step into the booth to be in the photo.");
  if (!peopleIds.every((id) => members.some((member) => member.id === id))) {
    return fail("Everyone in the photo has to be in the office.");
  }
  return OK;
}

/** Whoever is in a photo or took it can take it down; so can admins. */
export function canRemovePhoto(photo: Photo, me: string, isAdmin: boolean): boolean {
  return isAdmin || photo.takenBy === me || photo.people.some((person) => person.id === me);
}

/** Adds a photo to the front of the wall, dropping the oldest past twelve. */
export function withPhoto(photos: readonly Photo[], photo: Photo): Photo[] {
  return [photo, ...photos].slice(0, PHOTO_WALL_SIZE);
}

/** A pose for each person, picked at random. */
export function randomPose(random: () => number = Math.random): PhotoPose {
  return PHOTO_POSES[Math.floor(random() * PHOTO_POSES.length)];
}

export const PASSWORD_MIN = 8;

export function validateEmail(email: string): ActionResult {
  const cleaned = email.trim();
  if (cleaned.length === 0) return fail("Add your email address.");
  if (cleaned.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
    return fail("That doesn't look like an email address.");
  }
  return OK;
}

export function validatePassword(password: string): ActionResult {
  if (password.length < PASSWORD_MIN) return fail(`Use at least ${PASSWORD_MIN} characters for your password.`);
  if (password.length > 72) return fail("Keep your password to 72 characters or fewer.");
  return OK;
}

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
