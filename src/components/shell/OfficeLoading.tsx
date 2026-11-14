import { PookieAvatar } from "@/components/ui/PookieAvatar";

/** Fills the content area while the browser connects to the office. */
export function OfficeLoading() {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="animate-pulse">
        <PookieAvatar avatar={{ color: "lilac", shape: "bear" }} mood="away" size={56} />
      </span>
      <p className="text-[15px] font-semibold text-ink-soft">Opening the office…</p>
    </div>
  );
}
