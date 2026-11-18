"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import {
  BASKET_WIDTH,
  BASKET_Y,
  ITEM_SIZE,
  ROUND_SECONDS,
  newSnackCatch,
  stepSnackCatch,
  type SnackCatchState,
} from "@/lib/games/snackCatch";
import { playSound } from "@/lib/sound";
import { GamePanel, RoundResult, useMyBest } from "./GamePanel";

type Phase = "ready" | "playing" | "done";

/** Draws the field: falling snacks and the basket. The card behind gives the colour. */
function draw(canvas: HTMLCanvasElement, game: SnackCatchState | null, basketX: number): void {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // The floor.
  ctx.fillStyle = "rgba(143, 115, 223, 0.18)";
  ctx.fillRect(0, height * (BASKET_Y + 0.05), width, height);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Emoji take the fill's transparency, so draw them fully opaque.
  ctx.fillStyle = "#000000";
  ctx.font = `${Math.round(ITEM_SIZE * width * 1.5)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  for (const item of game?.items ?? []) ctx.fillText(item.emoji, item.x * width, item.y * height);

  // The basket: a soft tray with a rim, so it reads at any size.
  const bw = BASKET_WIDTH * width;
  const bx = basketX * width - bw / 2;
  const by = BASKET_Y * height;
  ctx.fillStyle = "#c9a27a";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, height * 0.06, [4, 4, 12, 12]);
  ctx.fill();
  ctx.fillStyle = "#ecd0a8";
  ctx.beginPath();
  ctx.roundRect(bx - 3, by - 3, bw + 6, 8, 4);
  ctx.fill();
}

/**
 * The arcade: catch falling snacks in a basket for a minute, dodge the alarm
 * clocks. Arrow keys or A/D to move; drag or use the buttons on a phone.
 */
export function SnackCatch({ onClose }: { onClose: () => void }) {
  const { actions } = useOffice();
  const myBest = useMyBest("snack");
  const [phase, setPhase] = useState<Phase>("ready");
  const [hud, setHud] = useState({ score: 0, left: ROUND_SECONDS });
  const [result, setResult] = useState<{ score: number; previousBest: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef<SnackCatchState | null>(null);
  const held = useRef({ left: false, right: false });
  const pointer = useRef<number | null>(null);
  const bestAtStart = useRef(0);

  const start = () => {
    game.current = newSnackCatch(Math.floor(Math.random() * 2 ** 31));
    bestAtStart.current = myBest;
    held.current = { left: false, right: false };
    pointer.current = null;
    setHud({ score: 0, left: ROUND_SECONDS });
    setResult(null);
    setPhase("playing");
  };

  // Keys: move while playing; Space or Enter starts.
  const startKey = useEffectEvent((event: KeyboardEvent) => {
    if (phase !== "ready") return;
    event.preventDefault();
    start();
  });
  useEffect(() => {
    const set = (event: KeyboardEvent, down: boolean) => {
      if (event.code === "ArrowLeft" || event.code === "KeyA") held.current.left = down;
      else if (event.code === "ArrowRight" || event.code === "KeyD") held.current.right = down;
      else return false;
      pointer.current = null;
      return true;
    };
    const onDown = (event: KeyboardEvent) => {
      if (set(event, true)) event.preventDefault();
      else if (event.code === "Space" || event.code === "Enter") startKey(event);
    };
    const onUp = (event: KeyboardEvent) => void set(event, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // The game loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (phase !== "playing") {
      draw(canvas, null, game.current?.basketX ?? 0.5);
      return;
    }
    let frame = 0;
    let last = performance.now();
    let lastHud = 0;
    const tick = (now: number) => {
      const state = game.current;
      if (!state) return;
      const dt = (now - last) / 1000;
      last = now;
      const { left, right } = held.current;
      const steer = pointer.current !== null ? { to: pointer.current } : ((Number(right) - Number(left)) as -1 | 0 | 1);
      stepSnackCatch(state, dt, steer);
      for (const event of state.events) playSound(event === "alarm" ? "oops" : "catch");
      draw(canvas, state, state.basketX);
      if (now - lastHud > 100 || state.over) {
        lastHud = now;
        setHud({ score: state.score, left: Math.ceil(ROUND_SECONDS - state.time) });
      }
      if (state.over) {
        setResult({ score: state.score, previousBest: bestAtStart.current });
        setPhase("done");
        playSound("cheer");
        if (state.score > 0) void actions.submitScore("snack", state.score);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, actions]);

  /** The basket slides towards the pointer (or finger) over the field. */
  const follow = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== "playing") return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current = (event.clientX - rect.left) / rect.width;
  };

  const hold = (side: "left" | "right", down: boolean) => {
    held.current[side] = down;
    pointer.current = null;
  };

  return (
    <GamePanel title="Snack Catch" icon={Gamepad2} onClose={onClose}>
      {phase === "done" && result ? (
        <RoundResult game="snack" score={result.score} previousBest={result.previousBest} onAgain={start} />
      ) : (
        <>
          <div className="flex items-center justify-between text-sm font-bold text-ink">
            <span>
              Score <span className="tabular-nums">{hud.score}</span>
            </span>
            <span className="text-ink-soft">
              {phase === "playing" ? `${hud.left}s left` : myBest > 0 ? `Your best: ${myBest}` : "One minute"}
            </span>
          </div>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#dff0fd] to-brand-soft">
            <canvas
              ref={canvasRef}
              aria-label="Snack Catch: falling snacks and your basket"
              onPointerMove={follow}
              onPointerDown={follow}
              className="block aspect-[4/5] w-full touch-none"
            />
            {phase === "ready" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
                <p className="text-sm font-bold text-ink">
                  Catch the snacks 🍩 🍪 🍰
                  <br />
                  Dodge the alarm clocks ⏰
                </p>
                <p className="text-xs font-semibold text-ink-soft">
                  <span className="hidden [@media(pointer:fine)]:inline">← → or A D to move. </span>
                  <span className="[@media(pointer:fine)]:hidden">Drag or use the buttons to move. </span>
                  Cakes and ice cream are worth 3.
                </p>
                <button
                  type="button"
                  onClick={start}
                  autoFocus
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-bold text-white hover:bg-brand-strong"
                >
                  Start
                </button>
              </div>
            )}
          </div>
          {/* Big buttons for phones; hidden where there's a keyboard and mouse. */}
          <div className="flex gap-2 [@media(pointer:fine)]:hidden">
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                type="button"
                aria-label={side === "left" ? "Move left" : "Move right"}
                onPointerDown={() => hold(side, true)}
                onPointerUp={() => hold(side, false)}
                onPointerLeave={() => hold(side, false)}
                onPointerCancel={() => hold(side, false)}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-sunken text-ink active:bg-brand-soft"
              >
                {side === "left" ? <ChevronLeft className="size-6" /> : <ChevronRight className="size-6" />}
              </button>
            ))}
          </div>
        </>
      )}
    </GamePanel>
  );
}
