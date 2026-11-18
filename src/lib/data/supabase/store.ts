import type { RealtimeChannel } from "@supabase/supabase-js";
import { PLANT_IDS } from "@/lib/world/map";
import {
  BOARD_MAX,
  NAME_MAX,
  NOTE_MAX,
  SHARED_EMOTES,
  WORKSPACE_NAME_MAX,
  canChangeRole,
  canRemoveMember,
  cleanLine,
  validateCheckIn,
  validateName,
  validatePhoto,
  validateScore,
  PHOTO_WALL_SIZE,
} from "../rules";
import {
  AVATAR_COLORS,
  AVATAR_SHAPES,
  GAMES,
  PHOTO_BACKDROPS,
  PHOTO_POSES,
  type ActionResult,
  type AvatarColor,
  type AvatarShape,
  type CheckIn,
  type GameId,
  type GameScore,
  type Invite,
  type Member,
  type OfficeActions,
  type OfficeConnection,
  type OfficeStore,
  type OfficeThings,
  type Photo,
  type PhotoBackdrop,
  type PhotoPerson,
  type PhotoPose,
  type PresenceEntry,
  type PresenceStatus,
  type WorldMessage,
  type Workspace,
} from "../types";
import { getSupabase } from "./client";
import type { Json } from "./database.types";

/**
 * The real office. Saved data lives in Postgres and is read through row-level
 * security; who is here right now, where they are standing and their waves
 * travel over one live channel per workspace.
 */

const CLOCK_INTERVAL_MS = 20_000;
const REFETCH_DELAY_MS = 120;
const HISTORY_DAYS = 31;

const LOADING: OfficeConnection = { phase: "loading" };
const SIGNED_OUT: OfficeConnection = { phase: "signed-out" };
const OK: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

const UNREACHABLE = "We couldn't reach the office. Check your connection and try again.";
const STATUSES: readonly PresenceStatus[] = ["online", "busy", "away"];

type Table =
  | "workspaces"
  | "workspace_members"
  | "profiles"
  | "check_ins"
  | "invites"
  | "game_scores"
  | "photos";
/** Everything there is to read, for a first load or catching up after a dropped connection. */
const ALL_TABLES = ["workspaces", "workspace_members", "check_ins", "invites", "game_scores", "photos"] as const;

let snapshot: OfficeConnection = LOADING;
const listeners = new Set<() => void>();
const worldListeners = new Set<(message: WorldMessage) => void>();

let started = false;
let userId: string | null = null;
let workspace: Workspace | null = null;
let members: Member[] = [];
let checkIns: CheckIn[] = [];
let invites: Invite[] = [];
let presence: PresenceEntry[] = [];
const NO_THINGS: OfficeThings = { board: null, plants: {}, scores: [], photos: [] };
let things: OfficeThings = NO_THINGS;

let channel: RealtimeChannel | null = null;
let channelReady = false;
/** Bumped on every (re)connect so a slow, older attempt can't overwrite a newer one. */
let attempt = 0;
/** While the guest form is signing in and joining, it drives the connection itself. */
let entering = false;
const pendingTables = new Set<Table>();
let refetchTimer: ReturnType<typeof setTimeout> | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

function setConnection(next: OfficeConnection): void {
  snapshot = next;
  notify();
}

/** Rebuilds the snapshot from the current pieces and tells React. */
function publish(): void {
  if (!userId || !workspace) return;
  setConnection({
    phase: "ready",
    state: {
      now: Date.now(),
      workspace,
      currentUserId: userId,
      members,
      presence,
      checkIns,
      invites,
      things,
    },
  });
}

/** Database errors raised on purpose carry a message written for people. */
function describe(error: { code?: string; message: string }): string {
  return error.code === "P0001" ? error.message : "Something went wrong. Please try again.";
}

function toColor(value: string): AvatarColor {
  return (AVATAR_COLORS as readonly string[]).includes(value) ? (value as AvatarColor) : "lilac";
}

function toShape(value: string): AvatarShape {
  return (AVATAR_SHAPES as readonly string[]).includes(value) ? (value as AvatarShape) : "bear";
}

// ---------------------------------------------------------------------------
// Reading saved data
// ---------------------------------------------------------------------------

