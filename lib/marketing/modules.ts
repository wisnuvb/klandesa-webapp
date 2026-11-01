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
  const both = [
    "keuangan",
    "anggaran",
    "lingkungan",
    "asisten-ai",
    "pertanian",
    "partisipasi-rtrw",
    "bumdes",
    "pkk",
    // Punya rekap/penggunaan di tingkat kabupaten (kalender kepatuhan, dasbor wilayah).
    "kepatuhan",
    "dana-desa",
    "apbdes",
    "idm",
    "laporan-kades",
  ];
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

/**
 * Nilai utama per modul (1–2 kalimat). Setiap kalimat harus bisa ditunjuk ke fitur yang sudah ada
 * (lihat docs/PHASE*.md, bagian "Yang dibangun" dan "Batas yang jujur"). Jangan menulis "(akses awal)": lencananya
 * sudah tampil dari status registry. Modul baru WAJIB ditambahkan di
 * sini dan di MARKETING_GROUPS; tests/marketing-modules.test.ts menggagalkan build bila terlewat.
 */
export const MARKETING_MODULE_COPY: Partial<Record<string, string>> = {
  "data-warga":
    "Administrasi penduduk dan KK terpusat, dengan impor Excel yang mengenali kolom umum desa.",
  "data-kk": "Kelola Kartu Keluarga dan struktur KK selaras data warga.",
  "data-perangkat": "Susunan perangkat desa lengkap untuk tata pemerintahan.",
  "data-jabatan": "Daftar jabatan desa konsisten untuk surat dan pelaporan.",
  potensi: "Potensi wilayah desa menjadi dasar pembangunan dan SDGs.",
  anggaran: "Perencanaan anggaran desa dengan penanda tujuan SDGs.",
  koperasi:
    "Koperasi desa: pelacak pembentukan Kopdes Merah Putih (8 langkah), simpan pinjam, dan kalkulator SHU.",
  bumdes:
    "Kas dan unit usaha, jurnal berpasangan, neraca dan laba rugi per unit, penutupan semester, serta legalitas BUMDes.",
  statistik:
    "Ringkasan indikator penduduk untuk kebijakan dan laporan; satu tombol Export ke Excel, CSV, atau PDF.",
  "permohonan-warga": "Alur permohonan surat daring dengan status transparan.",
  "layanan-mandiri": "Warga atau admin mengisi layanan secara mandiri dan terstruktur.",
  "layanan-surat":
    "Susun surat resmi langsung di lembar kertas, dengan nomor surat otomatis dan 37 jenis surat siap pakai.",
  "pengaturan-desa": "Profil dan preferensi desa, termasuk pengaturan pertukaran data.",
  keuangan: "Kas/APBDes, transaksi, dan pelaporan keuangan dengan penanda belanja SDGs.",
  "pengumuman-desa": "Kanal komunikasi resmi antara pemdes dan masyarakat.",
  "forum-diskusi": "Ruangan aspirasi warga dengan moderasi perangkat desa.",
  "pengaduan-masyarakat": "Aduan dapat dilacak demi akuntabilitas pelayanan.",
  "bantuan-program-keluarga":
    "Pencatatan penerima program sosial mendukung SDGs tanpa menyalahgunakan data.",
  "galeri-desa": "Arsip foto kegiatan desa untuk komunikasi dan transparansi.",
  absensi: "Presensi perangkat desa dengan QR; absensi GPS radius tersedia sebagai add-on.",
  pkk:
    "PKK Dasawisma, posyandu, KIA ibu hamil, imunisasi, gizi balita (z-score WHO), dan posyandu lansia, terhubung skor SDGs.",
  sdgs:
    "Skor 18 tujuan SDGs dari data operasional desa dan peta capaian per RT/RW.",
  rpjmdes:
    "Rencana pembangunan, RKPDes, dan usulan Musdes dengan bobot SDGs.",
  pertanian: "Plot lahan, siklus tanam, panen; referensi harga komoditas.",
  "partisipasi-rtrw":
    "Kegiatan dan usulan RT/RW, iuran per KK dengan laporan bayar, dan kas RT yang transparan.",
  "sinkronisasi-data":
    "Unduhan format Kemendesa dan riwayatnya, plus kunci API per desa, webhook, dan server MCP baca-saja untuk aplikasi buatan sendiri.",
  "peta-infrastruktur":
    "Aset dan proyek infrastruktur pada peta desa serta peta capaian SDGs per RT/RW.",
  lingkungan:
    "Bank sampah transaksional, insiden lingkungan, dan titik bahaya bencana.",
  "asisten-ai":
    "Laras, asisten teks untuk SDGs, RPJMDes, dan FAQ warga yang membaca data desa lewat alat baca-saja; 1.000 kredit gratis per pengguna.",
  arsip: "Dokumen desa dalam folder terstruktur; kapasitas mengikuti paket desa.",
  ukm:
    "Katalog UMKM desa. Warga pemilik bisa mengunggah produk dari aplikasi seluler; persetujuan admin bisa dimatikan.",
  website:
    "Layanan website resmi desa yang dibangun khusus dan dikelola tim Klandesa; dipesan terpisah dari paket desa.",

  // Keuangan & Dana Desa
  apbdes:
    "APB Desa awal dan perubahan, DPA, SPP, dan Buku Kas Umum menurut Permendagri 20/2018; belanja tidak bisa melebihi pagu dan bulan bisa ditutup.",
  "dana-desa":
    "Kepatuhan Dana Desa 2026: 8 fokus, 8 larangan lengkap dengan dasar pasal, publikasi, dan kesiapan penyaluran tahap I/II.",
  blt:
    "Penerima per keluarga, batas nilai menurut aturan tahun berjalan, pembayaran per bulan, dan lampiran SK siap cetak.",
  pktd:
    "Pekerja prioritas, upah harian, dan pemantau bagian upah minimal 50% dari biaya kegiatan.",
  kdmp:
    "Pantau dukungan KDMP: pagu, dana diterima, angsuran, dan progres fisik gerai atau gudang, lengkap dengan temuan pemeriksaan.",
  pengadaan:
    "Catat pengadaan barang/jasa desa dengan tim pelaksana kegiatan (TPK) dan aturan swakelola menurut Peraturan LKPP 12/2019.",
  "laporan-kades":
    "Susun LPPD, LKPPD, dan LPPD akhir masa jabatan; data APB Desa dan penduduk terisi otomatis.",
  kepatuhan:
    "Kalender laporan wajib per tahun anggaran: tenggat, status otomatis dari data aplikasi, pengingat, dan rekap kepatuhan untuk kabupaten.",

  // Perencanaan & pembangunan
  musdes:
    "Catat Musyawarah Desa: jadwal, peserta per unsur, daftar hadir, keputusan bernomor, dan berita acara yang bisa dicetak.",
  rkpdes:
    "Siklus RKP Desa dengan tenggat dihitung otomatis (Perdes 30 September, daftar usulan 31 Desember) dan keselarasan dengan APB Desa.",
  rpjm: "Tahapan penyusunan RPJM Desa (periode 8 tahun) dari tim penyusun sampai ditetapkan.",
  "kerja-sama": "Catat kerja sama antar-desa dan dengan pihak ketiga menurut Permendagri 96/2017.",
  idm: "Impor hasil Indeks Desa Membangun (IDM) untuk dipantau bersama perencanaan desa.",

  // Administrasi & tata kelola
  "produk-hukum":
    "Register Perdes, Perkades, dan keputusan kepala desa: nomor unik per tahun, pengundangan, dan pencabutan beralasan.",
  "register-surat":
    "Buku agenda surat masuk dan keluar dengan nomor agenda berurutan yang aman dari pencatat serentak.",
  "lembaga-desa": "Daftar lembaga desa (BPD, LPM, dan lainnya) beserta anggota dan masa baktinya.",
  "aset-desa":
    "Buku Inventaris Aset Desa (Permendagri 1/2016), usulan penghapusan, serta tanah kas desa dan sewa.",
  "dtsen-usulan":
    "Catat alur usulan DTSEN dari verifikasi dan musyawarah desa sampai diteruskan ke dinas sosial; desa tidak menetapkan desil.",
  polling: "Polling warga satu warga satu suara, tersedia di dashboard dan aplikasi seluler.",

  // Kebencanaan & keamanan
  bencana:
    "Kesiapsiagaan bencana dan Desa Tangguh Bencana (Peraturan BNPB 7/2025), plus catatan kejadian, tindakan, dan distribusi bantuan.",
  keamanan:
    "Satlinmas, jadwal ronda dengan rotasi adil, perlengkapan, dan pencatatan kejadian keamanan beserta tindak lanjutnya.",

  // Platform
  "data-kustom":
    "Buat tabel dan kolom sendiri untuk data yang belum tercakup, lengkap dengan formulir, unduhan CSV, jejak audit, dan akses API yang aman.",
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
  // Campuran modul yang sudah matang (data warga, surat, absensi) dan yang paling baru/berbeda
  // (APB Desa, Dana Desa, RKP Desa, BUMDes, Laras).
  const order = [
    "data-warga",
    "layanan-surat",
    "apbdes",
    "dana-desa",
    "rkpdes",
    "bumdes",
    "absensi",
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

export type MarketingGroup = {
  id: string;
  title: string;
  blurb: string;
  /** Urutan tampil di dalam kelompok. */
  ids: string[];
};

/** Kelompok katalog /platform. Modul yang belum terdaftar masuk "Lainnya" (dan tes akan gagal). */
export const MARKETING_GROUPS: MarketingGroup[] = [
  {
    id: "administrasi",
    title: "Kependudukan & administrasi",
    blurb: "Data warga, perangkat, arsip, dan buku-buku administrasi desa.",
    ids: [
      "data-warga",
      "data-kk",
      "data-perangkat",
      "data-jabatan",
      "statistik",
      "pengaturan-desa",
      "arsip",
      "register-surat",
      "produk-hukum",
      "lembaga-desa",
      "aset-desa",
    ],
  },
  {
    id: "layanan",
    title: "Layanan & warga",
    blurb: "Surat, permohonan, pengaduan, dan komunikasi dengan warga, juga lewat aplikasi seluler.",
    ids: [
      "layanan-surat",
      "permohonan-warga",
      "layanan-mandiri",
      "pengaduan-masyarakat",
      "pengumuman-desa",
      "forum-diskusi",
      "polling",
      "galeri-desa",
      "bantuan-program-keluarga",
      "dtsen-usulan",
      "absensi",
    ],
  },
  {
    id: "keuangan",
    title: "Keuangan & Dana Desa",
    blurb: "APB Desa sampai pertanggungjawaban, Dana Desa, dan laporan yang wajib disampaikan.",
    ids: [
      "apbdes",
      "keuangan",
      "anggaran",
      "dana-desa",
      "blt",
      "pktd",
      "kdmp",
      "pengadaan",
      "laporan-kades",
      "kepatuhan",
    ],
  },
  {
    id: "perencanaan",
    title: "Perencanaan & pembangunan",
    blurb: "Dari Musyawarah Desa dan RKP Desa sampai skor SDGs dan peta capaian.",
    ids: ["musdes", "rkpdes", "rpjm", "rpjmdes", "kerja-sama", "idm", "sdgs", "peta-infrastruktur", "potensi"],
  },
  {
    id: "usaha",
    title: "Usaha & ekonomi desa",
    blurb: "BUMDes, koperasi, UMKM warga, pertanian, dan website desa.",
    ids: ["bumdes", "koperasi", "ukm", "pertanian", "website"],
  },
  {
    id: "lapangan",
    title: "Kesehatan, lingkungan & ketertiban",
    blurb: "Program PKK dan posyandu, lingkungan, kebencanaan, keamanan, dan kegiatan RT/RW.",
    ids: ["pkk", "lingkungan", "bencana", "keamanan", "partisipasi-rtrw"],
  },
  {
    id: "platform",
    title: "Data, integrasi & AI",
    blurb: "Unduhan format Kemendesa, akses API untuk aplikasi buatan sendiri, data kustom, dan asisten AI.",
    ids: ["sinkronisasi-data", "data-kustom", "asisten-ai"],
  },
];

export type MarketingModuleGroup = Omit<MarketingGroup, "ids"> & { modules: MarketingModuleItem[] };

/** Kelompokkan modul (sudah disaring) sesuai MARKETING_GROUPS; kelompok kosong dibuang. */
export function groupMarketingModules(modules: MarketingModuleItem[]): MarketingModuleGroup[] {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const used = new Set<string>();
  const groups: MarketingModuleGroup[] = [];
  for (const g of MARKETING_GROUPS) {
    const items: MarketingModuleItem[] = [];
    for (const id of g.ids) {
      const m = byId.get(id);
      if (m) {
        items.push(m);
        used.add(id);
      }
    }
    if (items.length) groups.push({ id: g.id, title: g.title, blurb: g.blurb, modules: items });
  }
  const rest = modules.filter((m) => !used.has(m.id));
  if (rest.length) {
    groups.push({ id: "lainnya", title: "Lainnya", blurb: "Fitur tambahan.", modules: rest });
  }
  return groups;
}

/** Jumlah modul untuk angka di landing, dibulatkan ke bawah per sepuluh ("50+"), agar tidak basi tiap ada modul baru. */
export function getMarketingModuleCountLabel(): string {
  const n = getMarketingModules().length;
  return `${Math.floor(n / 10) * 10}+`;
}

export function badgeLabelForStatus(status: ModuleStatus): string | null {
  if (status === "beta") return EARLY_ACCESS_LABEL;
  return null;
}
