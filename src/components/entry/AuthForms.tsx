"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { officeKind, useSession } from "@/lib/data/react";
import { NAME_MAX, PASSWORD_MIN } from "@/lib/data/rules";
import type { AvatarStyle } from "@/lib/data/types";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, Field, FormMessage, inputClass } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";
import { PreviewNote } from "./EntryFrame";

/** Where to go after signing in: a safe path inside Pookies from `?next=`, or the default. */
export function useNextPath(fallback: string): string {
  const next = useSearchParams().get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** Keeps `?next=` when moving between the log-in and sign-up pages. */
function withNext(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

function localTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Make an account: your name and pookie, an email and a password. */
export function SignUpForm() {
  const session = useSession();
  const router = useRouter();
  const rawNext = useSearchParams().get("next");
  const next = useNextPath("/onboarding");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState<AvatarStyle>({ color: "lilac", shape: "bear" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await session.signUp({
      email,
      password,
      profile: { displayName, avatar, timezone: localTimezone() },
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(officeKind === "sample" ? "/office" : next);
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <PookieAvatar avatar={avatar} size={56} />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Make your account</h1>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Then start your team&apos;s office, or join one with an invite link.
          </p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-5">
        <Field label="Your name" htmlFor="signup-name">
          <input
            id="signup-name"
            type="text"
            value={displayName}
            maxLength={NAME_MAX}
            autoComplete="name"
            placeholder="e.g. Robin"
            onChange={(event) => setDisplayName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <AvatarPicker name="signup" value={avatar} onChange={setAvatar} />
        <Field label="Email" htmlFor="signup-email">
          <input
            id="signup-email"
            type="email"
            value={email}
            autoComplete="email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Password" hint={`At least ${PASSWORD_MIN} characters`} htmlFor="signup-password">
          <input
            id="signup-password"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        {error && (
          <div role="alert">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Making your account…" : "Sign up"}
          {!busy && <ArrowRight aria-hidden="true" className="size-5" />}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
        Already have an account?{" "}
        <Link href={withNext("/login", rawNext)} className="font-bold text-brand-ink underline">
          Log in
        </Link>
      </p>
      {officeKind === "sample" && (
        <PreviewNote>Accounts aren&apos;t connected in this preview. Signing up takes you to the sample office.</PreviewNote>
      )}
    </>
  );
}

/** Log in with your email and password. */
export function LogInForm() {
  const session = useSession();
  const router = useRouter();
  const rawNext = useSearchParams().get("next");
  const next = useNextPath("/office");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await session.signIn(email, password);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(officeKind === "sample" ? "/office" : next);
  };

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">Log in to walk into your office.</p>

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-5">
        <Field label="Email" htmlFor="login-email">
          <input
            id="login-email"
            type="email"
            value={email}
            autoComplete="email"
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <input
            id="login-password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </Field>

        {error && (
          <div role="alert">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}

        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Opening the door…" : "Log in"}
          {!busy && <ArrowRight aria-hidden="true" className="size-5" />}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm font-semibold text-ink-soft">
        New here?{" "}
        <Link href={withNext("/signup", rawNext)} className="font-bold text-brand-ink underline">
          Make an account
        </Link>
      </p>
      {officeKind === "sample" && (
        <PreviewNote>Accounts aren&apos;t connected in this preview. Logging in takes you to the sample office.</PreviewNote>
      )}
    </>
  );
}
