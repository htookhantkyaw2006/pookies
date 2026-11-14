"use client";

import { ShieldCheck } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { Card, PageHeader } from "@/components/ui/controls";
import { InviteLinks } from "./InviteLinks";
import { MemberList } from "./MemberList";
import { WorkspaceNameForm } from "./WorkspaceNameForm";

export function AdminScreen() {
  const { state, me } = useOffice();

  if (me.role !== "admin") {
    const admins = state.members
      .filter((member) => member.role === "admin")
      .map((member) => member.displayName);
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <PageHeader title="Admin" />
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <h2 className="text-xl font-semibold text-ink">This part is for admins</h2>
          <p className="max-w-sm text-[15px] font-semibold text-ink-soft">
            {admins.length > 0
              ? `Need someone added or something changed? Ask ${admins.join(" or ")}.`
              : "Need someone added or something changed? Ask a workspace admin."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Admin"
        subtitle="Look after the workspace: who's in it, and how people join."
      />
      <WorkspaceNameForm />
      <MemberList />
      <InviteLinks />
    </div>
  );
}
