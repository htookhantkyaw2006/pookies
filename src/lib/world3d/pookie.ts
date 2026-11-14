import { CircleGeometry, Group, RingGeometry, type Mesh } from "three";
import { AVATAR_PALETTE } from "@/lib/avatarPalette";
import type { AvatarStyle, DisplayStatus } from "@/lib/data/types";
import { COLORS, paint } from "./materials";
import { RING_HEIGHT, SHADOW_HEIGHT } from "./room";
import { ball, box, cone, cyl, group, mesh, ring } from "./parts";

const INK = "#2b2233";

/** Status colours for the ring under each character. */
const STATUS_RING: Record<DisplayStatus, string> = {
  online: "#2fa36b",
  busy: "#e5484d",
  away: "#f2a31b",
  offline: "#9a8fa6",
};

/** Characters are drawn a little larger than life next to the furniture, so faces read well. */
const SIZE = 1.25;

/** How tall a standing pookie is to the top of its head, for placing its name tag. */
export const HEAD_HEIGHT = 0.82 * SIZE;

/** Shortest turn from one angle to another. */
function turnToward(from: number, to: number, amount: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * amount;
}

function ears(style: AvatarStyle, body: string, shade: string): Group {
  const result = new Group();
  for (const side of [-1, 1]) {
    if (style.shape === "bear") {
      result.add(ball(0.1, body, side * 0.19, 0.56, -0.02), ball(0.05, shade, side * 0.19, 0.56, 0.05, [1, 1, 0.5]));
    } else if (style.shape === "cat") {
      const outer = cone(0.1, 0.2, body, side * 0.17, 0.62, 0);
      outer.rotation.z = side * -0.35;
      const inner = cone(0.055, 0.12, shade, side * 0.165, 0.6, 0.045);
      inner.rotation.z = side * -0.35;
      result.add(outer, inner);
    } else if (style.shape === "bunny") {
      const outer = ball(0.065, body, side * 0.1, 0.74, 0, [1, 2.8, 0.75]);
      outer.rotation.z = side * -0.15;
      const inner = ball(0.03, shade, side * 0.1, 0.73, 0.04, [1, 4, 0.5]);
      inner.rotation.z = side * -0.15;
      result.add(outer, inner);
    }
  }
  if (style.shape === "round") {
    const stem = cyl(0.012, 0.015, 0.12, shade, 0, 0.62, 0, 8);
    const leaf = ball(0.05, "#7fcf9d", 0.05, 0.69, 0, [1.4, 0.6, 0.8]);
    leaf.rotation.z = -0.5;
    result.add(stem, leaf);
  }
  return result;
}

/** The face for each status: bright eyes when online, focused when busy, dozing when away. */
function face(status: DisplayStatus): Group {
  const z = 0.262;
  const result = new Group();
  if (status === "online") {
    for (const side of [-1, 1]) {
      result.add(ball(0.032, INK, side * 0.1, 0.33, z, [1, 1.15, 0.6]), ball(0.01, COLORS.paper, side * 0.1 + 0.01, 0.345, z + 0.02));
    }
    const smile = ring(0.035, 0.008, INK, 0, 0.27, z + 0.008, Math.PI);
    smile.rotation.z = Math.PI;
    result.add(smile);
  } else if (status === "busy") {
    for (const side of [-1, 1]) result.add(box(0.075, 0.016, 0.02, INK, side * 0.1, 0.33, z));
    result.add(box(0.06, 0.013, 0.02, INK, 0, 0.26, z + 0.005));
  } else {
    for (const side of [-1, 1]) {
      const lid = ring(0.032, 0.008, INK, side * 0.1, 0.34, z, Math.PI);
      lid.rotation.z = Math.PI;
      result.add(lid);
    }
    const mouth = ring(0.022, 0.007, INK, 0, 0.26, z + 0.008, Math.PI);
    mouth.rotation.z = Math.PI;
    result.add(mouth);
  }
  return result;
}

/** What the stage tells a pookie each frame. */
export interface PookiePose {
  x: number;
  z: number;
  /** Height off the floor: above 0 while sitting. */
  y: number;
  walking: boolean;
  sitting: boolean;
  /** Which way to face while sitting. */
  seatYaw: number | null;
  holdingCoffee: boolean;
  visible: boolean;
}

/** One person in the 3D office. */
export class Pookie {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly figure = new Group();
  private faceGroup = new Group();
  private readonly feet: Group;
  private readonly mug: Group;
  private readonly statusRing: Mesh;
  private status: DisplayStatus;
  private yaw = 0;
  private phase = Math.random() * 10;
  private idle = 0;
  private last: { x: number; z: number } | null = null;

