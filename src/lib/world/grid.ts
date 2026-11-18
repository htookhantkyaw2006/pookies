import { TILE, type Point, type WorldMap } from "./map";

/** Which tiles can't be walked on: walls plus solid furniture. */
export interface Grid {
  cols: number;
  rows: number;
  solid: Uint8Array;
}

export interface Cell {
  c: number;
  r: number;
}

export function buildGrid(map: WorldMap): Grid {
  const solid = new Uint8Array(map.cols * map.rows);
  for (let r = 0; r < map.rows; r += 1) {
    for (let c = 0; c < map.cols; c += 1) {
      if (map.layout[r][c] !== ".") solid[r * map.cols + c] = 1;
    }
  }
  for (const item of map.furniture) {
    if (!item.solid) continue;
    for (let r = item.rect.y; r < item.rect.y + item.rect.h; r += 1) {
      for (let c = item.rect.x; c < item.rect.x + item.rect.w; c += 1) {
        solid[r * map.cols + c] = 1;
      }
    }
  }
  return { cols: map.cols, rows: map.rows, solid };
}

export function isWalkable(grid: Grid, c: number, r: number): boolean {
  return c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.solid[r * grid.cols + c] === 0;
}

export function cellAt(x: number, y: number): Cell {
  return { c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
}

export function cellCenter(cell: Cell): Point {
  return { x: (cell.c + 0.5) * TILE, y: (cell.r + 0.5) * TILE };
}

/** True if a box centred on (x, y) overlaps any solid tile. */
export function boxHitsSolid(grid: Grid, x: number, y: number, halfW: number, halfH: number): boolean {
  const c0 = Math.floor((x - halfW) / TILE);
  const c1 = Math.floor((x + halfW - 0.001) / TILE);
  const r0 = Math.floor((y - halfH) / TILE);
  const r1 = Math.floor((y + halfH - 0.001) / TILE);
  for (let r = r0; r <= r1; r += 1) {
    for (let c = c0; c <= c1; c += 1) {
      if (!isWalkable(grid, c, r)) return true;
    }
  }
  return false;
}

/**
 * Moves a box by (dx, dy), one axis at a time, so walking into a wall at an
 * angle slides along it instead of stopping dead.
 */
export function moveWithCollisions(
  grid: Grid,
  from: Point,
  dx: number,
  dy: number,
  halfW: number,
  halfH: number,
): Point {
  let { x, y } = from;
  if (dx !== 0 && !boxHitsSolid(grid, x + dx, y, halfW, halfH)) x += dx;
  if (dy !== 0 && !boxHitsSolid(grid, x, y + dy, halfW, halfH)) y += dy;
  return { x, y };
}

const LINE_STEP = 6;

/** Can the box travel in a straight line from a to b without touching anything? */
export function hasClearLine(
  grid: Grid,
  a: Point,
  b: Point,
  halfW: number,
  halfH: number,
): boolean {
  // The line is checked at points LINE_STEP apart. Growing the box by half a
  // step means a corner clipped *between* two checks is still caught.
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(distance / LINE_STEP));
  const margin = LINE_STEP / 2;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    if (boxHitsSolid(grid, x, y, halfW + margin, halfH + margin)) return false;
  }
  return true;
}
