"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Target } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import {
  DARTS_PER_ROUND,
  RINGS,
  aimAt,
  newDarts,
  throwDart,
  type DartsState,
  type Throw,
} from "@/lib/games/darts";
import { playSound } from "@/lib/sound";
import { GamePanel, RoundResult, useMyBest } from "./GamePanel";

const RING_COLORS = ["#e5484d", "#3fa173", "#f4e7cf", "#e5484d", "#f4e7cf"];

/**
 * Darts: the aim drifts around the board; throw when it's over the middle.
 * Space, click or tap to throw. Three darts a round.
 */
export function Darts({ onClose }: { onClose: () => void }) {
  const { actions } = useOffice();
  const myBest = useMyBest("darts");
  const [darts, setDarts] = useState<Throw[]>([]);
  const [last, setLast] = useState<Throw | null>(null);
  const [result, setResult] = useState<{ score: number; previousBest: number } | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const game = useRef<DartsState>(newDarts(seed));
  const aimRef = useRef<SVGGElement>(null);
  /** When the current dart started swaying (set as each round starts). */
  const started = useRef(0);
  const bestAtStart = useRef(myBest);
  const waiting = useRef(false);

  const playing = result === null;

  const again = () => {
    game.current = newDarts(Math.floor(Math.random() * 2 ** 31));
    bestAtStart.current = myBest;
    waiting.current = false;
    setDarts([]);
    setLast(null);
    setResult(null);
  };

  const throwNow = () => {
    const state = game.current;
    if (state.over || waiting.current) return;
    const dart = throwDart(state, (performance.now() - started.current) / 1000);
    if (!dart) return;
    playSound("dart");
    setDarts([...state.throws]);
    setLast(dart);
    started.current = performance.now();
    if (state.over) {
      // A moment to see where the last dart landed.
      waiting.current = true;
      window.setTimeout(() => {
        setResult({ score: state.score, previousBest: bestAtStart.current });
        playSound("cheer");
        if (state.score > 0) void actions.submitScore("darts", state.score);
      }, 900);
    }
  };

  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (!playing || (event.code !== "Space" && event.code !== "Enter")) return;
    event.preventDefault();
    throwNow();
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The aim drifts every frame; moved directly, so React doesn't redraw 60 times a second.
  useEffect(() => {
    if (!playing) return;
    started.current = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const state = game.current;
      const aim = waiting.current
        ? { x: 0, y: 0 }
        : aimAt(state, (now - started.current) / 1000);
      aimRef.current?.setAttribute("transform", `translate(${aim.x} ${aim.y})`);
      aimRef.current?.setAttribute("opacity", waiting.current ? "0" : "1");
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  return (
    <GamePanel title="Darts" icon={Target} onClose={onClose}>
      {result ? (
        <RoundResult game="darts" score={result.score} previousBest={result.previousBest} onAgain={again} />
      ) : (
        <>
          <div className="flex items-center justify-between text-sm font-bold text-ink">
            <span>
              Score <span className="tabular-nums">{darts.reduce((sum, dart) => sum + dart.points, 0)}</span>
            </span>
            <span className="flex items-center gap-1" aria-label={`${DARTS_PER_ROUND - darts.length} darts left`}>
              {Array.from({ length: DARTS_PER_ROUND }, (_, index) => (
                <span key={index} aria-hidden="true" className={index < darts.length ? "opacity-25" : ""}>
                  🎯
                </span>
              ))}
            </span>
          </div>
          <button
            type="button"
            onClick={throwNow}
            autoFocus
            aria-label="Throw a dart"
            className="relative block w-full touch-none rounded-2xl bg-[#f6efe6] p-3 focus-visible:outline-3 focus-visible:outline-brand"
          >
            <svg viewBox="-1.15 -1.15 2.3 2.3" className="block aspect-square w-full" aria-hidden="true">
              <circle r={1.1} fill="#3b3247" />
              {[...RINGS].reverse().map((ring, index) => (
                <circle key={ring.reach} r={ring.reach} fill={RING_COLORS[RINGS.length - 1 - index]} stroke="#3b3247" strokeWidth={0.012} />
              ))}
              {darts.map((dart, index) => (
                <g key={index} transform={`translate(${dart.x} ${dart.y})`}>
                  <circle r={0.035} fill="#3b3247" />
                  <path d="M0 0 L0.13 -0.13" stroke="#8f73df" strokeWidth={0.03} strokeLinecap="round" />
                </g>
              ))}
              <g ref={aimRef}>
                <circle r={0.09} fill="none" stroke="#6b4ee6" strokeWidth={0.025} />
                <path d="M-0.15 0 H-0.05 M0.05 0 H0.15 M0 -0.15 V-0.05 M0 0.05 V0.15" stroke="#6b4ee6" strokeWidth={0.025} strokeLinecap="round" />
              </g>
            </svg>
          </button>
          <p aria-live="polite" className="min-h-5 text-center text-sm font-bold text-ink-soft">
            {last
              ? `${last.name}${last.points > 0 ? ` +${last.points}` : ""}`
              : (
                <>
                  <span className="hidden [@media(pointer:fine)]:inline">Press Space or click to throw. </span>
                  <span className="[@media(pointer:fine)]:hidden">Tap to throw. </span>
                  Aim for the middle!
                </>
              )}
          </p>
        </>
      )}
    </GamePanel>
  );
}
