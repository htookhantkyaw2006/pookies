import type { Ref } from "react";
import type { DisplayStatus, Member } from "@/lib/data/types";
import { PookieAvatar } from "@/components/ui/PookieAvatar";
import { STATUS_META } from "@/components/ui/status";

/**
 * One person in the world. The element sits at the person's feet; the world
 * view moves it every frame and flips its data attributes (walking, lean,
 * near, emote), which the classes below react to.
 */
export function WorldAvatar({
  member,
  status,
  note,
  isYou,
  nodeRef,
  labelOnly = false,
}: {
  member: Member;
  status: DisplayStatus;
  note: string;
  isYou: boolean;
  nodeRef: Ref<HTMLDivElement>;
  /** The 3D office draws the body itself: show just the name, note and emoji above its head. */
  labelOnly?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const firstName = member.displayName.split(" ")[0];

  if (labelOnly) {
    return (
      <div
        ref={nodeRef}
        data-walking="false"
        data-near="false"
        data-emote="false"
        data-sitting="false"
        className="group/avatar pointer-events-none absolute top-0 left-0 opacity-0 transition-opacity duration-300 will-change-transform"
      >
        <div className="absolute bottom-0 left-0 flex -translate-x-1/2 flex-col items-center gap-1">
          <span
            aria-hidden="true"
            data-emote-slot
            className="hidden text-2xl leading-none group-data-[emote=true]/avatar:block group-data-[emote=true]/avatar:animate-emote"
          />
          {note && (
            <p
              className={`w-max max-w-44 rounded-2xl border border-line bg-surface px-2.5 py-1 text-center text-xs leading-4 font-bold text-ink shadow-lift transition-opacity duration-200 ${
                isYou ? "opacity-100" : "opacity-0 group-data-[near=true]/avatar:opacity-100"
              }`}
            >
              {note}
            </p>
          )}
          <p
            className={`flex w-max items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4 font-bold shadow-card ${
              isYou ? "bg-brand text-white" : `${meta.soft} ${meta.ink}`
            }`}
          >
            <Icon aria-hidden="true" className="size-3" strokeWidth={2.75} />
            {isYou ? "You" : firstName}
            <span className="sr-only">, {meta.label}</span>
          </p>
          {/* The 3D character holds its own coffee; this keeps the slot the map view fills. */}
          <span aria-hidden="true" data-hold-slot className="hidden" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={nodeRef}
      data-walking="false"
      data-lean="0"
      data-near="false"
      data-emote="false"
      data-sitting="false"
      className="group/avatar absolute top-0 left-0 opacity-0 transition-opacity duration-300 will-change-transform"
    >
      {/* Shadow on the floor */}
      <span className="absolute top-0 left-0 h-3 w-9 -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-ink/15 group-data-[sitting=true]/avatar:hidden" />

      {/* Body: stands on the feet point */}
      <div className="absolute bottom-[-3px] left-0 flex -translate-x-1/2 flex-col items-center group-data-[sitting=true]/avatar:bottom-[-1px]">
        {note && (
          <p
            className={`absolute bottom-full mb-1 w-max max-w-44 rounded-2xl border border-line bg-surface px-2.5 py-1 text-center text-xs leading-4 font-bold text-ink shadow-lift transition-opacity duration-200 ${
              isYou
                ? "opacity-100"
                : "opacity-0 group-hover/avatar:opacity-100 group-data-[near=true]/avatar:opacity-100"
            }`}
          >
            {note}
          </p>
        )}
        <span
          aria-hidden="true"
          data-emote-slot
          className="absolute -top-7 hidden text-2xl group-data-[emote=true]/avatar:block group-data-[emote=true]/avatar:animate-emote"
        />
        <span
          aria-hidden="true"
          data-hold-slot
          className="absolute -right-4 bottom-1 z-10 text-lg leading-none drop-shadow-sm empty:hidden"
        />
        <span className="block transition-transform duration-150 group-data-[lean=-1]/avatar:-rotate-6 group-data-[lean=1]/avatar:rotate-6">
          <span className="block group-data-[walking=true]/avatar:animate-bob">
            <span className="block origin-bottom transition-transform duration-200 group-data-[sitting=true]/avatar:scale-y-[0.9]">
              <PookieAvatar avatar={member.avatar} mood={status} size={46} />
            </span>
          </span>
        </span>
      </div>

      {/* Name tag under the feet: colour, icon and (for screen readers) the status word */}
      <p
        className={`absolute top-2 left-0 flex w-max -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] leading-4 font-bold shadow-card ${
          isYou ? "bg-brand text-white" : `${meta.soft} ${meta.ink}`
        }`}
      >
        <Icon aria-hidden="true" className="size-3" strokeWidth={2.75} />
        {isYou ? "You" : firstName}
        <span className="sr-only">, {meta.label}</span>
      </p>
    </div>
  );
}