interface WorkspaceAndThings {
  workspace: Workspace;
  /** Scores and photos live in their own tables and are read separately. */
  things: Omit<OfficeThings, "scores" | "photos">;
}

function toPlants(value: Json): Record<string, number> {
  const plants: Record<string, number> = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return plants;
  for (const [id, at] of Object.entries(value)) {
    const time = typeof at === "string" ? Date.parse(at) : Number.NaN;
    if (Number.isFinite(time)) plants[id] = time;
  }
  return plants;
}

async function fetchWorkspace(id: string): Promise<WorkspaceAndThings | null> {
  const { data, error } = await getSupabase()
    .from("workspaces")
    .select("id, name, board_text, board_by, board_at, plants")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    workspace: { id: data.id, name: data.name },
    things: {
      board: data.board_text
        ? {
            text: data.board_text,
            authorId: data.board_by,
            updatedAt: data.board_at ? Date.parse(data.board_at) : Date.now(),
          }
        : null,
      plants: toPlants(data.plants),
    },
  };
}

async function fetchMembers(workspaceId: string): Promise<Member[]> {
  const { data, error } = await getSupabase()
    .from("workspace_members")
    .select(
      "user_id, role, status, status_note, status_updated_at, joined_at, profiles(display_name, avatar_color, avatar_shape, timezone)",
    )
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return data.flatMap((row) => {
    const profile = row.profiles;
    if (!profile) return [];
    return [
      {
        id: row.user_id,
        displayName: profile.display_name,
        avatar: { color: toColor(profile.avatar_color), shape: toShape(profile.avatar_shape) },
        timezone: profile.timezone,
        role: row.role,
        status: row.status,
        statusNote: row.status_note,
        statusUpdatedAt: Date.parse(row.status_updated_at),
        joinedAt: Date.parse(row.joined_at),
      },
    ];
  });
}

async function fetchCheckIns(workspaceId: string): Promise<CheckIn[]> {
  const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await getSupabase()
    .from("check_ins")
    .select("id, user_id, check_in_date, yesterday, today, blockers, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .gte("check_in_date", since);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    date: row.check_in_date,
    yesterday: row.yesterday,
    today: row.today,
    blockers: row.blockers,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
  }));
}

async function fetchScores(workspaceId: string): Promise<GameScore[]> {
  const { data, error } = await getSupabase()
    .from("game_scores")
    .select("game, user_id, score, scored_at")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return data
    .filter((row) => (GAMES as readonly string[]).includes(row.game))
    .map((row) => ({
      game: row.game as GameId,
      userId: row.user_id,
      score: row.score,
      at: Date.parse(row.scored_at),
    }));
}

/** One person in a saved photo, if the row looks right. */
function toPhotoPerson(value: Json): PhotoPerson | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { id, name, color, shape, pose } = value;
  if (typeof id !== "string" || typeof name !== "string") return null;
  return {
    id,
    name,
    avatar: { color: toColor(String(color)), shape: toShape(String(shape)) },
    pose: (PHOTO_POSES as readonly string[]).includes(String(pose)) ? (pose as PhotoPose) : "wave",
  };
}

async function fetchPhotos(workspaceId: string): Promise<Photo[]> {
  const { data, error } = await getSupabase()
    .from("photos")
    .select("id, taken_by, taken_at, backdrop, people")
    .eq("workspace_id", workspaceId)
    .order("taken_at", { ascending: false })
    .limit(PHOTO_WALL_SIZE);
  if (error) throw error;
  return data.flatMap((row) => {
    const people = Array.isArray(row.people)
      ? row.people.map(toPhotoPerson).filter((person): person is PhotoPerson => person !== null)
      : [];
    if (people.length === 0 || !(PHOTO_BACKDROPS as readonly string[]).includes(row.backdrop)) return [];
    return [
      {
        id: row.id,
        takenAt: Date.parse(row.taken_at),
        takenBy: row.taken_by,
        backdrop: row.backdrop as PhotoBackdrop,
        people,
      },
    ];
  });
}

/** Only admins get rows back; for everyone else this is simply empty. */
async function fetchInvites(workspaceId: string): Promise<Invite[]> {
  const { data, error } = await getSupabase()
    .from("invites")
    .select("id, token, created_by, created_at, expires_at, revoked_at, use_count")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    token: row.token,
    createdBy: row.created_by ?? "",
    createdAt: Date.parse(row.created_at),
    expiresAt: Date.parse(row.expires_at),
    revokedAt: row.revoked_at ? Date.parse(row.revoked_at) : null,
    useCount: row.use_count,
  }));
}

