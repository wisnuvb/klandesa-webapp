import { VILLAGE_MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleDefinition, ModuleStatus } from "@/lib/modules/registry";
import { EARLY_ACCESS_LABEL } from "@/lib/marketing/copy";

export type MarketingAudience = "desa" | "pemda" | "both";

/** Petunjuk packaging untuk marketing matrix (tanpa angka). */
export type PackagingHint =
  | "core"
  | "professional_bundle"
  | "enterprise_bundle"
  | "addon";

export type MarketingModuleItem = ModuleDefinition & {
  marketingDescription: string;
  audience: MarketingAudience;
  packagingHint: PackagingHint;
};

const EXCLUDED_IDS = new Set(["dashboard", "billing"]);

function inferAudience(mod: ModuleDefinition): MarketingAudience {
  const pemdaHeavy = [
    "sdgs",
    "rpjmdes",
    "sinkronisasi-data",
    "peta-infrastruktur",
    "statistik",
  ];
  const both = ["keuangan", "anggaran", "lingkungan", "asisten-ai", "pertanian", "partisipasi-rtrw", "bumdes", "pkk"];
  if (pemdaHeavy.includes(mod.id)) return "pemda";
  if (both.includes(mod.id)) return "both";
  return "desa";
}

function inferPackagingHint(mod: ModuleDefinition): PackagingHint {
  if (
    mod.id === "sinkronisasi-data" ||
    mod.billingAddon === "integrations"
  ) {
    return "enterprise_bundle";
  }
  if (mod.id === "peta-infrastruktur" || mod.billingAddon === "gis") {
    return "addon";
  }
  if (
    mod.id === "lingkungan" ||
    ["sdgs", "rpjmdes"].includes(mod.id) ||
    mod.billingAddon === "sdgs"
  ) {
    return "professional_bundle";
  }
  if (mod.id === "keuangan" || mod.id === "anggaran") {
    return "professional_bundle";
  }
  if (mod.billingAddon === "bumdes" || mod.billingAddon === "pkk")
    return "addon";
  if (mod.billingAddon === "ai_assistant") return "addon";
  return "core";
}

/** Nilai utama per modul (1–2 kalimat). */
export const MARKETING_MODULE_COPY: Partial<Record<string, string>> = {
  "data-warga":
    "Administrasi penduduk dan KK terpusat untuk keputusan desa berbasis data.",
  "data-kk": "Kelola Kartu Keluarga dan struktur KK selaras data warga.",
  "data-perangkat": "Susunan perangkat desa lengkap untuk tata pemerintahan.",
  "data-jabatan": "Daftar jabatan desa konsisten untuk surat dan pelaporan.",
  potensi: "Potensi wilayah desa menjadi dasar pembangunan dan SDGs.",
  anggaran: "Perencanaan anggaran desa dengan penanda tujuan SDGs.",
  koperasi: "Operasional koperasi desa sebagai pilar ekonomi lokal.",
  bumdes: "Pembukuan unit usaha BUMDes terpisah dari APBDes (akses awal).",
  statistik: "Ringkasan indikator desa mendukung kebijakan dan laporan wilayah.",
  "permohonan-warga": "Alur permohonan surat daring dengan status transparan.",
  "layanan-mandiri": "Warga atau admin mengisi layanan secara mandiri dan terstruktur.",
  "layanan-surat": "Template dan nomor surat resmi konsisten untuk desa.",
  "pengaturan-desa": "Profil dan preferensi desa, termasuk pengaturan pertukaran data.",
  keuangan: "Kas/APBDes, transaksi, dan pelaporan keuangan dengan penanda belanja SDGs.",
  "pengumuman-desa": "Kanal komunikasi resmi antara pemdes dan masyarakat.",
  "forum-diskusi": "Ruangan aspirasi warga dengan moderasi perangkat desa.",
  "pengaduan-masyarakat": "Aduan dapat dilacak demi akuntabilitas pelayanan.",
  "bantuan-program-keluarga": "Pencatatan penerima program sosial mendukung SDGs tanpa menyalahgunakan data.",
  "galeri-desa": "Arsip foto kegiatan desa untuk komunikasi dan transparansi.",
  absensi: "Presensi perangkat; opsional dengan penanda lokasi kantor desa.",
  pkk:
    "PKK Dasawisma, posyandu, dan indikator kesehatan terhubung skor SDGs (akses awal).",
  sdgs:
    "Skor 18 tujuan SDGs dari data operasional desa dan peta capaian per RT/RW (akses awal).",
  rpjmdes:
    "Rencana pembangunan, RKPDes, dan usulan Musdes dengan bobot SDGs (akses awal).",
  pertanian: "Plot lahan, siklus tanam, panen; referensi harga komoditas (akses awal).",
  "partisipasi-rtrw":
    "Kegiatan dan usulan warga tingkat RT/RW dengan penanda SDGs (akses awal).",
  "sinkronisasi-data":
    "Unduh data dalam format standar Kemendesa: penduduk, APBDes, portal SDGs, Prodeskel—plus catatan riwayat pengiriman (akses awal).",
  "peta-infrastruktur":
    "Aset dan proyek infrastruktur pada peta desa serta peta capaian SDGs per RT/RW (akses awal).",
  lingkungan:
    "Bank sampah, insiden lingkungan, dan titik bahaya bencana (akses awal).",
  "asisten-ai":
    "Asisten teks untuk ringkasan SDGs, draf RPJMDes, dan FAQ warga (akses awal, kuota per pengguna).",
  arsip: "Dokumen desa dalam folder terstruktur; kapasitas mengikuti paket desa.",
  ukm: "Katalog dan promosi UKM desa meningkatkan ekonomi lokal.",
  website:
    "Situs resmi desa satu domain ketika paket desa Anda mendukung.",
};

const DEFAULT_FALLBACK_DESCRIPTION =
  "Bagian aplikasi desa dalam Klandesa untuk operasional terpadu.";

export function describeModule(mod: ModuleDefinition): string {
  return (
    MARKETING_MODULE_COPY[mod.id] ??
    MARKETING_MODULE_COPY[mod.label] ??
    DEFAULT_FALLBACK_DESCRIPTION
  );
}

export function getMarketingModules(): MarketingModuleItem[] {
  return VILLAGE_MODULE_REGISTRY.filter((m) => !EXCLUDED_IDS.has(m.id)).map(
    (m) => ({
      ...m,
      marketingDescription: describeModule(m),
      audience: inferAudience(m),
      packagingHint: inferPackagingHint(m),
    }),
  );
}

export function getFlagshipMarketingModules(limit = 8): MarketingModuleItem[] {
  const order = [
    "sdgs",
    "rpjmdes",
    "keuangan",
    "sinkronisasi-data",
    "peta-infrastruktur",
    "pkk",
    "bumdes",
    "asisten-ai",
  ];
  const all = getMarketingModules();
  const byId = new Map(all.map((m) => [m.id, m]));
  const picked: MarketingModuleItem[] = [];
  for (const id of order) {
    const v = byId.get(id);
    if (v) picked.push(v);
    if (picked.length >= limit) break;
  }
  return picked.length ? picked.slice(0, limit) : all.slice(0, limit);
}

export function badgeLabelForStatus(status: ModuleStatus): string | null {
  if (status === "beta") return EARLY_ACCESS_LABEL;
  return null;
}
