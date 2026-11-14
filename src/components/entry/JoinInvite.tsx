"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowRight } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { inviteState } from "@/lib/data/rules";
import { buttonClass } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";
import { PreviewNote } from "./EntryFrame";

const MAX_FACES = 6;

/** Landing screen for an invite link: join if it's good, explain if it isn't. */
export function JoinInvite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { state } = useOffice();
  const invite = state.invites.find((candidate) => candidate.token === token);
  const status = invite ? inviteState(invite, state.now) : "unknown";

  if (status !== "active") {
    const reason =
      status === "expired"
        ? "This invite link has expired."
        : status === "revoked"
          ? "This invite link has been switched off."
          : "We couldn't find this invite link.";
    return (
      <>
        <h1 className="text-3xl font-semibold tracking-tight text-ink">This link won&apos;t work</h1>
        <p className="mt-2 text-[15px] font-semibold text-ink-soft">
          {reason} Ask whoever invited you for a fresh one.
        </p>
        <Link href="/" className={`${buttonClass("secondary", "lg")} mt-6 w-full`}>
          Back to Pookies
        </Link>
      </>
    );
  }

  const faces = state.members.slice(0, MAX_FACES);
  const extra = state.members.length - faces.length;

  return (
    <>
      <p className="text-sm font-bold text-brand-ink">You&apos;re invited</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance text-ink">
        Join {state.workspace.name}
      </h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">
        {state.members.length} people are already in this office.
      </p>

      <ul aria-label="People in this workspace" className="mt-4 flex flex-wrap items-center gap-1.5">
        {faces.map((member) => (
          <li
            key={member.id}
            title={member.displayName}
            className="inline-flex size-11 items-center justify-center rounded-full bg-sunken"
          >
            <PookieAvatar avatar={member.avatar} size={38} />
            <span className="sr-only">{member.displayName}</span>
          </li>
        ))}
        {extra > 0 && <li className="pl-1 text-sm font-bold text-ink-soft">+{extra} more</li>}
      </ul>

      <Link href="/office" className={`${buttonClass("primary", "lg")} mt-6 w-full`}>
        Continue with Google
        <ArrowRight aria-hidden="true" className="size-5" />
      </Link>

      <PreviewNote>
        Sign-in isn&apos;t connected in this preview. The button takes you straight into the office.
      </PreviewNote>
    </>
  );
}
