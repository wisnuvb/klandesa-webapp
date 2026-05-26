import { VILLAGE_MODULE_REGISTRY } from "@/lib/modules/registry";
import type { ModuleDefinition, ModuleStatus } from "@/lib/modules/registry";

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
  "data-jabatan": "Master jabatan desa konsisten untuk surat dan pelaporan.",
  potensi: "Potensi wilayah desa menjadi dasar pembangunan dan SDGs.",
  anggaran: "Perencanaan anggaran desa dengan penanda tujuan SDGs.",
  koperasi: "Operasional koperasi desa sebagai pilar ekonomi lokal.",
  bumdes: "Pembukuan unit usaha BUMDes sebagai entitas terpisah dari APBDes (early access).",
  statistik: "Ringkasan indikator desa mendukung kebijakan dan laporan wilayah.",
  "permohonan-warga": "Alur permohonan surat daring dengan status transparan.",
  "layanan-mandiri": "Warga atau admin input layanan secara mandiri terstruktur.",
  "layanan-surat": "Template dan numerik surat resmi konsisten untuk desa.",
  "pengaturan-desa": "Preferensi dan profil desa termasuk pengaturan integrasi.",
  keuangan: "Kas/APBDes, transaksi, dan pelaporan keuangan; tagging belanja SDGs.",
  "pengumuman-desa": "Kanal komunikasi resmi antara pemdes dan masyarakat.",
  "forum-diskusi": "Ruangan aspirasi kolektif warga moderated.",
  "pengaduan-masyarakat": "Aduan dapat dilacak demi akuntabilitas pelayanan.",
  "bantuan-program-keluarga": "Pencatatan penerima program sosial mendukung SDG tanpa menyalahgunakan data.",
  "galeri-desa": "Arsip foto kegiatan desa untuk komunikasi dan transparansi.",
  absensi: "Presensi perangkat; opsional add-on GPS radius.",
  pkk:
    "PKK Dasawisma, posyandu, dan indikators kesehatan yang terhubung skor SDGs (early access).",
  sdgs:
    "Skoring 18 tujuan SDGs dari data operasional desa serta heatmap RT/RW (early access).",
  rpjmdes:
    "Rencana pembangunan, RKPDes, dan usulan Musdes dengan bobot SDGs (early access).",
  pertanian: "Plot lahan, siklus tanam, panen; referensi harga komoditas (early access).",
  "partisipasi-rtrw":
    "Kegiatan dan usulan warga tingkat RT/RW dengan tagging SDGs (early access).",
  "sinkronisasi-data":
    "Export standar Kemendesa: penduduk, APBDes/Siskeudes-format, portal SDGs, Prodeskel + log sinkron (early access).",
  "peta-infrastruktur":
    "Aset dan proyek infrastruktur digabung pada peta desa serta heatmap SDGs RT/RW (early access).",
  lingkungan:
    "Bank sampah, insiden lingkungan dengan checklist peringatan, titik bahaya bencana (early access).",
  "asisten-ai":
    "Asisten teks mendukung analisa SDGs, draf RPJMDes, FAQ warga konsumsi kredit AI per user (early access).",
  arsip: "Dokumen desa berskema folder; penyimpanan dibatasi paket desa atau add-on arsip.",
  ukm: "Katalog dan promosi UKM desa meningkatkan ekonomi lokal.",
  website:
    "Situs profesional satu domain dengan mesin tema Klandesa ketika aktivasi paket mendukung.",
};

const DEFAULT_FALLBACK_DESCRIPTION =
  "Modul aplikasi desa dalam ekosistem Klandesa untuk operasional terpadu.";

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
  if (status === "beta") return "Early Access";
  return null;
}
