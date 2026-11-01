"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  Lightbulb,
  Sparkles,
  Star,
  Upload,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { categorySubFromFolderPath } from "@/lib/digitalArchive/folderPath";
import { validateDocumentFile } from "@/lib/digitalArchive/document";
import type {
  ArchiveEntry,
  FileItem,
  PaymentMethod,
  StoragePlan,
} from "../_types";
import { STORAGE_PLANS } from "../_data/storagePlans";
import {
  archiveThumbnailNeedsUnoptimized,
  formatFileSize,
  getFileIcon,
} from "../_utils/fileUtils";
import { SearchSelect } from "@/components/ui/search-select";

interface UpgradeModalProps {
  open: boolean;
  currentPlan: StoragePlan;
  /** Paket Lengkap: kuota dasar 5 GB sudah termasuk, jadi tidak ditampilkan sebagai paket berbayar. */
  includedStarter?: boolean;
  /** ISO; masa berlaku add-on kapasitas arsip yang sedang aktif (null bila tidak ada). */
  addonExpiry?: string | null;
  onClose: () => void;
  onUpgradePlan: (planId: StoragePlan) => void;
}

export function UpgradeModal(props: UpgradeModalProps) {
  const { open, currentPlan, includedStarter, addonExpiry, onClose, onUpgradePlan } = props;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-6xl sm:max-w-6xl w-full max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
          <div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Upgrade Paket Storage
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Pilih paket storage yang sesuai dengan kebutuhan desa Anda
            </p>
            {addonExpiry && (
              <p className="text-sm text-teal-700 mt-1">
                Add-on kapasitas aktif hingga{" "}
                {new Date(addonExpiry).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
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
              const canRenew = isCurrentPlan && Boolean(addonExpiry);

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
                        ) : includedStarter && plan.id === "STARTER" ? (
                          "Termasuk"
                        ) : (
                          <>Rp {plan.price.toLocaleString("id-ID")}</>
                        )}
                      </span>
                      {plan.price > 0 && !(includedStarter && plan.id === "STARTER") && (
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
                      if (canUpgrade || canRenew) onUpgradePlan(plan.id);
                    }}
                    disabled={!canUpgrade && !canRenew}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all ${
                      canRenew
                        ? "bg-teal-600 text-white hover:bg-teal-700"
                        : isCurrentPlan
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : canUpgrade
                          ? plan.popular
                            ? "bg-linear-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 shadow-sm"
                            : "bg-teal-600 text-white hover:bg-teal-700"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {canRenew
                      ? "Perpanjang 1 bulan"
                      : isCurrentPlan
                        ? "Paket Aktif"
                        : canUpgrade
                          ? "Berlangganan"
                          : "Tidak Dapat Downgrade"}
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" aria-hidden="true" />
              Informasi Penting
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              {[
                {
                  title: "Pilih Lama Langganan",
                  desc: "Kapasitas tambahan berlaku 1, 3, 6, atau 12 bulan sejak pembayaran. Setelah berakhir, file tetap aman; unggahan baru terblokir bila pemakaian melebihi kuota dasar",
                },
                {
                  title: "File Tetap Aman",
                  desc: "Menambah kapasitas tidak menghapus atau memindahkan file yang sudah ada",
                },
                {
                  title: "Harga Transparan",
                  desc: "Harga yang ditampilkan sudah final, tanpa biaya tambahan",
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
      </DialogContent>
    </Dialog>
  );
}

export interface UploadProgressOpts {
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultSubCategory?: string | null;
  /**
   * Path folder untuk combobox (folder DB + kategori legacy dari arsip tanpa folderId),
   * selaras folder yang tampil di file manager.
   */
  folderPaths?: string[];
  onUpload: (
    file: File,
    meta: {
      category: string;
      subCategory: string | null;
      title: string;
      isPublic: boolean;
      accessLevel: "admin" | "public";
    },
    opts: UploadProgressOpts,
  ) => Promise<ArchiveEntry>;
  onUploaded: (entry: ArchiveEntry) => void;
}

export function UploadModal(props: UploadModalProps) {
  const {
    open,
    onClose,
    defaultCategory,
    defaultSubCategory,
    folderPaths = [],
    onUpload,
    onUploaded,
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [categoryFolderOpen, setCategoryFolderOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const [compressEnabled, setCompressEnabled] = useState(false);
  const [compressQuality, setCompressQuality] = useState(0.8);
  const [maxDimension, setMaxDimension] = useState(960);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const canCompress = useMemo(() => {
    if (!selectedFile) return false;
    const t = selectedFile.type;
    return t === "image/jpeg" || t === "image/png" || t === "image/webp";
  }, [selectedFile]);

  const fileValidationError = useMemo(() => {
    if (!selectedFile) return null;
    return validateDocumentFile({ name: selectedFile.name, size: selectedFile.size });
  }, [selectedFile]);

  const sortedFolderPaths = useMemo(() => {
    const paths = folderPaths.map((p) => p.trim()).filter(Boolean);
    return [...new Set(paths)].sort((a, b) => a.localeCompare(b, "id"));
  }, [folderPaths]);

  const filteredFolderPaths = useMemo(() => {
    const q = category.trim().toLowerCase();
    if (!q) return sortedFolderPaths;
    return sortedFolderPaths.filter((p) => {
      const tail = p.replace(/^\/+/, "").toLowerCase();
      return tail.includes(q) || p.toLowerCase().includes(q);
    });
  }, [sortedFolderPaths, category]);

  useEffect(() => {
    setCategory(defaultCategory || "");
    setSubCategory(defaultSubCategory || "");
    setTitle("");
    setSelectedFile(null);
    setPreparedFile(null);
    setIsPublic(false);
    setCompressEnabled(false);
    setCompressQuality(0.8);
    setMaxDimension(1920);
    setIsPreparing(false);
    setIsUploading(false);
    setUploadProgress(0);
    setCategoryFolderOpen(false);
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
      try {
        const out = await compressImageToWebp(
          selectedFile,
          compressQuality,
          maxDimension,
        );
        if (!cancelled) setPreparedFile(out);
      } catch {
        if (!cancelled) {
          setPreparedFile(selectedFile);
          toast.warning("Kompresi gagal", {
            description: "Akan memakai gambar asli untuk upload.",
          });
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
    !fileValidationError &&
    effectiveTitle &&
    !isPreparing &&
    !isUploading,
  );

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort();
  };

  const handleSubmit = async () => {
    if (!preparedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const entry = await onUpload(
        preparedFile,
        {
          category: category.trim(),
          subCategory: effectiveSubCategory,
          title: effectiveTitle,
          isPublic,
          accessLevel: isPublic ? "public" : "admin",
        },
        {
          onProgress: setUploadProgress,
          signal: controller.signal,
        },
      );
      onUploaded(entry);
      toast.success("Upload berhasil", {
        description: entry.title || entry.fileName,
      });
      onClose();
    } catch (e) {
      if (controller.signal.aborted) {
        toast.error("Upload dibatalkan");
      } else {
        const msg =
          e instanceof Error
            ? e.message
            : "Upload gagal. Silakan coba lagi.";
        toast.error("Upload gagal", { description: msg });
      }
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isUploading) onClose();
      }}
    >
      <DialogContent className="max-w-lg sm:max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        <div className="px-6 py-4 border-b border-gray-200 shrink-0">
          <DialogTitle className="text-lg font-semibold text-gray-900">Upload File</DialogTitle>
        </div>

        <div className="px-6 py-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setSelectedFile(f);
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
              PDF, dokumen Office/ODF, CSV/TXT/RTF, ZIP/RAR, gambar, audio/video
              umum. Maks 200 MB per berkas.
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
                  {fileValidationError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {fileValidationError}
                    </p>
                  )}
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
                      Kategori (opsional)
                    </label>
                    <Popover
                      modal={false}
                      open={categoryFolderOpen}
                      onOpenChange={setCategoryFolderOpen}
                    >
                      <PopoverAnchor asChild>
                        <div className="flex rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-transparent overflow-hidden bg-white">
                          <input
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            onFocus={() => setCategoryFolderOpen(true)}
                            className="min-w-0 flex-1 px-3 py-2 border-0 focus:outline-none focus:ring-0 text-sm"
                            placeholder="Pilih folder atau ketik baru…"
                            autoComplete="off"
                          />
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="shrink-0 px-2.5 border-l border-gray-200 text-gray-500 hover:bg-gray-50 outline-none"
                              aria-label="Buka daftar folder"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${categoryFolderOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                          </PopoverTrigger>
                        </div>
                      </PopoverAnchor>
                      <PopoverContent
                        align="start"
                        sideOffset={6}
                        collisionPadding={12}
                        className="z-[100] w-[var(--radix-popover-anchor-width)] min-w-[200px] max-w-[90vw] p-0 shadow-lg"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <ul className="max-h-48 overflow-auto py-1 text-sm">
                          {sortedFolderPaths.length === 0 ? (
                            <li className="px-3 py-2 text-gray-500">
                              Belum ada path folder terdaftar. Buat folder di
                              file manager atau ketik nama kategori baru.
                            </li>
                          ) : filteredFolderPaths.length === 0 ? (
                            <li className="px-3 py-2 text-gray-500">
                              Tidak ada folder yang cocok
                            </li>
                          ) : (
                            filteredFolderPaths.map((path) => {
                              const label = path.replace(/^\/+/, "") || path;
                              return (
                                <li key={path}>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 text-left hover:bg-teal-50 text-gray-900"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      const parsed =
                                        categorySubFromFolderPath(path);
                                      setCategory(parsed.category);
                                      setSubCategory(
                                        parsed.subCategory || "",
                                      );
                                      setCategoryFolderOpen(false);
                                    }}
                                  >
                                    {label}
                                  </button>
                                </li>
                              );
                            })
                          )}
                        </ul>
                      </PopoverContent>
                    </Popover>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Kosongkan untuk masuk ke folder &quot;Umum&quot;, atau
                      pilih/ketik kategori sendiri.
                    </p>
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

                <div>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                    />
                    Tampilkan di publik
                  </label>
                  <p className="text-xs text-gray-500 leading-relaxed mt-1">
                    Tanpa centang: berkas di-set <strong>privat</strong> di
                    storage; pratinjau dan unduh hanya untuk admin desa atau{" "}
                    <strong>Anda sebagai pengunggah</strong>. Centang jika
                    boleh diakses publik via tautan CDN.
                  </p>
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
                          <SearchSelect
                            value={maxDimension}
                            onChange={(e) =>
                              setMaxDimension(Number(e.target.value))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                          >
                            <option value={256}>256 px</option>
                            <option value={384}>384 px</option>
                            <option value={512}>512 px</option>
                            <option value={768}>768 px</option>
                            <option value={960}>960 px</option>
                            <option value={1024}>1024 px</option>
                            <option value={1280}>1280 px</option>
                            <option value={1920}>1920 px</option>
                            <option value={2560}>2560 px</option>
                          </SearchSelect>
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

                {isUploading && (
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {uploadProgress}% terunggah
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={() => {
              if (isUploading) {
                handleCancelUpload();
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isUploading ? "Batal Upload" : "Batal"}
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Mengupload..." : "Upload"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PreviewModalProps {
  open: boolean;
  file: FileItem | null;
  onClose: () => void;
}

export function PreviewModal(props: PreviewModalProps) {
  const { open, file, onClose } = props;
  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-4xl sm:max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        <div className="px-6 py-4 border-b border-gray-200 shrink-0">
          <DialogTitle className="text-lg font-semibold text-gray-900">{file.name}</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {formatFileSize(file.size)} • {file.uploaded_by}
          </p>
        </div>

        <div className="p-6 flex-1 min-h-0 overflow-y-auto">
          {file.file_type === "IMAGE" && file.thumbnail_url ? (
            <Image
              src={file.thumbnail_url}
              alt={file.name}
              className="w-full rounded-lg"
              width={800}
              height={600}
              unoptimized={archiveThumbnailNeedsUnoptimized(file.thumbnail_url)}
            />
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                {getFileIcon(file)}
              </div>
              <p className="text-gray-500 mt-4">
                Preview tidak tersedia untuk tipe file ini
              </p>
              {file.archiveId ? (
                <a
                  href={`/api/digital-archives/${file.archiveId}/file?download=1`}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Unduh File
                </a>
              ) : (
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors opacity-50 cursor-not-allowed"
                  disabled
                >
                  <Download className="w-4 h-4" />
                  Download File
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
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

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !creating) onClose(); }}>
      <DialogContent className="max-w-md sm:max-w-md w-full p-0 gap-0">
        <div className="px-6 py-4 border-b border-gray-200">
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Buat Folder Baru
          </DialogTitle>
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
      </DialogContent>
    </Dialog>
  );
}