/** Re-reads the given tables. Returns false if we turn out to be gone from the workspace. */
async function refresh(tables: Iterable<Table>): Promise<boolean> {
  if (!workspace || !userId) return false;
  const id = workspace.id;
  const wanted = new Set(tables);
  // A role change can change who may see invite links.
  if (wanted.has("workspace_members")) wanted.add("invites");

  // Someone leaving takes their scores with them, and steps out of the photos.
  if (wanted.has("workspace_members")) {
    wanted.add("game_scores");
    wanted.add("photos");
  }

  const [nextWorkspace, nextMembers, nextCheckIns, nextInvites, nextScores, nextPhotos] = await Promise.all([
    wanted.has("workspaces") ? fetchWorkspace(id) : { workspace, things },
    wanted.has("workspace_members") || wanted.has("profiles") ? fetchMembers(id) : members,
    wanted.has("check_ins") ? fetchCheckIns(id) : checkIns,
    wanted.has("invites") ? fetchInvites(id) : invites,
    wanted.has("game_scores") ? fetchScores(id) : things.scores,
    wanted.has("photos") ? fetchPhotos(id) : things.photos,
  ]);

  if (!nextWorkspace || !nextMembers.some((member) => member.id === userId)) return false;
  workspace = nextWorkspace.workspace;
  things = { ...nextWorkspace.things, scores: nextScores, photos: nextPhotos };
  members = nextMembers;
  checkIns = nextCheckIns;
  invites = nextInvites;
  return true;
}

function scheduleRefetch(table: unknown): void {
  const known: readonly string[] = [...ALL_TABLES, "profiles"];
  if (typeof table !== "string" || !known.includes(table)) return;
  pendingTables.add(table as Table);
  if (refetchTimer) return;
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    const tables = [...pendingTables];
    pendingTables.clear();
    const current = attempt;
    refresh(tables)
      .then((stillHere) => {
        if (current !== attempt) return;
        if (stillHere) publish();
        else disconnect(SIGNED_OUT); // removed from the workspace
      })
      .catch(() => {
        // A missed refresh is harmless: the next change or reconnect catches up.
      });
  }, REFETCH_DELAY_MS);
}

// ---------------------------------------------------------------------------
// The live channel: presence, positions, waves, "something changed" pings
// ---------------------------------------------------------------------------

function emitWorld(message: WorldMessage): void {
  for (const listener of worldListeners) listener(message);
}

function readPresence(source: RealtimeChannel): PresenceEntry[] {
  const state = source.presenceState<{ status?: unknown; note?: unknown; updated_at?: unknown }>();
  const entries: PresenceEntry[] = [];
  for (const [key, metas] of Object.entries(state)) {
    for (const meta of metas) {
      const status = STATUSES.find((candidate) => candidate === meta.status);
      if (!status) continue;
      entries.push({
        userId: key,
        connectionId: meta.presence_ref,
        status,
        note: typeof meta.note === "string" ? cleanLine(meta.note, NOTE_MAX) : "",
        updatedAt: typeof meta.updated_at === "number" ? meta.updated_at : 0,
      });
    }
  }
  return entries;
}

/** Announces this tab on the presence channel with our current status. */
async function trackMe(): Promise<void> {
  const me = members.find((member) => member.id === userId);
  if (!channel || !channelReady || !me) return;
  await channel.track({ status: me.status, note: me.statusNote, updated_at: me.statusUpdatedAt });
}

function closeChannel(): void {
  if (channel) void getSupabase().removeChannel(channel);
  channel = null;
  channelReady = false;
  presence = [];
}

