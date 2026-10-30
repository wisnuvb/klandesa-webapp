"use client";

import type { ReactNode } from "react";
import { Check, MapPin, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatIdr } from "@/lib/billing/catalog";
import type { CapacityOption } from "../types";

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

function ModalShell({
  open,
  onClose,
  title,
  maxWidth = "sm:max-w-lg",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className={`${maxWidth} max-h-[90vh] overflow-y-auto p-0 gap-0`}>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

const primaryBtn =
  "w-full px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";
const secondaryBtn =
  "w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600";

/* ------------------------------------------------------------------ */
/* Pilih kapasitas                                                      */
/* ------------------------------------------------------------------ */

export function CapacityModal({
  open,
  onClose,
  options,
  addonExpiresAt,
  totalStaff,
  baseLimit,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  options: CapacityOption[];
  addonExpiresAt: string | null;
  totalStaff: number;
  /** Kapasitas yang sudah termasuk di paket desa. */
  baseLimit: number;
  onSelect: (option: CapacityOption) => void;
}) {
  const recommended = options.find(
    (o) => (o.state === "available" || o.state === "current") && o.staffLimit >= totalStaff,
  );

  return (
    <ModalShell open={open} onClose={onClose} title="Tambah Kapasitas Absensi" maxWidth="sm:max-w-3xl">
      <div className="p-6 space-y-5">
        <p className="text-sm text-gray-600">
          Paket desa Anda sudah mencakup <strong>{baseLimit} perangkat</strong>. Pilih kapasitas yang lebih besar; Anda
          hanya membayar selisihnya, berlangganan per bulan. Saat ini ada <strong>{totalStaff}</strong> perangkat desa aktif.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((o) => {
            const disabled = o.state === "included" || o.state === "lower";
            const isRecommended = recommended?.code === o.code && !disabled;
            return (
              <li
                key={o.code}
                className={`relative border-2 rounded-xl p-5 flex flex-col ${
                  o.state === "current"
                    ? "border-teal-400 bg-teal-50/40"
                    : isRecommended
                      ? "border-teal-600 shadow-md"
                      : "border-gray-200"
                } ${disabled ? "opacity-70" : ""}`}
              >
                {isRecommended && o.state !== "current" && (
                  <span className="absolute -top-3 left-4 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    REKOMENDASI
                  </span>
                )}
                {o.state === "current" && (
                  <span className="absolute -top-3 left-4 bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full">
                    AKTIF{addonExpiresAt ? ` s.d. ${formatDate(addonExpiresAt)}` : ""}
                  </span>
                )}

                <div className="flex items-center gap-2 text-gray-900">
                  <Users className="w-5 h-5 text-teal-700" aria-hidden="true" />
                  <h4 className="text-lg font-bold">{o.staffLimit} Perangkat</h4>
                  <span className="text-sm text-gray-600">· {o.name}</span>
                </div>

                <div className="mt-3">
                  {o.state === "included" ? (
                    <p className="text-sm font-medium text-gray-700">Sudah termasuk di paket Anda</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-teal-700 tabular-nums">
                        {formatIdr(o.price)}
                        <span className="text-sm font-normal text-gray-600"> / bulan</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Harga tier {formatIdr(o.listPrice)} dikurangi {baseLimit} perangkat yang sudah termasuk.
                      </p>
                    </>
                  )}
                </div>

                <p className="text-sm text-gray-700 mt-3">Riwayat absensi {o.historyDays} hari</p>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(o)}
                  className={`mt-4 ${disabled ? "w-full px-4 py-3 rounded-lg bg-gray-100 text-gray-500 font-semibold cursor-not-allowed" : primaryBtn}`}
                >
                  {o.state === "included"
                    ? "Sudah termasuk"
                    : o.state === "lower"
                      ? "Kapasitas lebih kecil dari yang aktif"
                      : o.state === "current"
                        ? "Perpanjang 1 bulan"
                        : "Pilih kapasitas"}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="text-xs text-gray-600">
          Naik ke kapasitas lebih besar menghitung masa berlaku baru 1 bulan sejak pembayaran. Memperpanjang kapasitas yang
          sama menyambung dari tanggal berakhir.
        </p>
      </div>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Add-on GPS                                                           */
/* ------------------------------------------------------------------ */

export function GpsAddonModal({
  open,
  onClose,
  monthlyFee,
  active,
  expiresAt,
  onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  monthlyFee: number;
  active: boolean;
  /** null + active = tanpa batas waktu. */
  expiresAt: string | null;
  onCheckout: () => void;
}) {
  const unlimited = active && expiresAt == null;
  const features = [
    ["Validasi Radius Lokasi", "Pastikan pegawai absen dari lokasi kantor"],
    ["Anti Fake GPS", "Deteksi otomatis GPS palsu"],
    ["Laporan Lokasi Detail", "Koordinat lokasi absensi tercatat"],
  ];
  return (
    <ModalShell open={open} onClose={onClose} title="GPS Radius Add-on">
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10 text-blue-700" aria-hidden="true" />
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatIdr(monthlyFee)}</p>
          <p className="text-gray-600">per bulan</p>
          {active && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-green-800 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              <Check className="w-4 h-4" aria-hidden="true" />
              {unlimited ? "Aktif tanpa batas waktu" : `Aktif sampai ${formatDate(expiresAt!)}`}
            </p>
          )}
          {!active && expiresAt && (
            <p className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              Berakhir pada {formatDate(expiresAt)}. Check-in GPS dinonaktifkan sampai diperpanjang.
            </p>
          )}
        </div>

        <ul className="space-y-3">
          {features.map(([title, desc]) => (
            <li key={title} className="flex items-start gap-3">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-green-700" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium text-gray-900">{title}</p>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            {unlimited ? "Tutup" : "Batal"}
          </button>
          {!unlimited && (
            <button type="button" onClick={onCheckout} className={primaryBtn}>
              {active ? "Perpanjang 1 bulan" : "Lanjut Pembayaran"}
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
