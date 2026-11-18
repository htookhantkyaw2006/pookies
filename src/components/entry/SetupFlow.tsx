"use client";

import Link from "next/link";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { useConnection, useSession } from "@/lib/data/react";
import { Button, buttonClass } from "@/components/ui/controls";
import { EntryLoading } from "./EntryLoading";
import { WorkspaceSetup } from "./WorkspaceSetup";

/** The onboarding page: whatever step you're at, the next thing to do. */
export function SetupFlow() {
  const connection = useConnection();
  const session = useSession();

  if (connection.phase === "loading") return <EntryLoading />;

  if (connection.phase === "setup") return <WorkspaceSetup account={connection.account} />;

  if (connection.phase === "ready") {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">You&apos;re all set</h1>
        <p className="mt-2 text-[15px] font-semibold text-ink-soft">
          You&apos;re in {connection.state.workspace.name}.
        </p>
        <Link href="/office" className={`${buttonClass("primary", "lg")} mt-6 w-full`}>
          Go to your office
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
      </>
    );
  }

  if (connection.phase === "error") {
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">The office isn&apos;t answering</h1>
        <p role="alert" className="mt-2 text-[15px] font-semibold text-ink-soft">
          {connection.message}
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={() => session.retry()}>
          Try again
        </Button>
      </>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Make an account first</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">
        Then you can start your team&apos;s office or join one with an invite link.
      </p>
      <Link href="/signup" className={`${buttonClass("primary", "lg")} mt-6 w-full`}>
        <UserPlus aria-hidden="true" className="size-5" />
        Sign up
      </Link>
      <Link href="/login?next=/onboarding" className={`${buttonClass("secondary", "lg")} mt-3 w-full`}>
        <LogIn aria-hidden="true" className="size-5" />
        Log in
      </Link>
    </>
  );
}
