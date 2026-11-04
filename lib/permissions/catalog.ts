import type { PermissionAction } from "./actions";
import { PERMISSION_ACTIONS } from "./actions";
import { getRoleBaselineActions } from "./matrix";
import { NON_DELEGABLE_RESOURCES } from "./overrides";
import type { PermissionResource } from "./resources";
import { VILLAGE_ROLES } from "./roles";

/** Label aksi untuk admin desa (bukan istilah teknis). */
export const ACTION_LABELS: Record<PermissionAction, string> = {
  read: "Lihat",
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
  approve: "Setujui",
  export: "Ekspor/cetak",
};

export const ACTION_HINTS: Record<PermissionAction, string> = {
  read: "Membuka menu dan melihat datanya. Tanpa ini, semua izin lain pada modul ini tidak berlaku.",
  create: "Menambah data baru.",
  update: "Mengubah data yang sudah ada.",
  delete: "Menghapus data.",
  approve: "Menyetujui/menetapkan (mis. keuangan, perencanaan, mutasi, BLT).",
  export: "Mengunduh atau mencetak, termasuk data rinci yang memuat NIK/kontak.",
};

export type PermissionGroupId =
  | "kependudukan"
  | "pemerintahan"
  | "keuangan"
  | "surat"
  | "layanan"
  | "ekonomi"
  | "program"
  | "perencanaan"
  | "pengaturan";

export const PERMISSION_GROUPS: { id: PermissionGroupId; label: string }[] = [
  { id: "kependudukan", label: "Kependudukan & wilayah" },
  { id: "pemerintahan", label: "Pemerintahan desa" },
  { id: "keuangan", label: "Keuangan & anggaran" },
  { id: "surat", label: "Surat & arsip" },
  { id: "layanan", label: "Layanan & komunikasi warga" },
  { id: "ekonomi", label: "Ekonomi desa" },
  { id: "program", label: "Program & lingkungan" },
  { id: "perencanaan", label: "Perencanaan & kebencanaan" },
  { id: "pengaturan", label: "Pengaturan & sistem" },
];

type Meta = {
  label: string;
  group: PermissionGroupId;
  /** Satu kalimat: apa yang diatur. */
  hint: string;
  /** Data pribadi / uang / pengaturan desa: diberi tanda hati-hati di editor. */
  sensitive?: boolean;
};

