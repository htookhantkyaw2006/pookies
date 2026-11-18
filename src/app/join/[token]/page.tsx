import type { Metadata } from "next";
import { Suspense } from "react";
import { EntryFrame } from "@/components/entry/EntryFrame";
import { EntryLoading } from "@/components/entry/EntryLoading";
import { JoinInvite } from "@/components/entry/JoinInvite";
import { OfficeProvider } from "@/lib/data/react";

export const metadata: Metadata = { title: "You're invited" };

export default function JoinPage({ params }: PageProps<"/join/[token]">) {
  return (
    <EntryFrame>
      {/* The token is only known per request, so it resolves inside Suspense. */}
      <Suspense fallback={<EntryLoading />}>
        <OfficeProvider>
          <JoinInvite params={params} />
        </OfficeProvider>
      </Suspense>
    </EntryFrame>
  );
}
