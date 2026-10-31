/**
 * Pengaman data Laras: semua yang keluar ke model AI (pihak ketiga) dan semua jawaban yang kembali ke pengguna
 * lewat sini. Murni (tanpa DB) supaya mudah diuji.
 */

/** Hitungan 1–4 disamarkan agar kelompok kecil (mis. "stunting di RT 02 = 1") tidak mengidentifikasi orang. */
export const SMALL_CELL_THRESHOLD = 5;

const ZERO_WIDTH_RE = /[\u200b-\u200d\u2060\ufeff\u00ad]/g;

/** Angka lebar-penuh → ASCII, dan karakter tak terlihat dibuang, supaya tidak dipakai menyelundupkan digit. */
function normalizeForDetection(s: string): string {
  return s.normalize("NFKC").replace(ZERO_WIDTH_RE, "");
}

// NIK/KK: 16 digit, tiap digit boleh diikuti satu pemisah (spasi, titik, strip).
const NIK_LOOSE_RE = /(?<!\d)(?:\d[\s.\-]?){15}\d(?!\d)/g;
const FOUR_GROUPS_RE = /^\d{4}[\s.\-]\d{4}[\s.\-]\d{4}[\s.\-]\d{4}$/;
// Telepon seluler Indonesia (08xx / +62 8xx), dengan spasi, titik, strip, atau kurung. Tidak menyentuh angka setelah "Rp".
const PHONE_LOOSE_RE = /(?<!\d)(?<!Rp\s{0,2})\(?(?:\+62|62|0)\)?[\s.\-]?\(?8[1-9]\d?\)?(?:[\s.\-]?\d){6,9}(?!\d)/gi;
const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+/g;

/** Empat angka tahun berurutan ("2026 2025 2024 2023") bukan NIK/kartu. */
function isYearList(m: string): boolean {
  const groups = m.split(/[\s.\-]/).map(Number);
  return groups.length === 4 && groups.every((g) => g >= 1900 && g <= 2100);
}

/** Struktur NIK/KK: kode provinsi 11–94, lalu DDMMYY (hari 1–31, atau 41–71 untuk perempuan; bulan 1–12). */
export function looksLikeNik(digits: string): boolean {
  if (!/^\d{16}$/.test(digits)) return false;
  const prov = Number(digits.slice(0, 2));
  const day = Number(digits.slice(6, 8));
  const month = Number(digits.slice(8, 10));
  return prov >= 11 && prov <= 94 && ((day >= 1 && day <= 31) || (day >= 41 && day <= 71)) && month >= 1 && month <= 12;
}

export type RedactionResult = { text: string; redacted: number };

/**
 * Ganti NIK/KK, nomor telepon seluler, dan email dengan penanda. Dipakai pada pesan pengguna dan jawaban model.
 * Penyamaran bersifat upaya terbaik (bukan jaminan): 16 digit polos selalu disamarkan, sedangkan yang berpemisah hanya
 * bila berpola 4-4-4-4 atau berstruktur NIK, agar angka biasa (daftar tahun, nominal) tidak ikut rusak.
 */
export function redactSensitive(input: string): RedactionResult {
  let redacted = 0;
  const hit = (label: string) => {
    redacted++;
    return label;
  };
  const text = normalizeForDetection(input)
    .replace(NIK_LOOSE_RE, (m) => {
      const digits = m.replace(/\D/g, "");
      const contiguous = digits.length === m.length;
      return contiguous || (FOUR_GROUPS_RE.test(m) && !isYearList(m)) || looksLikeNik(digits) ? hit("[NIK disamarkan]") : m;
    })
    .replace(PHONE_LOOSE_RE, () => hit("[telepon disamarkan]"))
    .replace(EMAIL_RE, () => hit("[email disamarkan]"));
  return { text, redacted };
}

export type OutboundScrub = { text: string; linksRemoved: number; imagesRemoved: number; longNumbers: number };

