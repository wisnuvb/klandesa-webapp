"use client";

import type { AttendanceStatus } from "../types";

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const badges: Record<AttendanceStatus, string> = {
    PRESENT: "bg-green-100 text-green-700 border-green-200",
    LATE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    ABSENT: "bg-red-100 text-red-700 border-red-200",
    LEAVE: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const labels: Record<AttendanceStatus, string> = {
    PRESENT: "Hadir",
    LATE: "Terlambat",
    ABSENT: "Tidak Hadir",
    LEAVE: "Izin",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badges[status]}`}
    >
      {labels[status]}
    </span>
  );
}

