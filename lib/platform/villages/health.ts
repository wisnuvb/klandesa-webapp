import { getSubscriptionDaysRemaining, resolveSubscriptionPhase } from "@/lib/subscription";

/**
 * Kesehatan data desa. Setiap pemeriksaan = fungsi MURNI dari angka agregat -> temuan (atau null bila sehat).
 * Pengambilan angka ada di health-data.ts. Tidak ada data pribadi di sini: hanya hitungan.
 */

export type HealthSeverity = "critical" | "warning" | "info";

export type HealthFinding = {
  id: string;
  severity: HealthSeverity;
  title: string;
  /** Penjelasan terukur (memuat angka). */
  detail: string;
  /** Saran perbaikan untuk admin platform / admin desa. */
  hint: string;
  /** Angka utama pemeriksaan (untuk tampilan ringkas). */
  count?: number;
};

export type HealthInput = {
  now: Date;
  village: {
    isActive: boolean;
    createdAt: Date;
    subscriptionStatus: string;
    subscriptionExpiry: Date | null;
    storageLimitGb: number;
    storageUsedGb: number;
  };
  users: {
    total: number;
    active: number;
    /** Pengguna aktif ber-role admin. */
    activeAdmins: number;
    /** Pengguna aktif yang lastLogin dalam 30 hari terakhir. */
    loggedIn30d: number;
  };
  /** Jumlah baris audit desa dalam 7 hari terakhir. */
  auditEvents7d: number;
  residents: {
    total: number;
    withoutKk: number;
    /** Jumlah NIK yang muncul lebih dari sekali di desa ini. */
    duplicateNikGroups: number;
  };
  households: { total: number; activeWithoutHead: number };
  officials: { active: number; activeWithoutAccount: number };
  invoices: {
    /** Tagihan pending yang sudah melewati batas bayar (expiresAt < sekarang). */
    pendingOverdue: number;
  };
  modules: {
    /** Add-on berstatus aktif tetapi masa berlakunya sudah lewat. */
    expiredStillActive: number;
    /** Add-on aktif yang habis dalam 7 hari. */
    expiringIn7d: number;
  };
};

const MS_DAY = 24 * 60 * 60 * 1000;
const pct = (used: number, limit: number) => (limit > 0 ? (used / limit) * 100 : used > 0 ? 100 : 0);
const fmtPct = (n: number) => `${Math.round(n * 10) / 10}%`;
const ageDays = (i: HealthInput) => Math.floor((i.now.getTime() - i.village.createdAt.getTime()) / MS_DAY);

type Check = (i: HealthInput) => HealthFinding | null;

export const checkVillageInactive: Check = (i) =>
  i.village.isActive
    ? null
    : {
        id: "village-inactive",
        severity: "critical",
        title: "Desa sedang dinonaktifkan",
        detail: "Desa ini ditandai nonaktif oleh admin platform. Akses desa ke layanan (seluler, kios, kunci API) ditolak.",
        hint: "Aktifkan kembali dari tab Langganan bila penonaktifan tidak lagi diperlukan.",
      };

export const checkNoActiveAdmin: Check = (i) =>
  i.users.activeAdmins > 0
    ? null
    : {
        id: "no-active-admin",
        severity: "critical",
        title: "Tidak ada admin desa yang aktif",
        detail:
          i.users.total === 0
            ? "Desa belum memiliki pengguna sama sekali."
            : `Ada ${i.users.total} pengguna, tetapi tidak satu pun ber-role admin dan aktif. Desa tidak bisa mengelola akun stafnya sendiri.`,
        hint: "Buka Pusat Akun untuk mengaktifkan kembali admin yang ada atau kirim tautan atur sandi ke admin desa.",
        count: 0,
      };

export const checkNoRecentLogin: Check = (i) => {
  if (i.users.active === 0) return null; // sudah tertangkap pemeriksaan admin
  if (ageDays(i) < 14) return null; // desa baru: belum wajar dinilai
  if (i.users.loggedIn30d > 0) return null;
  return {
    id: "no-login-30d",
    severity: "warning",
    title: "Tidak ada pengguna yang masuk dalam 30 hari",
    detail: `${i.users.active} pengguna aktif, tetapi belum ada yang masuk dalam 30 hari terakhir. Desa mungkin berhenti memakai aplikasi.`,
    hint: "Hubungi admin desa untuk menanyakan kendala (lupa sandi, pergantian perangkat, pelatihan).",
    count: 0,
  };
};

