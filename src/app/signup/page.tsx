import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "@/components/entry/AuthForms";
import { EntryFrame } from "@/components/entry/EntryFrame";
import { EntryLoading } from "@/components/entry/EntryLoading";
import { OfficeProvider } from "@/lib/data/react";

export const metadata: Metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <EntryFrame>
      {/* Where to go afterwards comes from the address (?next=), so it resolves inside Suspense. */}
      <Suspense fallback={<EntryLoading />}>
        <OfficeProvider>
          <SignUpForm />
        </OfficeProvider>
      </Suspense>
    </EntryFrame>
  );
}
