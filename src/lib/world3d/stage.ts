import {
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { PlantMood } from "@/lib/data/rules";
import type { AvatarStyle, DisplayStatus } from "@/lib/data/types";
import type { WorldEngine } from "@/lib/world/engine";
import { TILE, canSit, personalRoomAt, sitPoint, type Seat, type WorldMap } from "@/lib/world/map";
import {
  FOV,
  PITCH,
  cameraOffset,
  clamp,
  distanceFor,
  rayToFloor,
  tilesPerPixel,
  toPixels,
  toScene,
} from "./coords";
import { Atmosphere } from "./atmosphere";
import { Doors } from "./doors";
import { sitSpot, type SitSpot } from "./furniture/seating";
import { SIGN_FREE, SIGN_TAKEN } from "./furniture/washroom";
import { Pookie } from "./pookie";
import { MARKER_HEIGHT } from "./room";
import { buildOfficeScene, type OfficeScene } from "./scene";

export interface StagePerson {
  id: string;
  avatar: AvatarStyle;
  status: DisplayStatus;
  isYou: boolean;
}

const MIN_DISTANCE = 5;
/** Frames slower than this, for a few seconds, turn the fancy lighting down. */
const SLOW_FRAME = 1 / 24;

/**
 * The 3D office: renderer, lights, camera and characters. Driven one frame at
 * a time by the map view's game loop; never runs a loop of its own.
 */
export class OfficeStage3D {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  // A near plane well in front of the camera keeps depth precise, so nearby surfaces don't flicker.
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.5, 300);
  private readonly sun: DirectionalLight;
  private readonly office: OfficeScene;
  private readonly atmosphere: Atmosphere;
  private readonly doors: Doors;
  /** Where everyone is this frame (tile units), for the doors. */
  private readonly nearDoors: Array<{ x: number; y: number }> = [];
  private readonly people = new Map<string, Pookie>();
  private readonly seats = new Map<string, SitSpot>();
  private readonly seatList: Array<{ seat: Seat; spot: SitSpot }> = [];
  /** Each stall door's sign, with the seat that is inside that stall. */
  private readonly stallSigns: Array<{ sign: Mesh; seatId: string }> = [];
  /** Each personal space room's sign, with that room's number (0-based). */
  private readonly roomSigns: Array<{ sign: Mesh; room: number }> = [];
  private readonly raycaster = new Raycaster();
  private readonly scratch = new Vector3();
  private boardTexture: CanvasTexture | null = null;

  /** Where the camera looks now, and where you last looked to when not following. */
  private readonly target: { x: number; z: number };
  private readonly free: { x: number; z: number };
  private follow = true;
  private distance = 14;
  private zoomChosen = false;
  private width = 1;
  private height = 1;
  private inset = 0;
  private snap = true;
  private readonly calm: boolean;
  private slowFor = 0;
  private reduced = false;
  private markerPulse = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly map: WorldMap,
    moods: Record<string, PlantMood>,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const center = { x: map.cols / 2, z: map.rows / 2 };
    this.target = { ...center };
    this.free = { ...center };

    this.scene.background = new Color("#5b4a63");
    const hemi = new HemisphereLight("#fff8f0", "#b9a6c9", 1.45);
    this.scene.add(hemi);
    this.sun = new DirectionalLight("#fff1dc", 2.9);
    this.sun.position.set(center.x - 9, 20, center.z + 11);
    this.sun.target.position.set(center.x, 0, center.z);
    this.sun.castShadow = true;
    const shadow = this.sun.shadow;
    // Sharp enough for the bigger building, but never more than the device can hold.
    const shadowSize = Math.min(4096, this.renderer.capabilities.maxTextureSize);
    shadow.mapSize.set(shadowSize, shadowSize);
    // The sun's shadows cover the whole building, whatever its size.
    const reach = Math.hypot(map.cols, map.rows) / 2 + 2;
    Object.assign(shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: 1, far: 100 });
    shadow.camera.updateProjectionMatrix();
    shadow.bias = -0.0004;
    shadow.normalBias = 0.02;
    shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);

    this.office = buildOfficeScene(map, moods);
    this.scene.add(this.office.root);
    this.atmosphere = new Atmosphere(this.scene, this.office.root, map, hemi, this.sun, this.calm);
    this.doors = new Doors(map, this.calm);
    this.scene.add(this.doors.root);
    for (const seat of map.seats) {
      const spot = sitSpot(map, seat);
      this.seats.set(seat.id, spot);
      if (canSit(seat)) this.seatList.push({ seat, spot });
    }
    this.office.root.traverse((object) => {
      const roomSign = object.userData.roomSign as string | undefined;
      const room = roomSign ? map.furniture.find((item) => item.id === roomSign) : undefined;
      if (room) {
        const index = personalRoomAt(room.rect.x, room.rect.y + 1);
        if (index >= 0) this.roomSigns.push({ sign: object as Mesh, room: index });
      }
      const stallId = object.userData.stallSign as string | undefined;
      const stall = stallId ? map.furniture.find((item) => item.id === stallId) : undefined;
      if (!stall) return;
      const inside = map.seats.find((seat) => {
        const at = sitPoint(seat);
        const { x, y, w, h } = stall.rect;
        return seat.kind === "stall" && at.x >= x && at.x <= x + w && at.y >= y && at.y <= y + h;
      });
      if (inside) this.stallSigns.push({ sign: object as Mesh, seatId: inside.id });
    });
  }

  resize(width: number, height: number): void {
    this.width = Math.max(width, 1);
    this.height = Math.max(height, 1);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    if (!this.zoomChosen) {
      const across = this.width < 640 ? 10 : 17;
      this.distance = clamp(distanceFor(across, this.width - this.inset, this.height), MIN_DISTANCE, this.maxDistance());
    } else {
      this.distance = clamp(this.distance, MIN_DISTANCE, this.maxDistance());
    }
    this.snap = true;
  }

  /** Zoomed all the way out, the whole office fits on screen. */
  private maxDistance(): number {
    const fit = distanceFor(this.map.cols + 3, Math.max(this.width - this.inset, 1), this.height);
    return clamp(fit, 16, 120);
  }

  setPeople(people: StagePerson[]): void {
    const seen = new Set<string>();
    for (const person of people) {
      seen.add(person.id);
      const existing = this.people.get(person.id);
      const same =
        existing &&
        existing.isYou === person.isYou &&
        existing.style.color === person.avatar.color &&
        existing.style.shape === person.avatar.shape;
      if (existing && same) {
        existing.setStatus(person.status);
        continue;
      }
      if (existing) {
        this.scene.remove(existing.root);
        existing.dispose();
      }
      const pookie = new Pookie(person.avatar, person.status, person.isYou);
      pookie.root.visible = false;
      this.people.set(person.id, pookie);
      this.scene.add(pookie.root);
    }
    for (const [id, pookie] of this.people) {
      if (seen.has(id)) continue;
      this.scene.remove(pookie.root);
      pookie.dispose();
      this.people.delete(id);
    }
  }

  setPlantMoods(moods: Record<string, PlantMood>): void {
    for (const [id, mood] of Object.entries(moods)) this.office.setPlantMood(id, mood);
  }

  /** Writes the team message onto the whiteboard. */
  setBoard(text: string | null, fontFamily: string): void {
    const surface = this.office.board;
    if (!surface) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1100;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    if (text) {
      context.fillStyle = "#4a2fb8";
      let size = 76;
      const lines = (fontSize: number) => {
        context.font = `600 ${fontSize}px ${fontFamily}`;
        const words = text.split(" ");
        const result: string[] = [];
        let line = "";
        for (const word of words) {
          const attempt = line ? `${line} ${word}` : word;
          if (context.measureText(attempt).width > canvas.width - 80 && line) {
            result.push(line);
            line = word;
          } else {
            line = attempt;
          }
        }
        if (line) result.push(line);
        return result;
      };
      let wrapped = lines(size);
      while (wrapped.length > 2 && size > 40) {
        size -= 6;
        wrapped = lines(size);
      }
      wrapped.slice(0, 3).forEach((line, index, all) => {
        context.fillText(line, canvas.width / 2, canvas.height / 2 + (index - (all.length - 1) / 2) * size * 1.1);
      });
    } else {
      context.fillStyle = "#b9b0c4";
      context.font = `italic 500 52px ${fontFamily}`;
      context.fillText("Nothing on the board yet", canvas.width / 2, canvas.height / 2);
    }
    // A couple of marker doodles in the corners.
    context.strokeStyle = "#e5484d";
    context.lineWidth = 6;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(40, 220);
    context.quadraticCurveTo(70, 190, 100, 220);
    context.stroke();

    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.boardTexture?.dispose();
    this.boardTexture = texture;
    const old = surface.material as MeshStandardMaterial;
    surface.material = new MeshStandardMaterial({ map: texture, roughness: 0.4 });
    if (old.map) old.dispose();
  }

  /** Draws one frame. */
  frame(dt: number, engine: WorldEngine): void {
    this.watchSpeed(dt);
    this.atmosphere.update(dt);

    for (const [id, entity] of engine.entities) {
      const pookie = this.people.get(id);
      if (!pookie) continue;
      const spot = entity.sitting && entity.seatId ? this.seats.get(entity.seatId) : undefined;
      const at = toScene(entity.x, entity.y);
      pookie.update(
        {
          x: spot ? spot.x : at.x,
          z: spot ? spot.z : at.z,
          y: spot ? spot.y : 0,
          walking: entity.walking,
          sitting: Boolean(spot),
          seatYaw: spot ? spot.yaw : null,
          holdingCoffee: entity.holding === "☕",
          // Nobody is seen inside a toilet stall.
          visible: entity.visible && spot?.pose !== "hidden",
          lying: spot?.pose === "lie",
        },
        dt,
        this.calm,
      );
    }

    // Stall doors say whether someone's inside.
    if (this.stallSigns.length > 0) {
      const taken = new Set<string>();
      for (const entity of engine.entities.values()) {
        if (entity.sitting && entity.seatId) taken.add(entity.seatId);
      }
      for (const { sign, seatId } of this.stallSigns) {
        sign.material = taken.has(seatId) ? SIGN_TAKEN : SIGN_FREE;
      }
    }

    // Doors swing open for anyone walking up to them.
    this.nearDoors.length = 0;
    for (const entity of engine.entities.values()) {
      if (entity.visible) this.nearDoors.push({ x: entity.x / TILE, y: entity.y / TILE });
    }
    this.doors.update(dt, this.nearDoors);

    // Personal space rooms say "In use" while anyone's inside.
    if (this.roomSigns.length > 0) {
      const used = new Set<number>();
      for (const entity of engine.entities.values()) {
        if (entity.visible) used.add(personalRoomAt(entity.x / TILE, entity.y / TILE));
      }
      for (const { sign, room } of this.roomSigns) {
        sign.material = used.has(room) ? SIGN_TAKEN : SIGN_FREE;
      }
    }

    const marker = this.office.marker;
    const goal = engine.playerTarget;
    marker.visible = goal !== null;
    if (goal) {
      const at = toScene(goal.x, goal.y);
      marker.position.set(at.x, MARKER_HEIGHT, at.z);
      this.markerPulse = (this.markerPulse + dt) % 1;
      const grow = this.calm ? 1 : 1 + this.markerPulse * 0.6;
      marker.scale.set(grow, 1, grow);
    }

    this.moveCamera(dt, engine);
    this.renderer.render(this.scene, this.camera);
  }

  private moveCamera(dt: number, engine: WorldEngine): void {
    const perPixel = tilesPerPixel(this.distance, this.height);
    const covered = this.inset * perPixel;
    // Don't drift far past the building's back wall: that's just empty sky.
    const topMargin = ((this.height / 2) * perPixel) / Math.sin(PITCH) * 0.45;
    const bounds = { minX: 0, maxX: this.map.cols + covered, minZ: Math.min(topMargin, this.map.rows / 2), maxZ: this.map.rows };
    // When the whole office fits on screen, keep it in the middle instead of chasing you;
    // otherwise stop at the office's side walls rather than showing empty space past them.
    const halfWidth = (this.width / 2) * perPixel;
    if ((this.width - this.inset) * perPixel >= this.map.cols) {
      bounds.minX = bounds.maxX = this.map.cols / 2 + covered / 2;
    } else {
      bounds.minX = halfWidth;
      bounds.maxX = this.map.cols + covered - halfWidth;
    }
    if (this.follow) {
      const player = engine.player;
      const at = player ? toScene(player.x, player.y) : { x: this.map.cols / 2, z: this.map.rows / 2 };
      // Keep you in the middle of the part of the map the side panel doesn't cover.
      const wantX = clamp(at.x + covered / 2, bounds.minX, bounds.maxX);
      const wantZ = clamp(at.z, bounds.minZ, bounds.maxZ);
      const ease = this.snap || this.calm ? 1 : 1 - Math.exp(-dt * 7);
      this.target.x += (wantX - this.target.x) * ease;
      this.target.z += (wantZ - this.target.z) * ease;
    } else {
      this.free.x = clamp(this.free.x, bounds.minX, bounds.maxX);
      this.free.z = clamp(this.free.z, bounds.minZ, bounds.maxZ);
      this.target.x = this.free.x;
      this.target.z = this.free.z;
    }
    this.snap = false;
    this.placeCamera();
  }

  private placeCamera(): void {
    const offset = cameraOffset(this.distance);
    this.camera.position.set(this.target.x, offset.y, this.target.z + offset.z);
    this.camera.lookAt(this.target.x, 0, this.target.z);
    this.camera.updateMatrixWorld();
  }

  /** If the device struggles for a few seconds, drop shadows and sharpness to keep things smooth. */
  private watchSpeed(dt: number): void {
    if (this.reduced || document.visibilityState !== "visible" || dt > 0.25) return;
    this.slowFor = dt > SLOW_FRAME ? this.slowFor + dt : Math.max(0, this.slowFor - dt * 0.5);
    if (this.slowFor < 3) return;
    this.reduced = true;
    this.renderer.shadowMap.enabled = false;
    this.sun.castShadow = false;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.width, this.height, false);
    this.scene.traverse((object) => {
      const material = (object as { material?: { needsUpdate: boolean } }).material;
      if (material) material.needsUpdate = true;
    });
  }

  /** A point in the office (tiles) to viewport pixels; `depth` sorts labels front to back. */
  project(x: number, y: number, z: number): { x: number; y: number; depth: number; visible: boolean } {
    const point = this.scratch.set(x, y, z).project(this.camera);
    return {
      x: ((point.x + 1) / 2) * this.width,
      y: ((1 - point.y) / 2) * this.height,
      depth: Math.round(z * 100),
      visible: point.z < 1,
    };
  }

  /** Where a person's name tag goes: just above their head. */
  labelPoint(id: string): { x: number; y: number; depth: number; visible: boolean } | null {
    const pookie = this.people.get(id);
    if (!pookie) return null;
    const { x, z } = pookie.root.position;
    return this.project(x, pookie.labelHeight, z);
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } | null {
    // A click on a seat's cushion means "sit there", even though the floor behind it is what's under the pointer.
    const seat = this.seatAt(sx, sy);
    if (seat) {
      const point = sitPoint(seat);
      // The engine treats a click just above a seat's spot as a click on the seat.
      return { x: point.x * TILE, y: point.y * TILE - 14 };
    }
    const hit = this.floorAt(sx, sy);
    return hit ? toPixels(hit.x, hit.z) : null;
  }

  /** The seat whose cushion is under the pointer, nearest the camera first. */
  private seatAt(sx: number, sy: number): Seat | null {
    const ndc = new Vector2((sx / this.width) * 2 - 1, -(sy / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const { origin, direction } = this.raycaster.ray;
    if (direction.y >= -1e-6) return null;
    let best: Seat | null = null;
    let nearest = Number.POSITIVE_INFINITY;
    for (const { seat, spot } of this.seatList) {
      const t = (spot.y + 0.08 - origin.y) / direction.y;
      const x = origin.x + direction.x * t;
      const z = origin.z + direction.z * t;
      if (Math.hypot(x - spot.x, z - spot.z) <= 0.42 && t < nearest) {
        best = seat;
        nearest = t;
      }
    }
    return best;
  }

  private floorAt(sx: number, sy: number): { x: number; z: number } | null {
    const ndc = new Vector2((sx / this.width) * 2 - 1, -(sy / this.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return rayToFloor(this.raycaster.ray.origin, this.raycaster.ray.direction);
  }

  panBy(dx: number, dy: number): void {
    this.setFollow(false);
    const perPixel = tilesPerPixel(this.distance, this.height);
    this.free.x -= dx * perPixel;
    this.free.z -= (dy * perPixel) / Math.sin(PITCH);
  }

  zoomBy(factor: number, sx?: number, sy?: number): void {
    const next = clamp(this.distance / factor, MIN_DISTANCE, this.maxDistance());
    this.zoomChosen = true;
    if (this.follow || sx === undefined || sy === undefined) {
      this.distance = next;
      return;
    }
    // Keep the spot under the pointer still while zooming.
    const before = this.floorAt(sx, sy);
    this.distance = next;
    this.placeCamera();
    const after = this.floorAt(sx, sy);
    if (before && after) {
      this.free.x += before.x - after.x;
      this.free.z += before.z - after.z;
    }
  }

  setFollow(follow: boolean): void {
    if (follow) {
      this.follow = true;
      return;
    }
    if (!this.follow) return;
    this.follow = false;
    this.free.x = this.target.x;
    this.free.z = this.target.z;
  }

  setInset(pixels: number): void {
    this.inset = pixels;
  }

  dispose(): void {
    for (const pookie of this.people.values()) pookie.dispose();
    this.people.clear();
    this.boardTexture?.dispose();
    this.atmosphere.dispose();
    this.doors.dispose();
    this.office.dispose();
    this.renderer.dispose();
  }
}