export const PERMISSION_CATALOG: Record<Exclude<PermissionResource, "rbac">, Meta> = {
  residents: { label: "Data warga & KK", group: "kependudukan", hint: "Warga, KK, mutasi penduduk. Ekspor memuat NIK lengkap.", sensitive: true },
  statistics: { label: "Statistik & dashboard", group: "kependudukan", hint: "Ringkasan angka dan grafik desa." },
  sdgs: { label: "SDGs Desa", group: "kependudukan", hint: "Skor dan indikator SDGs." },
  gis: { label: "Peta & GIS", group: "kependudukan", hint: "Peta infrastruktur dan wilayah." },
  rtrw: { label: "RT/RW & iuran", group: "kependudukan", hint: "Pengurus RT/RW dan iuran warga." },
  dtsen_usulan: { label: "Usulan DTSEN", group: "kependudukan", hint: "Usulan pemutakhiran data sosial ekonomi nasional." },

  officials: { label: "Perangkat desa & jabatan", group: "pemerintahan", hint: "Data perangkat dan jabatan." },
  lembaga_desa: { label: "Lembaga desa", group: "pemerintahan", hint: "BPD, LPM, karang taruna, dan lembaga lain." },
  produk_hukum: { label: "Produk hukum", group: "pemerintahan", hint: "Perdes, peraturan kepala desa, keputusan." },
  register_surat: { label: "Register surat", group: "pemerintahan", hint: "Buku agenda surat masuk/keluar." },
  attendance: { label: "Absensi perangkat", group: "pemerintahan", hint: "Kehadiran perangkat desa." },
  aset_desa: { label: "Aset desa", group: "pemerintahan", hint: "Inventaris, tanah, pemanfaatan, penghapusan aset." },
  potentials: { label: "Potensi desa", group: "pemerintahan", hint: "Katalog potensi dan profil wisata/produk." },

  finance: { label: "Keuangan (transaksi)", group: "keuangan", hint: "Pencatatan pemasukan dan pengeluaran.", sensitive: true },
  anggaran: { label: "Anggaran desa", group: "keuangan", hint: "Rencana anggaran dan realisasi.", sensitive: true },
  apbdes: { label: "APB Desa, SPP & pengadaan", group: "keuangan", hint: "APBDes, DPA, SPP, panjar, pengadaan, laporan.", sensitive: true },
  blt: { label: "BLT Desa", group: "keuangan", hint: "Data penerima dan penyaluran BLT.", sensitive: true },
  social_benefits: { label: "Bantuan sosial", group: "keuangan", hint: "Program dan penerima bantuan.", sensitive: true },

  mail: { label: "Layanan surat", group: "surat", hint: "Permohonan surat, template, kop surat, kiosk." },
  archive: { label: "Arsip digital", group: "surat", hint: "Dokumen dan penyimpanan arsip." },

  announcements: { label: "Pengumuman", group: "layanan", hint: "Pengumuman untuk warga." },
  forum: { label: "Forum diskusi", group: "layanan", hint: "Utas dan balasan warga." },
  citizen_reports: { label: "Pengaduan & permohonan warga", group: "layanan", hint: "Antrean pengaduan dan permohonan." },
  polls: { label: "Polling warga", group: "layanan", hint: "Membuat, menerbitkan, menutup polling." },
  ai_assistant: { label: "Asisten AI (Laras)", group: "layanan", hint: "Memakai asisten AI atas nama akun ini." },

  ukm: { label: "UKM & produk desa", group: "ekonomi", hint: "Produk UKM dan pesanan." },
  cooperative: { label: "Koperasi", group: "ekonomi", hint: "Koperasi desa/kelurahan." },
  bumdes: { label: "BUMDes", group: "ekonomi", hint: "Unit usaha dan transaksi BUMDes.", sensitive: true },
  pertanian: { label: "Pertanian & pangan", group: "ekonomi", hint: "Data pertanian dan harga pangan." },

  pkk: { label: "PKK & posyandu", group: "program", hint: "Kegiatan PKK, imunisasi, gizi." },
  lingkungan: { label: "Lingkungan", group: "program", hint: "Bank sampah dan program lingkungan." },
  website: { label: "Website desa", group: "program", hint: "Konten dan pengaturan website.", sensitive: true },

  rpjmdes: { label: "RPJM Desa (usulan)", group: "perencanaan", hint: "Usulan dan persetujuan RPJM." },
  perencanaan: { label: "Perencanaan (RPJM, RKP, Musdes)", group: "perencanaan", hint: "RPJM, RKPDes, musyawarah, kerja sama." },
  bencana: { label: "Kebencanaan", group: "perencanaan", hint: "Kejadian, kesiapsiagaan, peringatan dini. Ekspor = data rinci.", sensitive: true },
  keamanan: { label: "Keamanan & ketertiban", group: "perencanaan", hint: "Satlinmas, ronda, mediasi. Ekspor = data rinci.", sensitive: true },

  settings: { label: "Pengaturan desa", group: "pengaturan", hint: "Profil desa, kop surat, pengaturan umum.", sensitive: true },
  billing: { label: "Langganan & billing", group: "pengaturan", hint: "Tagihan, pembayaran, paket.", sensitive: true },
  integrations: { label: "Integrasi & API", group: "pengaturan", hint: "Kunci API, webhook, aplikasi pihak ketiga.", sensitive: true },
  custom_data: { label: "Data kustom", group: "pengaturan", hint: "Tabel dan formulir buatan desa." },
};

/**
 * Aksi yang bermakna untuk sebuah resource = gabungan aksi yang dipakai role mana pun di matriks bawaan.
 * Aksi yang tak dipakai role mana pun tidak punya rute yang memeriksanya, jadi tidak ditawarkan (tombol palsu).
 */
export function applicableActions(resource: PermissionResource): PermissionAction[] {
  const set = new Set<PermissionAction>();
  for (const role of VILLAGE_ROLES) for (const a of getRoleBaselineActions(resource, role)) set.add(a);
  set.add("read");
  return PERMISSION_ACTIONS.filter((a) => set.has(a));
}

export type CatalogEntry = Meta & { resource: Exclude<PermissionResource, "rbac">; actions: PermissionAction[] };

export function permissionCatalogByGroup(): { id: PermissionGroupId; label: string; entries: CatalogEntry[] }[] {
  return PERMISSION_GROUPS.map((g) => ({
    ...g,
    entries: (Object.keys(PERMISSION_CATALOG) as CatalogEntry["resource"][])
      .filter((r) => PERMISSION_CATALOG[r].group === g.id && !NON_DELEGABLE_RESOURCES.includes(r))
      .map((resource) => ({ resource, ...PERMISSION_CATALOG[resource], actions: applicableActions(resource) })),
  })).filter((g) => g.entries.length > 0);
}
