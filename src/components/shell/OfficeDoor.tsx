"use client";

import type { ReactNode } from "react";
import { OfficeGate, officeKind, useSession } from "@/lib/data/react";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { GuestEntry } from "@/components/entry/GuestEntry";
import { WorkspaceSetup } from "@/components/entry/WorkspaceSetup";
import { Button, Card, buttonClass } from "@/components/ui/controls";
import { OfficeLoading } from "./OfficeLoading";

/**
 * Stands in front of every screen that needs the office: shows a loader while
 * connecting, the way in when nobody is signed in, and a retry when the
 * connection failed.
 */
export function OfficeDoor({
  children,
  framed = false,
}: {
  children: ReactNode;
  /** The page has no padding of its own (the full-screen office): give the waiting screens some. */
  framed?: boolean;
}) {
  const session = useSession();
  const frame = (node: ReactNode) =>
    framed ? (
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-6 sm:px-6 lg:px-8">{node}</div>
    ) : (
      node
    );
  return (
    <OfficeGate
      loading={frame(<OfficeLoading />)}
      signedOut={frame(
        <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-6">
          {officeKind === "live" && <AccountDoor />}
          <GuestEntry />
        </div>,
      )}
      setup={(account) =>
        frame(
          <div className="mx-auto w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
            <WorkspaceSetup account={account} />
          </div>,
        )
      }
      failed={(message) =>
        frame(
          <Card className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 p-8 text-center">
            <h1 className="text-xl font-semibold text-ink">The office isn&apos;t answering</h1>
            <p role="alert" className="text-[15px] font-semibold text-ink-soft">
              {message}
            </p>
            <Button onClick={() => session.retry()}>Try again</Button>
          </Card>,
        )
      }
    >
      {children}
    </OfficeGate>
  );
}

/** The way into your own team's office: log in, or make an account. */
function AccountDoor() {
  return (
    <div className="rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Your team&apos;s office</h1>
      <p className="mt-1 text-sm font-semibold text-ink-soft">
        Log in, or make an account to start an office and invite your friends.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link href="/login?next=/office" className={buttonClass("primary", "lg")}>
          <LogIn aria-hidden="true" className="size-5" />
          Log in
        </Link>
        <Link href="/signup" className={buttonClass("secondary", "lg")}>
          <UserPlus aria-hidden="true" className="size-5" />
          Sign up
        </Link>
      </div>
    </div>
  );
}
