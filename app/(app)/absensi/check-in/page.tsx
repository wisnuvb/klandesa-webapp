import CheckInClient from "./CheckInClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check-in Absensi" };

export default function Page() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <CheckInClient />
    </div>
  );
}
