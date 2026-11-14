"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, NotebookPen, Settings, UserRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useOfficeIfConnected } from "@/lib/data/react";
import { latestEntryByUser, resolvePresence } from "@/lib/presence/derive";
import { Logo } from "@/components/ui/Logo";
import { STATUS_META, StatusAvatar } from "@/components/ui/status";
import { OfficeBanner } from "./OfficeBanner";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: NavItem[] = [
  { href: "/office", label: "Office", icon: House },
  { href: "/check-ins", label: "Check-ins", icon: NotebookPen },
  { href: "/admin", label: "Admin", icon: Settings },
];

const PROFILE: NavItem = { href: "/profile", label: "Profile", icon: UserRound };

/**
 * The frame around every signed-in screen. It renders before the office has
 * connected (with blanks where live details go), so pages appear instantly.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const office = useOfficeIfConnected();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const me = office?.me;
  const myStatus = office
    ? resolvePresence(office.me.id, latestEntryByUser(office.state.presence)).status
    : null;
  // Members don't get an Admin entry; the page itself also refuses them.
  const nav = NAV.filter((item) => item.href !== "/admin" || me?.role === "admin");
  const workspaceName = office?.state.workspace.name;
  // The office is the map, edge to edge: one screen tall, no page scrolling.
  const fullScreen = pathname === "/office";

  return (
    <div
      className={`flex flex-col md:flex-row ${fullScreen ? "h-dvh overflow-hidden" : "min-h-dvh"}`}
    >
      {/* Sidebar: tablet and up */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-surface/70 px-4 py-6 md:flex">
        <Link href="/office" className="px-2" aria-label="Pookies, go to the office">
          <Logo />
        </Link>
        <p className="mt-6 px-3 text-xs font-bold tracking-wide text-ink-soft uppercase">
          Workspace
        </p>
        <p className="mt-1 min-h-7 truncate px-3 font-display text-lg font-semibold text-ink">
          {workspaceName}
        </p>

        <nav aria-label="Main" className="mt-6 flex flex-col gap-1">
          {nav.map((item) => (
            <SideLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        <Link
          href="/profile"
          aria-current={isActive("/profile") ? "page" : undefined}
          className={`mt-auto flex min-h-16 items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-sunken ${
            isActive("/profile") ? "bg-sunken" : ""
          }`}
        >
          {me && myStatus ? (
            <>
              <StatusAvatar avatar={me.avatar} status={myStatus} size={44} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-ink">{me.displayName}</span>
                <span className="block text-xs font-semibold text-ink-soft">
                  {STATUS_META[myStatus].label} · Profile
                </span>
              </span>
            </>
          ) : (
            <span className="px-1 text-sm font-bold text-ink-soft">Profile</span>
          )}
        </Link>
      </aside>

      {/* Top bar: phones */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/95 px-4 py-2.5 backdrop-blur md:hidden">
        <Link href="/office" aria-label="Pookies, go to the office">
          <Logo size={30} />
        </Link>
        <span className="max-w-[45%] truncate text-sm font-bold text-ink-soft">
          {workspaceName}
        </span>
      </header>

      <div className={`flex min-w-0 flex-1 flex-col ${fullScreen ? "min-h-0" : ""}`}>
        {office && <OfficeBanner />}
        <main
          className={
            fullScreen
              ? "relative flex min-h-0 w-full flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
              : "mx-auto w-full max-w-[90rem] flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-12 lg:px-8"
          }
        >
          {children}
        </main>
      </div>

      {/* Tab bar: phones */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid auto-cols-fr grid-flow-col border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {[...nav, PROFILE].map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                active ? "text-brand-ink" : "text-ink-soft"
              }`}
            >
              <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.6 : 2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-bold transition-colors ${
        active ? "bg-brand-soft text-brand-ink" : "text-ink-soft hover:bg-sunken hover:text-ink"
      }`}
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.6 : 2.2} />
      {item.label}
    </Link>
  );
}
