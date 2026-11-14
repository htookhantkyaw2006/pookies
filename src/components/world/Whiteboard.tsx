"use client";

import { useState, type FormEvent } from "react";
import { PenLine, X } from "lucide-react";
import { timeAgo } from "@/lib/dates";
import { BOARD_MAX } from "@/lib/data/rules";
import type { ActionResult, BoardNote } from "@/lib/data/types";
import { TILE } from "@/lib/world/map";
import { Button, FormMessage, inputClass } from "@/components/ui/controls";

/** Where the board hangs on the meeting room's back wall, in world pixels. */
export const BOARD_RECT = { x: 14 * TILE + 6, y: 4, width: 3 * TILE - 12, height: 44 };

/**
 * The message written on the whiteboard, drawn on the board itself. Up close,
 * a card underneath shows all of it and who wrote it.
 */
export function WhiteboardText({
  board,
  author,
  now,
  showDetails,
}: {
  board: BoardNote | null;
  author: string | null;
  now: number;
  showDetails: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: BOARD_RECT.x, top: BOARD_RECT.y, width: BOARD_RECT.width, height: BOARD_RECT.height }}
    >
      <p
        className={`line-clamp-3 px-2 pt-1.5 text-center text-[10px] leading-[12px] font-bold ${
          board ? "text-brand-ink" : "text-ink-faint italic"
        }`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {board ? board.text : "Nothing on the board yet"}
      </p>
      {showDetails && board && (
        <div className="absolute top-full left-1/2 z-[2000] mt-2 -translate-x-1/2">
          <BoardDetails board={board} author={author} now={now} />
        </div>
      )}
    </div>
  );
}

/** The whole whiteboard message, who wrote it and when: shown when you stand at the board. */
export function BoardDetails({
  board,
  author,
  now,
}: {
  board: BoardNote;
  author: string | null;
  now: number;
}) {
  return (
    <div className="w-60 rounded-2xl border border-line bg-surface px-3 py-2 text-center shadow-lift">
      <p className="text-sm leading-5 font-bold text-ink">{board.text}</p>
      <p className="mt-1 text-xs font-semibold text-ink-soft">
        {author ? `${author} · ` : ""}
        {timeAgo(board.updatedAt, now)}
      </p>
    </div>
  );
}

/** Writing on the board: one short line for the whole team. */
export function WhiteboardEditor({
  board,
  onSave,
  onClose,
}: {
  board: BoardNote | null;
  onSave: (text: string) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(board?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (text: string) => {
    setSaving(true);
    const result = await onSave(text);
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(draft);
  };

  return (
    <form
      onSubmit={submit}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      aria-labelledby="whiteboard-title"
      className="absolute bottom-16 left-1/2 z-[3000] flex w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 cursor-auto flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-lift select-text"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="whiteboard-title" className="flex items-center gap-2 text-base font-bold text-ink">
          <PenLine aria-hidden="true" className="size-4 text-brand" />
          Write on the whiteboard
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
      <div className="flex flex-col gap-1">
        <input
          autoFocus
          aria-label="Whiteboard message"
          value={draft}
          maxLength={BOARD_MAX}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          placeholder="e.g. Demo at 3pm, everyone welcome!"
          className={inputClass}
        />
        <p className="self-end text-xs font-semibold text-ink-soft">
          {draft.length}/{BOARD_MAX} · everyone in the office sees this
        </p>
      </div>
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        {board && (
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => void save("")}>
            Wipe it clean
          </Button>
        )}
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : "Put it up"}
        </Button>
      </div>
    </form>
  );
}
