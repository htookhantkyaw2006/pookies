"use client";

import { useState } from "react";
import { useOffice } from "@/lib/data/react";
import { NOTE_MAX } from "@/lib/data/rules";
import type { PresenceStatus } from "@/lib/data/types";
import { inputClass } from "@/components/ui/controls";

const SUGGESTIONS: Record<PresenceStatus, string[]> = {
  online: ["Around if you need me", "Happy to pair", "Quick questions welcome"],
  busy: ["Deep work", "In a meeting", "On a call"],
  away: ["At lunch", "Back in 10", "Out for a walk"],
};

/** A one-line note next to your status. Saves when you leave the field or press Enter. */
export function StatusNote() {
  const { me, actions } = useOffice();
  const [draft, setDraft] = useState(me.statusNote);
  const dirty = draft.trim() !== me.statusNote;

  const save = (value: string) => {
    setDraft(value);
    void actions.setStatusNote(value);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor="status-note" className="text-sm font-bold text-ink">
          Add a note
          <span className="ml-2 font-semibold text-ink-soft">optional</span>
        </label>
        <span className="text-xs font-semibold text-ink-soft" aria-hidden="true">
          {draft.length}/{NOTE_MAX}
        </span>
      </div>
      <input
        id="status-note"
        type="text"
        value={draft}
        maxLength={NOTE_MAX}
        placeholder="e.g. At lunch, back at 1"
        autoComplete="off"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => dirty && save(draft)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save(draft);
        }}
        className={inputClass}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {SUGGESTIONS[me.status].map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => save(suggestion)}
            className="min-h-8 rounded-full border border-line bg-surface px-3 text-xs font-bold text-ink-soft transition-colors hover:border-line-strong hover:bg-sunken hover:text-ink"
          >
            {suggestion}
          </button>
        ))}
        {me.statusNote !== "" && (
          <button
            type="button"
            onClick={() => save("")}
            className="min-h-8 rounded-full px-3 text-xs font-bold text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            Clear note
          </button>
        )}
        <span role="status" className="ml-auto text-xs font-bold text-online-ink">
          {!dirty && me.statusNote !== "" ? "Note is showing to your team" : ""}
        </span>
      </div>
    </div>
  );
}
