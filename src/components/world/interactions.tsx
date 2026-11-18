import {
  Armchair,
  BedDouble,
  Camera,
  Images,
  Coffee,
  DoorOpen,
  Droplet,
  Droplets,
  Gamepad2,
  PenLine,
  Sparkles,
  Target,
  Trophy,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { OfficeActions, WorldTransport } from "@/lib/data/types";
import { playSound } from "@/lib/sound";
import { COFFEE_SECONDS, type Nearby, type WorldEngine } from "@/lib/world/engine";
import type { SeatKind, Thing, ThingKind } from "@/lib/world/map";

/**
 * What pressing F (or the action button) does for each thing you can walk up
 * to. Adding something new to the office means adding a line here, not a new
 * branch in the map view.
 */

/** Things that open a panel over the map. Each is named after the thing that opens it. */
export type Activity = Extract<
  ThingKind,
  "board" | "mirror" | "breathe" | "arcade" | "darts" | "scores" | "booth" | "photos"
>;

export interface ActionContext {
  engine: WorldEngine;
  transport: WorldTransport;
  actions: OfficeActions;
  open: (activity: Activity) => void;
}

interface ThingAction {
  label: string;
  icon: LucideIcon;
  run: (context: ActionContext, thing: Thing) => void;
}

/** An emoji over your head, shown to everyone. */
function pop(context: ActionContext, emoji: string): void {
  context.engine.emote(emoji);
  context.transport.sendEmote(emoji, false);
}

const THINGS: Record<ThingKind, ThingAction> = {
  coffee: {
    label: "Make coffee",
    icon: Coffee,
    run: ({ engine, transport }) => {
      engine.carry("☕", COFFEE_SECONDS);
      transport.sendEmote("☕", true);
      playSound("coffee");
    },
  },
  plant: {
    label: "Water plant",
    icon: Droplets,
    run: (context, thing) => {
      pop(context, "💧");
      playSound("water");
      void context.actions.waterPlant(thing.id);
    },
  },
  board: { label: "Write on whiteboard", icon: PenLine, run: ({ open }) => open("board") },
  sink: {
    label: "Wash hands",
    icon: Droplet,
    run: (context) => {
      pop(context, "🫧");
      playSound("water");
    },
  },
  mirror: { label: "Look in the mirror", icon: Sparkles, run: ({ open }) => open("mirror") },
  breathe: { label: "Breathing exercise", icon: Wind, run: ({ open }) => open("breathe") },
  arcade: {
    label: "Play Snack Catch",
    icon: Gamepad2,
    run: (context) => {
      pop(context, "🕹️");
      context.open("arcade");
    },
  },
  darts: {
    label: "Throw darts",
    icon: Target,
    run: (context) => {
      pop(context, "🎯");
      context.open("darts");
    },
  },
  scores: { label: "See high scores", icon: Trophy, run: ({ open }) => open("scores") },
  booth: { label: "Photo booth", icon: Camera, run: ({ open }) => open("booth") },
  photos: { label: "See the photo wall", icon: Images, run: ({ open }) => open("photos") },
};

/** Seats that aren't really "sitting" get their own words. */
const SEAT_WORDS: Partial<Record<SeatKind, { sit: string; stand: string; icon: LucideIcon }>> = {
  stall: { sit: "Go in", stand: "Come out", icon: DoorOpen },
  bed: { sit: "Lie down", stand: "Get up", icon: BedDouble },
};

/** The label and icon for the action button. */
export function describeAction(nearby: Nearby): { label: string; icon: LucideIcon } {
  if (nearby.kind === "thing") return THINGS[nearby.thing.kind];
  const words = SEAT_WORDS[nearby.seat.kind];
  if (nearby.kind === "sit") return { label: words?.sit ?? "Sit", icon: words?.icon ?? Armchair };
  return { label: words?.stand ?? "Stand up", icon: words?.icon ?? Armchair };
}

/** Does it: sits, stands, or uses the thing. */
export function runAction(nearby: Nearby, context: ActionContext): void {
  const { engine } = context;
  if (nearby.kind === "stand") {
    engine.standUp();
    playSound("stand");
  } else if (nearby.kind === "sit") {
    if (engine.sit(nearby.seat.id)) playSound(nearby.seat.kind === "bed" ? "calm" : "sit");
  } else {
    THINGS[nearby.thing.kind].run(context, nearby.thing);
  }
}
