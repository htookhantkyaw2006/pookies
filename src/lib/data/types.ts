/**
 * Domain types shared by every data source (the Phase 1 mock and, later,
 * Supabase). Screens depend only on these, never on a concrete backend.
 */

/** A status a person chooses for themselves. */
export type PresenceStatus = "online" | "busy" | "away";

/** What the room shows. "offline" is never chosen: it means "not connected". */
export type DisplayStatus = PresenceStatus | "offline";

export type Role = "admin" | "member";

export const AVATAR_COLORS = [
  "peach",
  "mint",
  "sky",
  "lilac",
  "butter",
  "rose",
] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

export const AVATAR_SHAPES = ["round", "bear", "cat", "bunny"] as const;
export type AvatarShape = (typeof AVATAR_SHAPES)[number];

export interface AvatarStyle {
  color: AvatarColor;
  shape: AvatarShape;
}

export interface Member {
  id: string;
  displayName: string;
  avatar: AvatarStyle;
  /** IANA time zone, e.g. "Europe/Lisbon". */
  timezone: string;
  role: Role;
  /** Durable copy of the chosen status, restored after a reload. */
  status: PresenceStatus;
  statusNote: string;
  statusUpdatedAt: number;
  joinedAt: number;
}

/**
 * One live connection (one browser tab) in the workspace presence channel.
 * A person with no entries is offline; a person with several tabs has several.
 */
export interface PresenceEntry {
  userId: string;
  connectionId: string;
  status: PresenceStatus;
  note: string;
  updatedAt: number;
}

export interface CheckIn {
  id: string;
  userId: string;
  /** The author's local calendar day, "YYYY-MM-DD". One check-in per day. */
  date: string;
  yesterday: string;
  today: string;
  blockers: string;
  createdAt: number;
  updatedAt: number;
}

export interface CheckInInput {
  yesterday: string;
  today: string;
  blockers: string;
}

export interface Invite {
  id: string;
  token: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
  useCount: number;
}

export interface Workspace {
  id: string;
  name: string;
}

/** The message on the meeting room whiteboard. */
export interface BoardNote {
  text: string;
  /** Who wrote it; null once they have left the workspace. */
  authorId: string | null;
  updatedAt: number;
}

/** Shared things in the office itself, saved for everyone. */
export interface OfficeThings {
  board: BoardNote | null;
  /** Plant id (from the office map) to when it was last watered. */
  plants: Record<string, number>;
}

export interface OfficeState {
  /** Current time, refreshed by the store so rendering stays pure. */
  now: number;
  workspace: Workspace;
  currentUserId: string;
  members: Member[];
  presence: PresenceEntry[];
  checkIns: CheckIn[];
  invites: Invite[];
  things: OfficeThings;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface ProfileInput {
  displayName: string;
  avatar: AvatarStyle;
  timezone: string;
}

/** Everything a screen can ask the backend to do. Async so Supabase fits later. */
export interface OfficeActions {
  setStatus(status: PresenceStatus): Promise<ActionResult>;
  setStatusNote(note: string): Promise<ActionResult>;
  saveCheckIn(input: CheckInInput): Promise<ActionResult>;
  updateProfile(input: ProfileInput): Promise<ActionResult>;
  renameWorkspace(name: string): Promise<ActionResult>;
  setMemberRole(userId: string, role: Role): Promise<ActionResult>;
  removeMember(userId: string): Promise<ActionResult>;
  createInvite(): Promise<ActionResult>;
  revokeInvite(inviteId: string): Promise<ActionResult>;
  /** Anyone in the workspace can write on the whiteboard. Empty text wipes it. */
  writeBoard(text: string): Promise<ActionResult>;
  waterPlant(plantId: string): Promise<ActionResult>;
}

/** Where this browser stands with the office. */
export type OfficeConnection =
  | { phase: "loading" }
  /** Nobody is signed in (or they are not in a workspace yet). */
  | { phase: "signed-out" }
  | { phase: "error"; message: string }
  | { phase: "ready"; state: OfficeState };

export interface GuestProfile {
  displayName: string;
  avatar: AvatarStyle;
  timezone: string;
}

export interface SessionActions {
  /** Step into the shared demo office without an account (development only). */
  enterAsGuest(profile: GuestProfile): Promise<ActionResult>;
  /** Leave the office and sign out. */
  leave(): Promise<void>;
  /** Try connecting again after an error. */
  retry(): void;
}

/** What travels between browsers so everyone sees everyone else move. */
export type WorldMessage =
  /** `seat` is the seat they are sitting in, if any. */
  | { type: "position"; id: string; x: number; y: number; seat: string | null }
  | { type: "wave"; id: string }
  /** A quick emoji over someone's head, or (hold) something they carry for a while. */
  | { type: "emote"; id: string; emoji: string; hold: boolean }
  /** Someone just connected: a good moment to tell them where you are. */
  | { type: "peer-joined"; id: string };

export interface WorldTransport {
  /**
   * "simulated": teammates are sample people, walked around locally.
   * "live": teammates are real, and move when their browser says so.
   */
  teammates: "simulated" | "live";
  /** Returns false if it couldn't be sent yet (still connecting): try again shortly. */
  sendPosition(x: number, y: number, seat: string | null): boolean;
  sendWave(): void;
  sendEmote(emoji: string, hold: boolean): void;
  subscribe(listener: (message: WorldMessage) => void): () => void;
}

export interface OfficeStore {
  /** "sample" is the built-in pretend office; "live" is the real backend. */
  kind: "sample" | "live";
  subscribe(listener: () => void): () => void;
  /** Must return the same object until something changes. */
  getSnapshot(): OfficeConnection;
  /** The server never has an office: it only exists once a browser connects. */
  getServerSnapshot(): OfficeConnection;
  actions: OfficeActions;
  session: SessionActions;
  world: WorldTransport;
}
