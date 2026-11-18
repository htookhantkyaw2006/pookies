import type { DisplayStatus } from "@/lib/data/types";
import {
  boxHitsSolid,
  buildGrid,
  cellAt,
  cellCenter,
  hasClearLine,
  moveWithCollisions,
  type Grid,
} from "./grid";
import {
  TILE,
  canSit,
  sitPoint,
  toPixels,
  zoneAt,
  type Point,
  type Seat,
  type Thing,
  type TileRect,
  type WorldMap,
  type Zone,
  type ZoneKind,
} from "./map";
import { findPath, nearestWalkable } from "./pathfinding";

/**
 * The walkable office. Plain TypeScript with no React or browser APIs, so it
 * can be stepped in tests. One engine runs in each browser: you steer your own
 * character, and everyone else is moved by whatever feeds `sync` (sample
 * teammates today, live positions from other browsers later).
 */

export const PLAYER_SPEED = 230;
/** Going somewhere picked from Places: a brisk walk, because the office is big. */
export const HURRY_SPEED = PLAYER_SPEED * 1.9;
/** Sample teammates stroll. */
export const TEAMMATE_SPEED = 130;
/** Real teammates move a touch faster than they walk, to catch up with the network. */
export const REMOTE_SPEED = PLAYER_SPEED * 1.2;
/** A real teammate further than this from where we drew them is moved there at once. */
const SNAP_DISTANCE = 420;
/** Collision box around a character's feet, in pixels. */
export const HALF_W = 13;
export const HALF_H = 10;
/** How close you need to be to "be with" someone. */
export const NEAR_DISTANCE = 140;

/** How close you need to stand to a seat to sit in it, in pixels. */
export const SIT_REACH = 60;
/** A click this close to where a seat is drawn means "go and sit there". */
const SEAT_CLICK_RADIUS = 30;

const WAVE_SECONDS = 1.8;
/** How long a coffee lasts in your hand. */
export const COFFEE_SECONDS = 90;
const ARRIVE_EPSILON = 0.5;

export interface WorldEntity {
  id: string;
  x: number;
  y: number;
  /** False while someone is offline: they have left the building. */
  visible: boolean;
  walking: boolean;
  /** Which way they are leaning as they walk: -1 left, 1 right, 0 neither. */
  lean: -1 | 0 | 1;
  path: Point[];
  /** The seat they are sitting in, or heading for (sample teammates). */
  seatId: string | null;
  /** Sitting down in `seatId`. */
  sitting: boolean;
  homeSeatId: string | null;
  /** Walking to the door; disappears on arrival. */
  leaving: boolean;
  /** Live teammates only: their browser has told us where they are. */
  placed: boolean;
  emote: string | null;
  emoteUntil: number;
  /** Something they are carrying for a while, like a coffee. */
  holding: string | null;
  holdingUntil: number;
}

/** The one thing you could do right where you are standing. */
export type Nearby =
  | { kind: "stand"; seat: Seat }
  | { kind: "sit"; seat: Seat }
  | { kind: "thing"; thing: Thing };

export interface WorldPerson {
  id: string;
  status: DisplayStatus;
}

/**
 * Who moves your teammates. "simulated": sample people, walked to a room that
 * matches their status. "live": real people, moved by `setRemotePosition`.
 */
export type TeammateMode = "simulated" | "live";

/** Which rooms a teammate heads for when they pick a status. */
const ZONES_FOR_STATUS: Record<Exclude<DisplayStatus, "offline">, ZoneKind[]> = {
  online: ["desks"],
  busy: ["focus", "meeting"],
  away: ["kitchen", "lounge", "garden", "nap"],
};

export class WorldEngine {
  readonly map: WorldMap;
  readonly grid: Grid;
  readonly entities = new Map<string, WorldEntity>();
  /** Seconds of simulated time so far. */
  time = 0;
  /** Where your character is walking to after a click, for the marker. */
  playerTarget: Point | null = null;

  private readonly random: () => number;
  private mode: TeammateMode = "simulated";
  private playerId: string | null = null;
  private inputX = 0;
  private inputY = 0;
  private zoneId: ZoneKind | null = null;
  private readonly statuses = new Map<string, DisplayStatus>();
  private readonly seatOwners = new Map<string, string>();
  private pendingWaves: Array<{ id: string; at: number }> = [];
  private readonly seats: Map<string, Seat>;
  /** You clicked a seat: sit in it once you get there. */
  private sitOnArrival: string | null = null;
  /** Walking briskly to a place picked from Places. */
  private hurrying = false;

