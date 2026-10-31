import type { ElementType } from "react";

export type SidebarSearchMenuItem = {
  id: string;
  label: string;
  icon: ElementType;
  path?: string;
  children?: SidebarSearchMenuItem[];
};

export type SidebarSearchEntry = {
  id: string;
  label: string;
  icon: ElementType;
  path: string;
  groupLabel?: string;
  keywords: string[];
};

/**
 * Kata kunci tambahan per id menu agar pencarian tetap menemukan menu yang
 * tepat walau pengguna mengetik istilah sehari-hari, bukan label persis.
 */
const MENU_SEARCH_SYNONYMS: Record<string, string[]> = {
  dashboard: ["beranda", "home", "ringkasan", "overview"],
  "asisten-ai": ["laras", "chatbot", "tanya ai", "asisten virtual", "ai"],

  "data-warga": ["penduduk", "sensus", "nik", "warga", "biodata warga"],
  "data-kk": ["kartu keluarga", "kk", "keluarga"],
  statistik: ["grafik penduduk", "demografi", "jumlah penduduk", "laporan penduduk"],

  "data-perangkat": ["pegawai desa", "staff desa", "aparat desa", "pamong desa", "perangkat"],
  "data-jabatan": ["struktur organisasi", "bagan jabatan", "jabatan perangkat", "struktur desa"],
  absensi: ["kehadiran", "presensi", "jam kerja", "gps check in", "check in perangkat"],

  potensi: ["profil desa", "produk unggulan", "sumber daya desa", "sda"],
  anggaran: ["apbdes", "dana desa", "budget desa", "realisasi anggaran"],
  koperasi: ["simpan pinjam", "unit usaha koperasi"],
  bumdes: ["badan usaha milik desa", "usaha desa"],
  ukm: ["umkm", "produk warga", "toko warga", "katalog usaha"],

  "permohonan-warga": ["pengajuan surat", "approval surat", "verifikasi surat", "permintaan surat"],
  "layanan-mandiri": ["kiosk", "self service", "cetak mandiri", "swalayan surat"],
  "layanan-surat": [
    "buat surat",
    "cetak surat",
    "pengajuan surat",
    "template surat",
    "surat keterangan",
    "blangko surat",
  ],
  arsip: ["arsip digital", "dokumen desa", "scan dokumen", "penyimpanan file"],
  keuangan: ["apbdes", "transaksi desa", "laporan keuangan", "kas desa"],

  "pengumuman-desa": ["info desa", "broadcast warga", "notifikasi warga", "pengumuman"],
  "forum-diskusi": ["diskusi warga", "obrolan warga", "chat warga"],
  "pengaduan-masyarakat": ["komplain warga", "laporan warga", "keluhan warga", "pengaduan"],
  "galeri-desa": ["foto kegiatan", "dokumentasi kegiatan", "album foto"],
  website: ["web desa", "landing page desa", "portal publik desa", "situs desa"],

  "bantuan-program-keluarga": ["bansos", "bantuan sosial", "pkh", "bpnt", "program keluarga"],
  pkk: ["posyandu", "kesehatan keluarga", "ibu dan anak"],
  pertanian: ["tani", "sawah", "panen", "petani desa"],
  "partisipasi-rtrw": ["rt rw", "kegiatan warga", "gotong royong"],
  lingkungan: ["sampah", "kebersihan desa", "go green", "lingkungan hidup"],

  sdgs: ["sustainable development goals", "skor desa", "penilaian sdgs"],
  rpjmdes: ["rencana pembangunan", "perencanaan jangka menengah desa"],
  "peta-infrastruktur": ["gis", "peta desa", "infrastruktur jalan", "peta wilayah"],
  "sinkronisasi-data": ["integrasi data", "sync data", "siskeudes", "dukcapil"],

  "pengaturan-desa": ["kop surat", "profil desa", "logo desa", "identitas desa", "pengaturan"],
  billing: ["tagihan", "langganan", "pembayaran paket", "invoice", "upgrade paket"],
  profil: ["akun saya", "profil pengguna", "data akun"],
};

function getKeywords(id: string): string[] {
  return MENU_SEARCH_SYNONYMS[id] ?? [];
}

/** Ratakan pohon menu sidebar jadi daftar tujuan yang bisa dicari (hanya item berisi path). */
export function flattenMenuForSearch(
  items: SidebarSearchMenuItem[],
  groupLabel?: string,
): SidebarSearchEntry[] {
  const result: SidebarSearchEntry[] = [];

  for (const item of items) {
    if (item.children && item.children.length > 0) {
      result.push(...flattenMenuForSearch(item.children, item.label));
      continue;
    }
    if (!item.path) continue;
    result.push({
      id: item.id,
      label: item.label,
      icon: item.icon,
      path: item.path,
      groupLabel,
      keywords: getKeywords(item.id),
    });
  }

  return result;
}
