import type { Metadata } from "next";
import { CheckInsScreen } from "@/components/check-ins/CheckInsScreen";
import { OfficeDoor } from "@/components/shell/OfficeDoor";

export const metadata: Metadata = { title: "Check-ins" };

export default function CheckInsPage() {
  return (
    <OfficeDoor>
      <CheckInsScreen />
    </OfficeDoor>
  );
}
