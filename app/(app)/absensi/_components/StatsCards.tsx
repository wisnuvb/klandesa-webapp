"use client";

import { CheckCircle, Clock, MapPin, Users } from "lucide-react";
import { motion } from "motion/react";
import type { AttendanceStats } from "../types";

export function StatsCards({
  stats,
  gpsAddonEnabled,
}: {
  stats: AttendanceStats;
  gpsAddonEnabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Pegawai</p>
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalStaff}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Limit: {stats.staffLimit}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        {stats.isOverLimit && (
          <div className="mt-3 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
            ⚠️ Over Limit
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Hadir Hari Ini</p>
            <p className="text-3xl font-bold text-green-600">{stats.present}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Terlambat</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">GPS Add-on</p>
            <p className="text-lg font-bold text-gray-900">
              {gpsAddonEnabled ? "Aktif" : "Tidak Aktif"}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              gpsAddonEnabled ? "bg-teal-100" : "bg-gray-100"
            }`}
          >
            <MapPin
              className={`w-6 h-6 ${
                gpsAddonEnabled ? "text-teal-600" : "text-gray-400"
              }`}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

