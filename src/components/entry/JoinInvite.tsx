"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { useConnection, useSession } from "@/lib/data/react";
import type { InvitePreview } from "@/lib/data/types";
import { Button, FormMessage, buttonClass } from "@/components/ui/controls";
import { EntryLoading } from "./EntryLoading";
import { WorkspaceSetup } from "./WorkspaceSetup";

/** Landing screen for an invite link: who it's for, then sign up, log in or join. */
export function JoinInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const connection = useConnection();
  const session = useSession();
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let alive = true;
    void session.previewInvite(token).then((result) => {
      if (alive) setPreview(result);
    });
    return () => {
      alive = false;
    };
  }, [session, token]);

  if (preview === undefined || connection.phase === "loading") return <EntryLoading />;

  if (preview === null) {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">This link won&apos;t work</h1>
        <p className="mt-2 text-[15px] font-semibold text-ink-soft">
          It may have expired or been switched off. Ask whoever invited you for a fresh one.
        </p>
        <Link href="/" className={`${buttonClass("secondary", "lg")} mt-6 w-full`}>
          Back to Pookies
        </Link>
      </>
    );
  }

  const here = `/join/${token}`;
  const heading = (
    <>
      <p className="text-sm font-bold text-brand-ink">You&apos;re invited</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance text-ink">
        Join {preview.workspaceName}
      </h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">
        {preview.memberCount === 1 ? "1 person is" : `${preview.memberCount} people are`} already in
        this office.
      </p>
    </>
  );

  if (connection.phase === "ready") {
    const same = connection.state.workspace.name === preview.workspaceName;
    return (
      <>
        {heading}
        <p className="mt-4 text-[15px] font-semibold text-ink-soft">
          {same
            ? "You're already in this office."
            : `You're already in ${connection.state.workspace.name}. For now, each account belongs to one office.`}
        </p>
        <Link href="/office" className={`${buttonClass("primary", "lg")} mt-6 w-full`}>
          Go to your office
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
      </>
    );
  }

  if (connection.phase === "setup") {
    if (!connection.account.profile) return <WorkspaceSetup account={connection.account} />;
    const join = async () => {
      setJoining(true);
      setError(null);
      const result = await session.acceptInvite(token);
      if (!result.ok) {
        setError(result.error);
        setJoining(false);
        return;
      }
      router.push("/office");
    };
    return (
      <>
        {heading}
        {error && (
          <div role="alert" className="mt-4">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}
        <Button size="lg" className="mt-6 w-full" disabled={joining} onClick={join}>
          {joining ? "Opening the door…" : `Join as ${connection.account.profile.displayName}`}
          {!joining && <ArrowRight aria-hidden="true" className="size-5" />}
        </Button>
      </>
    );
  }

  // Signed out (or the connection failed): make an account or log in, then come back here.
  return (
    <>
      {heading}
      <Link
        href={`/signup?next=${encodeURIComponent(here)}`}
        className={`${buttonClass("primary", "lg")} mt-6 w-full`}
      >
        <UserPlus aria-hidden="true" className="size-5" />
        Sign up to join
      </Link>
      <Link
        href={`/login?next=${encodeURIComponent(here)}`}
        className={`${buttonClass("secondary", "lg")} mt-3 w-full`}
      >
        <LogIn aria-hidden="true" className="size-5" />
        I have an account
      </Link>
    </>
  );
}
