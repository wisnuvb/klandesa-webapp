"use client";

import { MapPin, QrCode, Users } from "lucide-react";
import type { AttendanceRow } from "../types";
import { StatusBadge } from "./StatusBadge";

export function AttendanceTable({ rows }: { rows: AttendanceRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Tidak ada data absensi</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Pegawai
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Jabatan
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Check In
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Metode
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((att) => (
            <tr key={att.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-teal-700">
                      {att.user_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900">
                    {att.user_name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4 text-sm text-gray-600">{att.position}</td>
              <td className="px-4 py-4">
                <StatusBadge status={att.status} />
              </td>
              <td className="px-4 py-4 text-sm text-gray-900">
                {att.check_in_time || "-"}
              </td>
              <td className="px-4 py-4">
                {att.check_in_method && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {att.check_in_method === "QR" ? (
                      <QrCode className="w-3 h-3" />
                    ) : (
                      <MapPin className="w-3 h-3" />
                    )}
                    {att.check_in_method}
                  </span>
                )}
                {!att.check_in_method && "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

