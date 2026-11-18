"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Download, Images, Trash2 } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { canRemovePhoto } from "@/lib/data/rules";
import { GamePanel } from "@/components/games/GamePanel";
import { PhotoPrint, savePrint } from "./PhotoPrint";

/** The photo wall in the garden: the team's last twelve booth photos. */
export function PhotoWall({ onClose }: { onClose: () => void }) {
  const { state, me, actions } = useOffice();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const printRef = useRef<SVGSVGElement>(null);
  const photos = state.things.photos;
  const open = photos.find((photo) => photo.id === openId) ?? null;
  const admin = me.role === "admin";

  const names = (id: string | null) =>
    id === me.id ? "you" : (state.members.find((member) => member.id === id)?.displayName.split(" ")[0] ?? null);

  const remove = async () => {
    if (!open) return;
    setBusy(true);
    const result = await actions.removePhoto(open.id);
    setBusy(false);
    if (result.ok) setOpenId(null);
    else setError(result.error);
  };

  return (
    <GamePanel title="Photo wall" icon={Images} onClose={onClose}>
      {open ? (
        <div className="flex flex-col gap-3">
          <PhotoPrint photo={open} svgRef={printRef} className="w-full rounded-xl shadow-card" />
          <p className="text-sm font-semibold text-ink-soft">
            {new Date(open.takenAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            {names(open.takenBy) && <> · taken by {names(open.takenBy)}</>}
          </p>
          {error && <p className="text-sm font-bold text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-ink-soft hover:bg-sunken hover:text-ink"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              All photos
            </button>
            <span className="flex-1" />
            {canRemovePhoto(open, me.id, admin) && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line-strong px-3 text-sm font-bold text-ink hover:bg-sunken disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Take down
              </button>
            )}
            <button
              type="button"
              onClick={() => printRef.current && void savePrint(printRef.current, open.takenAt)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-bold text-white hover:bg-brand-strong"
            >
              <Download aria-hidden="true" className="size-4" />
              Save image
            </button>
          </div>
        </div>
      ) : photos.length === 0 ? (
        <p className="text-sm font-semibold text-ink-soft">
          No photos yet. Grab a teammate or two and step into the photo booth next door!
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {photos.map((photo) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setOpenId(photo.id);
                  }}
                  className="block w-full rounded-lg transition-transform hover:-rotate-1 hover:scale-[1.03] focus-visible:outline-3 focus-visible:outline-brand"
                >
                  <PhotoPrint photo={photo} className="w-full rounded-lg shadow-card" />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs font-semibold text-ink-soft">The newest twelve stay up. Tap one to see it big.</p>
        </>
      )}
    </GamePanel>
  );
}
