"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Check,
  CreditCard,
  MapPin,
  QrCode,
  Smartphone,
  X,
} from "lucide-react";
import type { PaymentMethod, SubscriptionTier } from "../types";
import type { PricingTier } from "../pricing";

export function UpgradeModal({
  open,
  onClose,
  pricingTiers,
  currentTier,
  onSelectTier,
}: {
  open: boolean;
  onClose: () => void;
  pricingTiers: PricingTier[];
  currentTier: SubscriptionTier;
  onSelectTier: (tier: PricingTier) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-2xl font-bold text-gray-900">
                Pilih Paket Absensi
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pricingTiers.map((tier) => (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`relative border-2 rounded-xl p-6 hover:shadow-lg transition-all ${
                      tier.recommended
                        ? "border-teal-600 shadow-lg"
                        : currentTier === tier.id
                          ? "border-teal-400"
                          : "border-gray-200"
                    }`}
                  >
                    {tier.recommended && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          REKOMENDASI
                        </span>
                      </div>
                    )}

                    {currentTier === tier.id && (
                      <div className="absolute -top-3 right-4">
                        <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                          PAKET SAAT INI
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        {tier.name}
                      </h4>
                      <div className="text-3xl font-bold text-teal-600 mb-1">
                        {tier.priceLabel}
                      </div>
                      <div className="text-sm text-gray-600">
                        {tier.price > 0 ? "per bulan" : "selamanya"}
                      </div>
                      <div className="mt-2 text-sm font-medium text-gray-700">
                        {tier.staffRange}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {tier.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-2 text-sm text-gray-700"
                        >
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => onSelectTier(tier)}
                      disabled={currentTier === tier.id}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        currentTier === tier.id
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : tier.recommended
                            ? "bg-teal-600 text-white hover:bg-teal-700"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                    >
                      {currentTier === tier.id
                        ? "Paket Aktif"
                        : tier.price === 0
                          ? "Pilih Gratis"
                          : "Pilih Paket"}
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
                <h4 className="font-semibold text-blue-900 mb-2">
                  💳 Metode Pembayaran
                </h4>
                <p className="text-sm text-blue-800">
                  Kami menerima pembayaran via QRIS, Virtual Account (BCA, BNI,
                  Mandiri, BRI), dan E-Wallet (OVO, GoPay, Dana, ShopeePay)
                  melalui LinkQu Payment Gateway.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GpsAddonModal({
  open,
  onClose,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                GPS Radius Add-on
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-10 h-10 text-blue-600" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">
                  Rp 49.000
                </h4>
                <p className="text-gray-600">per bulan</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Validasi Radius Lokasi
                    </p>
                    <p className="text-sm text-gray-600">
                      Pastikan pegawai absen dari lokasi kantor
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Anti Fake GPS</p>
                    <p className="text-sm text-gray-600">
                      Deteksi otomatis GPS palsu
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Laporan Lokasi Detail
                    </p>
                    <p className="text-sm text-gray-600">
                      Koordinat dan peta lokasi absensi
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={onCheckout}
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
                >
                  Lanjut Pembayaran
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CheckoutModal({
  open,
  onClose,
  selectedTier,
  pricingTiers,
  selectedPaymentMethod,
  onChangePaymentMethod,
  onPay,
}: {
  open: boolean;
  onClose: () => void;
  selectedTier: SubscriptionTier | null;
  pricingTiers: PricingTier[];
  selectedPaymentMethod: PaymentMethod;
  onChangePaymentMethod: (method: PaymentMethod) => void;
  onPay: () => void;
}) {
  const summaryName =
    selectedTier === "FREE" || !selectedTier
      ? "GPS Add-on"
      : pricingTiers.find((t) => t.id === selectedTier)?.name;

  const summaryPrice =
    selectedTier === "FREE" || !selectedTier
      ? "Rp 49.000"
      : pricingTiers.find((t) => t.id === selectedTier)?.priceLabel;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Pembayaran</h3>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Ringkasan Pesanan
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Item:</span>
                    <span className="font-medium text-gray-900">
                      {summaryName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Harga:</span>
                    <span className="font-medium text-gray-900">
                      {summaryPrice}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-teal-600 text-lg">
                        {summaryPrice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Metode Pembayaran
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-teal-300 transition-colors">
                    <input
                      type="radio"
                      name="payment"
                      value="QRIS"
                      checked={selectedPaymentMethod === "QRIS"}
                      onChange={() => onChangePaymentMethod("QRIS")}
                      className="w-4 h-4 text-teal-600"
                    />
                    <QrCode className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">QRIS</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-teal-300 transition-colors">
                    <input
                      type="radio"
                      name="payment"
                      value="VA"
                      checked={selectedPaymentMethod === "VA"}
                      onChange={() => onChangePaymentMethod("VA")}
                      className="w-4 h-4 text-teal-600"
                    />
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">
                      Virtual Account
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      (BCA, BNI, Mandiri, BRI)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-teal-300 transition-colors">
                    <input
                      type="radio"
                      name="payment"
                      value="EWALLET"
                      checked={selectedPaymentMethod === "EWALLET"}
                      onChange={() => onChangePaymentMethod("EWALLET")}
                      className="w-4 h-4 text-teal-600"
                    />
                    <Smartphone className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">E-Wallet</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      (OVO, GoPay, Dana)
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-900">
                    Pembayaran aman dengan <strong>LinkQu Payment Gateway</strong>
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Batal
                </button>
                <button
                  onClick={onPay}
                  className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Bayar Sekarang
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

