"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import type { AvatarStyle } from "@/lib/data/types";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, FormMessage } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

/** The washroom mirror: try a new look for your pookie. Saved to your profile. */
export function MirrorPanel({ onClose }: { onClose: () => void }) {
  const { me, actions } = useOffice();
  const [avatar, setAvatar] = useState<AvatarStyle>(me.avatar);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const changed = avatar.color !== me.avatar.color || avatar.shape !== me.avatar.shape;

  const save = async () => {
    setSaving(true);
    const result = await actions.updateProfile({
      displayName: me.displayName,
      avatar,
      timezone: me.timezone,
    });
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error);
  };

  return (
    <section
      aria-labelledby="mirror-title"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="absolute bottom-16 left-1/2 z-[3000] flex max-h-[calc(100%-6rem)] w-[min(26rem,calc(100%-1.5rem))] -translate-x-1/2 cursor-auto flex-col gap-3 overflow-y-auto rounded-card border border-line bg-surface p-4 shadow-lift select-text"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="mirror-title" className="flex items-center gap-2 text-base font-bold text-ink">
          <Sparkles aria-hidden="true" className="size-4 text-brand" />
          Mirror, mirror
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="flex justify-center rounded-2xl bg-sunken py-2">
        <PookieAvatar avatar={avatar} size={88} />
      </div>
      <AvatarPicker value={avatar} onChange={setAvatar} name="mirror" />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Keep my look
        </Button>
        <Button size="sm" disabled={!changed || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save new look"}
        </Button>
      </div>
    </section>
  );
}
