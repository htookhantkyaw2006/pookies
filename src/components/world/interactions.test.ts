import { describe, expect, it, vi } from "vitest";
import type { OfficeActions, WorldTransport } from "@/lib/data/types";
import { WorldEngine } from "@/lib/world/engine";
import { OFFICE_MAP, TILE } from "@/lib/world/map";
import { describeAction, runAction, type ActionContext } from "./interactions";

function setup() {
  const engine = new WorldEngine(OFFICE_MAP, () => 0.5);
  engine.sync([{ id: "me", status: "online" }], "me");
  const transport: WorldTransport = {
    teammates: "simulated",
    sendPosition: () => true,
    sendWave: vi.fn(),
    sendEmote: vi.fn(),
    sendSnap: vi.fn(),
    subscribe: () => () => {},
  };
  const actions = { waterPlant: vi.fn(async () => ({ ok: true as const })) } as unknown as OfficeActions;
  const open = vi.fn();
  const context: ActionContext = { engine, transport, actions, open };
  const standAt = (x: number, y: number) => {
    engine.player!.x = x * TILE;
    engine.player!.y = y * TILE;
  };
  return { engine, transport, open, context, standAt };
}

describe("things you can use", () => {
  it("washes your hands at the sink: bubbles everyone can see", () => {
    const { engine, transport, context, standAt } = setup();
    standAt(29.5, 20.9);
    const here = engine.nearby()!;
    expect(describeAction(here).label).toBe("Wash hands");
    runAction(here, context);
    expect(engine.player!.emote).toBe("🫧");
    expect(transport.sendEmote).toHaveBeenCalledWith("🫧", false);
  });

  it("opens the mirror and the breathing guide", () => {
    const { engine, open, context, standAt } = setup();
    standAt(29.5, 22.3);
    runAction(engine.nearby()!, context);
    expect(open).toHaveBeenCalledWith("mirror");
    standAt(4, 24.2);
    expect(describeAction(engine.nearby()!).label).toBe("Breathing exercise");
    runAction(engine.nearby()!, context);
    expect(open).toHaveBeenCalledWith("breathe");
  });

  it("opens the arcade, the dartboard and the high-score board in the game corner", () => {
    const { engine, transport, open, context, standAt } = setup();
    standAt(32.6, 2.5);
    expect(describeAction(engine.nearby()!).label).toBe("Play Snack Catch");
    runAction(engine.nearby()!, context);
    expect(open).toHaveBeenCalledWith("arcade");
    expect(transport.sendEmote).toHaveBeenCalledWith("🕹️", false);

    standAt(40.5, 4.5);
    expect(describeAction(engine.nearby()!).label).toBe("Throw darts");
    runAction(engine.nearby()!, context);
    expect(open).toHaveBeenCalledWith("darts");

    standAt(38.6, 2.2);
    expect(describeAction(engine.nearby()!).label).toBe("See high scores");
    runAction(engine.nearby()!, context);
    expect(open).toHaveBeenCalledWith("scores");
  });

  it("opens the photo booth from any spot, and the photo wall beside it", () => {
    const { engine, open, context, standAt } = setup();
    for (const x of [32.5, 35.5]) {
      standAt(x, 22.6);
      expect(describeAction(engine.nearby()!).label).toBe("Photo booth");
    }
    runAction(engine.nearby()!, context);
    expect(open).toHaveBeenCalledWith("booth");
    standAt(39, 22.5);
    expect(describeAction(engine.nearby()!).label).toBe("See the photo wall");
    runAction(engine.nearby()!, context);
    expect(open).toHaveBeenCalledWith("photos");
  });

  it("says 'Go in' at a stall and 'Lie down' at a nap pod", () => {
    const { engine, context, standAt } = setup();
    standAt(26, 22.5);
    let here = engine.nearby()!;
    expect(describeAction(here).label).toBe("Go in");
    runAction(here, context);
    expect(engine.player!.sitting).toBe(true);
    expect(describeAction(engine.nearby()!).label).toBe("Come out");
    runAction(engine.nearby()!, context);
    expect(engine.player!.sitting).toBe(false);

    standAt(3.5, 22.5);
    here = engine.nearby()!;
    expect(describeAction(here).label).toBe("Lie down");
    runAction(here, context);
    expect(describeAction(engine.nearby()!).label).toBe("Get up");
  });
});

describe("Places", () => {
  it("walks you briskly to a far room, and stops hurrying once you take over", () => {
    const { engine } = setup();
    const garden = OFFICE_MAP.zones.find((zone) => zone.id === "garden")!;
    expect(engine.hurryTo(garden.spot.x * TILE, garden.spot.y * TILE)).toBe(true);
    const start = { x: engine.player!.x, y: engine.player!.y };
    engine.step(0.05);
    const brisk = Math.hypot(engine.player!.x - start.x, engine.player!.y - start.y);

    const slow = setup().engine;
    slow.walkTo(garden.spot.x * TILE, garden.spot.y * TILE);
    const from = { x: slow.player!.x, y: slow.player!.y };
    slow.step(0.05);
    const normal = Math.hypot(slow.player!.x - from.x, slow.player!.y - from.y);
    expect(brisk).toBeGreaterThan(normal * 1.5);

    // Taking over with the keys cancels the trip.
    engine.setInput(1, 0);
    expect(engine.player!.path).toHaveLength(0);
  });
});
