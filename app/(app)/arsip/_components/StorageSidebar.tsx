"use client";

import { motion } from "motion/react";
import { AlertCircle, HardDrive, Sparkles } from "lucide-react";
import type { PlanDetail, StoragePlan } from "../_types";
import {
  formatFileSize,
  getQuotaColor,
  getQuotaTextColor,
} from "../_utils/fileUtils";
import { Archive, FileSpreadsheet, FileText, Image as ImageIcon } from "lucide-react";

interface Props {
  currentPlan: StoragePlan;
  currentPlanDetail: PlanDetail;
  totalQuotaBytes: number;
  usedBytes: number;
  remainingBytes: number;
  usagePercentage: number;
  fileCount: number;
  fileStats: {
    images: number;
    documents: number;
    pdfs: number;
    excel: number;
    archives: number;
  };
  onUpgradeClick: () => void;
}

export function StorageSidebar(props: Props) {
  const {
    currentPlan,
    currentPlanDetail,
    totalQuotaBytes,
    usedBytes,
    remainingBytes,
    usagePercentage,
    fileCount,
    fileStats,
    onUpgradeClick,
  } = props;

  return (
    <div className="lg:col-span-3 space-y-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div
          className={`${currentPlanDetail.bgColor} px-6 py-4 border-b ${currentPlanDetail.borderColor}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 ${currentPlanDetail.bgColor} rounded-lg flex items-center justify-center`}
            >
              <currentPlanDetail.icon
                className={`w-6 h-6 ${currentPlanDetail.color}`}
              />
            </div>
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide">
                Paket Aktif
              </p>
              <p className={`font-bold ${currentPlanDetail.color}`}>
                {currentPlanDetail.name}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Storage Terpakai</span>
              <span
                className={`text-sm font-semibold ${getQuotaTextColor(
                  usagePercentage,
                )}`}
              >
                {usagePercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${getQuotaColor(
                  usagePercentage,
                )} transition-all duration-500`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {formatFileSize(usedBytes)} dari{" "}
              {formatFileSize(totalQuotaBytes)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Total File</p>
              <p className="text-lg font-bold text-gray-900">{fileCount}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Sisa Kuota</p>
              <p className="text-lg font-bold text-green-600">
                {formatFileSize(Math.max(0, remainingBytes))}
              </p>
            </div>
          </div>

          {currentPlan !== "PROMAX" && (
            <button
              onClick={onUpgradeClick}
              className="w-full mt-4 px-4 py-2.5 bg-linear-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Upgrade Paket
            </button>
          )}
        </div>
      </motion.div>

      {usagePercentage >= 80 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${
            usagePercentage >= 90
              ? "bg-red-50 border-red-200"
              : "bg-yellow-50 border-yellow-200"
          } rounded-xl border p-4`}
        >
          <div className="flex gap-3">
            <AlertCircle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                usagePercentage >= 90 ? "text-red-600" : "text-yellow-600"
              }`}
            />
            <div>
              <p
                className={`text-sm font-semibold ${
                  usagePercentage >= 90 ? "text-red-900" : "text-yellow-900"
                }`}
              >
                {usagePercentage >= 90
                  ? "Storage Hampir Penuh!"
                  : "Storage Mulai Penuh"}
              </p>
              <p
                className={`text-xs mt-1 ${
                  usagePercentage >= 90 ? "text-red-700" : "text-yellow-700"
                }`}
              >
                {usagePercentage >= 90
                  ? "Upgrade paket Anda atau hapus file yang tidak diperlukan."
                  : "Pertimbangkan untuk upgrade paket storage Anda."}
              </p>
              {currentPlan !== "PROMAX" && (
                <button
                  onClick={onUpgradeClick}
                  className={`mt-3 text-xs font-semibold ${
                    usagePercentage >= 90
                      ? "text-red-700 hover:text-red-800"
                      : "text-yellow-700 hover:text-yellow-800"
                  } underline`}
                >
                  Lihat Paket →
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-teal-600" />
          Storage by Kategori
        </h3>
        <div className="space-y-3">
          {[
            {
              label: "Gambar",
              size: fileStats.images,
              color: "bg-purple-500",
              icon: ImageIcon,
            },
            {
              label: "PDF",
              size: fileStats.pdfs,
              color: "bg-red-500",
              icon: FileText,
            },
            {
              label: "Dokumen",
              size: fileStats.documents,
              color: "bg-blue-500",
              icon: FileText,
            },
            {
              label: "Excel",
              size: fileStats.excel,
              color: "bg-green-500",
              icon: FileSpreadsheet,
            },
            {
              label: "Arsip",
              size: fileStats.archives,
              color: "bg-orange-500",
              icon: Archive,
            },
          ].map((category) => {
            const percentage = usedBytes > 0 ? (category.size / usedBytes) * 100 : 0;
            const Icon = category.icon;
            return (
              <div key={category.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-700">
                      {category.label}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">
                    {formatFileSize(category.size)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-full ${category.color} rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
