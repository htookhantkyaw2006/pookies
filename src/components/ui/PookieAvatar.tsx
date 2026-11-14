import { AVATAR_PALETTE } from "@/lib/avatarPalette";
import type { AvatarStyle, DisplayStatus } from "@/lib/data/types";

const INK = "#2b2233";

/**
 * The little character that stands in for a person. Its face follows their
 * status: bright eyes when online, focused when busy, dozing when away.
 * Decorative: always pair it with the person's name and a status label.
 */
export function PookieAvatar({
  avatar,
  mood = "online",
  size = 56,
  className = "",
}: {
  avatar: AvatarStyle;
  mood?: DisplayStatus;
  size?: number;
  className?: string;
}) {
  const { body, shade } = AVATAR_PALETTE[avatar.color];
  const asleep = mood === "offline";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={`${asleep ? "opacity-70 grayscale" : ""} ${className}`}
    >
      {avatar.shape === "bear" && (
        <>
          <circle cx="15" cy="18" r="9" fill={body} />
          <circle cx="49" cy="18" r="9" fill={body} />
          <circle cx="15" cy="18" r="4.5" fill={shade} />
          <circle cx="49" cy="18" r="4.5" fill={shade} />
        </>
      )}
      {avatar.shape === "cat" && (
        <>
          <path d="M9 28 L12 7 L29 17 Z" fill={body} stroke={body} strokeWidth="3" strokeLinejoin="round" />
          <path d="M55 28 L52 7 L35 17 Z" fill={body} stroke={body} strokeWidth="3" strokeLinejoin="round" />
          <path d="M14 22 L15.5 13 L23 17.5 Z" fill={shade} />
          <path d="M50 22 L48.5 13 L41 17.5 Z" fill={shade} />
        </>
      )}
      {avatar.shape === "bunny" && (
        <>
          <ellipse cx="22" cy="14" rx="6" ry="13" fill={body} />
          <ellipse cx="42" cy="14" rx="6" ry="13" fill={body} />
          <ellipse cx="22" cy="14" rx="2.5" ry="8" fill={shade} />
          <ellipse cx="42" cy="14" rx="2.5" ry="8" fill={shade} />
        </>
      )}
      {avatar.shape === "round" && (
        <path d="M32 16 q-2 -8 4 -10 q-1 5 3 7" fill="none" stroke={shade} strokeWidth="3" strokeLinecap="round" />
      )}

      <ellipse cx="32" cy="39" rx="25" ry="22" fill={body} />
      <circle cx="17.5" cy="45" r="4" fill="#ff8fa3" opacity="0.45" />
      <circle cx="46.5" cy="45" r="4" fill="#ff8fa3" opacity="0.45" />

      {mood === "online" && (
        <>
          <circle cx="23" cy="38" r="2.9" fill={INK} />
          <circle cx="41" cy="38" r="2.9" fill={INK} />
          <circle cx="24" cy="37" r="0.9" fill="#fff" />
          <circle cx="42" cy="37" r="0.9" fill="#fff" />
          <path d="M27 45 q5 5 10 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {mood === "busy" && (
        <>
          <path d="M19.5 38 h7 M37.5 38 h7" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M28.5 46.5 h7" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {(mood === "away" || mood === "offline") && (
        <>
          <path
            d="M19.5 37 q3.5 3.5 7 0 M37.5 37 q3.5 3.5 7 0"
            fill="none"
            stroke={INK}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M29 46 q3 2.2 6 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {asleep && (
        <g fill={INK} fontFamily="var(--font-display)" fontWeight="600">
          <text x="50" y="16" fontSize="10">z</text>
          <text x="57" y="9" fontSize="7">z</text>
        </g>
      )}
    </svg>
  );
}
