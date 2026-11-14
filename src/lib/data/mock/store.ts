import { dateKeyInZone } from "@/lib/dates";
import { PLANT_IDS } from "@/lib/world/map";
import {
  BOARD_MAX,
  CHECKIN_FIELD_MAX,
  INVITE_LIFETIME_MS,
  NAME_MAX,
  NOTE_MAX,
  WORKSPACE_NAME_MAX,
  canChangeRole,
  canRemoveMember,
  cleanLine,
  cleanText,
  validateCheckIn,
  validateName,
} from "../rules";
import type {
  ActionResult,
  CheckIn,
  Invite,
  OfficeActions,
  OfficeConnection,
  OfficeState,
  OfficeStore,
  Role,
} from "../types";
import { LOCAL_CONNECTION_ID, createSeed } from "./seed";
import { simulateStep } from "./simulate";

/**
 * In-memory stand-in for the real backend. Lives for as long as the browser
 * tab does; a reload brings back the original sample office.
 */

const SIMULATION_INTERVAL_MS = 7_000;
const CLOCK_INTERVAL_MS = 20_000;

const OK: ActionResult = { ok: true };

const LOADING: OfficeConnection = { phase: "loading" };

let state: OfficeState | null = null;
let snapshot: OfficeConnection = LOADING;
const listeners = new Set<() => void>();
let simulationTimer: ReturnType<typeof setInterval> | null = null;
let clockTimer: ReturnType<typeof setInterval> | null = null;

function browserZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getState(): OfficeState {
  if (!state) {
    state = createSeed(Date.now(), browserZone());
    snapshot = { phase: "ready", state };
  }
  return state;
}

function getSnapshot(): OfficeConnection {
  getState();
  return snapshot;
}

function commit(recipe: (current: OfficeState) => OfficeState): void {
  state = recipe({ ...getState(), now: Date.now() });
  snapshot = { phase: "ready", state };
  for (const listener of listeners) listener();
}

function startTimers(): void {
  if (simulationTimer === null) {
    simulationTimer = setInterval(() => {
      commit((current) => simulateStep(current, Math.random, () => crypto.randomUUID()));
    }, SIMULATION_INTERVAL_MS);
  }
  if (clockTimer === null) {
    clockTimer = setInterval(() => commit((current) => current), CLOCK_INTERVAL_MS);
  }
}

function stopTimers(): void {
  if (simulationTimer !== null) clearInterval(simulationTimer);
  if (clockTimer !== null) clearInterval(clockTimer);
  simulationTimer = null;
  clockTimer = null;
}

function isValidZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("");
}

