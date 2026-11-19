import type { Metadata } from "next";
import { CheckInsScreen } from "@/components/check-ins/CheckInsScreen";
import { ScreenOverlay } from "@/components/shell/ScreenOverlay";

export const metadata: Metadata = { title: "Check-ins" };

export default function CheckInsPage() {
  return (
    <ScreenOverlay label="Check-ins">
      <CheckInsScreen />
    </ScreenOverlay>
  );
}
