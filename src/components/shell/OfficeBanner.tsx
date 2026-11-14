"use client";

import { DoorOpen, Radio, Sparkles } from "lucide-react";
import { officeKind, useOffice, useSession } from "@/lib/data/react";
import { previewAsRole } from "@/lib/data/mock/store";
import type { Role } from "@/lib/data/types";

const ROLES: Array<{ value: Role; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

const stripClass =
  "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-brand-soft/70 px-4 py-2 text-sm sm:px-6 lg:px-8";

/**
 * The strip across the top of the app while Pookies has no real accounts.
 * Sample office: says the data is made up and lets you flip between the admin
 * and member views. Live demo office: says it's shared, and lets you leave.
 */
export function OfficeBanner() {
  return officeKind === "live" ? <LiveBanner /> : <SampleBanner />;
}

function LiveBanner() {
  const session = useSession();
  return (
    <div className={stripClass}>
      <p className="flex items-center gap-2 font-semibold text-brand-ink">
        <Radio aria-hidden="true" className="size-4 shrink-0" />
        Live demo office. Open this page in another browser to walk in as someone else.
      </p>
      <button
        type="button"
        onClick={() => void session.leave()}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/25 bg-surface px-3 text-xs font-bold text-brand-ink transition-colors hover:bg-brand-soft"
      >
        <DoorOpen aria-hidden="true" className="size-4" />
        Leave the office
      </button>
    </div>
  );
}

function SampleBanner() {
  const { me } = useOffice();
  return (
    <div className={stripClass}>
      <p className="flex items-center gap-2 font-semibold text-brand-ink">
        <Sparkles aria-hidden="true" className="size-4 shrink-0" />
        Preview with sample teammates. Nothing here is saved.
      </p>
      <fieldset className="flex items-center gap-2">
        <legend className="float-left mr-2 text-sm font-semibold text-brand-ink">View as</legend>
        <div className="inline-flex rounded-full border border-brand/25 bg-surface p-0.5">
          {ROLES.map((role) => (
            <label
              key={role.value}
              className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-ink-soft has-checked:bg-brand has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
            >
              <input
                type="radio"
                name="preview-role"
                value={role.value}
                checked={me.role === role.value}
                onChange={() => previewAsRole(role.value)}
                className="sr-only"
              />
              {role.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
