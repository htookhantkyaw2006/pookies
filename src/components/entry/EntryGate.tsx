"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { OfficeGate, useSession } from "@/lib/data/react";
import { Button, buttonClass } from "@/components/ui/controls";
import { EntryLoading } from "./EntryLoading";

/** The sign-in, onboarding and invite cards' version of the office door. */
export function EntryGate({ children }: { children: ReactNode }) {
  const session = useSession();
  return (
    <OfficeGate
      loading={<EntryLoading />}
      signedOut={
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Come on in first</h1>
          <p className="mt-2 text-[15px] font-semibold text-ink-soft">
            Step into the office, then come back to this page.
          </p>
          <Link href="/office" className={`${buttonClass("primary", "lg")} mt-6 w-full`}>
            Go to the office
          </Link>
        </>
      }
      failed={(message) => (
        <>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">
            The office isn&apos;t answering
          </h1>
          <p role="alert" className="mt-2 text-[15px] font-semibold text-ink-soft">
            {message}
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={() => session.retry()}>
            Try again
          </Button>
        </>
      )}
    >
      {children}
    </OfficeGate>
  );
}
