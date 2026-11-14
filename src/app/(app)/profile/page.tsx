import type { Metadata } from "next";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { OfficeDoor } from "@/components/shell/OfficeDoor";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <OfficeDoor>
      <ProfileScreen />
    </OfficeDoor>
  );
}
