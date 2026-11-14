import { WorldEngine } from "./engine";
import { OFFICE_MAP } from "./map";

let engine: WorldEngine | null = null;

/**
 * The one world for this browser tab. Kept outside React so everyone stays
 * where they were when you visit another page and come back. Browser only:
 * call it from effects and event handlers, never while rendering.
 */
export function getWorldEngine(): WorldEngine {
  engine ??= new WorldEngine(OFFICE_MAP, Math.random);
  return engine;
}
