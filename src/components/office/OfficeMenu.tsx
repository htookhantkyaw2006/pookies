"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  DoorOpen,
  Link2,
  NotebookPen,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { officeKind, useOffice, useSession } from "@/lib/data/react";
import { previewAsRole } from "@/lib/data/mock/store";
import type { Role } from "@/lib/data/types";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/**
 * The office's menu, floating in the top-left corner of the game: which
 * office this is and its code to share, plus the way to check-ins, your
 * profile, the admin page and out.
 */
export function OfficeMenu() {
  const { state, me } = useOffice();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const code = state.workspace.code;

  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is on screen to read out instead.
    }
  };

  return (
    <div ref={root} data-hud onPointerDown={(event) => event.stopPropagation()} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${state.workspace.name} menu`}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 max-w-[min(20rem,calc(100vw-12rem))] items-center gap-2 rounded-full bg-surface/95 py-1 pr-3 pl-1 text-sm font-bold text-ink shadow-lift backdrop-blur transition-colors hover:bg-brand-soft"
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <PookieAvatar avatar={me.avatar} size={30} />
        </span>
        <span className="hidden min-w-0 truncate sm:inline">{state.workspace.name}</span>
        {code && (
          <span
            data-office-code={code}
            className="rounded-md bg-sunken px-1.5 py-0.5 font-mono text-xs font-bold tracking-[0.15em] text-ink-soft"
          >
            {code}
          </span>
        )}
        <ChevronDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-[calc(100%+0.5rem)] left-0 z-[3000] w-72 rounded-2xl border border-line bg-surface/97 p-2 shadow-lift backdrop-blur"
        >
          <div className="px-2 pt-1 pb-2">
            <p className="truncate font-display text-lg font-semibold text-ink">{state.workspace.name}</p>
            {code ? (
              <>
                <p className="mt-1 text-xs font-bold text-ink-soft">Office code</p>
                <p className="font-mono text-2xl font-bold tracking-[0.25em] text-ink">{code}</p>
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-full bg-brand px-3 text-sm font-bold text-white hover:bg-brand-strong"
                >
                  {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
                  {copied ? "Invite link copied" : "Copy invite link"}
                </button>
              </>
            ) : (
              <p className="mt-1 text-xs font-semibold text-ink-soft">
                {officeKind === "sample" ? "Sample office: nothing here is saved." : "The shared demo office."}
              </p>
            )}
          </div>

          <div className="my-1 h-px bg-line" />
          <MenuLink href="/check-ins" icon={NotebookPen} label="Check-ins" onPick={() => setOpen(false)} />
          <MenuLink href="/profile" icon={UserRound} label="Profile" onPick={() => setOpen(false)} />
          {me.role === "admin" && (
            <MenuLink href="/admin" icon={Settings} label="Admin" onPick={() => setOpen(false)} />
          )}

          {officeKind === "sample" && <PreviewRole role={me.role} />}

          {officeKind === "live" && (
            <>
              <div className="my-1 h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => void session.leave()}
                className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-2 text-sm font-bold text-ink hover:bg-sunken"
              >
                <DoorOpen aria-hidden="true" className="size-4 text-ink-soft" />
                Leave office
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onPick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onPick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onPick}
      className="flex min-h-10 items-center gap-2.5 rounded-xl px-2 text-sm font-bold text-ink hover:bg-sunken"
    >
      <Icon aria-hidden="true" className="size-4 text-ink-soft" />
      {label}
    </Link>
  );
}

const ROLES: Array<{ value: Role; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

/** Sample office only: flip between the admin and member views. */
function PreviewRole({ role }: { role: Role }) {
  return (
    <fieldset className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-sunken px-2 py-2">
      <legend className="sr-only">View the sample office as</legend>
      <span className="text-xs font-bold text-ink-soft">View as</span>
      <div className="inline-flex rounded-full border border-line bg-surface p-0.5">
        {ROLES.map((option) => (
          <label
            key={option.value}
            className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-ink-soft has-checked:bg-brand has-checked:text-white"
          >
            <input
              type="radio"
              name="preview-role"
              value={option.value}
              checked={role === option.value}
              onChange={() => previewAsRole(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
