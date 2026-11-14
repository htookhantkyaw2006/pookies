import type { Metadata } from "next";
import { AdminScreen } from "@/components/admin/AdminScreen";
import { OfficeDoor } from "@/components/shell/OfficeDoor";

export const metadata: Metadata = { title: "Admin" };

export default function AdminPage() {
  return (
    <OfficeDoor>
      <AdminScreen />
    </OfficeDoor>
  );
}
