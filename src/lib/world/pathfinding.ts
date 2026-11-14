import { isWalkable, type Cell, type Grid } from "./grid";

const STRAIGHT = 1;
const DIAGONAL = Math.SQRT2;

const NEIGHBOURS: Array<{ dc: number; dr: number; cost: number }> = [
  { dc: 1, dr: 0, cost: STRAIGHT },
  { dc: -1, dr: 0, cost: STRAIGHT },
  { dc: 0, dr: 1, cost: STRAIGHT },
  { dc: 0, dr: -1, cost: STRAIGHT },
  { dc: 1, dr: 1, cost: DIAGONAL },
  { dc: 1, dr: -1, cost: DIAGONAL },
  { dc: -1, dr: 1, cost: DIAGONAL },
  { dc: -1, dr: -1, cost: DIAGONAL },
];

/**
 * A* over the tile grid, eight directions, never cutting a corner between two
 * solid tiles. Returns the cells to step through (start excluded, goal
 * included), an empty list if already there, or null if there is no way.
 */
export function findPath(grid: Grid, start: Cell, goal: Cell): Cell[] | null {
  if (!isWalkable(grid, start.c, start.r) || !isWalkable(grid, goal.c, goal.r)) return null;
  if (start.c === goal.c && start.r === goal.r) return [];

  const size = grid.cols * grid.rows;
  const index = (c: number, r: number) => r * grid.cols + c;
  const cost = new Float64Array(size).fill(Infinity);
  const score = new Float64Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open: number[] = [];

  const heuristic = (c: number, r: number) => {
    const dc = Math.abs(c - goal.c);
    const dr = Math.abs(r - goal.r);
    return STRAIGHT * (dc + dr) + (DIAGONAL - 2 * STRAIGHT) * Math.min(dc, dr);
  };

  const startIndex = index(start.c, start.r);
  const goalIndex = index(goal.c, goal.r);
  cost[startIndex] = 0;
  score[startIndex] = heuristic(start.c, start.r);
  open.push(startIndex);

  while (open.length > 0) {
    let best = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (score[open[i]] < score[open[best]]) best = i;
    }
    const current = open[best];
    open[best] = open[open.length - 1];
    open.pop();

    if (current === goalIndex) {
      const path: Cell[] = [];
      for (let at = current; at !== startIndex; at = cameFrom[at]) {
        path.push({ c: at % grid.cols, r: Math.floor(at / grid.cols) });
      }
      return path.reverse();
    }
    if (closed[current]) continue;
    closed[current] = 1;

    const c = current % grid.cols;
    const r = Math.floor(current / grid.cols);
    for (const step of NEIGHBOURS) {
      const nc = c + step.dc;
      const nr = r + step.dr;
      if (!isWalkable(grid, nc, nr)) continue;
      if (step.dc !== 0 && step.dr !== 0) {
        if (!isWalkable(grid, nc, r) || !isWalkable(grid, c, nr)) continue;
      }
      const next = index(nc, nr);
      if (closed[next]) continue;
      const tentative = cost[current] + step.cost;
      if (tentative < cost[next]) {
        cost[next] = tentative;
        score[next] = tentative + heuristic(nc, nr);
        cameFrom[next] = current;
        open.push(next);
      }
    }
  }
  return null;
}

/** The closest walkable cell to `cell` (itself, if it is walkable). */
export function nearestWalkable(grid: Grid, cell: Cell, maxRadius = 8): Cell | null {
  if (isWalkable(grid, cell.c, cell.r)) return cell;
  let best: Cell | null = null;
  let bestDistance = Infinity;
  for (let radius = 1; radius <= maxRadius && best === null; radius += 1) {
    for (let dr = -radius; dr <= radius; dr += 1) {
      for (let dc = -radius; dc <= radius; dc += 1) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        const c = cell.c + dc;
        const r = cell.r + dr;
        if (!isWalkable(grid, c, r)) continue;
        const distance = Math.hypot(dc, dr);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = { c, r };
        }
      }
    }
  }
  return best;
}
