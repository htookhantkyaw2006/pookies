import type { Metadata } from "next";
import { EntryFrame } from "@/components/entry/EntryFrame";
import { SetupFlow } from "@/components/entry/SetupFlow";
import { OfficeProvider } from "@/lib/data/react";

export const metadata: Metadata = { title: "Set up your office" };

export default function OnboardingPage() {
  return (
    <EntryFrame>
      <OfficeProvider>
        <SetupFlow />
      </OfficeProvider>
    </EntryFrame>
  );
}
