"use client";

import { useState } from "react";
import { Check, DoorOpen, Link2, Radio, Sparkles } from "lucide-react";
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
 * The strip across the top of the app. Live office: its code to share, a
 * copy-link button, and the way out. Sample office: says the data is made up
 * and lets you flip between the admin and member views.
 */
export function OfficeBanner() {
  return officeKind === "live" ? <LiveBanner /> : <SampleBanner />;
}

function LiveBanner() {
  const session = useSession();
  const { state } = useOffice();
  const [copied, setCopied] = useState(false);
  const code = state.workspace.code;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to read out instead.
    }
  };

  return (
    <div className={stripClass}>
      {code ? (
        <p className="flex flex-wrap items-center gap-2 font-semibold text-brand-ink">
          <Radio aria-hidden="true" className="size-4 shrink-0" />
          Office code
          <span
            data-office-code={code}
            className="rounded-lg bg-surface px-2 py-0.5 font-mono text-base font-bold tracking-[0.2em] text-ink"
          >
            {code}
          </span>
          <span className="text-ink-soft">Share it so friends can join.</span>
        </p>
      ) : (
        <p className="flex items-center gap-2 font-semibold text-brand-ink">
          <Radio aria-hidden="true" className="size-4 shrink-0" />
          The shared demo office: anyone with the link can walk in.
        </p>
      )}
      <div className="flex items-center gap-2">
        {code && (
          <button type="button" onClick={() => void copy()} className={chipClass}>
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
            {copied ? "Link copied" : "Copy invite link"}
          </button>
        )}
        <button type="button" onClick={() => void session.leave()} className={chipClass}>
          <DoorOpen aria-hidden="true" className="size-4" />
          Leave office
        </button>
      </div>
    </div>
  );
}

const chipClass =
  "inline-flex min-h-8 items-center gap-1.5 rounded-full border border-brand/25 bg-surface px-3 text-xs font-bold text-brand-ink transition-colors hover:bg-brand-soft";

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
