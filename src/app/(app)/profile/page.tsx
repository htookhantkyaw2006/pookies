import type { Metadata } from "next";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { ScreenOverlay } from "@/components/shell/ScreenOverlay";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <ScreenOverlay label="Profile">
      <ProfileScreen />
    </ScreenOverlay>
  );
}
