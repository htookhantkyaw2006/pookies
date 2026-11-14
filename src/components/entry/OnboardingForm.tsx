"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { useOffice } from "@/lib/data/react";
import { WORKSPACE_NAME_MAX } from "@/lib/data/rules";
import { Button, Field, FormMessage, inputClass } from "@/components/ui/controls";
import { PookieAvatar } from "@/components/ui/PookieAvatar";
import { PreviewNote } from "./EntryFrame";

/** First sign-in with no workspace yet: name one and become its admin. */
export function OnboardingForm() {
  const { me, actions } = useOffice();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await actions.renameWorkspace(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/office");
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft">
          <PookieAvatar avatar={me.avatar} size={48} />
        </span>
        <p className="text-[15px] font-semibold text-ink-soft">
          Hi {me.displayName.split(" ")[0]}, nice to meet you.
        </p>
      </div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">Set up your office</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">
        Give your workspace a name. You&apos;ll be its admin and can invite your team next.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-4">
        <Field label="Workspace name" htmlFor="onboarding-name">
          <input
            id="onboarding-name"
            type="text"
            value={name}
            maxLength={WORKSPACE_NAME_MAX}
            placeholder="e.g. Sunny Side Studio"
            autoComplete="organization"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "onboarding-error" : undefined}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </Field>
        {error && (
          <div id="onboarding-error">
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}
        <Button type="submit" size="lg" className="w-full">
          Create workspace
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </form>

      <PreviewNote>
        In this preview, this renames the sample workspace and drops you into it.
      </PreviewNote>
    </>
  );
}
