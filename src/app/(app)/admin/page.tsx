import type { Metadata } from "next";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { ScreenOverlay } from "@/components/shell/ScreenOverlay";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <ScreenOverlay label="Admin">
      <AdminScreen />
    </ScreenOverlay>
  );
}
