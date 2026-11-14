"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { CHECKIN_FIELD_MAX } from "@/lib/data/rules";
import type { CheckIn } from "@/lib/data/types";
import { Button, FormMessage, inputClass } from "@/components/ui/controls";

/**
 * The daily check-in form. Pass `existing` to edit today's entry instead of
 * posting a new one.
 */
export function CheckInComposer({
  existing,
  onDone,
}: {
  existing?: CheckIn;
  onDone?: () => void;
}) {
  const { actions } = useOffice();
  const [yesterday, setYesterday] = useState(existing?.yesterday ?? "");
  const [today, setToday] = useState(existing?.today ?? "");
  const [blockers, setBlockers] = useState(existing?.blockers ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = await actions.saveCheckIn({ yesterday, today, blockers });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onDone?.();
  };

  const areaClass = `${inputClass} min-h-20 resize-y leading-6`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="checkin-yesterday" className="text-sm font-bold text-ink">
          What did you do yesterday?
        </label>
        <textarea
          id="checkin-yesterday"
          value={yesterday}
          maxLength={CHECKIN_FIELD_MAX}
          onChange={(event) => setYesterday(event.target.value)}
          placeholder="Wrapped up…"
          className={areaClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="checkin-today" className="text-sm font-bold text-ink">
          What&apos;s next today?
        </label>
        <textarea
          id="checkin-today"
          value={today}
          maxLength={CHECKIN_FIELD_MAX}
          required
          aria-describedby={error ? "checkin-error" : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setToday(event.target.value)}
          placeholder="Today I'm…"
          className={areaClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="checkin-blockers" className="text-sm font-bold text-ink">
          Anything in your way?
          <span className="ml-2 font-semibold text-ink-soft">optional</span>
        </label>
        <textarea
          id="checkin-blockers"
          value={blockers}
          maxLength={CHECKIN_FIELD_MAX}
          onChange={(event) => setBlockers(event.target.value)}
          placeholder="Nothing right now"
          className={`${inputClass} min-h-12 resize-y leading-6`}
        />
      </div>

      {error && (
        <div id="checkin-error">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving}>
          <Send aria-hidden="true" className="size-4" />
          {existing ? "Save changes" : "Post check-in"}
        </Button>
        {existing && onDone && (
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
