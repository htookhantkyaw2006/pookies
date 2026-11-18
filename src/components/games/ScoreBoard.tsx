"use client";

import { Trophy } from "lucide-react";
import { GAMES } from "@/lib/data/types";
import { GamePanel, ScoreList } from "./GamePanel";

/** The high-score board on the game corner wall: the team's top five in each game. */
export function ScoreBoard({ onClose }: { onClose: () => void }) {
  return (
    <GamePanel title="High scores" icon={Trophy} onClose={onClose}>
      {GAMES.map((game) => (
        <ScoreList key={game} game={game} />
      ))}
      <p className="text-xs font-semibold text-ink-soft">
        Play at the arcade or the dartboard. Only your best score counts.
      </p>
    </GamePanel>
  );
}