async function openChannel(workspaceId: string, me: string): Promise<void> {
  closeChannel();
  const supabase = getSupabase();
  await supabase.realtime.setAuth(); // private channels check who we are
  const current = attempt;

  const next = supabase.channel(`workspace:${workspaceId}`, {
    config: { private: true, presence: { key: me }, broadcast: { self: false } },
  });

  next
    .on("presence", { event: "sync" }, () => {
      if (channel !== next) return;
      presence = readPresence(next);
      publish();
    })
    .on("presence", { event: "join" }, ({ key }) => {
      if (channel === next && key !== me) emitWorld({ type: "peer-joined", id: key });
    })
    .on("broadcast", { event: "db" }, ({ payload }) => {
      if (channel === next) scheduleRefetch((payload as { table?: unknown } | null)?.table);
    })
    .on("broadcast", { event: "pos" }, ({ payload }) => {
      const data = payload as { id?: unknown; x?: unknown; y?: unknown; seat?: unknown } | null;
      if (
        channel === next &&
        data &&
        typeof data.id === "string" &&
        data.id !== me &&
        typeof data.x === "number" &&
        typeof data.y === "number" &&
        Number.isFinite(data.x) &&
        Number.isFinite(data.y)
      ) {
        emitWorld({
          type: "position",
          id: data.id,
          x: data.x,
          y: data.y,
          seat: typeof data.seat === "string" && data.seat.length <= 40 ? data.seat : null,
        });
      }
    })
    .on("broadcast", { event: "emote" }, ({ payload }) => {
      const data = payload as { id?: unknown; emoji?: unknown; hold?: unknown } | null;
      if (
        channel === next &&
        data &&
        typeof data.id === "string" &&
        data.id !== me &&
        typeof data.emoji === "string" &&
        SHARED_EMOTES.includes(data.emoji)
      ) {
        emitWorld({ type: "emote", id: data.id, emoji: data.emoji, hold: data.hold === true });
      }
    })
    .on("broadcast", { event: "snap" }, ({ payload }) => {
      const data = payload as { id?: unknown; backdrop?: unknown } | null;
      if (
        channel === next &&
        data &&
        typeof data.id === "string" &&
        data.id !== me &&
        typeof data.backdrop === "string" &&
        (PHOTO_BACKDROPS as readonly string[]).includes(data.backdrop)
      ) {
        emitWorld({ type: "snap", id: data.id, backdrop: data.backdrop as PhotoBackdrop });
      }
    })
    .on("broadcast", { event: "wave" }, ({ payload }) => {
      const id = (payload as { id?: unknown } | null)?.id;
      if (channel === next && typeof id === "string" && id !== me) emitWorld({ type: "wave", id });
    })
    .subscribe((status) => {
      if (channel !== next || current !== attempt) return;
      if (status === "SUBSCRIBED") {
        const reconnected = channelReady === false && snapshot.phase === "ready";
        channelReady = true;
        void trackMe();
        // After a dropped connection, catch up on anything we missed.
        if (reconnected) {
          for (const table of ALL_TABLES) scheduleRefetch(table);
        }
      } else {
        channelReady = false;
      }
    });

  channel = next;
}

// ---------------------------------------------------------------------------
// Connecting and disconnecting
// ---------------------------------------------------------------------------

function disconnect(next: OfficeConnection): void {
  attempt += 1;
  closeChannel();
  workspace = null;
  things = NO_THINGS;
  members = [];
  checkIns = [];
  invites = [];
  if (next.phase === "signed-out") userId = null;
  setConnection(next);
}

async function connect(me: string): Promise<void> {
  const current = (attempt += 1);
  userId = me;
  if (snapshot.phase !== "ready") setConnection(LOADING);

  try {
    const { data: membership, error } = await getSupabase()
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", me)
      .maybeSingle();
    if (error) throw error;
    if (current !== attempt) return;

    if (!membership) {
      // Signed in, but not in a workspace yet (a guest who hasn't picked a name).
      closeChannel();
      workspace = null;
      setConnection(SIGNED_OUT);
      return;
    }

    workspace = { id: membership.workspace_id, name: "" };
    const stillHere = await refresh(ALL_TABLES);
    if (current !== attempt) return;
    if (!stillHere) {
      workspace = null;
      setConnection(SIGNED_OUT);
      return;
    }

    await openChannel(membership.workspace_id, me);
    if (current !== attempt) return;
    publish();
  } catch {
    if (current === attempt) setConnection({ phase: "error", message: UNREACHABLE });
  }
}

