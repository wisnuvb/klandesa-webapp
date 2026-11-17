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
