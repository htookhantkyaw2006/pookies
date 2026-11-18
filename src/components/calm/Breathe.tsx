"use client";

import { useEffect, useState } from "react";
import { Wind, X } from "lucide-react";
import { playSound } from "@/lib/sound";
import { Button } from "@/components/ui/controls";

/** One breath: in for 4 seconds, out for 6. */
const IN_SECONDS = 4;
const BREATH_SECONDS = 10;
const SESSION_SECONDS = 60;

/**
 * A one-minute breathing guide: a circle that slowly grows as you breathe in
 * and shrinks as you breathe out. With "reduce motion" on, just the words.
 */
export function Breathe({ onClose }: { onClose: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  const done = elapsed >= SESSION_SECONDS;

  useEffect(() => {
    playSound("calm");
    const started = performance.now();
    const timer = window.setInterval(() => {
      const seconds = (performance.now() - started) / 1000;
      setElapsed(seconds);
      if (seconds >= SESSION_SECONDS) {
        window.clearInterval(timer);
        playSound("calm");
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  const inBreath = elapsed % BREATH_SECONDS < IN_SECONDS;
  const left = Math.max(0, Math.ceil(SESSION_SECONDS - elapsed));

  return (
    <section
      aria-labelledby="breathe-title"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="absolute bottom-16 left-1/2 z-[3000] flex w-[min(22rem,calc(100%-1.5rem))] -translate-x-1/2 cursor-auto flex-col items-center gap-3 rounded-card border border-line bg-surface/95 p-5 text-center shadow-lift backdrop-blur select-text"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <h3 id="breathe-title" className="flex items-center gap-2 text-base font-bold text-ink">
          <Wind aria-hidden="true" className="size-4 text-brand" />
          One minute of calm
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div className="relative flex size-44 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-brand-soft/50" aria-hidden="true" />
        <div
          aria-hidden="true"
          className={`absolute inset-3 rounded-full bg-brand-soft ring-4 ring-brand/30 ${
            done ? "" : "animate-slow-breath motion-reduce:animate-none"
          }`}
        />
        <p aria-live="polite" className="relative font-display text-xl font-semibold text-brand-ink">
          {done ? "Nicely done" : inBreath ? "Breathe in…" : "Breathe out…"}
        </p>
      </div>

      <p className="text-sm font-semibold text-ink-soft">
        {done ? "That was a whole minute just for you." : `${left} seconds left`}
      </p>
      {done && (
        <Button size="sm" onClick={onClose}>
          Back to the office
        </Button>
      )}
    </section>
  );
}
