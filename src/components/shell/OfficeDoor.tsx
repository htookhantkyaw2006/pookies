"use client";

import type { ReactNode } from "react";
import { OfficeGate, useSession } from "@/lib/data/react";
import { GuestEntry } from "@/components/entry/GuestEntry";
import { Button, Card } from "@/components/ui/controls";
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
        <div className="py-6">
          <GuestEntry />
        </div>,
      )}
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
