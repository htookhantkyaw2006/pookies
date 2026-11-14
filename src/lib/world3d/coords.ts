import { TILE } from "@/lib/world/map";

/**
 * The world engine works in pixels (48 to a tile). The 3D office works in
 * tiles: x goes right, z goes down the map (towards the camera), y goes up.
 */

export function toScene(px: number, py: number): { x: number; z: number } {
  return { x: px / TILE, z: py / TILE };
}

export function toPixels(x: number, z: number): { x: number; y: number } {
  return { x: x * TILE, y: z * TILE };
}

/** The camera looks down at this angle from the horizontal. */
export const PITCH = (47 * Math.PI) / 180;
/** Vertical field of view, in degrees. */
export const FOV = 34;
const HALF_FOV = (FOV * Math.PI) / 360;

/** Where the camera sits to look at `target` from `distance` away. */
export function cameraOffset(distance: number): { y: number; z: number } {
  return { y: distance * Math.sin(PITCH), z: distance * Math.cos(PITCH) };
}

/** Floor tiles per screen pixel across, at the point the camera looks at. */
export function tilesPerPixel(distance: number, viewHeight: number): number {
  return (2 * distance * Math.tan(HALF_FOV)) / Math.max(viewHeight, 1);
}

/** Camera distance that shows `tilesAcross` tiles across a view of this size. */
export function distanceFor(tilesAcross: number, viewWidth: number, viewHeight: number): number {
  return (tilesAcross * Math.max(viewHeight, 1)) / (Math.max(viewWidth, 1) * 2 * Math.tan(HALF_FOV));
}

/**
 * Where a ray from the camera through a point on screen lands on the floor
 * (y = 0). `origin` and `direction` describe the ray. Null if it never does.
 */
export function rayToFloor(
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
): { x: number; z: number } | null {
  if (direction.y >= -1e-6) return null;
  const t = -origin.y / direction.y;
  return { x: origin.x + direction.x * t, z: origin.z + direction.z * t };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