  constructor(
    readonly style: AvatarStyle,
    status: DisplayStatus,
    readonly isYou: boolean,
  ) {
    this.status = status;
    const { body, shade } = AVATAR_PALETTE[style.color];

    const torso = ball(0.3, body, 0, 0.3, 0, [1, 0.92, 0.9]);
    const cheeks = group(
      ball(0.034, "#ffb3c3", -0.17, 0.27, 0.215, [1, 0.8, 0.5]),
      ball(0.034, "#ffb3c3", 0.17, 0.27, 0.215, [1, 0.8, 0.5]),
    );
    this.faceGroup = face(status);
    this.figure.add(torso, cheeks, ears(style, body, shade), this.faceGroup);

    // Little arms, one holding a coffee when there is one.
    this.mug = group(
      cyl(0.065, 0.058, 0.13, COLORS.rose, 0.33, 0.25, 0.12),
      cyl(0.058, 0.058, 0.006, "#6b4a36", 0.33, 0.316, 0.12),
      ring(0.035, 0.012, COLORS.rose, 0.4, 0.25, 0.12),
    );
    this.mug.visible = false;
    this.figure.add(ball(0.07, shade, -0.29, 0.22, 0.04, [0.8, 1, 0.8]), ball(0.07, shade, 0.29, 0.22, 0.04, [0.8, 1, 0.8]), this.mug);

    this.feet = group(ball(0.07, shade, -0.11, 0.035, 0.08, [1, 0.6, 1.3]), ball(0.07, shade, 0.11, 0.035, 0.08, [1, 0.6, 1.3]));
    this.body.add(this.figure, this.feet);
    this.body.scale.setScalar(SIZE);
    this.body.traverse((child) => {
      child.castShadow = true;
    });

    // A soft shadow and a ring in the person's status colour, under their feet.
    const shadowGeometry = new CircleGeometry(0.3, 24);
    shadowGeometry.rotateX(-Math.PI / 2);
    const shadow = mesh(shadowGeometry, paint("#2b2233", { opacity: 0.16 }), 0, SHADOW_HEIGHT, 0);
    const ringGeometry = new RingGeometry(isYou ? 0.34 : 0.33, isYou ? 0.42 : 0.38, 32);
    ringGeometry.rotateX(-Math.PI / 2);
    this.statusRing = mesh(ringGeometry, paint(isYou ? "#6b4ee6" : STATUS_RING[status], { opacity: 0.85 }), 0, RING_HEIGHT, 0);
    this.root.add(shadow, this.statusRing, this.body);
  }

  /** How far off the floor the character is raised (sitting on something). */
  get lift(): number {
    return this.body.position.y;
  }

  setStatus(status: DisplayStatus): void {
    if (status === this.status) return;
    this.status = status;
    this.figure.remove(this.faceGroup);
    this.faceGroup.traverse((child) => (child as Mesh).geometry?.dispose());
    this.faceGroup = face(status);
    this.figure.add(this.faceGroup);
    if (!this.isYou) this.statusRing.material = paint(STATUS_RING[status], { opacity: 0.85 });
  }

  /** Moves and animates the character. `calm` turns off the bobbing for people who prefer less motion. */
  update(pose: PookiePose, dt: number, calm: boolean): void {
    this.root.visible = pose.visible;
    if (!pose.visible) {
      this.last = null;
      return;
    }
    this.root.position.set(pose.x, 0, pose.z);
    this.body.position.y = pose.y;
    this.mug.visible = pose.holdingCoffee;
    this.feet.visible = !pose.sitting;

    // Face the way you walk; face the desk when sitting; turn back to the camera when idle.
    let want = this.yaw;
    if (pose.sitting && pose.seatYaw !== null) {
      want = pose.seatYaw;
      this.idle = 0;
    } else if (this.last && pose.walking) {
      const dx = pose.x - this.last.x;
      const dz = pose.z - this.last.z;
      if (Math.hypot(dx, dz) > 1e-4) want = Math.atan2(dx, dz);
      this.idle = 0;
    } else {
      this.idle += dt;
      if (this.idle > 1.2) want = 0;
    }
    this.yaw = calm ? want : turnToward(this.yaw, want, 1 - Math.exp(-dt * 12));
    this.body.rotation.y = this.yaw;
    this.last = { x: pose.x, z: pose.z };

    this.phase += dt;
    if (calm) {
      this.figure.position.y = 0;
      this.figure.scale.set(1, 1, 1);
    } else if (pose.walking) {
      const step = Math.abs(Math.sin(this.phase * 11));
      this.figure.position.y = step * 0.06;
      this.figure.scale.set(1 + (1 - step) * 0.03, 1 - (1 - step) * 0.04, 1);
    } else {
      const breath = Math.sin(this.phase * 2.2) * 0.015;
      this.figure.position.y = 0;
      this.figure.scale.set(1 - breath * 0.5, 1 + breath, 1);
    }
  }

  dispose(): void {
    this.root.traverse((child) => (child as Mesh).geometry?.dispose());
  }
}
