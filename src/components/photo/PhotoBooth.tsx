"use client";

import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { PHOTO_MAX_PEOPLE } from "@/lib/data/rules";
import { PHOTO_BACKDROPS, type PhotoBackdrop } from "@/lib/data/types";
import { PHOTO_BOOTH_AREA } from "@/lib/world/map";
import { getWorldEngine } from "@/lib/world/instance";
import { GamePanel } from "@/components/games/GamePanel";
import { PookieAvatar } from "@/components/ui/PookieAvatar";
import { PhotoPrint } from "./PhotoPrint";

export const BACKDROP_NAMES: Record<PhotoBackdrop, string> = {
  garden: "Garden",
  stars: "Starry night",
  confetti: "Confetti",
  sunset: "Sunset",
};

const SWATCHES: Record<PhotoBackdrop, string> = {
  garden: "linear-gradient(#cfe9ff 55%, #a9e5c8 55%)",
  stars: "radial-gradient(circle at 70% 30%, #fff3c4 12%, transparent 13%), linear-gradient(#2b2440, #4d3d73)",
  confetti: "radial-gradient(circle at 25% 30%, #ff8fa3 10%, transparent 11%), radial-gradient(circle at 70% 60%, #a9e5c8 10%, transparent 11%), radial-gradient(circle at 45% 80%, #ffe08a 10%, transparent 11%), #fff4fa",
  sunset: "radial-gradient(circle at 50% 75%, #ffe08a 22%, transparent 23%), linear-gradient(#ffb38a, #cfbcf8)",
};

/** Who is in the booth right now, refreshed a few times a second. */
function useBoothPeople(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const read = () => {
      const next = getWorldEngine().peopleIn(PHOTO_BOOTH_AREA);
      setIds((old) => (old.join() === next.join() ? old : next));
    };
    read();
    const timer = window.setInterval(read, 300);
    return () => window.clearInterval(timer);
  }, []);
  return ids;
}

/**
 * The photo booth: see who's in, pick a backdrop, and start the countdown.
 * The countdown and flash happen over the whole map (so others in the booth
 * see them too); the finished photo shows up here and on the photo wall.
 */
export function PhotoBooth({
  onClose,
  onSnap,
  snapping,
  since,
}: {
  onClose: () => void;
  /** Starts the 3-2-1 for everyone in the booth. */
  onSnap: (backdrop: PhotoBackdrop) => void;
  /** A countdown is running. */
  snapping: boolean;
  /** When the panel opened: photos you took after this are shown here. */
  since: number;
}) {
  const { state, me } = useOffice();
  const [backdrop, setBackdrop] = useState<PhotoBackdrop>("garden");
  const ids = useBoothPeople();
  const people = ids
    .map((id) => state.members.find((member) => member.id === id))
    .filter((member) => member !== undefined);
  const inside = ids.includes(me.id);
  const latest = state.things.photos.find((photo) => photo.takenBy === me.id && photo.takenAt >= since);

  return (
    <GamePanel title="Photo booth" icon={Camera} onClose={onClose}>
      {latest && !snapping ? (
        <div className="flex flex-col gap-2">
          <PhotoPrint photo={latest} className="w-full rounded-xl shadow-card" />
          <p aria-live="polite" className="text-center text-sm font-bold text-ink">
            Pinned on the photo wall! 📌
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-bold text-ink">In the photo</p>
          {people.length === 0 ? (
            <p className="text-sm font-semibold text-ink-soft">Nobody yet. Step onto a spot!</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {people.slice(0, PHOTO_MAX_PEOPLE).map((member) => (
                <li key={member.id} className="flex items-center gap-1.5 rounded-full bg-sunken py-1 pr-3 pl-1 text-sm font-bold text-ink">
                  <PookieAvatar avatar={member.avatar} size={26} />
                  {member.id === me.id ? "You" : member.displayName.split(" ")[0]}
                </li>
              ))}
            </ul>
          )}
          {people.length > PHOTO_MAX_PEOPLE && (
            <p className="text-xs font-semibold text-ink-soft">Only four fit: the first four are in.</p>
          )}
        </div>
      )}

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold text-ink">Backdrop</legend>
        <div className="grid grid-cols-4 gap-2">
          {PHOTO_BACKDROPS.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={backdrop === kind}
              onClick={() => setBackdrop(kind)}
              className="flex flex-col items-center gap-1 rounded-xl p-1 text-xs font-bold text-ink-soft aria-pressed:bg-brand-soft aria-pressed:text-brand-ink"
            >
              <span
                aria-hidden="true"
                className="block aspect-[4/3] w-full rounded-lg ring-2 ring-line"
                style={{ background: SWATCHES[kind] }}
              />
              {BACKDROP_NAMES[kind]}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => onSnap(backdrop)}
        disabled={!inside || snapping}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Camera aria-hidden="true" className="size-4" />
        {snapping ? "Smile!" : latest ? "Take another" : "Take photo"}
      </button>
      {!inside && (
        <p className="text-center text-xs font-semibold text-ink-soft">Step onto one of the spots to be in it.</p>
      )}
    </GamePanel>
  );
}