export const checkExpiredButActive: Check = (i) => {
  const phase = resolveSubscriptionPhase(
    { subscriptionStatus: i.village.subscriptionStatus, subscriptionExpiry: i.village.subscriptionExpiry },
    i.now.getTime(),
  );
  if (phase !== "inactive" || i.auditEvents7d === 0) return null;
  return {
    id: "expired-with-activity",
    severity: "warning",
    title: "Langganan tidak aktif tetapi masih ada aktivitas",
    detail: `Langganan berstatus tidak aktif/kedaluwarsa, namun ada ${i.auditEvents7d} aktivitas tercatat dalam 7 hari terakhir. Desa kemungkinan masih ingin memakai layanan.`,
    hint: "Hubungi desa untuk perpanjangan, atau perpanjang manual (dengan alasan) bila sudah ada kesepakatan.",
    count: i.auditEvents7d,
  };
};

export const checkSubscriptionEnding: Check = (i) => {
  const sub = { subscriptionStatus: i.village.subscriptionStatus, subscriptionExpiry: i.village.subscriptionExpiry };
  const phase = resolveSubscriptionPhase(sub, i.now.getTime());
  const days = getSubscriptionDaysRemaining(sub, i.now.getTime());
  if (days == null) return null;
  if (phase === "trial" && days <= 3) {
    return {
      id: "trial-ending",
      severity: "warning",
      title: "Masa uji coba hampir habis",
      detail: `Trial berakhir dalam ${days} hari. Setelah itu desa masuk masa tenggang 7 hari (hanya baca).`,
      hint: "Hubungi desa agar membeli paket sebelum trial habis, atau perpanjang trial secara manual bila ada alasan.",
      count: days,
    };
  }
  if (phase === "active" && days <= 7) {
    return {
      id: "subscription-ending",
      severity: "info",
      title: "Langganan segera berakhir",
      detail: `Langganan berbayar berakhir dalam ${days} hari.`,
      hint: "Ingatkan desa untuk memperpanjang melalui menu Tagihan.",
      count: days,
    };
  }
  if (phase === "grace") {
    return {
      id: "in-grace",
      severity: "warning",
      title: "Desa dalam masa tenggang (hanya baca)",
      detail: `Trial sudah habis; desa hanya bisa membaca data${days != null ? ` selama ${days} hari lagi` : ""}.`,
      hint: "Desa perlu membeli paket agar bisa menambah/mengubah data lagi.",
      count: days,
    };
  }
  return null;
};

export const checkResidentsWithoutKk: Check = (i) => {
  const n = i.residents.withoutKk;
  if (n <= 0) return null;
  const share = i.residents.total > 0 ? (n / i.residents.total) * 100 : 0;
  return {
    id: "residents-without-kk",
    severity: share >= 20 ? "warning" : "info",
    title: "Warga tanpa nomor KK",
    detail: `${n} dari ${i.residents.total} warga (${fmtPct(share)}) belum punya nomor KK, sehingga tidak masuk hitungan keluarga/Data KK.`,
    hint: "Minta admin desa memakai Daftar kerja di Kependudukan atau wizard keluarga untuk melengkapi KK.",
    count: n,
  };
};

export const checkHouseholdsWithoutHead: Check = (i) => {
  const n = i.households.activeWithoutHead;
  if (n <= 0) return null;
  return {
    id: "households-without-head",
    severity: "warning",
    title: "KK aktif tanpa kepala keluarga",
    detail: `${n} dari ${i.households.total} KK belum menunjuk kepala keluarga.`,
    hint: "Admin desa dapat menetapkan kepala keluarga dari halaman detail KK; data tanpa kepala memengaruhi statistik dan surat.",
    count: n,
  };
};

export const checkDuplicateNik: Check = (i) => {
  const n = i.residents.duplicateNikGroups;
  if (n <= 0) return null;
  return {
    id: "duplicate-nik",
    severity: "critical",
    title: "NIK ganda dalam satu desa",
    detail: `${n} NIK muncul lebih dari sekali di desa ini. Ini seharusnya tidak mungkin terjadi (ada batas unik), kemungkinan ada kerusakan data.`,
    hint: "Jangan hapus massal. Eskalasi ke pengembang untuk pemeriksaan basis data sebelum ada perubahan.",
    count: n,
  };
};

