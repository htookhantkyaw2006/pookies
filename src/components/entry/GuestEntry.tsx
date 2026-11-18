"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/lib/data/react";
import { NAME_MAX } from "@/lib/data/rules";
import type { AvatarStyle } from "@/lib/data/types";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, Field, FormMessage, inputClass } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/**
 * Guest mode: pick a name and a pookie, step into the shared demo office
 * without an account. Anyone with the link can walk in.
 */
export function GuestEntry() {
  const session = useSession();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState<AvatarStyle>({ color: "lilac", shape: "bear" });
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setEntering(true);
    setError(null);
    const result = await session.enterAsGuest({
      displayName,
      avatar,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    // On success this form is replaced by the office, so only failure lands here.
    if (!result.ok) {
      setError(result.error);
      setEntering(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-4">
        <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <PookieAvatar avatar={avatar} size={56} />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Try the demo office</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Pick a name and a pookie. No account needed: it&apos;s one shared office anyone can visit.
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-5">
        <Field label="Your name" htmlFor="guest-name">
          <input
            id="guest-name"
            type="text"
            value={displayName}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder="e.g. Robin"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "guest-error" : undefined}
            onChange={(event) => setDisplayName(event.target.value)}
            className={inputClass}
          />
        </Field>

        <AvatarPicker name="guest" value={avatar} onChange={setAvatar} />

        {error && (
          <div id="guest-error">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}

        <Button type="submit" size="lg" disabled={entering} className="w-full">
          {entering ? "Opening the door…" : "Walk in"}
          {!entering && <ArrowRight aria-hidden="true" className="size-5" />}
        </Button>
      </form>
    </div>
  );
}
