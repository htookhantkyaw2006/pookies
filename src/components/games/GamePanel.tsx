"use client";

import { useEffect, type ReactNode } from "react";
import { X, type LucideIcon } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { GAME_NAMES, topScores } from "@/lib/data/rules";
import type { GameId } from "@/lib/data/types";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/** The card a game (or the score board) opens in, over the map. Escape closes it. */
export function GamePanel({
  title,
  icon: Icon,
  onClose,
  children,
}: {
  title: string;
  icon: LucideIcon;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section
      aria-labelledby="game-title"
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute bottom-16 left-1/2 z-[3000] flex max-h-[calc(100%-5rem)] w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2 cursor-auto flex-col gap-3 overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lift select-none md:bottom-auto md:top-1/2 md:-translate-y-1/2"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="game-title" className="flex items-center gap-2 text-base font-bold text-ink">
          <Icon aria-hidden="true" className="size-4 text-brand" />
          {title}
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
      {children}
    </section>
  );
}

/** Your best score in a game, or 0 if you haven't played. */
export function useMyBest(game: GameId): number {
  const { state } = useOffice();
  return (
    state.things.scores.find((item) => item.game === game && item.userId === state.currentUserId)?.score ?? 0
  );
}

/** The team's top five in one game. */
export function ScoreList({ game, heading = true }: { game: GameId; heading?: boolean }) {
  const { state } = useOffice();
  const members = new Map(state.members.map((member) => [member.id, member]));
  // Only people still in the workspace.
  const top = topScores(
    state.things.scores.filter((item) => members.has(item.userId)),
    game,
  );

  return (
    <div className="flex flex-col gap-1.5">
      {heading && <h4 className="text-sm font-bold text-ink">{GAME_NAMES[game]}</h4>}
      {top.length === 0 ? (
        <p className="text-sm font-semibold text-ink-soft">No scores yet. Be the first!</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {top.map((item, index) => {
            const member = members.get(item.userId)!;
            const you = item.userId === state.currentUserId;
            return (
              <li
                key={item.userId}
                className={`flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-bold ${
                  you ? "bg-brand-soft text-brand-ink" : "text-ink"
                }`}
              >
                <span className="w-5 shrink-0 text-center text-ink-soft">
                  {index === 0 ? "🏆" : index + 1}
                </span>
                <PookieAvatar avatar={member.avatar} size={24} />
                <span className="min-w-0 flex-1 truncate">
                  {member.displayName}
                  {you && <span className="font-semibold text-ink-soft"> (you)</span>}
                </span>
                <span className="tabular-nums">{item.score}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** What the end of a round says. */
export function RoundResult({
  score,
  previousBest,
  onAgain,
  game,
}: {
  score: number;
  previousBest: number;
  onAgain: () => void;
  game: GameId;
}) {
  const newBest = score > previousBest;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-brand-soft/60 p-3 text-center">
        <p className="font-display text-3xl font-semibold text-brand-ink tabular-nums">{score}</p>
        <p aria-live="polite" className="text-sm font-bold text-ink-soft">
          {newBest
            ? previousBest > 0
              ? `New best! (was ${previousBest})`
              : "Your first score, saved for the team!"
            : `Your best is still ${previousBest}`}
        </p>
      </div>
      <ScoreList game={game} />
      <button
        type="button"
        onClick={onAgain}
        autoFocus
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong"
      >
        Play again
      </button>
    </div>
  );
}