const IMAGE_MD_RE = /!\[[^\]]*\]\([^)]*\)|!\[[^\]]*\]\[[^\]]*\]|<img\b[^>]*>/gi;
const LINK_MD_RE = /\[([^\]]+)\]\(\s*[^)]*\)/g;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s)<>\]]+/gi;
const BARE_DOMAIN_RE =
  /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|id|xyz|info|site|online|link|top|app|me|io|co|biz|shop|club)\b(?:\/[^\s)<>\]]*)?/gi;
const LONG_NUMBER_RE = /(?<![\d.])\d{8,}(?!\d)/g;

/**
 * Teks yang ditulis model untuk dikirim/diterbitkan kepada warga: tautan dan gambar dibuang (jalur phishing dan
 * eksfiltrasi), deretan angka panjang (mungkin nomor rekening) hanya ditandai. Baris baru dipertahankan.
 */
export function scrubOutboundText(input: string): OutboundScrub {
  let imagesRemoved = 0;
  let linksRemoved = 0;
  let text = input.replace(IMAGE_MD_RE, () => {
    imagesRemoved++;
    return "";
  });
  text = text.replace(LINK_MD_RE, (_m, label: string) => {
    linksRemoved++;
    return label;
  });
  text = text
    .replace(URL_RE, () => {
      linksRemoved++;
      return "[tautan dihapus]";
    })
    .replace(BARE_DOMAIN_RE, () => {
      linksRemoved++;
      return "[tautan dihapus]";
    });
  const longNumbers = (text.match(LONG_NUMBER_RE) ?? []).length;
  return { text, linksRemoved, imagesRemoved, longNumbers };
}

/** Peringatan untuk kartu konfirmasi dari hasil penyamaran dan penyaringan teks keluar. */
export function outboundWarnings(o: { redacted?: number; scrub: Pick<OutboundScrub, "linksRemoved" | "imagesRemoved" | "longNumbers"> }): string[] {
  const out: string[] = [];
  if ((o.redacted ?? 0) > 0) out.push("NIK, telepon, atau email pada teks disamarkan. Periksa sebelum dikirim.");
  if (o.scrub.linksRemoved > 0) out.push("Tautan dihapus dari teks (risiko phishing). Tambahkan manual bila memang diperlukan.");
  if (o.scrub.imagesRemoved > 0) out.push("Gambar dihapus dari teks.");
  if (o.scrub.longNumbers > 0) out.push("Memuat deretan angka panjang (mungkin nomor rekening). Pastikan memang benar.");
  return out;
}

/** Penyamaran PII lalu penyaringan teks keluar, dalam satu langkah. */
export function cleanOutbound(input: string): { text: string; redacted: number; warnings: string[] } {
  const r = redactSensitive(input);
  const s = scrubOutboundText(r.text);
  return { text: s.text, redacted: r.redacted, warnings: outboundWarnings({ redacted: r.redacted, scrub: s }) };
}

/**
 * Teks dari data pengguna (nama akun, nama BUMDes) yang disisipkan ke system prompt: satu baris, tanpa karakter
 * kendali dan tanpa pembatas markdown/kode, dan dipotong. Mengurangi peluang menyisipkan instruksi.
 */
export function sanitizeForPrompt(value: string | null | undefined, max = 80): string {
  if (!value) return "";
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/[`<>{}\[\]|#*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Bersihkan jawaban model sebelum disimpan/dikirim: gambar markdown dibuang (jalur umum untuk membocorkan data lewat
 * URL), tautan hanya http(s), dan NIK/telepon yang lolos disamarkan.
 */
export function sanitizeAssistantMarkdown(input: string): RedactionResult {
  let text = input
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/\[([^\]]+)\]\(\s*(?!https?:\/\/)[^)]*\)/gi, "$1");
  const r = redactSensitive(text);
  text = r.text;
  return { text, redacted: r.redacted };
}

/** Angka untuk model: kelompok kecil menjadi "<5" (bukan angka sebenarnya). */
export function suppressSmallCount(n: number, k = SMALL_CELL_THRESHOLD): number | string {
  return n > 0 && n < k ? `<${k}` : n;
}
