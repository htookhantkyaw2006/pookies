import type { Ref } from "react";
import type { PlantMood } from "@/lib/data/rules";
import type { BoardNote } from "@/lib/data/types";
import type { RoomMember } from "@/lib/presence/derive";
import { NEAR_DISTANCE, type WorldEntity } from "@/lib/world/engine";

/**
 * A stage draws the office and owns its camera. The map view steps the world
 * and handles input; it talks to whichever stage is showing (flat 2D or 3D)
 * through this handle, in viewport pixels.
 */
export interface StageHandle {
  /** Draws one frame, `dt` seconds after the last. */
  frame(dt: number): void;
  /** A point in the viewport to engine world pixels; null if it misses the floor. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } | null;
  /** Slides the view by this many screen pixels (and stops following you). */
  panBy(dx: number, dy: number): void;
  /** Zooms by a factor (>1 is closer), keeping the point under (sx, sy) still. */
  zoomBy(factor: number, sx?: number, sy?: number): void;
  setFollow(follow: boolean): void;
  /** Screen pixels on the right covered by the side panel. */
  setInset(pixels: number): void;
}

export interface StageProps {
  handle: Ref<StageHandle>;
  room: RoomMember[];
  plantMoods: Record<string, PlantMood>;
  board: BoardNote | null;
  boardAuthor: string | null;
  now: number;
  /** You are standing at the whiteboard: show all of it. */
  showBoardDetails: boolean;
}

/** Copies what a character is doing onto its label element, touching the DOM only on change. */
export function syncAvatarNode(
  node: HTMLElement,
  entity: WorldEntity,
  player: WorldEntity | null,
): void {
  node.style.opacity = entity.visible ? "1" : "0";
  const data = node.dataset;
  const near =
    player !== null &&
    entity !== player &&
    Math.hypot(entity.x - player.x, entity.y - player.y) < NEAR_DISTANCE;

  const set = (key: string, value: string) => {
    if (data[key] !== value) data[key] = value;
  };
  set("walking", String(entity.walking));
  set("lean", String(entity.lean));
  set("near", String(near));
  set("emote", String(entity.emote !== null));
  set("sitting", String(entity.sitting));
  set("x", String(Math.round(entity.x)));
  set("y", String(Math.round(entity.y)));

  const emoji = entity.emote ?? "";
  if (data.emoji !== emoji) {
    data.emoji = emoji;
    const slot = node.querySelector<HTMLElement>("[data-emote-slot]");
    if (slot) slot.textContent = emoji;
  }
  const holding = entity.holding ?? "";
  if (data.holding !== holding) {
    data.holding = holding;
    const slot = node.querySelector<HTMLElement>("[data-hold-slot]");
    if (slot) slot.textContent = holding;
  }
}
