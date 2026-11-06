/** Label Indonesia untuk aksi jejak audit platform + penyamaran metadata. Murni (aman diimpor klien dan server). */

export const ACTION_LABELS: Record<string, string> = {
  "account.reset_link": "Kirim tautan atur sandi akun",
  "account.deactivate": "Nonaktifkan akun",
  "account.activate": "Aktifkan akun",
  "account.force_logout": "Paksa keluar akun",
  "account.change_email": "Ubah email akun",
  "account.change_role": "Ubah peran akun",
  "account.ai_credits": "Ubah kredit AI akun",
  "account.unlock": "Buka kunci akun",
  "account.search": "Cari akun (email lengkap)",
  "revenue.export": "Ekspor tagihan (CSV)",
  "account.view_sensitive": "Lihat data sensitif akun",
  "citizen.reset_code": "Reset kode akun warga",
  "citizen.unlock": "Buka kunci akun warga",
  "resident.view_sensitive": "Lihat data sensitif warga",
  "resident.search": "Cari warga",
  "village.subscription_extend": "Perpanjang langganan desa",
  "village.subscription_set": "Ubah langganan desa",
  "village.deactivate": "Nonaktifkan desa",
  "village.activate": "Aktifkan desa",
  "village.view_sensitive": "Lihat data sensitif desa",
  "admin.create": "Buat admin platform",
  "admin.invite": "Undang admin platform",
  "admin.deactivate": "Nonaktifkan admin platform",
  "admin.activate": "Aktifkan admin platform",
  "admin.force_logout": "Paksa keluar admin platform",
  "admin.reset_link": "Kirim tautan atur sandi admin",
  "admin.2fa_enable": "Aktifkan 2FA",
  "admin.2fa_disable": "Nonaktifkan 2FA",
  "admin.2fa_reset": "Reset 2FA admin",
  "admin.unlock": "Buka kunci login admin",
  "admin.2fa_recovery_regenerate": "Buat ulang kode pemulihan 2FA",
  "admin.password_change": "Ganti/atur kata sandi admin",
  "admin.login": "Masuk (admin platform)",
  "admin.login_failed": "Gagal masuk (admin platform)",
};

const PREFIX_LABELS: Record<string, string> = {
  partner: "Mitra",
  disbursement: "Pencairan komisi",
  payment_channel: "Kanal pembayaran",
  referral: "Referral",
  theme_pack: "Paket tema",
  app_template: "Templat aplikasi",
  blog: "Blog",
  regional_user: "Akun wilayah",
  village: "Desa",
  account: "Akun",
  admin: "Admin platform",
};

/** Label terbaca; aksi yang belum terdaftar memakai awalan ("partner.approve" → "Mitra · approve"). */
export function actionLabel(action: string): string {
  const exact = ACTION_LABELS[action];
  if (exact) return exact;
  const [head, ...rest] = action.split(".");
  const prefix = PREFIX_LABELS[head ?? ""];
  return prefix && rest.length ? `${prefix} · ${rest.join(".").replace(/_/g, " ")}` : action;
}

/** Awalan aksi untuk saringan (cocok dengan indeks action+createdAt). */
export const ACTION_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "admin.", label: "Admin platform (semua)" },
  { value: "admin.login", label: "Login admin" },
  { value: "admin.login_failed", label: "Login gagal" },
  { value: "account.", label: "Akun pengguna (semua)" },
  { value: "village.", label: "Desa (semua)" },
  { value: "citizen.", label: "Akun warga (semua)" },
  { value: "resident.", label: "Data warga" },
  { value: "partner.", label: "Mitra" },
  { value: "disbursement.", label: "Pencairan komisi" },
  { value: "payment_channel.", label: "Kanal pembayaran" },
  { value: "referral.", label: "Referral" },
  { value: "blog.", label: "Blog" },
];

export const TARGET_TYPE_LABELS: Record<string, string> = {
  user: "Pengguna",
  village: "Desa",
  resident: "Warga",
  invoice: "Tagihan",
  platform_user: "Admin platform",
  partner: "Mitra",
  system: "Sistem",
};

const SENSITIVE_KEY = /pass(word)?|sandi|token|secret|rahasia|hash|link|tautan|otp|totp|recovery|pemulihan|nik|id_number|authorization|cookie/i;

/** Pertahanan berlapis: metadata yang tak sengaja memuat kunci rahasia disamarkan saat ditampilkan (aturan #4 rencana). */
export function redactMetadata(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value ?? null;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => redactMetadata(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[disamarkan]" : redactMetadata(v, depth + 1);
    }
    return out;
  }
  if (typeof value === "string" && value.length > 1000) return `${value.slice(0, 1000)}…`;
  return value;
}