const actions: OfficeActions = {
  async setStatus(status) {
    commit((current) => {
      const me = current.currentUserId;
      const note = current.members.find((m) => m.id === me)?.statusNote ?? "";
      return {
        ...current,
        members: current.members.map((m) =>
          m.id === me ? { ...m, status, statusUpdatedAt: current.now } : m,
        ),
        presence: [
          ...current.presence.filter((entry) => entry.userId !== me),
          { userId: me, connectionId: LOCAL_CONNECTION_ID, status, note, updatedAt: current.now },
        ],
      };
    });
    return OK;
  },

  async setStatusNote(rawNote) {
    const note = cleanLine(rawNote, NOTE_MAX);
    commit((current) => {
      const me = current.currentUserId;
      const status = current.members.find((m) => m.id === me)?.status ?? "online";
      return {
        ...current,
        members: current.members.map((m) =>
          m.id === me ? { ...m, statusNote: note, statusUpdatedAt: current.now } : m,
        ),
        presence: [
          ...current.presence.filter((entry) => entry.userId !== me),
          { userId: me, connectionId: LOCAL_CONNECTION_ID, status, note, updatedAt: current.now },
        ],
      };
    });
    return OK;
  },

  async saveCheckIn(input) {
    const valid = validateCheckIn(input);
    if (!valid.ok) return valid;
    commit((current) => {
      const me = current.members.find((m) => m.id === current.currentUserId);
      if (!me) return current;
      const date = dateKeyInZone(current.now, me.timezone);
      const fields = {
        yesterday: cleanText(input.yesterday, CHECKIN_FIELD_MAX),
        today: cleanText(input.today, CHECKIN_FIELD_MAX),
        blockers: cleanText(input.blockers, CHECKIN_FIELD_MAX),
      };
      const existing = current.checkIns.find((c) => c.userId === me.id && c.date === date);
      if (existing) {
        return {
          ...current,
          checkIns: current.checkIns.map((c) =>
            c.id === existing.id ? { ...c, ...fields, updatedAt: current.now } : c,
          ),
        };
      }
      const created: CheckIn = {
        id: crypto.randomUUID(),
        userId: me.id,
        date,
        ...fields,
        createdAt: current.now,
        updatedAt: current.now,
      };
      return { ...current, checkIns: [...current.checkIns, created] };
    });
    return OK;
  },

  async updateProfile(input) {
    const valid = validateName(input.displayName, "Your name", NAME_MAX);
    if (!valid.ok) return valid;
    if (!isValidZone(input.timezone)) {
      return { ok: false, error: "Pick a time zone from the list." };
    }
    commit((current) => ({
      ...current,
      members: current.members.map((m) =>
        m.id === current.currentUserId
          ? {
              ...m,
              displayName: cleanLine(input.displayName, NAME_MAX),
              avatar: input.avatar,
              timezone: input.timezone,
            }
          : m,
      ),
    }));
    return OK;
  },

  async renameWorkspace(name) {
    if (!isAdmin(getState())) return { ok: false, error: "Only admins can rename the workspace." };
    const valid = validateName(name, "Workspace name", WORKSPACE_NAME_MAX);
    if (!valid.ok) return valid;
    commit((current) => ({
      ...current,
      workspace: { ...current.workspace, name: cleanLine(name, WORKSPACE_NAME_MAX) },
    }));
    return OK;
  },

  async setMemberRole(userId, role) {
    const current = getState();
    const allowed = canChangeRole(current.members, current.currentUserId, userId, role);
    if (!allowed.ok) return allowed;
    commit((s) => ({
      ...s,
      members: s.members.map((m) => (m.id === userId ? { ...m, role } : m)),
    }));
    return OK;
  },

  async removeMember(userId) {
    const current = getState();
    const allowed = canRemoveMember(current.members, current.currentUserId, userId);
    if (!allowed.ok) return allowed;
    commit((s) => ({
      ...s,
      members: s.members.filter((m) => m.id !== userId),
      presence: s.presence.filter((entry) => entry.userId !== userId),
      checkIns: s.checkIns.filter((c) => c.userId !== userId),
    }));
    return OK;
  },

  async createInvite() {
    if (!isAdmin(getState())) return { ok: false, error: "Only admins can create invite links." };
    commit((current) => {
      const invite: Invite = {
        id: crypto.randomUUID(),
        token: newToken(),
        createdBy: current.currentUserId,
        createdAt: current.now,
        expiresAt: current.now + INVITE_LIFETIME_MS,
        revokedAt: null,
        useCount: 0,
      };
      return { ...current, invites: [invite, ...current.invites] };
    });
    return OK;
  },

  async revokeInvite(inviteId) {
    if (!isAdmin(getState())) return { ok: false, error: "Only admins can revoke invite links." };
    commit((current) => ({
      ...current,
      invites: current.invites.map((invite) =>
        invite.id === inviteId && invite.revokedAt === null
          ? { ...invite, revokedAt: current.now }
          : invite,
      ),
    }));
    return OK;
  },

  async writeBoard(text) {
    const cleaned = cleanLine(text, BOARD_MAX + 1);
    if (cleaned.length > BOARD_MAX) {
      return { ok: false, error: `Keep the whiteboard to ${BOARD_MAX} characters.` };
    }
    commit((current) => ({
      ...current,
      things: {
        ...current.things,
        board: cleaned
          ? { text: cleaned, authorId: current.currentUserId, updatedAt: current.now }
          : null,
      },
    }));
    return OK;
  },

  async waterPlant(plantId) {
    if (!PLANT_IDS.includes(plantId)) return { ok: false, error: "That isn't a plant." };
    commit((current) => ({
      ...current,
      things: { ...current.things, plants: { ...current.things.plants, [plantId]: current.now } },
    }));
    return OK;
  },
};

function isAdmin(current: OfficeState): boolean {
  return current.members.some((m) => m.id === current.currentUserId && m.role === "admin");
}

export const mockStore: OfficeStore = {
  kind: "sample",
  subscribe(listener) {
    listeners.add(listener);
    startTimers();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stopTimers();
    };
  },
  getSnapshot,
  getServerSnapshot: () => LOADING,
  actions,
  // The sample office has no accounts and nobody else's browser to talk to.
  session: {
    enterAsGuest: async () => OK,
    leave: async () => {},
    retry: () => {},
  },
  world: {
    teammates: "simulated",
    sendPosition: () => true,
    sendWave: () => {},
    sendEmote: () => {},
    subscribe: () => () => {},
  },
};

/**
 * Prototype-only: flip your own role so you can preview the app as an admin
 * or as a regular member. Skips the usual rules on purpose.
 */
export function previewAsRole(role: Role): void {
  commit((current) => ({
    ...current,
    members: current.members.map((m) =>
      m.id === current.currentUserId ? { ...m, role } : m,
    ),
  }));
}
