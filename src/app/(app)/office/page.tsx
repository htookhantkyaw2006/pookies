import type { Metadata } from "next";
import { OfficeScreen } from "@/components/office/OfficeScreen";
import { OfficeDoor } from "@/components/shell/OfficeDoor";

export const metadata: Metadata = { title: "Office" };

export default function OfficePage() {
  return (
    <OfficeDoor framed>
      <OfficeScreen />
    </OfficeDoor>
  );
}
