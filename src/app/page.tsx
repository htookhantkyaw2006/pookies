import Link from "next/link";
import { ArrowRight, HeartHandshake, NotebookPen, Users } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/controls";
import { StatusAvatar } from "@/components/ui/status";
import type { AvatarStyle, DisplayStatus } from "@/lib/data/types";

const CAST: Array<{ avatar: AvatarStyle; status: DisplayStatus; name: string; note: string }> = [
  { avatar: { color: "peach", shape: "cat" }, status: "online", name: "Maya", note: "Around" },
  { avatar: { color: "sky", shape: "round" }, status: "busy", name: "Leo", note: "Deep work" },
  { avatar: { color: "mint", shape: "bunny" }, status: "online", name: "Aisha", note: "Happy to pair" },
  { avatar: { color: "butter", shape: "bear" }, status: "away", name: "Tomás", note: "At lunch" },
  { avatar: { color: "rose", shape: "round" }, status: "offline", name: "Jonas", note: "Offline" },
];

const POINTS = [
  {
    icon: Users,
    title: "See who's around",
    text: "Online, busy or away, with a one-line note. Live for everyone, no refresh.",
  },
  {
    icon: NotebookPen,
    title: "Two-minute check-ins",
    text: "Yesterday, today, anything in the way. Stay in sync without another meeting.",
  },
  {
    icon: HeartHandshake,
    title: "Connection, not surveillance",
    text: "You choose what you share. No activity tracking, no screenshots, ever.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <Link href="/office" className={buttonClass("secondary", "sm")}>
          Join with a code
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center pt-8 pb-16 text-center sm:pt-14">
        <p className="rounded-full bg-brand-soft px-4 py-1 text-sm font-bold text-brand-ink">
          A virtual office for small remote teams
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl leading-tight font-semibold tracking-tight text-balance text-ink sm:text-6xl">
          Feel like you&apos;re in the same room again
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-7 font-semibold text-pretty text-ink-soft">
          Pookies shows who&apos;s around, who&apos;s heads-down, and what everyone&apos;s up to
          today. Light, friendly, and no extra meetings.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/office" className={buttonClass("primary", "lg")}>
            Create or join an office
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </div>

        <ul
          aria-label="Example teammates"
          className="mt-12 flex w-full max-w-3xl flex-wrap items-start justify-center gap-x-6 gap-y-5 rounded-card border border-line bg-surface px-4 py-7 shadow-card sm:gap-x-9"
        >
          {CAST.map((person) => (
            <li key={person.name} className="flex w-20 flex-col items-center gap-2">
              <StatusAvatar avatar={person.avatar} status={person.status} size={64} />
              <span className="font-display text-base leading-none font-semibold text-ink">
                {person.name}
              </span>
              <span className="text-xs leading-tight font-bold text-ink-soft">{person.note}</span>
            </li>
          ))}
        </ul>

        <ul className="mt-12 grid w-full gap-4 text-left sm:grid-cols-3">
          {POINTS.map((point) => (
            <li key={point.title} className="rounded-card border border-line bg-surface p-5 shadow-card">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                <point.icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-3 text-lg font-semibold text-ink">{point.title}</h2>
              <p className="mt-1 text-[15px] leading-6 font-semibold text-ink-soft">{point.text}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
