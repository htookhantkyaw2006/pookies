import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
  type DirectionalLight,
  type HemisphereLight,
  type Light,
  type MeshStandardMaterial,
  type Object3D,
  type Scene,
} from "three";
import type { WorldMap } from "@/lib/world/map";
import { currentHour, daylightAt, type Daylight } from "./daylight";
import { getSkyMode, skyHour, subscribeSkyMode } from "./skyMode";

/** How long the day/night switch takes to sweep the sky round. */
const SWEEP_SECONDS = 1.6;
import type { TimedGlow } from "./materials";
import { seeded } from "./parts";

/** How often the light is brought up to date with the clock, in seconds. */
const REFRESH_SECONDS = 30;
const FIREFLIES = 14;

interface NightLight {
  light: Light;
  base: number;
  flicker: boolean;
}

/**
 * Time of day for the 3D office: sky colour, sun and ambient light, lamps and
 * string lights that come on after dark, stars around the building, and a few
 * fireflies over the garden at night.
 */
export class Atmosphere {
  private readonly timed: Array<{ material: MeshStandardMaterial; glow: TimedGlow }> = [];
  private readonly lights: NightLight[] = [];
  private readonly stars: Points;
  private readonly fireflies = new Group();
  private readonly flies: Array<{ mesh: Mesh; x: number; z: number; phase: number }> = [];
  private night = 0;
  private time = 0;
  private untilRefresh = 0;
  /** The hour the sky shows now (null until first lit). */
  private shownHour: number | null = null;
  /** A sweep to a new hour after the day/night switch, `t` from 0 to 1. */
  private sweep: { from: number; to: number; t: number } | null = null;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Scene,
    root: Object3D,
    map: WorldMap,
    private readonly hemi: HemisphereLight,
    private readonly sun: DirectionalLight,
    private readonly calm: boolean,
  ) {
    this.unsubscribe = subscribeSkyMode(() => this.retarget(true));
    const seen = new Set<string>();
    root.traverse((object) => {
      const light = object as Light;
      if (light.isLight && typeof object.userData.nightLight === "number") {
        this.lights.push({ light, base: object.userData.nightLight, flicker: Boolean(object.userData.flicker) });
      }
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const glow = material.userData.timedGlow as TimedGlow | undefined;
        if (glow && !seen.has(material.uuid)) {
          seen.add(material.uuid);
          this.timed.push({ material: material as MeshStandardMaterial, glow });
        }
      }
    });

    this.stars = makeStars(map);
    scene.add(this.stars);

    const garden = map.zones.find((zone) => zone.id === "garden");
    if (garden) {
      const random = seeded("fireflies");
      const geometry = new SphereGeometry(0.035, 6, 4);
      const material = new MeshBasicMaterial({ color: "#eaff9c", transparent: true, opacity: 0.9 });
      for (let i = 0; i < FIREFLIES; i += 1) {
        const mesh = new Mesh(geometry, material);
        this.flies.push({
          mesh,
          x: garden.rect.x + 1 + random() * (garden.rect.w - 2),
          z: garden.rect.y + 1 + random() * (garden.rect.h - 2),
          phase: random() * Math.PI * 2,
        });
        this.fireflies.add(mesh);
      }
      this.fireflies.visible = false;
      scene.add(this.fireflies);
    }
  }

  /** Called every frame. */
  update(dt: number): void {
    this.time += dt;
    if (this.sweep) {
      const sweep = this.sweep;
      sweep.t = Math.min(1, sweep.t + dt / SWEEP_SECONDS);
      const eased = sweep.t * sweep.t * (3 - 2 * sweep.t);
      this.show(sweep.from + (sweep.to - sweep.from) * eased);
      if (sweep.t >= 1) this.sweep = null;
    } else {
      this.untilRefresh -= dt;
      if (this.untilRefresh <= 0) {
        this.untilRefresh = REFRESH_SECONDS;
        this.retarget(false);
      }
    }

    // The fire flickers.
    for (const { light, base, flicker } of this.lights) {
      if (!flicker) continue;
      const wobble = this.calm ? 1 : 0.85 + 0.1 * Math.sin(this.time * 11) + 0.05 * Math.sin(this.time * 23);
      light.intensity = base * (0.2 + 0.8 * this.night) * wobble;
    }

    if (this.fireflies.visible) {
      for (const fly of this.flies) {
        const t = this.time * 0.6 + fly.phase;
        fly.mesh.position.set(fly.x + Math.sin(t) * 0.6, 0.6 + Math.sin(t * 1.7) * 0.25, fly.z + Math.cos(t * 0.8) * 0.6);
      }
    }
  }

  private apply(light: Daylight): void {
    this.night = light.night;
    this.scene.background = new Color(light.sky);
    this.hemi.color.set(light.skyLight);
    this.hemi.groundColor.set(light.groundLight);
    this.hemi.intensity = light.ambient;
    this.sun.color.set(light.sun);
    this.sun.intensity = light.sunIntensity;

    for (const { material, glow } of this.timed) {
      const strength = glow.when === "night" ? 0.08 + 0.92 * light.night : 0.15 + 0.85 * (1 - light.night);
      material.emissiveIntensity = glow.glow * strength;
    }
    for (const { light: lamp, base, flicker } of this.lights) {
      if (!flicker) lamp.intensity = base * (0.2 + 0.8 * light.night);
    }

    const starMaterial = this.stars.material as PointsMaterial;
    starMaterial.opacity = Math.max(0, (light.night - 0.4) / 0.6);
    this.stars.visible = starMaterial.opacity > 0.01;
    this.fireflies.visible = !this.calm && light.night > 0.6;
    if (this.calm && light.night > 0.6) {
      // Still fireflies for people who prefer less motion.
      this.fireflies.visible = true;
      for (const fly of this.flies) fly.mesh.position.set(fly.x, 0.6, fly.z);
    }
  }

  /** The hour the sky should show: the switch's choice, or the clock. */
  private targetHour(): number {
    return skyHour(getSkyMode(), currentHour(new Date(), window.location.search));
  }

  /** Lights the sky for a new hour: straight away, or sweeping the short way round the clock. */
  private retarget(animate: boolean): void {
    const to = this.targetHour();
    const from = this.shownHour;
    if (!animate || this.calm || from === null) {
      this.sweep = null;
      this.show(to);
      return;
    }
    let delta = (((to - from) % 24) + 24) % 24;
    if (delta > 12) delta -= 24;
    if (Math.abs(delta) < 0.01) return;
    this.sweep = { from, to: from + delta, t: 0 };
  }

  private show(hour: number): void {
    this.shownHour = ((hour % 24) + 24) % 24;
    this.apply(daylightAt(this.shownHour));
  }

  dispose(): void {
    this.unsubscribe();
    this.stars.geometry.dispose();
    (this.stars.material as PointsMaterial).dispose();
    const fly = this.flies[0]?.mesh;
    if (fly) {
      fly.geometry.dispose();
      (fly.material as MeshBasicMaterial).dispose();
    }
    this.scene.remove(this.stars, this.fireflies);
  }
}

/** Stars scattered in the dark around (and below) the building, so the office floats in a night sky. */
function makeStars(map: WorldMap): Points {
  const random = seeded("stars");
  const positions: number[] = [];
  while (positions.length < 700 * 3) {
    const x = -70 + random() * (map.cols + 140);
    const z = -70 + random() * (map.rows + 140);
    if (x > -2 && x < map.cols + 2 && z > -2 && z < map.rows + 2) continue;
    positions.push(x, -2 - random() * 6, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const material = new PointsMaterial({ color: "#ffffff", size: 0.28, transparent: true, opacity: 0, depthWrite: false });
  const stars = new Points(geometry, material);
  stars.visible = false;
  return stars;
}
