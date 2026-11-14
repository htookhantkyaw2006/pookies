"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import type { Member, Role } from "@/lib/data/types";
import { Button, Card, FormMessage } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

export function MemberList() {
  const { state, me, actions } = useOffice();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const members = [...state.members].sort((a, b) => {
    if ((a.id === me.id) !== (b.id === me.id)) return a.id === me.id ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const changeRole = async (member: Member, role: Role) => {
    const result = await actions.setMemberRole(member.id, role);
    setError(result.ok ? null : result.error);
  };

  const remove = async (member: Member) => {
    const result = await actions.removeMember(member.id);
    setError(result.ok ? null : result.error);
    setConfirming(null);
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold text-ink">People</h2>
        <p className="text-sm font-bold text-ink-soft">{members.length} in the workspace</p>
      </div>
      {error && (
        <div className="mt-3">
          <FormMessage tone="error">{error}</FormMessage>
        </div>
      )}

      <ul className="mt-3 divide-y divide-line">
        {members.map((member) => {
          const isYou = member.id === me.id;
          const selectId = `role-${member.id}`;
          return (
            <li key={member.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-sunken">
                <PookieAvatar avatar={member.avatar} size={38} />
              </span>
              <p className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
                {member.displayName}
                {isYou && <span className="ml-1 font-semibold text-brand-ink">(you)</span>}
              </p>

              {confirming === member.id ? (
                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                  <p className="text-sm font-bold text-ink">
                    Remove {member.displayName.split(" ")[0]}?
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                    Keep
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => void remove(member)}>
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <label htmlFor={selectId} className="sr-only">
                    Role for {member.displayName}
                  </label>
                  <select
                    id={selectId}
                    value={member.role}
                    onChange={(event) => void changeRole(member, event.target.value as Role)}
                    className="min-h-9 rounded-full border border-line-strong bg-surface px-3 text-sm font-bold text-ink"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isYou}
                    aria-label={`Remove ${member.displayName}`}
                    title={isYou ? "You can't remove yourself" : undefined}
                    onClick={() => setConfirming(member.id)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
