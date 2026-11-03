/**
 * Katalog semua panduan halaman, dipakai /bantuan. Panduan baru: buat lib/guides/<halaman>.ts yang mengekspor GuideEntry,
 * lalu tambahkan di sini dan di daftar test:unit (package.json). Tes katalog menjaga id unik dan href tidak ganda.
 */
import { LAPORAN_GUIDE_ENTRY } from "@/lib/laporan-desa/guide";
import { APBDES_GUIDE_ENTRIES } from "./apbdes";
import { BUMDES_GUIDE_ENTRY } from "./bumdes";
import { DANA_DESA_GUIDE_ENTRIES } from "./dana-desa";
import { MUSDES_GUIDE_ENTRY } from "./musdes";
import { PENGADAAN_GUIDE_ENTRIES } from "./pengadaan";
import { RKPDES_GUIDE_ENTRY } from "./rkpdes";
import { RPJM_GUIDE_ENTRIES } from "./rpjm";
import type { GuideEntry } from "./types";

export const GUIDE_CATALOG: GuideEntry[] = [
  ...APBDES_GUIDE_ENTRIES,
  ...RPJM_GUIDE_ENTRIES,
  RKPDES_GUIDE_ENTRY,
  MUSDES_GUIDE_ENTRY,
  ...DANA_DESA_GUIDE_ENTRIES,
  BUMDES_GUIDE_ENTRY,
  ...PENGADAAN_GUIDE_ENTRIES,
  LAPORAN_GUIDE_ENTRY,
];
