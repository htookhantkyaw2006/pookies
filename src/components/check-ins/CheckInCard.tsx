import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { timeAgo } from "@/lib/dates";
import type { CheckIn, Member } from "@/lib/data/types";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/** One person's check-in for a day. */
export function CheckInCard({
  checkIn,
  author,
  isYou,
  now,
  action,
}: {
  checkIn: CheckIn;
  author: Member;
  isYou: boolean;
  now: number;
  action?: ReactNode;
}) {
  const edited = checkIn.updatedAt > checkIn.createdAt;
  return (
    <article
      className={`animate-rise rounded-card border bg-surface p-4 shadow-card ${
        isYou ? "border-brand/40" : "border-line"
      }`}
    >
      <header className="flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken">
          <PookieAvatar avatar={author.avatar} size={34} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base leading-tight font-semibold text-ink">
            {author.displayName}
            {isYou && <span className="ml-1 text-sm font-semibold text-brand-ink">(you)</span>}
          </h3>
          <p className="text-xs font-semibold text-ink-soft">
            {timeAgo(checkIn.createdAt, now)}
            {edited && " · edited"}
          </p>
        </div>
        {action}
      </header>

      <dl className="mt-3 flex flex-col gap-2.5 text-[15px] leading-6">
        {checkIn.yesterday && (
          <div>
            <dt className="text-xs font-bold tracking-wide text-ink-soft uppercase">Yesterday</dt>
            <dd className="break-words whitespace-pre-line text-ink">{checkIn.yesterday}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-bold tracking-wide text-ink-soft uppercase">Today</dt>
          <dd className="break-words whitespace-pre-line text-ink">{checkIn.today}</dd>
        </div>
        {checkIn.blockers && (
          <div className="rounded-2xl bg-away-soft px-3 py-2">
            <dt className="flex items-center gap-1 text-xs font-bold tracking-wide text-away-ink uppercase">
              <TriangleAlert aria-hidden="true" className="size-3.5" />
              In the way
            </dt>
            <dd className="break-words whitespace-pre-line text-ink">{checkIn.blockers}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
