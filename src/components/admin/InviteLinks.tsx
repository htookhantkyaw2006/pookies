"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Check, Copy, Plus } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { inviteState, type InviteState } from "@/lib/data/rules";
import type { Invite } from "@/lib/data/types";
import { Button, Card, FormMessage } from "@/components/ui/controls";

const DAY_MS = 24 * 60 * 60 * 1000;

const STATE_STYLE: Record<InviteState, string> = {
  active: "bg-online-soft text-online-ink",
  expired: "bg-offline-soft text-offline-ink",
  revoked: "bg-busy-soft text-busy-ink",
};

function stateLabel(invite: Invite, state: InviteState, now: number): string {
  if (state === "revoked") return "Revoked";
  if (state === "expired") return "Expired";
  const days = Math.ceil((invite.expiresAt - now) / DAY_MS);
  return days <= 1 ? "Active · expires today" : `Active · ${days} days left`;
}

export function InviteLinks() {
  const { state, actions } = useOffice();
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const memberById = new Map(state.members.map((member) => [member.id, member]));

  const create = async () => {
    const result = await actions.createInvite();
    setError(result.ok ? null : result.error);
  };

  const copy = async (invite: Invite) => {
    const url = `${window.location.origin}/join/${invite.token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(invite.id);
      setError(null);
    } catch {
      setError(`Couldn't copy automatically. The link is ${url}`);
    }
  };

  const revoke = async (invite: Invite) => {
    const result = await actions.revokeInvite(invite.id);
    setError(result.ok ? null : result.error);
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Invite links</h2>
          <p className="mt-1 text-sm font-semibold text-ink-soft">
            Share a link however you like. Anyone who opens it can join. Links last 7 days.
          </p>
        </div>
        <Button onClick={() => void create()}>
          <Plus aria-hidden="true" className="size-4" />
          New invite link
        </Button>
      </div>
      {error && (
        <div className="mt-3">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      )}

      {state.invites.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-sunken px-4 py-6 text-center text-sm font-semibold text-ink-soft">
          No invite links yet. Create one to bring your team in.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {state.invites.map((invite) => {
            const status = inviteState(invite, state.now);
            const active = status === "active";
            const creator = memberById.get(invite.createdBy)?.displayName ?? "a former member";
            return (
              <li key={invite.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  {active ? (
                    <Link
                      href={`/join/${invite.token}`}
                      className="block truncate font-mono text-sm font-semibold text-brand-ink underline-offset-2 hover:underline"
                    >
                      /join/{invite.token}
                    </Link>
                  ) : (
                    <p className="truncate font-mono text-sm font-semibold text-ink-soft line-through">
                      /join/{invite.token}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                    Made by {creator} · used {invite.useCount}{" "}
                    {invite.useCount === 1 ? "time" : "times"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATE_STYLE[status]}`}
                >
                  {stateLabel(invite, status, state.now)}
                </span>
                {active && (
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={() => void copy(invite)}>
                      {copied === invite.id ? (
                        <Check aria-hidden="true" className="size-4" />
                      ) : (
                        <Copy aria-hidden="true" className="size-4" />
                      )}
                      {copied === invite.id ? "Copied" : "Copy link"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void revoke(invite)}>
                      <Ban aria-hidden="true" className="size-4" />
                      Revoke
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
