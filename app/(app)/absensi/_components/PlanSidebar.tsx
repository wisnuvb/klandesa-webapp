"use client";

import Link from "next/link";
import { AlertCircle, Crown, MapPin, Plus, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { formatIdr } from "@/lib/billing/catalog";
import type { AttendanceStats, CapacityOption } from "../types";
import { formatDate } from "./AbsensiModals";

export function PlanSidebar({
  planLabel,
  stats,
  capacityAddon,
  recommended,
  onCapacityClick,
  gpsAddonActive,
  gpsExpiresAt,
  gpsOfficeConfigured,
  onGpsAddonClick,
}: {
  planLabel: string;
  stats: AttendanceStats;
  /** Add-on kapasitas yang sedang aktif (null bila tidak ada). */
  capacityAddon: { name: string; staffLimit: number; expiresAt: string } | null;
  /** Kapasitas terkecil yang cukup untuk semua perangkat aktif, bila kapasitas sekarang kurang. */
  recommended: CapacityOption | null;
  onCapacityClick: () => void;
  gpsAddonActive: boolean;
  /** null + aktif = tanpa batas waktu. */
  gpsExpiresAt: string | null;
  gpsOfficeConfigured: boolean;
  onGpsAddonClick: () => void;
}) {
  const percent = stats.staffLimit > 0 ? Math.min((stats.totalStaff / stats.staffLimit) * 100, 100) : 0;
  const gpsExpired = !gpsAddonActive && gpsExpiresAt != null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="lg:col-span-1 space-y-4"
    >
      <div className="bg-linear-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5" aria-hidden="true" />
          <h3 className="font-semibold">Paket Anda</h3>
        </div>

        <div className="mb-4">
          <div className="text-2xl font-bold mb-1">{planLabel}</div>
          <div className="text-teal-50 text-sm">
            {stats.totalStaff}/{stats.staffLimit} Perangkat
          </div>
          {capacityAddon && (
            <p className="text-xs text-teal-50 mt-1">
              Kapasitas tambahan {capacityAddon.staffLimit} perangkat aktif s.d. {formatDate(capacityAddon.expiresAt)}
            </p>
          )}
        </div>

        <div className="mb-4">
          <div
            className="w-full bg-teal-800 rounded-full h-2.5 overflow-hidden"
            role="progressbar"
            aria-label="Pemakaian kapasitas absensi"
            aria-valuemin={0}
            aria-valuemax={stats.staffLimit}
            aria-valuenow={Math.min(stats.totalStaff, stats.staffLimit)}
          >
            <div
              className={`h-2.5 rounded-full transition-[width] motion-reduce:transition-none ${
                stats.isOverLimit ? "bg-red-300" : "bg-white"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-teal-50 mt-1.5">
            {stats.isOverLimit
              ? `${stats.hiddenCount} perangkat belum tercakup`
              : `${stats.staffLimit - stats.totalStaff} slot tersisa`}
          </p>
        </div>

        {stats.isOverLimit && (
          <div className="bg-red-700 rounded-lg p-3 mb-4" role="alert">
            <p className="text-white text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Kapasitas penuh, tambah kapasitas.
            </p>
          </div>
        )}

        {recommended && (
          <div className="bg-teal-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-teal-50 mb-1">Rekomendasi:</p>
            <p className="text-white text-sm font-semibold">{recommended.staffLimit} perangkat</p>
            <p className="text-teal-50 text-xs mt-0.5">{formatIdr(recommended.price)}/bulan</p>
          </div>
        )}

        <button
          type="button"
          onClick={onCapacityClick}
          className="w-full min-h-11 bg-white text-teal-800 font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {capacityAddon ? "Kelola kapasitas" : "Tambah kapasitas"}
        </button>

        <button
          type="button"
          onClick={onGpsAddonClick}
          className="w-full min-h-11 mt-3 bg-teal-800/80 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-900/90 transition-colors flex items-center justify-center gap-2 border border-teal-400/50 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {gpsAddonActive || gpsExpired ? (
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          ) : (
            <MapPin className="w-4 h-4" aria-hidden="true" />
          )}
          {gpsAddonActive ? "Kelola Add-on GPS" : gpsExpired ? "Perpanjang Add-on GPS" : "Add-on GPS Radius"}
        </button>

        {(gpsAddonActive || gpsExpired) && (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-teal-800/60 border border-teal-400/40 px-3 py-2 text-sm text-teal-50">
              <span className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                {gpsExpired
                  ? `GPS berakhir ${formatDate(gpsExpiresAt!)}`
                  : gpsExpiresAt
                    ? `GPS aktif s.d. ${formatDate(gpsExpiresAt)}`
                    : "GPS Add-on aktif"}
              </span>
              {gpsAddonActive && !gpsOfficeConfigured && (
                <p className="mt-1 text-xs text-teal-50">Atur titik kantor di bawah agar staf bisa absen GPS.</p>
              )}
            </div>
            {gpsAddonActive && gpsOfficeConfigured && (
              <Link
                href="/absensi/check-in"
                className="flex items-center justify-center min-h-11 w-full text-center bg-white text-teal-800 font-medium py-2 px-3 rounded-lg text-sm hover:bg-teal-50 transition-colors"
              >
                Halaman check-in GPS (staf)
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