  constructor(map: WorldMap, random: () => number) {
    this.map = map;
    this.grid = buildGrid(map);
    this.random = random;
    this.seats = new Map(map.seats.map((seat) => [seat.id, seat]));
  }

  get player(): WorldEntity | null {
    return this.playerId ? (this.entities.get(this.playerId) ?? null) : null;
  }

  /** The room your character is in (stays on the last room while in a doorway). */
  get zone(): Zone | null {
    return this.map.zones.find((zone) => zone.id === this.zoneId) ?? null;
  }

  setTeammateMode(mode: TeammateMode): void {
    this.mode = mode;
  }

  /**
   * Tells the world who is in the workspace and what their status is. New
   * people appear, removed people vanish. Sample teammates whose status changed
   * walk to a matching room; real ones walk out when they go offline.
   */
  sync(people: readonly WorldPerson[], playerId: string): void {
    this.playerId = playerId;
    const seen = new Set<string>();

    for (const person of people) {
      seen.add(person.id);
      const previous = this.statuses.get(person.id);
      this.statuses.set(person.id, person.status);
      const entity = this.entities.get(person.id);

      if (!entity) {
        this.entities.set(person.id, this.createEntity(person, person.id === playerId));
        continue;
      }
      if (person.id === playerId || previous === person.status) continue;

      if (person.status === "offline") {
        this.getUp(entity);
        this.releaseSeat(entity);
        if (!entity.visible) {
          entity.placed = false;
          continue;
        }
        entity.leaving = true;
        this.route(entity, toPixels(this.map.entrance));
        if (entity.path.length === 0) this.finishLeaving(entity);
      } else if (this.mode === "live") {
        // They're back. Show them as soon as we know where they are.
        if (entity.leaving) {
          entity.leaving = false;
          entity.path = [];
        }
        entity.visible = entity.placed;
      } else {
        if (previous === "offline" || !entity.visible) {
          const door = toPixels(this.map.entrance);
          entity.x = door.x;
          entity.y = door.y;
          entity.visible = true;
        }
        entity.leaving = false;
        this.sendToStatusSeat(entity, person.status);
      }
    }

    for (const [id, entity] of this.entities) {
      if (seen.has(id)) continue;
      this.releaseSeat(entity);
      this.entities.delete(id);
      this.statuses.delete(id);
    }
  }

  /** Direction from the keyboard, each axis -1, 0 or 1. Cancels click-to-walk. */
  setInput(x: number, y: number): void {
    this.inputX = Math.sign(x);
    this.inputY = Math.sign(y);
    if ((this.inputX !== 0 || this.inputY !== 0) && this.player) {
      this.standUp();
      this.player.path = [];
      this.playerTarget = null;
      this.sitOnArrival = null;
      this.hurrying = false;
    }
  }

  /** Walks briskly to a room picked from Places. */
  hurryTo(x: number, y: number): boolean {
    const reached = this.walkTo(x, y);
    this.hurrying = reached;
    return reached;
  }

  /**
   * Walk your character to a point in the world. Clicking a free seat walks
   * there and sits down. False if it can't be reached.
   */
  walkTo(x: number, y: number): boolean {
    const player = this.player;
    if (!player) return false;
    this.hurrying = false;
    const seat = this.seatUnderPoint(x, y);
    if (seat && this.isFree(seat, player)) {
      if (player.sitting && player.seatId === seat.id) return true;
      this.standUp();
      const goal = toPixels(seat);
      const reached = this.goTo(player, goal.x, goal.y);
      this.sitOnArrival = reached ? seat.id : null;
      if (reached && player.path.length === 0) this.sit(seat.id);
      return reached;
    }
    this.standUp();
    this.sitOnArrival = null;
    return this.goTo(player, x, y);
  }