export const checkOfficialsWithoutAccount: Check = (i) => {
  const n = i.officials.activeWithoutAccount;
  if (n <= 0) return null;
  return {
    id: "officials-without-account",
    severity: "info",
    title: "Perangkat desa tanpa akun",
    detail: `${n} dari ${i.officials.active} perangkat aktif belum punya akun pengguna. Wajar bila tidak semua perlu akses.`,
    hint: "Admin desa dapat membuat akun dari menu Data Perangkat bagi yang memerlukan akses.",
    count: n,
  };
};

export const checkStorage: Check = (i) => {
  const p = pct(i.village.storageUsedGb, i.village.storageLimitGb);
  if (p < 90) return null;
  const full = p >= 100;
  return {
    id: "storage-high",
    severity: full ? "critical" : "warning",
    title: full ? "Penyimpanan penuh" : "Penyimpanan hampir penuh",
    detail: `Terpakai ${Math.round(i.village.storageUsedGb * 100) / 100} dari ${i.village.storageLimitGb} GB (${fmtPct(p)}).${full ? " Unggahan baru ditolak." : ""}`,
    hint: "Sarankan desa membeli add-on Arsip Digital atau merapikan berkas lama.",
    count: Math.round(p),
  };
};

export const checkPendingInvoices: Check = (i) => {
  const n = i.invoices.pendingOverdue;
  if (n <= 0) return null;
  return {
    id: "invoices-pending-overdue",
    severity: "warning",
    title: "Tagihan menunggu melewati batas bayar",
    detail: `${n} tagihan berstatus pending tetapi sudah lewat batas waktu bayar. Bisa berarti pembayaran tertahan atau callback tidak masuk.`,
    hint: "Periksa tagihan di tab Langganan & Tagihan; bila desa mengaku sudah membayar, cek dasbor penyedia pembayaran sebelum perpanjang manual.",
    count: n,
  };
};

export const checkModules: Check = (i) => {
  const n = i.modules.expiredStillActive;
  if (n <= 0) return null;
  return {
    id: "modules-expired",
    severity: "info",
    title: "Add-on kedaluwarsa",
    detail: `${n} add-on/modul berlangganan sudah lewat masa berlaku (berstatus aktif di catatan). Fiturnya tidak lagi terbuka bagi desa.`,
    hint: "Ingatkan desa memperpanjang add-on di menu Tagihan.",
    count: n,
  };
};

export const checkModulesExpiringSoon: Check = (i) => {
  const n = i.modules.expiringIn7d;
  if (n <= 0) return null;
  return {
    id: "modules-expiring",
    severity: "info",
    title: "Add-on segera berakhir",
    detail: `${n} add-on/modul berakhir dalam 7 hari.`,
    hint: "Ingatkan desa memperpanjang agar fitur tidak terputus.",
    count: n,
  };
};

export const checkNoData: Check = (i) => {
  if (i.residents.total > 0 || ageDays(i) < 14) return null;
  return {
    id: "no-residents",
    severity: "info",
    title: "Belum ada data warga",
    detail: `Desa terdaftar ${ageDays(i)} hari lalu tetapi belum ada satu pun data warga.`,
    hint: "Tawarkan pendampingan impor Excel (wizard impor warga) agar desa mulai memakai aplikasi.",
    count: 0,
  };
};

export const HEALTH_CHECKS: readonly Check[] = [
  checkVillageInactive,
  checkNoActiveAdmin,
  checkDuplicateNik,
  checkStorage,
  checkExpiredButActive,
  checkSubscriptionEnding,
  checkNoRecentLogin,
  checkPendingInvoices,
  checkHouseholdsWithoutHead,
  checkResidentsWithoutKk,
  checkOfficialsWithoutAccount,
  checkModules,
  checkModulesExpiringSoon,
  checkNoData,
];

const ORDER: Record<HealthSeverity, number> = { critical: 0, warning: 1, info: 2 };

export type HealthReport = {
  findings: HealthFinding[];
  /** Jumlah pemeriksaan yang dijalankan dan yang lolos (tanpa temuan). */
  checked: number;
  passed: number;
};

export function runHealthChecks(input: HealthInput): HealthReport {
  const findings = HEALTH_CHECKS.map((c) => c(input)).filter((f): f is HealthFinding => f != null);
  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  return { findings, checked: HEALTH_CHECKS.length, passed: HEALTH_CHECKS.length - findings.length };
}
