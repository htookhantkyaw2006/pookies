"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { useSession } from "@/lib/data/react";
import { NAME_MAX, WORKSPACE_NAME_MAX } from "@/lib/data/rules";
import type { Account, AvatarStyle } from "@/lib/data/types";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, Field, FormMessage, inputClass } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/** Pulls the token out of a pasted invite link (or takes a bare token). */
export function inviteToken(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/\/join\/([A-Za-z0-9]+)/) ?? trimmed.match(/^([A-Za-z0-9]{16,})$/);
  return match ? match[1] : null;
}

/**
 * Signed in, but not in a workspace yet: start your team's office (and be
 * its admin), or paste the invite link a teammate sent you.
 */
export function WorkspaceSetup({ account }: { account: Account }) {
  if (!account.profile) return <ProfileSetup />;
  return <CreateOrJoin account={account} />;
}

function CreateOrJoin({ account }: { account: Account }) {
  const session = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const profile = account.profile!;

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await session.createWorkspace(name);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else router.push("/office");
  };

  const join = (event: FormEvent) => {
    event.preventDefault();
    const token = inviteToken(link);
    if (!token) {
      setLinkError("Paste the whole invite link, like pookies…/join/abc123.");
      return;
    }
    router.push(`/join/${token}`);
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <PookieAvatar avatar={profile.avatar} size={48} />
        </span>
        <p className="text-[15px] font-semibold text-ink-soft">
          Hi {profile.displayName.split(" ")[0]}, nice to meet you.
        </p>
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Set up your office</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">
        Name your team&apos;s workspace. You&apos;ll be its admin, and can invite people next.
      </p>

      <form onSubmit={create} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Workspace name" htmlFor="setup-name">
          <input
            id="setup-name"
            type="text"
            value={name}
            maxLength={WORKSPACE_NAME_MAX}
            placeholder="e.g. Sunny Side Studio"
            autoComplete="organization"
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </Field>
        {error && (
          <div role="alert">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Building your office…" : "Create workspace"}
          {!busy && <ArrowRight aria-hidden="true" className="size-5" />}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-bold text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        OR
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={join} noValidate className="flex flex-col gap-3">
        <Field label="Got an invite link?" htmlFor="setup-link">
          <input
            id="setup-link"
            type="url"
            value={link}
            placeholder="Paste it here"
            onChange={(event) => {
              setLink(event.target.value);
              setLinkError(null);
            }}
            className={inputClass}
          />
        </Field>
        {linkError && <FormMessage tone="error">{linkError}</FormMessage>}
        <Button type="submit" variant="secondary" size="lg" className="w-full">
          <Link2 aria-hidden="true" className="size-5" />
          Join with the link
        </Button>
      </form>
    </>
  );
}

/** Rare: the account exists but its profile didn't save during sign-up. */
function ProfileSetup() {
  const session = useSession();
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState<AvatarStyle>({ color: "lilac", shape: "bear" });
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await session.saveProfile({
      displayName,
      avatar,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });
    if (!result.ok) setError(result.error);
  };

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Who are you?</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">Pick a name and a pookie for the office.</p>
      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-5">
        <Field label="Your name" htmlFor="profile-name">
          <input
            id="profile-name"
            type="text"
            value={displayName}
            maxLength={NAME_MAX}
            autoComplete="name"
            onChange={(event) => setDisplayName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <AvatarPicker name="profile-setup" value={avatar} onChange={setAvatar} />
        {error && (
          <div role="alert">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full">
          Continue
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </form>
    </>
  );
}
