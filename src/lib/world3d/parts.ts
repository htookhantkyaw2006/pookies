import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  Shape,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { paint, type Finish } from "./materials";

/**
 * Small building blocks for furniture. Sizes are in tiles (1 tile = 1 unit);
 * every helper takes the centre position of the piece.
 */

export type Paint = string | Material;

function material(color: Paint, finish?: Finish): Material {
  return typeof color === "string" ? paint(color, finish) : color;
}

export function mesh(
  geometry: BufferGeometry,
  color: Paint,
  x = 0,
  y = 0,
  z = 0,
  finish?: Finish,
): Mesh {
  const result = new Mesh(geometry, material(color, finish));
  result.position.set(x, y, z);
  return result;
}

export function box(
  w: number,
  h: number,
  d: number,
  color: Paint,
  x: number,
  y: number,
  z: number,
  finish?: Finish,
): Mesh {
  return mesh(new BoxGeometry(w, h, d), color, x, y, z, finish);
}

/** A box with softened edges: most furniture is made of these. */
export function rbox(
  w: number,
  h: number,
  d: number,
  color: Paint,
  x: number,
  y: number,
  z: number,
  radius = Math.min(w, h, d) * 0.3,
  finish?: Finish,
): Mesh {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.0005);
  return mesh(new RoundedBoxGeometry(w, h, d, 2, Math.max(r, 0.001)), color, x, y, z, finish);
}

export function cyl(
  radiusTop: number,
  radiusBottom: number,
  h: number,
  color: Paint,
  x: number,
  y: number,
  z: number,
  segments = 18,
  finish?: Finish,
): Mesh {
  return mesh(new CylinderGeometry(radiusTop, radiusBottom, h, segments), color, x, y, z, finish);
}

export function ball(
  r: number,
  color: Paint,
  x: number,
  y: number,
  z: number,
  scale: [number, number, number] = [1, 1, 1],
  finish?: Finish,
): Mesh {
  const result = mesh(new SphereGeometry(r, 18, 12), color, x, y, z, finish);
  result.scale.set(...scale);
  return result;
}

export function cone(
  r: number,
  h: number,
  color: Paint,
  x: number,
  y: number,
  z: number,
  segments = 14,
): Mesh {
  return mesh(new ConeGeometry(r, h, segments), color, x, y, z);
}

export function ring(
  radius: number,
  tube: number,
  color: Paint,
  x: number,
  y: number,
  z: number,
  arc = Math.PI * 2,
): Mesh {
  return mesh(new TorusGeometry(radius, tube, 8, 20, arc), color, x, y, z);
}

/** A flat disc lying on the floor (or on a table). */
export function disc(r: number, color: Paint, x: number, y: number, z: number, finish?: Finish): Mesh {
  const geometry = new CircleGeometry(r, 28);
  geometry.rotateX(-Math.PI / 2);
  return mesh(geometry, color, x, y, z, finish);
}

/**
 * A flat rounded rectangle, `h` thick, lying on the floor plane with its
 * bottom at `y`: table tops, rugs, mats.
 */
export function slab(
  w: number,
  d: number,
  h: number,
  radius: number,
  color: Paint,
  x: number,
  y: number,
  z: number,
  finish?: Finish,
): Mesh {
  const r = Math.min(radius, w / 2 - 0.001, d / 2 - 0.001);
  const shape = new Shape();
  const hw = w / 2;
  const hd = d / 2;
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  const geometry = new ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 6 });
  geometry.rotateX(-Math.PI / 2);
  return mesh(geometry, color, x, y, z, finish);
}

export function group(...children: Object3D[]): Group {
  const result = new Group();
  for (const child of children) result.add(child);
  return result;
}

/** Turns an object to face a direction: yaw 0 faces +z (towards the camera). */
export function turn<T extends Object3D>(object: T, yaw: number): T {
  object.rotation.y = yaw;
  return object;
}

/** Same pseudo-random sequence every time for a given id, so the office looks the same for everyone. */
export function seeded(id: string): () => number {
  let seed = 0;
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) % 2147483647;
  seed = seed || 1;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

export function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length) % list.length];
}
