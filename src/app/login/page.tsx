import type { Metadata } from "next";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { EntryFrame, PreviewNote } from "@/components/entry/EntryFrame";
import { buttonClass } from "@/components/ui/controls";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <EntryFrame>
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Welcome in</h1>
      <p className="mt-2 text-[15px] font-semibold text-ink-soft">
        Sign in with your Google account. New here? The same button creates your account.
      </p>

      <Link href="/onboarding" className={`${buttonClass("primary", "lg")} mt-6 w-full`}>
        <LogIn aria-hidden="true" className="size-5" />
        Continue with Google
      </Link>

      <PreviewNote>
        Sign-in isn&apos;t connected in this preview. The button takes you straight to the next
        step.
      </PreviewNote>
    </EntryFrame>
  );
}
