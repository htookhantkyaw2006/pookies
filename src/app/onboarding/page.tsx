import type { Metadata } from "next";
import { EntryFrame } from "@/components/entry/EntryFrame";
import { EntryGate } from "@/components/entry/EntryGate";
import { OnboardingForm } from "@/components/entry/OnboardingForm";
import { OfficeProvider } from "@/lib/data/react";

export const metadata: Metadata = { title: "Create your workspace" };

export default function OnboardingPage() {
  return (
    <EntryFrame>
      <OfficeProvider>
        <EntryGate>
          <OnboardingForm />
        </EntryGate>
      </OfficeProvider>
    </EntryFrame>
  );
}
