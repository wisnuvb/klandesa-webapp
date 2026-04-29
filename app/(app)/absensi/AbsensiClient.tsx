"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Download,
  Filter,
  QrCode,
  Search,
} from "lucide-react";
import { motion } from "motion/react";
import { AttendanceTable } from "./_components/AttendanceTable";
import { AttendanceHistory } from "./_components/AttendanceHistory";
import { StatsCards } from "./_components/StatsCards";
import { PlanSidebar } from "./_components/PlanSidebar";
import {
  CheckoutModal,
  GpsAddonModal,
  UpgradeModal,
} from "./_components/AbsensiModals";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { getRecommendedTierByTotalStaff, pricingTiers } from "./pricing";
import type {
  AttendanceStatus,
  AttendanceTodayResponse,
  PaymentMethod,
  SubscriptionTier,
} from "./types";
import { usePersistedTab } from "@/hooks/usePersistedTab";

const ABSENSI_TABS = ["today", "history", "qrcode"] as const;

export default function AbsensiClient() {
  const { appAlert } = useAppDialogs();
  const [activeTab, setActiveTab] = usePersistedTab(
    "absensi",
    "today",
    ABSENSI_TABS
  );
  const [rows, setRows] = useState<AttendanceTodayResponse["rows"]>([]);
  const [stats, setStats] = useState<AttendanceTodayResponse["stats"]>({
    totalStaff: 0,
    present: 0,
    late: 0,
    absent: 0,
    staffLimit: 5,
    isOverLimit: false,
    hiddenCount: 0,
  });
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("FREE");
  const [gpsAddonEnabled, setGpsAddonEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "ALL">(
    "ALL"
  );

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("QRIS");

  const [qrImageDataUrl, setQrImageDataUrl] = useState<string | null>(null);
  const [qrScanUrl, setQrScanUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await fetch("/api/attendance/today", {
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Gagal memuat data absensi");
        }
        const data = (await res.json()) as AttendanceTodayResponse;
        setRows(data.rows);
        setStats(data.stats);
        setCurrentTier(data.plan.tier);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setLoadError(e instanceof Error ? e.message : "Gagal memuat data absensi");
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, []);

  const loadQrCode = async () => {
    try {
      setQrLoading(true);
      setQrError(null);

      const res = await fetch("/api/attendance/qr");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal memuat QR code");
      }

      const data = (await res.json()) as { scanUrl: string };
      setQrScanUrl(data.scanUrl);

      const QRCode = await import("qrcode");
      const dataUrl = await QRCode.toDataURL(data.scanUrl, {
        margin: 1,
        width: 256,
        errorCorrectionLevel: "M",
      });
      setQrImageDataUrl(dataUrl);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : "Gagal memuat QR code");
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "qrcode") return;
    void loadQrCode();
  }, [activeTab]);

  const filteredRows = useMemo(() => {
    return rows.filter((att) => {
      const matchSearch =
        att.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        att.position.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = filterStatus === "ALL" || att.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [rows, searchQuery, filterStatus]);

  const recommendedTier = useMemo(() => {
    return getRecommendedTierByTotalStaff(stats.totalStaff);
  }, [stats.totalStaff]);

  const handleSelectTier = (tier: (typeof pricingTiers)[number]) => {
    setSelectedTier(tier.id);
    setShowUpgradeModal(false);
    setShowCheckoutModal(true);
  };

  const handleGpsCheckout = () => {
    setShowGpsModal(false);
    setSelectedTier("FREE");
    setShowCheckoutModal(true);
  };

  const handlePayment = () => {
    void appAlert({
      title: "Demo pembayaran",
      description:
        `Membuat pembayaran via ${selectedPaymentMethod}...\n\nIntegrasi LinkQu:\n- QRIS\n- Virtual Account\n- E-Wallet\n\nDemo: Pembayaran berhasil!`,
    });
    setShowCheckoutModal(false);

    if (selectedTier && selectedTier !== "FREE") {
      setCurrentTier(selectedTier);
    } else {
      setGpsAddonEnabled(true);
    }
  };

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} gpsAddonEnabled={gpsAddonEnabled} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <PlanSidebar
          currentTier={currentTier}
          stats={stats}
          recommendedTier={recommendedTier}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div className="border-b border-gray-200">
            <div className="flex gap-1 p-1">
              <button
                onClick={() => setActiveTab("today")}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "today"
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Absensi Hari Ini
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "history"
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Riwayat
              </button>
              <button
                onClick={() => setActiveTab("qrcode")}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === "qrcode"
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                QR Code
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === "today" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Cari nama atau jabatan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={filterStatus}
                      onChange={(e) =>
                        setFilterStatus(e.target.value as AttendanceStatus | "ALL")
                      }
                      className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="PRESENT">Hadir</option>
                      <option value="LATE">Terlambat</option>
                      <option value="LEAVE">Izin</option>
                      <option value="ABSENT">Tidak Hadir</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                {loading && (
                  <div className="py-12 text-center text-gray-500">Memuat...</div>
                )}

                {!loading && loadError && (
                  <div className="py-12 text-center text-red-600">{loadError}</div>
                )}

                {!loading && !loadError && (
                  <>
                    {stats.isOverLimit && (
                      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        Paket saat ini membatasi {stats.staffLimit} pegawai.
                        {stats.hiddenCount > 0
                          ? ` ${stats.hiddenCount} pegawai lainnya tidak ditampilkan.`
                          : ""}
                      </div>
                    )}
                    <AttendanceTable rows={filteredRows} />
                  </>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <AttendanceHistory />
            )}

            {activeTab === "qrcode" && (
              <div className="max-w-2xl mx-auto text-center space-y-6">
                <div className="inline-block p-8 bg-white border-4 border-gray-200 rounded-2xl shadow-lg">
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    {qrLoading && (
                      <div className="text-sm text-gray-500">Memuat QR...</div>
                    )}
                    {!qrLoading && qrError && (
                      <div className="space-y-3">
                        <div className="text-sm text-red-600">{qrError}</div>
                        <button
                          onClick={loadQrCode}
                          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                        >
                          Coba Lagi
                        </button>
                      </div>
                    )}
                    {!qrLoading && !qrError && qrImageDataUrl && (
                      <img
                        src={qrImageDataUrl}
                        alt="QR Code Absensi"
                        className="w-64 h-64"
                      />
                    )}
                    {!qrLoading && !qrError && !qrImageDataUrl && (
                      <QrCode className="w-32 h-32 text-gray-400" />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    QR Code Absensi
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Scan untuk melakukan absensi
                  </p>
                </div>

                <a
                  href={qrImageDataUrl ?? "#"}
                  download="absensi-qr.png"
                  onClick={(e) => {
                    if (!qrImageDataUrl) e.preventDefault();
                  }}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    qrImageDataUrl
                      ? "bg-teal-600 text-white hover:bg-teal-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <Download className="w-5 h-5" />
                  Download QR Code
                </a>

                {qrScanUrl && (
                  <div className="text-xs text-gray-400 break-all">
                    {qrScanUrl}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        pricingTiers={pricingTiers}
        currentTier={currentTier}
        onSelectTier={handleSelectTier}
      />

      <GpsAddonModal
        open={showGpsModal}
        onClose={() => setShowGpsModal(false)}
        onCheckout={handleGpsCheckout}
      />

      <CheckoutModal
        open={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        selectedTier={selectedTier}
        pricingTiers={pricingTiers}
        selectedPaymentMethod={selectedPaymentMethod}
        onChangePaymentMethod={setSelectedPaymentMethod}
        onPay={handlePayment}
      />
    </div>
  );
}