function start(): void {
  if (started) return;
  started = true;

  // Fires straight away with the saved session (or none), then on every change.
  // Work is deferred: the auth library asks not to call it back from in here.
  getSupabase().auth.onAuthStateChange((event, session) => {
    const next = session?.user.id ?? null;
    setTimeout(() => {
      if (entering) return;
      if (!next) {
        if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") disconnect(SIGNED_OUT);
      } else if (next !== userId || snapshot.phase === "loading") {
        void connect(next);
      }
    }, 0);
  });

  setInterval(() => {
    if (snapshot.phase === "ready") publish(); // keeps "now" fresh for clocks and "5 min ago"
  }, CLOCK_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Changes my own status or note everywhere at once: screen, presence, database. */
async function saveMyStatus(change: { status?: PresenceStatus; note?: string }): Promise<ActionResult> {
  const me = members.find((member) => member.id === userId);
  if (!me || !workspace) return fail(UNREACHABLE);

  const now = Date.now();
  const status = change.status ?? me.status;
  const note = change.note ?? me.statusNote;
  members = members.map((member) =>
    member.id === me.id ? { ...member, status, statusNote: note, statusUpdatedAt: now } : member,
  );
  presence = presence.map((entry) =>
    entry.userId === me.id ? { ...entry, status, note, updatedAt: now } : entry,
  );
  publish();
  void trackMe();

  const { error } = await getSupabase()
    .from("workspace_members")
    .update({ status, status_note: note, status_updated_at: new Date(now).toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("user_id", me.id);
  return error ? fail(describe(error)) : OK;
}

/** Runs a change, then re-reads the tables it touched so the screen is right at once. */
async function act(
  run: () => PromiseLike<{ error: { code?: string; message: string } | null }>,
  tables: Table[],
): Promise<ActionResult> {
  const { error } = await run();
  if (error) return fail(describe(error));
  try {
    if (await refresh(tables)) publish();
  } catch {
    // The live "something changed" ping will bring the screen up to date.
  }
  return OK;
}

const actions: OfficeActions = {
  setStatus: (status) => saveMyStatus({ status }),
  setStatusNote: (note) => saveMyStatus({ note: cleanLine(note, NOTE_MAX) }),

  async saveCheckIn(input) {
    const valid = validateCheckIn(input);
    if (!valid.ok) return valid;
    return act(
      () =>
        getSupabase().rpc("save_check_in", {
          p_yesterday: input.yesterday,
          p_today: input.today,
          p_blockers: input.blockers,
        }),
      ["check_ins"],
    );
  },

  async updateProfile(input) {
    const valid = validateName(input.displayName, "Your name", NAME_MAX);
    if (!valid.ok) return valid;
    if (!userId) return fail(UNREACHABLE);
    const me = userId;
    return act(
      () =>
        getSupabase()
          .from("profiles")
          .update({
            display_name: cleanLine(input.displayName, NAME_MAX),
            avatar_color: input.avatar.color,
            avatar_shape: input.avatar.shape,
            timezone: input.timezone,
          })
          .eq("id", me),
      ["profiles"],
    );
  },

  async renameWorkspace(name) {
    const valid = validateName(name, "Workspace name", WORKSPACE_NAME_MAX);
    if (!valid.ok) return valid;
    if (!workspace) return fail(UNREACHABLE);
    const id = workspace.id;
    const { data, error } = await getSupabase()
      .from("workspaces")
      .update({ name: cleanLine(name, WORKSPACE_NAME_MAX) })
      .eq("id", id)
      .select("id, name");
    if (error) return fail(describe(error));
    // The database quietly changes nothing for people who aren't admins.
    if (data.length === 0) return fail("Only admins can rename the workspace.");
    workspace = data[0];
    publish();
    return OK;
  },

  async setMemberRole(targetId, role) {
    const allowed = canChangeRole(members, userId ?? "", targetId, role);
    if (!allowed.ok) return allowed;
    return act(
      () => getSupabase().rpc("set_member_role", { p_user_id: targetId, p_role: role }),
      ["workspace_members"],
    );
  },

  async removeMember(targetId) {
    const allowed = canRemoveMember(members, userId ?? "", targetId);
    if (!allowed.ok) return allowed;
    return act(
      () => getSupabase().rpc("remove_member", { p_user_id: targetId }),
      ["workspace_members", "check_ins"],
    );
  },

  createInvite: () => act(() => getSupabase().rpc("create_invite"), ["invites"]),

  revokeInvite: (inviteId) =>
    act(() => getSupabase().rpc("revoke_invite", { p_invite_id: inviteId }), ["invites"]),

  async writeBoard(text) {
    const cleaned = cleanLine(text, BOARD_MAX + 1);
    if (cleaned.length > BOARD_MAX) return fail(`Keep the whiteboard to ${BOARD_MAX} characters.`);
    return act(() => getSupabase().rpc("write_board", { p_text: cleaned }), ["workspaces"]);
  },

  async waterPlant(plantId) {
    if (!PLANT_IDS.includes(plantId)) return fail("That isn't a plant.");
    // Show the fresh plant straight away; the save catches up.
    things = { ...things, plants: { ...things.plants, [plantId]: Date.now() } };
    publish();
    return act(() => getSupabase().rpc("water_plant", { p_plant: plantId }), ["workspaces"]);
  },

  async submitScore(game, score) {
    const valid = validateScore(game, score);
    if (!valid.ok) return valid;
    const mine = things.scores.find((item) => item.game === game && item.userId === userId);
    // Nothing to save if it doesn't beat your best.
    if (mine && mine.score >= score) return OK;
    return act(() => getSupabase().rpc("submit_score", { p_game: game, p_score: score }), ["game_scores"]);
  },

  async pinPhoto(backdrop, peopleIds) {
    const valid = validatePhoto(backdrop, peopleIds, userId ?? "", members);
    if (!valid.ok) return valid;
    return act(
      () => getSupabase().rpc("pin_photo", { p_backdrop: backdrop, p_people: peopleIds }),
      ["photos"],
    );
  },

  removePhoto: (photoId) =>
    act(() => getSupabase().rpc("remove_photo", { p_photo: photoId }), ["photos"]),
};

export const supabaseStore: OfficeStore = {
  kind: "live",

  subscribe(listener) {
    listeners.add(listener);
    start();
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
  getServerSnapshot: () => LOADING,
  actions,

  session: {
    async enterAsGuest(profile) {
      const valid = validateName(profile.displayName, "Your name", NAME_MAX);
      if (!valid.ok) return valid;

      const supabase = getSupabase();
      entering = true;
      try {
        let me = (await supabase.auth.getSession()).data.session?.user.id ?? null;
        if (!me) {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error || !data.user) {
            return fail(
              error?.message.toLowerCase().includes("anonymous")
                ? "Guest mode is switched off for this project. Turn on anonymous sign-ins in Supabase to use it."
                : "We couldn't start a guest session. Please try again.",
            );
          }
          me = data.user.id;
        }

        const { error } = await supabase.rpc("join_demo_workspace", {
          p_display_name: cleanLine(profile.displayName, NAME_MAX),
          p_avatar_color: profile.avatar.color,
          p_avatar_shape: profile.avatar.shape,
          p_timezone: profile.timezone,
        });
        if (error) return fail(describe(error));

        await connect(me);
        return snapshot.phase === "ready" ? OK : fail(UNREACHABLE);
      } finally {
        entering = false;
      }
    },

    async leave() {
      const supabase = getSupabase();
      // Guests can't come back as the same person, so tidy their seat away.
      await supabase.rpc("leave_demo_workspace");
      await supabase.auth.signOut();
      disconnect(SIGNED_OUT);
    },

    retry() {
      if (userId) void connect(userId);
      else disconnect(SIGNED_OUT);
    },
  },

  world: {
    teammates: "live",
    sendPosition(x, y, seat) {
      if (!channel || !channelReady || !userId) return false;
      void channel.send({
        type: "broadcast",
        event: "pos",
        payload: { id: userId, x: Math.round(x), y: Math.round(y), seat },
      });
      return true;
    },
    sendEmote(emoji, hold) {
      if (!channel || !channelReady || !userId) return;
      void channel.send({ type: "broadcast", event: "emote", payload: { id: userId, emoji, hold } });
    },
    sendWave() {
      if (!channel || !channelReady || !userId) return;
      void channel.send({ type: "broadcast", event: "wave", payload: { id: userId } });
    },
    sendSnap(backdrop) {
      if (!channel || !channelReady || !userId) return;
      void channel.send({ type: "broadcast", event: "snap", payload: { id: userId, backdrop } });
    },
    subscribe(listener) {
      worldListeners.add(listener);
      return () => {
        worldListeners.delete(listener);
      };
    },
  },
};