  /** The free seat you are close enough to sit in, if any. */
  nearbySeat(): Seat | null {
    const player = this.player;
    if (!player || player.sitting) return null;
    let best: Seat | null = null;
    let bestDistance = SIT_REACH;
    for (const seat of this.seats.values()) {
      if (!canSit(seat) || !this.isFree(seat, player)) continue;
      const spot = toPixels(seat);
      const distance = Math.hypot(spot.x - player.x, spot.y - player.y);
      if (distance <= bestDistance) {
        best = seat;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Sit in a seat (the nearest free one if none is named). False if there's nowhere to sit. */
  sit(seatId?: string): boolean {
    const player = this.player;
    if (!player) return false;
    const seat = seatId ? this.seats.get(seatId) : this.nearbySeat();
    if (!seat || !canSit(seat) || !this.isFree(seat, player)) return false;
    this.releaseSeat(player);
    this.claimSeat(player, seat);
    this.seatEntity(player, seat);
    this.playerTarget = null;
    this.sitOnArrival = null;
    return true;
  }

  /** Get up out of your seat, back to where you stood to sit down. */
  standUp(): void {
    const player = this.player;
    if (!player?.sitting) return;
    this.getUp(player);
    this.releaseSeat(player);
  }

  /** Walk over to stand next to a teammate. */
  walkToEntity(id: string): boolean {
    const target = this.entities.get(id);
    if (!target || !target.visible || id === this.playerId) return false;
    const offsets: Point[] = [
      { x: 44, y: 0 },
      { x: -44, y: 0 },
      { x: 0, y: 40 },
      { x: 0, y: -40 },
    ];
    for (const offset of offsets) {
      const x = target.x + offset.x;
      const y = target.y + offset.y;
      if (!boxHitsSolid(this.grid, x, y, HALF_W, HALF_H) && this.walkTo(x, y)) return true;
    }
    return this.walkTo(target.x, target.y);
  }

  /**
   * A real teammate's browser reports where they are. They glide there, or
   * appear there if we hadn't placed them yet (or they are far off).
   */
  setRemotePosition(id: string, x: number, y: number, seatId: string | null = null): void {
    const entity = this.entities.get(id);
    if (!entity || id === this.playerId || this.mode !== "live") return;

    const seat = seatId ? this.seats.get(seatId) : undefined;
    if (seat && canSit(seat)) {
      if (entity.seatId !== seat.id) {
        this.releaseSeat(entity);
        if (this.isFree(seat, entity)) this.claimSeat(entity, seat);
        else entity.seatId = seat.id;
      }
      entity.sitting = true;
    } else if (entity.sitting || entity.seatId) {
      this.releaseSeat(entity);
      entity.sitting = false;
    }

    const width = this.map.cols * TILE;
    const height = this.map.rows * TILE;
    const target = {
      x: Math.min(Math.max(x, TILE), width - TILE),
      y: Math.min(Math.max(y, TILE), height - TILE),
    };
    const here = this.statuses.get(id) !== "offline";
    const far = Math.hypot(target.x - entity.x, target.y - entity.y) > SNAP_DISTANCE;

    if (!entity.placed || !entity.visible || entity.leaving || far || entity.sitting) {
      entity.x = target.x;
      entity.y = target.y;
      entity.path = [];
      entity.leaving = false;
      entity.walking = false;
    } else {
      entity.path = [target];
    }
    entity.placed = true;
    entity.visible = here;
  }

  /** Someone else waved. */
  showWave(id: string): void {
    const entity = this.entities.get(id);
    if (entity?.visible && id !== this.playerId) this.showEmote(entity, "👋");
  }

  /** Someone else popped an emoji, or picked something up to carry. */
  showRemoteEmote(id: string, emoji: string, hold: boolean): void {
    const entity = this.entities.get(id);
    if (!entity?.visible || id === this.playerId) return;
    if (hold) this.hold(entity, emoji, COFFEE_SECONDS);
    else this.showEmote(entity, emoji);
  }

  /** Who's standing in an area right now (tile units): you first, then left to right. */
  peopleIn(rect: TileRect): string[] {
    const inside = [...this.entities.values()].filter((entity) => {
      if (!entity.visible || entity.leaving) return false;
      const x = entity.x / TILE;
      const y = entity.y / TILE;
      return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
    });
    inside.sort((a, b) => Number(b.id === this.playerId) - Number(a.id === this.playerId) || a.x - b.x);
    return inside.map((entity) => entity.id);
  }

  /** Everyone listed strikes a pose for the camera (just on this screen). */
  pose(ids: readonly string[]): void {
    const poses = ["✌️", "💖", "✨", "🙌"];
    ids.forEach((id, index) => {
      const entity = this.entities.get(id);
      if (entity?.visible) this.showEmote(entity, poses[index % poses.length]);
    });
  }

  /** A quick emoji over your head. */
  emote(emoji: string): void {
    if (this.player) this.showEmote(this.player, emoji);
  }

  /** Carry something for a while. */
  carry(item: string, seconds: number): void {
    if (this.player) this.hold(this.player, item, seconds);
  }

  /**
   * The one thing you could do here: stand up if you're sitting, otherwise
   * the closest free seat or thing to use within reach.
   */
  nearby(): Nearby | null {
    const player = this.player;
    if (!player) return null;
    if (player.sitting) {
      const seat = player.seatId ? this.seats.get(player.seatId) : undefined;
      return seat ? { kind: "stand", seat } : null;
    }
    let best: Nearby | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const seat = this.nearbySeat();
    if (seat) {
      const spot = toPixels(seat);
      best = { kind: "sit", seat };
      bestDistance = Math.hypot(spot.x - player.x, spot.y - player.y);
    }
    for (const thing of this.map.things) {
      const spot = toPixels(thing);
      const distance = Math.hypot(spot.x - player.x, spot.y - player.y);
      if (distance <= thing.reach && distance < bestDistance) {
        best = { kind: "thing", thing };
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Wave. Sample teammates close by who aren't busy wave back a moment later. */
  wave(): void {
    const player = this.player;
    if (!player) return;
    this.showEmote(player, "👋");
    if (this.mode === "live") return; // real people decide for themselves
    for (const entity of this.entities.values()) {
      if (entity === player || !entity.visible || entity.leaving) continue;
      if (this.statuses.get(entity.id) === "busy") continue;
      if (Math.hypot(entity.x - player.x, entity.y - player.y) > NEAR_DISTANCE * 1.3) continue;
      this.pendingWaves.push({ id: entity.id, at: this.time + 0.4 + this.random() * 0.6 });
    }
  }

  /**
   * Advances the world by `dt` seconds. Returns the room your character just
   * walked into, or null if they are still in the same one.
   */
  step(dt: number): Zone | null {
    const seconds = Math.min(Math.max(dt, 0), 0.05);
    this.time += seconds;

    for (const entity of this.entities.values()) {
      if (entity.id === this.playerId) this.stepPlayer(entity, seconds);
      else this.stepTeammate(entity, seconds);
      if (entity.emote && this.time >= entity.emoteUntil) entity.emote = null;
      if (entity.holding && this.time >= entity.holdingUntil) entity.holding = null;
    }

    if (this.pendingWaves.length > 0) {
      const due = this.pendingWaves.filter((wave) => wave.at <= this.time);
      this.pendingWaves = this.pendingWaves.filter((wave) => wave.at > this.time);
      for (const wave of due) {
        const entity = this.entities.get(wave.id);
        if (entity?.visible) this.showEmote(entity, "👋");
      }
    }

    const player = this.player;
    if (!player) return null;
    const zone = zoneAt(this.map, player.x, player.y);
    if (zone && zone.id !== this.zoneId) {
      this.zoneId = zone.id;
      return zone;
    }
    return null;
  }

  private createEntity(person: WorldPerson, isPlayer: boolean): WorldEntity {
    const entity: WorldEntity = {
      id: person.id,
      x: 0,
      y: 0,
      visible: true,
      walking: false,
      lean: 0,
      path: [],
      seatId: null,
      sitting: false,
      homeSeatId: null,
      leaving: false,
      placed: false,
      emote: null,
      emoteUntil: 0,
      holding: null,
      holdingUntil: 0,
    };

    if (isPlayer) {
      const spawn = toPixels(this.map.spawn);
      entity.x = spawn.x;
      entity.y = spawn.y;
      this.zoneId = zoneAt(this.map, spawn.x, spawn.y)?.id ?? null;
      return entity;
    }

    if (this.mode === "live") {
      // A real person: hidden until their browser says where they are.
      const door = toPixels(this.map.entrance);
      entity.x = door.x;
      entity.y = door.y;
      entity.visible = false;
      return entity;
    }

    // Everyone gets a desk of their own to come back to.
    const home = this.pickSeat(["desks"], null);
    entity.homeSeatId = home?.id ?? null;

    if (person.status === "offline") {
      const door = toPixels(this.map.entrance);
      entity.x = door.x;
      entity.y = door.y;
      entity.visible = false;
      return entity;
    }

    // Already in the office when you arrive: start them at their spot.
    const seat = this.pickSeat(ZONES_FOR_STATUS[person.status], entity.homeSeatId);
    const position = toPixels(seat ?? this.map.entrance);
    entity.x = position.x;
    entity.y = position.y;
    if (seat) {
      this.claimSeat(entity, seat);
      if (canSit(seat)) this.seatEntity(entity, seat);
    }
    return entity;
  }

  private stepPlayer(player: WorldEntity, dt: number): void {
    if (this.inputX !== 0 || this.inputY !== 0) {
      const length = Math.hypot(this.inputX, this.inputY);
      const distance = PLAYER_SPEED * dt;
      const moved = moveWithCollisions(
        this.grid,
        player,
        (this.inputX / length) * distance,
        (this.inputY / length) * distance,
        HALF_W,
        HALF_H,
      );
      player.walking = moved.x !== player.x || moved.y !== player.y;
      player.lean = this.inputX === 0 ? 0 : this.inputX > 0 ? 1 : -1;
      player.x = moved.x;
      player.y = moved.y;
      return;
    }
    this.followPath(player, this.hurrying ? HURRY_SPEED : PLAYER_SPEED, dt);
    if (player.path.length === 0) this.hurrying = false;
    if (player.path.length === 0) {
      this.playerTarget = null;
      if (this.sitOnArrival) {
        const seatId = this.sitOnArrival;
        this.sitOnArrival = null;
        this.sit(seatId);
      }
    }
  }

  private stepTeammate(entity: WorldEntity, dt: number): void {
    const wasMoving = entity.path.length > 0;
    this.followPath(entity, this.mode === "live" ? REMOTE_SPEED : TEAMMATE_SPEED, dt);
    if (!wasMoving || entity.path.length > 0) return;
    if (entity.leaving) {
      this.finishLeaving(entity);
      return;
    }
    const seat = entity.seatId ? this.seats.get(entity.seatId) : undefined;
    if (this.mode === "simulated" && seat && canSit(seat) && !entity.sitting) {
      this.seatEntity(entity, seat);
      // Sample teammates who head to the kitchen come back with a coffee.
      if (seat.zone === "kitchen") this.hold(entity, "☕", COFFEE_SECONDS * 2);
    }
  }

  private followPath(entity: WorldEntity, speed: number, dt: number): void {
    let budget = speed * dt;
    let moved = false;
    while (budget > 0 && entity.path.length > 0) {
      const next = entity.path[0];
      const dx = next.x - entity.x;
      const dy = next.y - entity.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= ARRIVE_EPSILON) {
        entity.path.shift();
        continue;
      }
      const travel = Math.min(budget, distance);
      entity.x += (dx / distance) * travel;
      entity.y += (dy / distance) * travel;
      entity.lean = Math.abs(dx) <= Math.abs(dy) * 0.5 ? 0 : dx > 0 ? 1 : -1;
      budget -= travel;
      moved = true;
      if (travel >= distance - ARRIVE_EPSILON) entity.path.shift();
    }
    entity.walking = moved;
    if (!moved) entity.lean = 0;
  }

  /** Routes the player somewhere and shows the marker there. */
  private goTo(player: WorldEntity, x: number, y: number): boolean {
    const reached = this.route(player, { x, y });
    this.playerTarget = reached ? (player.path.at(-1) ?? null) : null;
    return reached;
  }

  /** A seat drawn under this world point (a chair is drawn a little above the feet). */
  private seatUnderPoint(x: number, y: number): Seat | null {
    for (const seat of this.seats.values()) {
      if (!canSit(seat)) continue;
      const spot = toPixels(sitPoint(seat));
      if (Math.hypot(spot.x - x, spot.y - 14 - y) <= SEAT_CLICK_RADIUS) return seat;
    }
    return null;
  }

  private isFree(seat: Seat, entity: WorldEntity): boolean {
    const owner = this.seatOwners.get(seat.id);
    return owner === undefined || owner === entity.id;
  }

  private seatEntity(entity: WorldEntity, seat: Seat): void {
    const point = toPixels(sitPoint(seat));
    entity.x = point.x;
    entity.y = point.y;
    entity.path = [];
    entity.walking = false;
    entity.lean = 0;
    entity.sitting = true;
  }

  /** Stands up where they stood to sit down. Keeps the seat claimed. */
  private getUp(entity: WorldEntity): void {
    if (!entity.sitting) return;
    entity.sitting = false;
    const seat = entity.seatId ? this.seats.get(entity.seatId) : undefined;
    if (!seat) return;
    const spot = toPixels(seat);
    entity.x = spot.x;
    entity.y = spot.y;
  }

  /** Plans a path for `entity` to `goal`. False if there is no way there. */
  private route(entity: WorldEntity, goal: Point): boolean {
    const startCell = nearestWalkable(this.grid, cellAt(entity.x, entity.y));
    const goalCell = nearestWalkable(this.grid, cellAt(goal.x, goal.y));
    if (!startCell || !goalCell) return false;
    const cells = findPath(this.grid, startCell, goalCell);
    if (!cells) return false;

    // Tile centres are always safe to walk between, so the raw route goes:
    // centre of the tile we're on, each tile centre on the way, then the exact
    // spot inside the last tile (when there is room to stand there). Smoothing
    // then removes every stop a straight, collision-free walk can skip.
    const points: Point[] = [cellCenter(startCell), ...cells.map(cellCenter)];
    const sameCell =
      goalCell.c === Math.floor(goal.x / TILE) && goalCell.r === Math.floor(goal.y / TILE);
    if (sameCell && !boxHitsSolid(this.grid, goal.x, goal.y, HALF_W, HALF_H)) points.push(goal);

    entity.path = this.smooth({ x: entity.x, y: entity.y }, points);
    return true;
  }

  /** Drops waypoints that a straight walk can skip, so paths look natural. */
  private smooth(start: Point, points: Point[]): Point[] {
    const all = [start, ...points];
    const result: Point[] = [];
    let from = 0;
    while (from < all.length - 1) {
      let to = all.length - 1;
      while (to > from + 1 && !hasClearLine(this.grid, all[from], all[to], HALF_W, HALF_H)) {
        to -= 1;
      }
      result.push(all[to]);
      from = to;
    }
    return result;
  }

  private sendToStatusSeat(entity: WorldEntity, status: Exclude<DisplayStatus, "offline">): void {
    const zones = ZONES_FOR_STATUS[status];
    const current = this.map.seats.find((seat) => seat.id === entity.seatId);
    if (current && zones.includes(current.zone)) return; // already at, or heading to, a spot that fits
    this.getUp(entity);
    this.releaseSeat(entity);
    const seat = this.pickSeat(zones, entity.homeSeatId);
    if (!seat) return;
    this.claimSeat(entity, seat);
    const goal = toPixels(seat);
    if (!this.route(entity, goal)) {
      entity.x = goal.x;
      entity.y = goal.y;
      entity.path = [];
    }
  }

  private pickSeat(zones: readonly ZoneKind[], preferredId: string | null): Seat | null {
    const free = this.map.seats.filter(
      (seat) => zones.includes(seat.zone) && !this.seatOwners.has(seat.id),
    );
    const preferred = free.find((seat) => seat.id === preferredId);
    if (preferred) return preferred;
    if (free.length > 0) return free[Math.floor(this.random() * free.length)];
    const anywhere = this.map.seats.filter((seat) => !this.seatOwners.has(seat.id));
    return anywhere.length > 0 ? anywhere[Math.floor(this.random() * anywhere.length)] : null;
  }

  private claimSeat(entity: WorldEntity, seat: Seat): void {
    entity.seatId = seat.id;
    this.seatOwners.set(seat.id, entity.id);
  }

  private releaseSeat(entity: WorldEntity): void {
    if (entity.seatId && this.seatOwners.get(entity.seatId) === entity.id) {
      this.seatOwners.delete(entity.seatId);
    }
    entity.seatId = null;
    entity.sitting = false;
  }

  private finishLeaving(entity: WorldEntity): void {
    entity.leaving = false;
    entity.placed = false;
    entity.visible = false;
    entity.walking = false;
    entity.path = [];
  }

  private hold(entity: WorldEntity, item: string, seconds: number): void {
    entity.holding = item;
    entity.holdingUntil = this.time + seconds;
  }

  private showEmote(entity: WorldEntity, emote: string): void {
    entity.emote = emote;
    entity.emoteUntil = this.time + WAVE_SECONDS;
  }
}
