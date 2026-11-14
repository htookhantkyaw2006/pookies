/**
 * Which office this browser shows: the 3D one, or the flat 2D map. Remembered
 * per browser; devices without WebGL always get 2D.
 */

export type ViewMode = "2d" | "3d";

const STORAGE_KEY = "pookies-view";

let mode: ViewMode | null = null;
let webgl: boolean | null = null;
const listeners = new Set<() => void>();

export function supports3D(): boolean {
  if (webgl === null) {
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
  }
  return webgl;
}

export function getViewMode(): ViewMode {
  if (mode === null) {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage can be blocked; fall back to the default.
    }
    mode = saved !== "2d" && supports3D() ? "3d" : "2d";
  }
  return mode;
}

export function setViewMode(next: ViewMode): void {
  mode = next === "3d" && !supports3D() ? "2d" : next;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The choice just won't stick.
  }
  for (const listener of listeners) listener();
}

export function subscribeViewMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
