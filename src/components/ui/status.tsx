import { Coffee, Headphones, Moon, Sun, type LucideIcon } from "lucide-react";
import type { AvatarStyle, DisplayStatus } from "@/lib/data/types";
import { PookieAvatar } from "./PookieAvatar";

interface StatusMeta {
  label: string;
  /** Heading for this group in the room. */
  section: string;
  hint: string;
  icon: LucideIcon;
  dot: string;
  ink: string;
  soft: string;
  ring: string;
}

/** Every status has its own icon and label, so colour is never the only cue. */
export const STATUS_META: Record<DisplayStatus, StatusMeta> = {
  online: {
    label: "Online",
    section: "Around",
    hint: "Up for a quick chat",
    icon: Sun,
    dot: "bg-online",
    ink: "text-online-ink",
    soft: "bg-online-soft",
    ring: "ring-online",
  },
  busy: {
    label: "Busy",
    section: "Heads-down",
    hint: "Best not to interrupt",
    icon: Headphones,
    dot: "bg-busy",
    ink: "text-busy-ink",
    soft: "bg-busy-soft",
    ring: "ring-busy",
  },
  away: {
    label: "Away",
    section: "Stepped away",
    hint: "Back in a bit",
    icon: Coffee,
    dot: "bg-away",
    ink: "text-away-ink",
    soft: "bg-away-soft",
    ring: "ring-away",
  },
  offline: {
    label: "Offline",
    section: "Not in right now",
    hint: "They'll see things when they're back",
    icon: Moon,
    dot: "bg-offline",
    ink: "text-offline-ink",
    soft: "bg-offline-soft",
    ring: "ring-offline",
  },
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.soft} ${meta.ink}`}
    >
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      {meta.label}
    </span>
  );
}

/** Avatar inside a status-coloured ring, with the status icon as a corner badge. */
export function StatusAvatar({
  avatar,
  status,
  size = 72,
}: {
  avatar: AvatarStyle;
  status: DisplayStatus;
  size?: number;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const badge = Math.max(18, Math.round(size * 0.3));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {status === "online" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-breathe rounded-full bg-online"
        />
      )}
      <span
        className={`relative inline-flex size-full items-center justify-center rounded-full ring-[3px] ring-offset-2 ring-offset-surface ${meta.ring} ${meta.soft}`}
      >
        <PookieAvatar avatar={avatar} mood={status} size={Math.round(size * 0.86)} />
      </span>
      <span
        aria-hidden="true"
        className={`absolute -right-1 -bottom-1 inline-flex items-center justify-center rounded-full border-2 border-surface text-white ${meta.dot}`}
        style={{ width: badge, height: badge }}
      >
        <Icon className="size-[60%]" strokeWidth={2.75} />
      </span>
    </span>
  );
}
