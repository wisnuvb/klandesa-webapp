/**
 * Ekspor daftar KK (hasil filter /data-kk). Murni. Satu baris per KK, tanpa NIK dan tanpa nama anggota selain kepala keluarga.
 * Nomor KK ditulis dengan spasi tiap 4 angka agar Excel tetap menganggapnya teks (16 angka polos dibulatkan Excel menjadi 15 angka bermakna).
 */
import { KK_FLAG_META, kkFlags, spacedDigits, type KkAggRow, type KkQuery } from "./kk-list";

/** Batas baris satu ekspor: melindungi server dari permintaan tak terbatas. */
export const KK_EXPORT_MAX_ROWS = 20_000;

export const KK_EXPORT_HEADER = [
  "No",
  "Nomor KK",
  "Kepala Keluarga",
  "Alamat",
  "RT",
  "RW",
  "Dusun",
  "Anggota Aktif",
  "Meninggal/Pindah",
  "Balita",
  "Lansia",
  "Hamil",
  "Disabilitas",
  "Stunting",
  "Catatan Data",
] as const;

export function kkExportRow(r: KkAggRow, no: number): (string | number)[] {
  return [
    no,
    spacedDigits(r.kk),
    r.headName || "-",
    r.address || "-",
    r.rt || "-",
    r.rw || "-",
    r.hamlet || "-",
    r.activeCount,
    r.inactiveCount,
    r.balita,
    r.lansia,
    r.hamil,
    r.disabilitas,
    r.stunting,
    kkFlags(r).map((f) => KK_FLAG_META[f].label).join("; "),
  ];
}

/** Ringkasan filter untuk jejak audit: tanpa teks pencarian (bisa berisi nama atau NIK), hanya apakah dipakai. */
export function kkExportAuditFilters(q: KkQuery) {
  return { dusun: q.dusun || null, rw: q.rw || null, rt: q.rt || null, size: q.size, has: q.has, preset: q.preset, search: q.search ? true : false };
}
