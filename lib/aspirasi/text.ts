/**
 * Pembersihan teks kiriman publik. Tujuan: laporan yang tayang tidak memuat data pribadi tanpa sengaja dan tidak
 * dipakai menitipkan tautan/iklan. Moderator tetap meninjau; ini jaring pertama.
 */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const NIK = /(?<!\d)\d{4}[ .-]?\d{4}[ .-]?\d{4}[ .-]?\d{4}(?!\d)/;
const PHONE = /(?<!\d)(?:\+?62|0)[\s.-]?8\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{2,5}(?!\d)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;

export type CleanResult = { ok: true; text: string; masked: string[] } | { ok: false; error: string };

/** Rapikan spasi/baris baru, buang karakter kontrol; pertahankan paragraf (maks satu baris kosong berurutan). */
export function tidyText(raw: unknown): string {
  return String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** NIK/nomor KK (16 angka) ditolak; nomor telepon, email, dan tautan disamarkan. */
export function maskPersonalData(text: string): CleanResult {
  if (NIK.test(text)) {
    return { ok: false, error: "Jangan menulis NIK atau nomor Kartu Keluarga di laporan. Hapus angka tersebut lalu kirim lagi." };
  }
  const masked = new Set<string>();
  let out = text.replace(PHONE, () => {
    masked.add("nomor telepon");
    return "[nomor disembunyikan]";
  });
  out = out.replace(EMAIL, () => {
    masked.add("email");
    return "[email disembunyikan]";
  });
  out = out.replace(URL_RE, () => {
    masked.add("tautan");
    return "[tautan dihapus]";
  });
  return { ok: true, text: out, masked: [...masked] };
}

/** Bersihkan teks bebas publik: rapikan, cek panjang, samarkan data pribadi. */
export function cleanPublicText(raw: unknown, label: string, min: number, max: number): CleanResult {
  const tidy = tidyText(raw);
  if (tidy.length < min) return { ok: false, error: `${label} terlalu pendek (minimal ${min} karakter).` };
  if (tidy.length > max) return { ok: false, error: `${label} terlalu panjang (maksimal ${max} karakter).` };
  const r = maskPersonalData(tidy);
  if (!r.ok) return r;
  return r;
}
