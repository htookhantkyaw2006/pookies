"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, LogOut } from "lucide-react";
import { officeKind, useOffice, useSession } from "@/lib/data/react";
import { NAME_MAX } from "@/lib/data/rules";
import type { AvatarColor, AvatarShape } from "@/lib/data/types";
import { clockInZone } from "@/lib/dates";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { Button, Card, Field, FormMessage, PageHeader, inputClass } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";

export function ProfileScreen() {
  const { state, me, actions } = useOffice();
  const session = useSession();
  const [displayName, setDisplayName] = useState(me.displayName);
  const [color, setColor] = useState<AvatarColor>(me.avatar.color);
  const [shape, setShape] = useState<AvatarShape>(me.avatar.shape);
  const [timezone, setTimezone] = useState(me.timezone);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const zones = useMemo(() => {
    const all = Intl.supportedValuesOf("timeZone");
    return all.includes(me.timezone) ? all : [me.timezone, ...all];
  }, [me.timezone]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await actions.updateProfile({
      displayName,
      avatar: { color, shape },
      timezone,
    });
    setMessage(
      result.ok
        ? { tone: "success", text: "Saved. Your team sees the change right away." }
        : { tone: "error", text: result.error },
    );
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Your profile" subtitle="How you show up in the office." />

      <form onSubmit={submit} noValidate>
        <Card className="flex flex-col gap-6 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-24 shrink-0 items-center justify-center rounded-full bg-brand-soft">
              <PookieAvatar avatar={{ color, shape }} size={84} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-semibold text-ink">
                {displayName.trim() || "Your name"}
              </p>
              <p className="text-sm font-semibold text-ink-soft">
                {me.role === "admin" ? "Admin" : "Member"} of {state.workspace.name}
              </p>
            </div>
          </div>

          <Field label="Name" htmlFor="profile-name">
            <input
              id="profile-name"
              type="text"
              value={displayName}
              maxLength={NAME_MAX}
              autoComplete="name"
              onChange={(event) => setDisplayName(event.target.value)}
              className={inputClass}
            />
          </Field>

          <AvatarPicker
            name="profile"
            value={{ color, shape }}
            onChange={(next) => {
              setColor(next.color);
              setShape(next.shape);
            }}
          />

          <Field
            label="Time zone"
            hint={`It's ${clockInZone(state.now, timezone)} there now`}
            htmlFor="profile-timezone"
          >
            <select
              id="profile-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className={inputClass}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">
              <Check aria-hidden="true" className="size-4" />
              Save profile
            </Button>
            {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
          </div>
        </Card>
      </form>

      {officeKind === "live" && (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm font-semibold text-ink-soft">
            Leaving takes you out of {state.workspace.name}. Come back any time with its code.
          </p>
          <Button variant="secondary" onClick={() => void session.leave()}>
            <LogOut aria-hidden="true" className="size-4" />
            Leave office
          </Button>
        </Card>
      )}
    </div>
  );
}
