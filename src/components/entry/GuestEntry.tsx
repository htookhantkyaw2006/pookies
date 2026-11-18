"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useSession } from "@/lib/data/react";
import { CODE_LENGTH, NAME_MAX, cleanCode } from "@/lib/data/rules";
import type { AvatarStyle, GuestProfile } from "@/lib/data/types";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, Field, FormMessage, inputClass } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/** A code from the address (/office?code=PKX4QZ, which shared /join/ links open). */
function codeFromAddress(): string {
  if (typeof window === "undefined") return "";
  return cleanCode(new URLSearchParams(window.location.search).get("code") ?? "");
}

/**
 * The lobby, like a party game: pick a nickname and a pookie, then join a
 * friend's office with its code, or create a new office and share yours.
 * No account needed.
 */
export function GuestEntry() {
  const session = useSession();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState<AvatarStyle>({ color: "lilac", shape: "bear" });
  const [code, setCode] = useState(codeFromAddress);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"join" | "create" | null>(null);
  const invited = codeFromAddress().length > 0;

  const profile = (): GuestProfile => ({
    displayName,
    avatar,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });

  const go = async (kind: "join" | "create") => {
    setBusy(kind);
    setError(null);
    const result = kind === "join" ? await session.joinOffice(code, profile()) : await session.createOffice(profile());
    // On success this lobby is replaced by the office, so only failure lands here.
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
    }
  };

  const join = (event: FormEvent) => {
    event.preventDefault();
    void go("join");
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <div className="flex items-center gap-4">
        <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <PookieAvatar avatar={avatar} size={56} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            {invited ? "You're invited!" : "Hop into an office"}
          </h1>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Pick a nickname and a pookie. No account needed.
          </p>
        </div>
      </div>

      <form onSubmit={join} noValidate className="mt-6 flex flex-col gap-5">
        <Field label="Your nickname" htmlFor="guest-name">
          <input
            id="guest-name"
            type="text"
            value={displayName}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder="e.g. Robin"
            onChange={(event) => setDisplayName(event.target.value)}
            className={inputClass}
          />
        </Field>

        <AvatarPicker name="guest" value={avatar} onChange={setAvatar} />

        <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-4">
          <label htmlFor="office-code" className="text-sm font-bold text-ink">
            Office code
          </label>
          <div className="flex gap-2">
            <input
              id="office-code"
              type="text"
              value={code}
              maxLength={CODE_LENGTH + 2}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="PKX4QZ"
              onChange={(event) => setCode(cleanCode(event.target.value))}
              className={`${inputClass} min-w-0 flex-1 text-center font-mono text-lg font-bold tracking-[0.3em] uppercase`}
            />
            <Button type="submit" size="lg" disabled={busy !== null}>
              {busy === "join" ? "Joining…" : "Join"}
              {busy !== "join" && <ArrowRight aria-hidden="true" className="size-5" />}
            </Button>
          </div>
          <p className="text-xs font-semibold text-ink-soft">Got a code from a friend? Type it here.</p>
        </div>

        {error && (
          <div role="alert">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-bold text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        OR
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void go("create")}
      >
        <Sparkles aria-hidden="true" className="size-5" />
        {busy === "create" ? "Building your office…" : "Create a new office"}
      </Button>
      <p className="mt-2 text-center text-xs font-semibold text-ink-soft">
        You&apos;ll get a code to share with your friends.
      </p>
    </div>
  );
}
