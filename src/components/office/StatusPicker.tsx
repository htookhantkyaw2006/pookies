"use client";

import { useOffice } from "@/lib/data/react";
import type { PresenceStatus } from "@/lib/data/types";
import { STATUS_META } from "@/components/ui/status";

const OPTIONS: PresenceStatus[] = ["online", "busy", "away"];

/** Three big, obvious choices. Native radios, so arrow keys just work. */
export function StatusPicker() {
  const { me, actions } = useOffice();

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-ink">
        Your status
        <span className="ml-2 font-semibold text-ink-soft">rooms set it, or pick one here</span>
      </legend>
      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((status) => {
          const meta = STATUS_META[status];
          const Icon = meta.icon;
          const checked = me.status === status;
          return (
            <label
              key={status}
              className={`flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-2 text-center transition-colors has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand ${
                checked
                  ? `${meta.soft} ${meta.ink} border-current`
                  : "border-line bg-surface text-ink-soft hover:border-line-strong hover:bg-sunken"
              }`}
            >
              <input
                type="radio"
                name="my-status"
                value={status}
                checked={checked}
                onChange={() => void actions.setStatus(status)}
                className="sr-only"
              />
              <Icon aria-hidden="true" className="size-5" strokeWidth={2.4} />
              <span className="text-sm leading-tight font-bold">{meta.label}</span>
              <span className="hidden text-xs leading-tight font-semibold opacity-80 sm:block">
                {meta.hint}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
