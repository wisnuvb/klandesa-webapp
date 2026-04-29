"use client";

import Link from "next/link";
import { AlertCircle, Crown, MapPin, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import type { AttendanceStats, SubscriptionTier } from "../types";
import type { PricingTier } from "../pricing";
import { planLabelFromTier } from "../pricing";

export function PlanSidebar({
  currentTier,
  stats,
  recommendedTier,
  onUpgradeClick,
  gpsAddonActive,
  gpsOfficeConfigured,
  onGpsAddonClick,
}: {
  currentTier: SubscriptionTier;
  stats: AttendanceStats;
  recommendedTier: PricingTier;
  onUpgradeClick: () => void;
  gpsAddonActive: boolean;
  gpsOfficeConfigured: boolean;
  onGpsAddonClick: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="lg:col-span-1 space-y-4"
    >
      <div className="bg-linear-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5" />
          <h3 className="font-semibold">Paket Anda</h3>
        </div>

        <div className="mb-4">
          <div className="text-2xl font-bold mb-1">
            {planLabelFromTier(currentTier)}
          </div>
          <div className="text-teal-100 text-sm">
            {stats.totalStaff}/{stats.staffLimit} Pegawai
          </div>
        </div>

        <div className="mb-4">
          <div className="w-full bg-teal-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all ${
                stats.isOverLimit ? "bg-red-400" : "bg-white"
              }`}
              style={{
                width: `${Math.min(
                  (stats.totalStaff / stats.staffLimit) * 100,
                  100
                )}%`,
              }}
            />
          </div>
          <p className="text-xs text-teal-100 mt-1.5">
            {stats.isOverLimit
              ? `⚠️ ${stats.hiddenCount} pegawai terkunci`
              : `${stats.staffLimit - stats.totalStaff} slot tersisa`}
          </p>
        </div>

        {stats.isOverLimit && (
          <div className="bg-red-500 rounded-lg p-3 mb-4">
            <p className="text-white text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Upgrade diperlukan!
            </p>
          </div>
        )}

        {stats.isOverLimit && (
          <div className="bg-teal-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-teal-100 mb-1">💡 Rekomendasi:</p>
            <p className="text-white text-sm font-semibold">
              {recommendedTier.name} - {recommendedTier.staffRange}
            </p>
            <p className="text-teal-100 text-xs mt-0.5">
              {recommendedTier.priceLabel}/bulan
            </p>
          </div>
        )}

        <button
          onClick={onUpgradeClick}
          className="w-full bg-white text-teal-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Upgrade Paket
        </button>

        {!gpsAddonActive ? (
          <button
            type="button"
            onClick={onGpsAddonClick}
            className="w-full mt-3 bg-teal-800/80 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-900/90 transition-colors flex items-center justify-center gap-2 border border-teal-500/40"
          >
            <MapPin className="w-4 h-4" />
            Add-on GPS Radius
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <div className="rounded-lg bg-teal-800/60 border border-teal-500/30 px-3 py-2 text-sm text-teal-50">
              <span className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                GPS Add-on aktif
              </span>
              {!gpsOfficeConfigured && (
                <p className="mt-1 text-xs text-teal-100">
                  Atur titik kantor di bawah agar staf bisa absen GPS.
                </p>
              )}
            </div>
            {gpsOfficeConfigured && (
              <Link
                href="/absensi/check-in"
                className="block w-full text-center bg-white text-teal-800 font-medium py-2 px-3 rounded-lg text-sm hover:bg-teal-50 transition-colors"
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

