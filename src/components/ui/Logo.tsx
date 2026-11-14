import { PookieAvatar } from "./PookieAvatar";

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <PookieAvatar avatar={{ color: "lilac", shape: "bear" }} size={size} />
      <span className="font-display text-2xl font-semibold tracking-tight text-ink">Pookies</span>
    </span>
  );
}
