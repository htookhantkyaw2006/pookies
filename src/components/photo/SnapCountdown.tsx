"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { playSound } from "@/lib/sound";

/** Seconds from the countdown starting to the flash. */
export const COUNTDOWN_SECONDS = 3;

/**
 * 3, 2, 1, then a camera flash, over the whole map. Calls onFlash at the
 * flash (when the photo is taken) and onDone once it has faded.
 */
export function SnapCountdown({ onFlash, onDone }: { onFlash: () => void; onDone: () => void }) {
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const flash = useEffectEvent(onFlash);
  const done = useEffectEvent(onDone);

  useEffect(() => {
    playSound("tick");
    const timers = [
      window.setTimeout(() => {
        setCount(2);
        playSound("tick");
      }, 1000),
      window.setTimeout(() => {
        setCount(1);
        playSound("tick");
      }, 2000),
      window.setTimeout(() => {
        setCount(0);
        playSound("shutter");
        flash();
      }, COUNTDOWN_SECONDS * 1000),
      window.setTimeout(() => done(), COUNTDOWN_SECONDS * 1000 + 700),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <div aria-live="assertive" className="pointer-events-none absolute inset-0 z-[3500] flex items-center justify-center">
      {count > 0 ? (
        <span
          key={count}
          className="flex size-32 animate-count items-center justify-center rounded-full bg-brand font-display text-7xl font-semibold text-white shadow-lift ring-8 ring-white/70 motion-reduce:animate-none"
        >
          {count}
        </span>
      ) : (
        <>
          <span className="sr-only">Snap!</span>
          {/* A soft flash; gentler still with reduced motion. */}
          <div className="absolute inset-0 animate-flash bg-white motion-reduce:animate-none motion-reduce:opacity-30" />
        </>
      )}
    </div>
  );
}
