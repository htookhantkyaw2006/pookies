import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/** Centred single-card layout for sign-in, onboarding and invite screens. */
export function EntryFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center px-4 py-8 sm:py-14">
      <Link href="/" aria-label="Pookies home">
        <Logo size={40} />
      </Link>
      <main className="mt-8 w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8">
        {children}
      </main>
      <p className="mt-6 max-w-md text-center text-sm font-semibold text-ink-soft">
        Pookies is for connection, not surveillance. No activity tracking, ever.
      </p>
    </div>
  );
}

/** Small note used on entry screens while the prototype has no real accounts. */
export function PreviewNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-ink">
      {children}
    </p>
  );
}
