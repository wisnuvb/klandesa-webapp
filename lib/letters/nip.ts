/**
 * NIP (Nomor Induk Pegawai) PNS/PPPK — murni, aman di klien dan server.
 *
 * Susunan 18 angka: TTTTBBHH (tanggal lahir) · TTTTBB (tahun-bulan pengangkatan) · J (1 laki-laki, 2 perempuan) · NNN (urut).
 * Yang diperiksa hanya hal pasti: 18 angka, tanggal lahir sah, tahun pengangkatan wajar, dan digit jenis kelamin.
 * Bulan pengangkatan sengaja TIDAK diperiksa karena NIP PPPK memakai kode khusus di sana.
 */

export const NIP_LENGTH = 18;

/** Pemisah yang lazim diketik orang: spasi, titik, tanda hubung (mis. "19700101 200003 1 001"). */
const SEPARATORS = /[\s.\-]/g;

/** Buang pemisah. Isi lain (huruf, dll.) dibiarkan agar `validateNip` dapat menolaknya. */
export function normalizeNip(raw: string): string {
  return raw.replace(SEPARATORS, "");
}

/** Tampilan cetak baku "19700101 200003 1 001" untuk NIP 18 angka; selain itu apa adanya. */
export function formatNip(raw: string): string {
  const n = normalizeNip(raw);
  return /^\d{18}$/.test(n) ? `${n.slice(0, 8)} ${n.slice(8, 14)} ${n.slice(14, 15)} ${n.slice(15)}` : raw.trim();
}

const isRealDate = (y: number, m: number, d: number) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/** Pesan galat untuk NIP, atau `null` bila sah. Kosong dianggap sah (NIP opsional). */
export function validateNip(raw: string, now: Date = new Date()): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = normalizeNip(trimmed);
  if (!/^\d+$/.test(n)) return "NIP hanya boleh berisi angka (spasi, titik, atau tanda hubung sebagai pemisah boleh).";
  if (n.length !== NIP_LENGTH) return `NIP harus ${NIP_LENGTH} angka; yang Anda isi ${n.length} angka.`;

  const year = now.getUTCFullYear();
  const by = Number(n.slice(0, 4));
  const bm = Number(n.slice(4, 6));
  const bd = Number(n.slice(6, 8));
  if (by < 1930 || by > year - 17 || !isRealDate(by, bm, bd)) {
    return "NIP tidak sah: 8 angka pertama harus tanggal lahir (TTTTBBHH), mis. 19700101.";
  }
  const ty = Number(n.slice(8, 12));
  if (ty < by + 15 || ty > year + 1) {
    return "NIP tidak sah: angka ke-9 sampai 12 harus tahun pengangkatan yang wajar, mis. 2000.";
  }
  if (n[14] !== "1" && n[14] !== "2") {
    return "NIP tidak sah: angka ke-15 harus 1 (laki-laki) atau 2 (perempuan).";
  }
  return null;
}
