import type { Metadata } from "next";
import { Suspense } from "react";
import { LogInForm } from "@/components/entry/AuthForms";
import { EntryFrame } from "@/components/entry/EntryFrame";
import { EntryLoading } from "@/components/entry/EntryLoading";
import { OfficeProvider } from "@/lib/data/react";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <EntryFrame>
      {/* Where to go afterwards comes from the address (?next=), so it resolves inside Suspense. */}
      <Suspense fallback={<EntryLoading />}>
        <OfficeProvider>
          <LogInForm />
        </OfficeProvider>
      </Suspense>
    </EntryFrame>
  );
}
