/**
 * Helper murni untuk kontak masuk (formulir landing/iklan): label sumber, tautan WhatsApp, email sintetis.
 * Dipakai server (email pemilik) dan klien (halaman Kontak Masuk di konsol admin), jadi tanpa dependensi server.
 */
export const CONTACT_SOURCE_LABELS: Record<string, string> = {
  "iklan-meta": "Iklan Meta",
  demo: "Halaman Demo",
  landing: "Landing (modal kontak)",
};

export function contactSourceLabel(source: string): string {
  return CONTACT_SOURCE_LABELS[source] ?? source;
}

/**
 * Peran pengirim formulir kontak. Klandesa dijual ke pemerintah desa, jadi formulir bertanya peran lebih dulu:
 * `perangkat_desa` = calon pelanggan (wajib menulis jabatan), `warga` = diarahkan ke formulir aspirasi (bukan lead),
 * `lainnya` = pemda, mitra, media, dan sebagainya. Baris lama (sebelum kolom ada) bernilai NULL.
 */
export const CONTACT_ROLES = ["perangkat_desa", "warga", "lainnya"] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  perangkat_desa: "Perangkat desa",
  warga: "Warga",
  lainnya: "Lainnya",
};

export function contactRoleLabel(role: string | null | undefined): string {
  if (!role) return "Tidak diisi";
  return CONTACT_ROLE_LABELS[role as ContactRole] ?? role;
}

/** Saran jabatan untuk kolom isian (datalist); pengguna tetap boleh menulis sendiri. */
export const VILLAGE_POSITION_SUGGESTIONS = [
  "Kepala Desa",
  "Sekretaris Desa",
  "Kaur Keuangan",
  "Kaur Umum dan Perencanaan",
  "Kaur Tata Usaha dan Umum",
  "Kasi Pemerintahan",
  "Kasi Kesejahteraan",
  "Kasi Pelayanan",
  "Kepala Dusun",
  "Operator Desa / SID",
  "Ketua BPD",
  "Anggota BPD",
  "Pendamping Desa",
  "Ketua RT / RW",
  "Pengurus BUMDes",
] as const;

export type ContactRoleInput =
  | { ok: true; role: ContactRole | null; position: string | null }
  | { ok: false; error: string; redirectTo?: string };

/** Alamat formulir aspirasi warga: tujuan bagi pengirim berperan warga. */
export const ASPIRASI_FORM_PATH = "/aspirasi/kirim";

/**
 * Validasi peran + jabatan dari badan permintaan. `role` kosong tetap diterima (klien lama yang belum memuat ulang);
 * `warga` ditolak dengan petunjuk ke formulir aspirasi; `perangkat_desa` wajib berjabatan (2-120 karakter).
 */
export function parseContactRole(roleRaw: unknown, positionRaw: unknown): ContactRoleInput {
  const role = String(roleRaw ?? "").trim().toLowerCase();
  if (!role) return { ok: true, role: null, position: null };
  if (!(CONTACT_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "Peran tidak dikenal. Pilih perangkat desa, warga, atau lainnya." };
  }
  if (role === "warga") {
    return {
      ok: false,
      error:
        "Klandesa adalah aplikasi untuk pemerintah desa. Untuk menyampaikan aspirasi atau melaporkan kondisi desa, gunakan formulir aspirasi warga.",
      redirectTo: ASPIRASI_FORM_PATH,
    };
  }
  const position = String(positionRaw ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (role === "perangkat_desa") {
    if (position.length < 2) return { ok: false, error: "Jabatan di desa wajib diisi, contoh: Kepala Desa atau Operator Desa." };
    return { ok: true, role, position };
  }
  return { ok: true, role: "lainnya", position: position || null };
}

/** Nomor Indonesia ke format internasional tanpa "+": 0812… -> 62812…; 62812… tetap; selain itu null. */
export function normalizeWaNumber(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return null;
}

export function contactWaLink(phone: string | null | undefined, text?: string): string | null {
  const n = normalizeWaNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Email yang dibuat sistem dari nomor telepon (`kontak+<digit>@inbound.klandesa.id`), bukan alamat milik pengirim. */
export function isSyntheticContactEmail(email: string | null | undefined): boolean {
  return /^kontak\+\d+@inbound\.klandesa\.id$/i.test(String(email ?? "").trim());
}

/** Bersihkan teks bebas dari pengunjung untuk dipakai di subjek email (tanpa baris baru, dipotong). */
export function oneLine(s: string, max = 60): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Nama desa dari pesan formulir iklan/demo ("Desa: <teks>"), bila ada. */
export function extractVillageFromMessage(message: string): string | null {
  const m = /^Desa:\s*(.+)$/m.exec(message);
  return m ? m[1]!.trim().slice(0, 200) : null;
}

/** "5 menit lalu", "3 jam lalu", "2 hari lalu" (untuk memantau kecepatan membalas lead). */
export function ageLabel(from: Date, now: Date = new Date()): string {
  const min = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  if (min < 1) return "baru saja";
  if (min < 60) return `${min} menit lalu`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}
