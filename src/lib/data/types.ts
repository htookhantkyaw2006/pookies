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
  /** The shared guest office anyone can walk into (as opposed to a team's own workspace). */
  demo?: boolean;
}

/** The message on the meeting room whiteboard. */
export interface BoardNote {
  text: string;
  /** Who wrote it; null once they have left the workspace. */
  authorId: string | null;
  updatedAt: number;
}

/** The games in the game corner. */
export const GAMES = ["snack", "darts"] as const;
export type GameId = (typeof GAMES)[number];

/** Someone's best score in one game. */
export interface GameScore {
  game: GameId;
  userId: string;
  score: number;
  at: number;
}

/** Backdrops for the photo booth. */
export const PHOTO_BACKDROPS = ["garden", "stars", "confetti", "sunset"] as const;
export type PhotoBackdrop = (typeof PHOTO_BACKDROPS)[number];

/** How each pookie poses for the camera (picked for them). */
export const PHOTO_POSES = ["wave", "peace", "jump", "heart"] as const;
export type PhotoPose = (typeof PHOTO_POSES)[number];

/** Someone in a photo, as they looked when it was taken. */
export interface PhotoPerson {
  id: string;
  name: string;
  avatar: AvatarStyle;
  pose: PhotoPose;
}

/** A team photo from the booth, pinned on the photo wall. */
export interface Photo {
  id: string;
  takenAt: number;
  /** Who pressed the button; null once they've left. */
  takenBy: string | null;
  backdrop: PhotoBackdrop;
  /** One to four people, left to right. */
  people: PhotoPerson[];
}

/** Shared things in the office itself, saved for everyone. */
export interface OfficeThings {
  board: BoardNote | null;
  /** Plant id (from the office map) to when it was last watered. */
  plants: Record<string, number>;
  /** Everyone's best score in each game (one per person per game). */
  scores: GameScore[];
  /** The photo wall, newest first. */
  photos: Photo[];
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
  /** Saves a finished round. Only beats your best if it's higher. */
  submitScore(game: GameId, score: number): Promise<ActionResult>;
  /** Pins a booth photo of these people (you must be one of them) to the wall. */
  pinPhoto(backdrop: PhotoBackdrop, peopleIds: string[]): Promise<ActionResult>;
  /** Takes a photo off the wall: anyone in it, whoever took it, or an admin. */
  removePhoto(photoId: string): Promise<ActionResult>;
}

/** Someone signed in with an account, before they're in a workspace. */
export interface Account {
  userId: string;
  email: string | null;
  /** Their name and pookie, once they've set them up. */
  profile: GuestProfile | null;
}

/** Where this browser stands with the office. */
export type OfficeConnection =
  | { phase: "loading" }
  /** Nobody is signed in (or a guest who hasn't picked a name yet). */
  | { phase: "signed-out" }
  /** Signed in with an account, but not in a workspace yet: create one or join one. */
  | { phase: "setup"; account: Account }
  | { phase: "error"; message: string }
  | { phase: "ready"; state: OfficeState };

/** What an invite link is for, shown before you join. */
export interface InvitePreview {
  workspaceName: string;
  memberCount: number;
}

export interface SignUpInput {
  email: string;
  password: string;
  profile: GuestProfile;
}

export interface GuestProfile {
  displayName: string;
  avatar: AvatarStyle;
  timezone: string;
}

export interface SessionActions {
  /** Step into the shared demo office without an account. */
  enterAsGuest(profile: GuestProfile): Promise<ActionResult>;
  /** Make an account (email and password) with your name and pookie. */
  signUp(input: SignUpInput): Promise<ActionResult>;
  signIn(email: string, password: string): Promise<ActionResult>;
  /** Signed in without a profile yet (sign-up was interrupted): save your name and pookie. */
  saveProfile(profile: GuestProfile): Promise<ActionResult>;
  /** Signed in without a workspace: start one, and become its admin. */
  createWorkspace(name: string): Promise<ActionResult>;
  /** Signed in without a workspace: join one with an invite link's token. */
  acceptInvite(token: string): Promise<ActionResult>;
  /** Which workspace an invite link is for, or null if the link doesn't work. */
  previewInvite(token: string): Promise<InvitePreview | null>;
  /** Leave the office and sign out (guests also give up their seat in the demo office). */
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
  /** Someone started the photo booth countdown. */
  | { type: "snap"; id: string; backdrop: PhotoBackdrop }
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
  /** Tells everyone the photo booth countdown just started. */
  sendSnap(backdrop: PhotoBackdrop): void;
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
