"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Filter, QrCode, Search } from "lucide-react";
import { motion } from "motion/react";
import { AttendanceTable } from "./_components/AttendanceTable";
import { AttendanceHistory } from "./_components/AttendanceHistory";
import { StatsCards } from "./_components/StatsCards";
import { PlanSidebar } from "./_components/PlanSidebar";
import {
  CheckoutModal,
  GpsAddonModal,
  UpgradeModal,
  type AbsensiGpsCheckoutInvoice,
} from "./_components/AbsensiModals";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { ABSENSI_GPS_ADDON_PLAN_CODE } from "@/lib/billing/catalog";
import { LINKQU_VA_CHANNELS } from "@/lib/payment/linkqu-channels";
import { getRecommendedTierByTotalStaff, pricingTiers } from "./pricing";
import type {
  AttendanceStatus,
  AttendanceTodayResponse,
  PaymentMethod,
  SubscriptionTier,
} from "./types";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import Image from "next/image";

const ABSENSI_TABS = ["today", "history", "qrcode"] as const;

const defaultVaCode =
  LINKQU_VA_CHANNELS.find((c) => c.enabled)?.linkquBankCode ?? "014";

export default function AbsensiClient() {
  const { appAlert } = useAppDialogs();
  const [activeTab, setActiveTab] = usePersistedTab(
    "absensi",
    "today",
    ABSENSI_TABS,
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
  const [gpsAddon, setGpsAddon] = useState<AttendanceTodayResponse["gpsAddon"]>(
    {
      active: false,
      officeLat: null,
      officeLng: null,
      radiusMeters: 100,
      officeConfigured: false,
    },
  );
  const [canManageGpsOffice, setCanManageGpsOffice] = useState(false);
  const [officeLatInput, setOfficeLatInput] = useState("");
  const [officeLngInput, setOfficeLngInput] = useState("");
  const [radiusInput, setRadiusInput] = useState("100");
  const [officeSaving, setOfficeSaving] = useState(false);
  const [officeSaveError, setOfficeSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "ALL">(
    "ALL",
  );

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(
    null,
  );
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutKind, setCheckoutKind] = useState<"tier" | "gps_addon" | null>(
    null,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("QRIS");
  const [vaBankLinkquCode, setVaBankLinkquCode] = useState(defaultVaCode);
  const [gpsInvoice, setGpsInvoice] = useState<AbsensiGpsCheckoutInvoice | null>(
    null,
  );
  const [gpsCheckoutError, setGpsCheckoutError] = useState<string | null>(null);
  const [gpsCheckoutLoading, setGpsCheckoutLoading] = useState(false);

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
        setGpsAddon(data.gpsAddon);
        setCanManageGpsOffice(data.canManageGpsOffice);
        if (data.gpsAddon.officeLat != null) {
          setOfficeLatInput(String(data.gpsAddon.officeLat));
        }
        if (data.gpsAddon.officeLng != null) {
          setOfficeLngInput(String(data.gpsAddon.officeLng));
        }
        setRadiusInput(String(data.gpsAddon.radiusMeters));
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setLoadError(
          e instanceof Error ? e.message : "Gagal memuat data absensi",
        );
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
    setCheckoutKind("tier");
    setGpsInvoice(null);
    setGpsCheckoutError(null);
    setShowUpgradeModal(false);
    setShowCheckoutModal(true);
  };

  const handleGpsAddonOpen = () => setShowGpsModal(true);

  const handleGpsCheckout = () => {
    setShowGpsModal(false);
    setCheckoutKind("gps_addon");
    setSelectedTier(null);
    setGpsInvoice(null);
    setGpsCheckoutError(null);
    setSelectedPaymentMethod("QRIS");
    setVaBankLinkquCode(defaultVaCode);
    setShowCheckoutModal(true);
  };

  const closeCheckoutModal = () => {
    setShowCheckoutModal(false);
    setGpsInvoice(null);
    setGpsCheckoutError(null);
    setCheckoutKind(null);
    setGpsCheckoutLoading(false);
  };

  const handleTierDemoPayment = () => {
    void appAlert({
      title: "Demo pembayaran",
      description: `Membuat pembayaran via ${selectedPaymentMethod}...\n\nIntegrasi LinkQu:\n- QRIS\n- Virtual Account\n- E-Wallet\n\nDemo: Pembayaran berhasil!`,
    });
    closeCheckoutModal();
    if (selectedTier) {
      setCurrentTier(selectedTier);
    }
  };

  const handleGpsBillingPay = async () => {
    if (selectedPaymentMethod === "EWALLET") {
      setGpsCheckoutError(
        "Untuk add-on GPS gunakan QRIS atau Virtual Account di sini, atau halaman Tagihan.",
      );
      return;
    }
    setGpsCheckoutLoading(true);
    setGpsCheckoutError(null);
    try {
      const paymentMethod =
        selectedPaymentMethod === "QRIS"
          ? "qris"
          : selectedPaymentMethod === "VA"
            ? "va"
            : "ewallet";
      const body: Record<string, unknown> = {
        productType: "absensi_gps_addon",
        planCode: ABSENSI_GPS_ADDON_PLAN_CODE,
        paymentMethod,
      };
      if (paymentMethod === "va") {
        body.bankCode = vaBankLinkquCode;
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (data && typeof data.error === "string" && data.error) ||
            "Gagal membuat tagihan",
        );
      }
      const inv = data?.invoice as AbsensiGpsCheckoutInvoice | undefined;
      if (!inv?.id) {
        throw new Error("Respons tagihan tidak valid");
      }
      setGpsInvoice({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        paymentUrl: inv.paymentUrl ?? null,
        qrContent: inv.qrContent ?? null,
        qrImageUrl: inv.qrImageUrl ?? null,
        vaNumber: inv.vaNumber ?? null,
        bankCode: inv.bankCode ?? null,
        expiresAt: inv.expiresAt ?? null,
      });
    } catch (e) {
      setGpsCheckoutError(
        e instanceof Error ? e.message : "Gagal membuat tagihan",
      );
    } finally {
      setGpsCheckoutLoading(false);
    }
  };

  const handleCheckoutPay = async () => {
    if (checkoutKind === "tier") {
      handleTierDemoPayment();
      return;
    }
    if (checkoutKind === "gps_addon") {
      await handleGpsBillingPay();
    }
  };

  const saveGpsOffice = async () => {
    setOfficeSaving(true);
    setOfficeSaveError(null);
    try {
      const res = await fetch("/api/attendance/gps-office", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeLat: Number(officeLatInput),
          officeLng: Number(officeLngInput),
          radiusMeters: Number(radiusInput),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan");
      }
      setGpsAddon((prev) => ({
        ...prev,
        officeLat: data.officeLat ?? null,
        officeLng: data.officeLng ?? null,
        radiusMeters: data.radiusMeters ?? prev.radiusMeters,
        officeConfigured:
          data.officeLat != null && data.officeLng != null,
      }));
      void appAlert({
        title: "Tersimpan",
        description: "Koordinat kantor untuk absensi GPS telah diperbarui.",
      });
    } catch (e) {
      setOfficeSaveError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setOfficeSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} gpsAddonEnabled={gpsAddon.active} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <PlanSidebar
          currentTier={currentTier}
          stats={stats}
          recommendedTier={recommendedTier}
          onUpgradeClick={() => setShowUpgradeModal(true)}
          gpsAddonActive={gpsAddon.active}
          gpsOfficeConfigured={gpsAddon.officeConfigured}
          onGpsAddonClick={handleGpsAddonOpen}
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
                        setFilterStatus(
                          e.target.value as AttendanceStatus | "ALL",
                        )
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
                  <div className="py-12 text-center text-gray-500">
                    Memuat...
                  </div>
                )}

                {!loading && loadError && (
                  <div className="py-12 text-center text-red-600">
                    {loadError}
                  </div>
                )}

                {!loading && !loadError && (
                  <>
                    {canManageGpsOffice && gpsAddon.active && (
                      <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
                        <h4 className="font-semibold text-teal-900 text-sm">
                          Titik kantor (geofencing GPS)
                        </h4>
                        <p className="text-xs text-teal-800">
                          Isi koordinat kantor desa (bisa dari Google Maps). Staf
                          hanya bisa check-in GPS dalam radius yang ditentukan.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Latitude
                            </label>
                            <input
                              type="text"
                              value={officeLatInput}
                              onChange={(e) => setOfficeLatInput(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="-7.xxx"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Longitude
                            </label>
                            <input
                              type="text"
                              value={officeLngInput}
                              onChange={(e) => setOfficeLngInput(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="110.xxx"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">
                              Radius (m)
                            </label>
                            <input
                              type="text"
                              value={radiusInput}
                              onChange={(e) => setRadiusInput(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              placeholder="100"
                            />
                          </div>
                        </div>
                        {officeSaveError && (
                          <p className="text-sm text-red-600">{officeSaveError}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => void saveGpsOffice()}
                          disabled={officeSaving}
                          className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                        >
                          {officeSaving ? "Menyimpan…" : "Simpan titik kantor"}
                        </button>
                      </div>
                    )}
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

            {activeTab === "history" && <AttendanceHistory />}

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
                      <Image
                        width={256}
                        height={256}
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
                  <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                    Perangkat akan dibuka ke halaman check-in. Staf harus{" "}
                    <strong>login</strong> dan email akun harus sama dengan
                    email di <strong>Data Perangkat Desa</strong>.
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
                  <p className="text-xs text-teal-600 break-all hover:text-teal-700 tracking-normal cursor-pointer" onClick={() => window.open(qrScanUrl, "_blank")}>
                    {qrScanUrl}
                  </p>
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
        onClose={closeCheckoutModal}
        checkoutKind={checkoutKind ?? "tier"}
        selectedTier={selectedTier}
        pricingTiers={pricingTiers}
        selectedPaymentMethod={selectedPaymentMethod}
        onChangePaymentMethod={setSelectedPaymentMethod}
        vaBankLinkquCode={vaBankLinkquCode}
        onChangeVaBankLinkquCode={setVaBankLinkquCode}
        gpsInvoice={gpsInvoice}
        gpsCheckoutError={gpsCheckoutError}
        gpsCheckoutLoading={gpsCheckoutLoading}
        onPay={handleCheckoutPay}
      />
    </div>
  );
}
