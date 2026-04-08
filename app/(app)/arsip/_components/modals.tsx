"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Sparkles,
  Star,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import type {
  ArchiveEntry,
  FileItem,
  PaymentMethod,
  StoragePlan,
} from "../_types";
import { STORAGE_PLANS } from "../_data/storagePlans";
import { formatFileSize, getFileIcon } from "../_utils/fileUtils";

interface UpgradeModalProps {
  open: boolean;
  currentPlan: StoragePlan;
  onClose: () => void;
  onUpgradePlan: (planId: StoragePlan) => void;
}

export function UpgradeModal(props: UpgradeModalProps) {
  const { open, currentPlan, onClose, onUpgradePlan } = props;
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Upgrade Paket Storage
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Pilih paket storage yang sesuai dengan kebutuhan desa Anda
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {STORAGE_PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === currentPlan;
              const isPlanIndex = STORAGE_PLANS.findIndex(
                (p) => p.id === plan.id,
              );
              const currentPlanIndex = STORAGE_PLANS.findIndex(
                (p) => p.id === currentPlan,
              );
              const canUpgrade = isPlanIndex > currentPlanIndex;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative border-2 rounded-xl p-6 transition-all ${
                    plan.popular
                      ? "border-teal-500 shadow-lg scale-105"
                      : isCurrentPlan
                        ? `${plan.borderColor} bg-gray-50`
                        : "border-gray-200 hover:border-teal-300 hover:shadow-md"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        PALING POPULER
                      </div>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        PAKET AKTIF
                      </div>
                    </div>
                  )}

                  <div
                    className={`w-14 h-14 ${plan.bgColor} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <Icon className={`w-7 h-7 ${plan.color}`} />
                  </div>

                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h4>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">
                        {plan.price === 0 ? (
                          "BASIC"
                        ) : (
                          <>Rp {plan.price.toLocaleString("id-ID")}</>
                        )}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-sm text-gray-500">/bulan</span>
                      )}
                    </div>
                    <p className={`text-sm font-semibold ${plan.color} mt-1`}>
                      {plan.storageLabel} Storage
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => {
                      if (canUpgrade) onUpgradePlan(plan.id);
                    }}
                    disabled={!canUpgrade}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all ${
                      isCurrentPlan
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : canUpgrade
                          ? plan.popular
                            ? "bg-linear-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 shadow-sm"
                            : "bg-teal-600 text-white hover:bg-teal-700"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isCurrentPlan
                      ? "Paket Aktif"
                      : canUpgrade
                        ? "Upgrade Sekarang"
                        : "Tidak Dapat Downgrade"}
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4">
              💡 Informasi Penting
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              {[
                {
                  title: "Pembayaran Bulanan",
                  desc: "Biaya langganan ditagih setiap bulan secara otomatis",
                },
                {
                  title: "Upgrade Kapan Saja",
                  desc: "Anda dapat upgrade paket kapan saja tanpa kehilangan data",
                },
                {
                  title: "Tidak Ada Biaya Tersembunyi",
                  desc: "Harga yang ditampilkan sudah final, tanpa biaya tambahan",
                },
                {
                  title: "Data Aman & Terenkripsi",
                  desc: "File Anda disimpan dengan enkripsi standar enterprise",
                },
              ].map((it) => (
                <div key={it.title} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">{it.title}</p>
                    <p className="text-xs mt-1">{it.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface PaymentModalProps {
  open: boolean;
  selectedPlan: StoragePlan | null;
  selectedPaymentMethod: PaymentMethod;
  onSelectPaymentMethod: (m: PaymentMethod) => void;
  onCancel: () => void;
  onPay: () => void;
}

export function PaymentModal(props: PaymentModalProps) {
  const {
    open,
    selectedPlan,
    selectedPaymentMethod,
    onSelectPaymentMethod,
    onCancel,
    onPay,
  } = props;

  if (!open || !selectedPlan) return null;

  const plan = STORAGE_PLANS.find((p) => p.id === selectedPlan);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Pembayaran Upgrade Storage
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Selesaikan pembayaran untuk mengaktifkan paket baru Anda
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-linear-to-br from-teal-50 to-teal-100 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">
              Ringkasan Pesanan
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Paket Dipilih</span>
                <span className="font-semibold text-gray-900">
                  {plan?.name} Plan
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Storage</span>
                <span className="font-semibold text-gray-900">
                  {plan?.storageLabel}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Periode</span>
                <span className="font-semibold text-gray-900">1 Bulan</span>
              </div>
              <div className="pt-3 border-t border-teal-200 flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  Total Pembayaran
                </span>
                <span className="text-2xl font-bold text-teal-600">
                  Rp {plan?.price.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-4">
              Pilih Metode Pembayaran
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: "QRIS" as const,
                  title: "QRIS",
                  desc: "Scan & bayar",
                  icon: "📱",
                },
                {
                  id: "VA" as const,
                  title: "Virtual Account",
                  desc: "Transfer bank",
                  icon: "🏦",
                },
                {
                  id: "EWALLET" as const,
                  title: "E-Wallet",
                  desc: "OVO, Dana, dll",
                  icon: "💳",
                },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => onSelectPaymentMethod(m.id)}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    selectedPaymentMethod === m.id
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-teal-300"
                  }`}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <span className="text-2xl">{m.icon}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {m.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">
                  Pembayaran via LinkQu Payment Gateway
                </p>
                <p className="text-xs text-blue-700">
                  Transaksi Anda dilindungi dengan sistem keamanan tingkat
                  enterprise. Pembayaran akan diproses secara real-time.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Batal
            </button>
            <button
              onClick={onPay}
              className="flex-1 px-4 py-3 bg-linear-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all font-semibold shadow-sm"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Bayar Sekarang
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultSubCategory?: string | null;
  onUpload: (
    file: File,
    meta: {
      category: string;
      subCategory: string | null;
      title: string;
      isPublic: boolean;
      accessLevel: "admin" | "staff" | "public";
    },
  ) => Promise<ArchiveEntry>;
  onUploaded: (entry: ArchiveEntry) => void;
}

export function UploadModal(props: UploadModalProps) {
  const {
    open,
    onClose,
    defaultCategory,
    defaultSubCategory,
    onUpload,
    onUploaded,
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [title, setTitle] = useState("");
  const [accessLevel, setAccessLevel] = useState<"admin" | "staff" | "public">(
    "admin",
  );
  const [isPublic, setIsPublic] = useState(false);

  const [compressEnabled, setCompressEnabled] = useState(false);
  const [compressQuality, setCompressQuality] = useState(0.8);
  const [maxDimension, setMaxDimension] = useState(1920);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCompress = useMemo(() => {
    if (!selectedFile) return false;
    const t = selectedFile.type;
    return t === "image/jpeg" || t === "image/png" || t === "image/webp";
  }, [selectedFile]);

  useEffect(() => {
    setCategory(defaultCategory || "");
    setSubCategory(defaultSubCategory || "");
    setTitle("");
    setSelectedFile(null);
    setPreparedFile(null);
    setIsPublic(false);
    setAccessLevel("admin");
    setCompressEnabled(false);
    setCompressQuality(0.8);
    setMaxDimension(1920);
    setIsPreparing(false);
    setIsUploading(false);
    setError(null);
  }, [defaultCategory, defaultSubCategory, open]);

  async function compressImageToWebp(
    file: File,
    quality: number,
    maxDim: number,
  ) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.floor(bitmap.width * scale));
    const height = Math.max(1, Math.floor(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error("Failed to create image blob"));
          else resolve(b);
        },
        "image/webp",
        Math.min(0.95, Math.max(0.4, quality)),
      );
    });
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!selectedFile) {
        setPreparedFile(null);
        return;
      }
      if (!compressEnabled || !canCompress) {
        setPreparedFile(selectedFile);
        return;
      }
      setIsPreparing(true);
      setError(null);
      try {
        const out = await compressImageToWebp(
          selectedFile,
          compressQuality,
          maxDimension,
        );
        if (!cancelled) setPreparedFile(out);
      } catch (e) {
        if (!cancelled) {
          setPreparedFile(selectedFile);
          setError("Gagal kompres gambar. Akan upload versi original.");
        }
      } finally {
        if (!cancelled) setIsPreparing(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [
    canCompress,
    compressEnabled,
    compressQuality,
    maxDimension,
    selectedFile,
  ]);

  const effectiveTitle =
    title.trim() || preparedFile?.name || selectedFile?.name || "";
  const effectiveSubCategory = subCategory.trim() ? subCategory.trim() : null;

  const sizeInfo = useMemo(() => {
    if (!selectedFile) return null;
    if (!preparedFile) return null;
    return {
      original: selectedFile.size,
      prepared: preparedFile.size,
    };
  }, [preparedFile, selectedFile]);

  const canSubmit = Boolean(
    preparedFile &&
    category.trim() &&
    effectiveTitle &&
    !isPreparing &&
    !isUploading,
  );

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => {
        if (!isUploading) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-lg w-full"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Upload File</h3>
          <button
            onClick={() => {
              if (!isUploading) onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setSelectedFile(f);
              setError(null);
              if (f) setTitle(f.name);
            }}
          />

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0] || null;
              setSelectedFile(f);
              setError(null);
              if (f) setTitle(f.name);
            }}
          >
            <div className="w-12 h-12 text-gray-400 mx-auto mb-3 flex items-center justify-center">
              <Upload className="w-10 h-10" />
            </div>
            <p className="text-gray-700 font-medium mb-1">
              Drag & drop file di sini
            </p>
            <p className="text-sm text-gray-500 mb-3">
              atau klik untuk memilih file
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors"
            >
              Pilih File
            </button>
            <p className="text-xs text-gray-400 mt-3">
              Mendukung berbagai tipe file (gambar, PDF, dokumen, excel, zip,
              dll)
            </p>
          </div>

          {selectedFile && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 break-all">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedFile.type || "application/octet-stream"} •{" "}
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-gray-600 underline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreparedFile(null);
                  }}
                >
                  Ganti
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Judul Arsip
                  </label>
                  <input
                    value={effectiveTitle}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="Judul arsip"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Kategori
                    </label>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      placeholder="Contoh: Surat, Laporan, SK"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sub Kategori (opsional)
                    </label>
                    <input
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      placeholder="Contoh: 2024, Administrasi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Akses
                    </label>
                    <select
                      value={accessLevel}
                      onChange={(e) =>
                        setAccessLevel(
                          e.target.value as "admin" | "staff" | "public",
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                      <option value="public">Publik</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                      />
                      Tampilkan di publik
                    </label>
                  </div>
                </div>

                {canCompress && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={compressEnabled}
                          onChange={(e) => setCompressEnabled(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                        />
                        Kompres gambar sebelum upload
                      </label>
                      {isPreparing && (
                        <span className="text-xs text-gray-500">
                          Menyiapkan...
                        </span>
                      )}
                    </div>

                    {compressEnabled && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Kualitas
                          </label>
                          <input
                            type="range"
                            min={40}
                            max={95}
                            value={Math.round(compressQuality * 100)}
                            onChange={(e) =>
                              setCompressQuality(Number(e.target.value) / 100)
                            }
                            className="w-full"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.round(compressQuality * 100)}%
                          </p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Maks dimensi
                          </label>
                          <select
                            value={maxDimension}
                            onChange={(e) =>
                              setMaxDimension(Number(e.target.value))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          >
                            <option value={1280}>1280 px</option>
                            <option value={1920}>1920 px</option>
                            <option value={2560}>2560 px</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {sizeInfo && compressEnabled && (
                      <p className="text-xs text-gray-600 mt-3">
                        Ukuran: {formatFileSize(sizeInfo.original)} →{" "}
                        {formatFileSize(sizeInfo.prepared)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              if (!isUploading) onClose();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            disabled={!canSubmit}
            onClick={async () => {
              if (!preparedFile) return;
              setIsUploading(true);
              setError(null);
              try {
                const entry = await onUpload(preparedFile, {
                  category: category.trim(),
                  subCategory: effectiveSubCategory,
                  title: effectiveTitle,
                  isPublic,
                  accessLevel,
                });
                onUploaded(entry);
                onClose();
              } catch (e) {
                setError("Upload gagal. Silakan coba lagi.");
              } finally {
                setIsUploading(false);
              }
            }}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Mengupload..." : "Upload"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface PreviewModalProps {
  open: boolean;
  file: FileItem | null;
  onClose: () => void;
}

export function PreviewModal(props: PreviewModalProps) {
  const { open, file, onClose } = props;
  if (!open || !file) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{file.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatFileSize(file.size)} • {file.uploaded_by}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {file.file_type === "IMAGE" && file.thumbnail_url ? (
            <Image
              src={file.thumbnail_url}
              alt={file.name}
              className="w-full rounded-lg"
              width={800}
              height={600}
            />
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                {getFileIcon(file)}
              </div>
              <p className="text-gray-500 mt-4">
                Preview tidak tersedia untuk tipe file ini
              </p>
              <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
                <Download className="w-4 h-4" />
                Download File
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface NewFolderModalProps {
  open: boolean;
  folderName: string;
  setFolderName: (name: string) => void;
  onClose: () => void;
  onCreate: () => void | Promise<void>;
  creating?: boolean;
}

export function NewFolderModal(props: NewFolderModalProps) {
  const { open, folderName, setFolderName, onClose, onCreate, creating } =
    props;
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-md w-full"
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Buat Folder Baru
          </h3>
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nama Folder
          </label>
          <input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Masukkan nama folder"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreate();
            }}
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => void onCreate()}
            disabled={!folderName.trim() || creating}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Menyimpan..." : "Buat Folder"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
