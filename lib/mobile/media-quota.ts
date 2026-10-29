/**
 * Kuota foto aplikasi seluler per desa (laporan warga, Warga, bukti iuran). Murni, tanpa DB/Spaces.
 * Foto dikompres di HP (~300 KB), jadi 5 GB setara belasan ribu foto: batas pengaman biaya, bukan pembatas pemakaian wajar.
 * Terpisah dari kuota arsip digital (5 GB di Paket Lengkap).
 */
export const MOBILE_MEDIA_QUOTA_BYTES = 5 * 1024 * 1024 * 1024;

/** Semua folder unggahan seluler (mobile-social, mobile-fees, mobile-reports) berada di bawah prefix ini. */
export function mobileMediaPrefix(villageCode: string): string {
  return `villages/${villageCode}/mobile-`;
}

/**
 * Pemakaian tertinggi yang masih membuat `incomingBytes` muat dalam batas (dipakai sebagai syarat `UPDATE ... WHERE used <= ceiling`
 * agar pemesanan atomik). Negatif bila satu unggahan saja sudah melewati batas.
 */
export function reserveCeiling(incomingBytes: number, limitBytes: number = MOBILE_MEDIA_QUOTA_BYTES): number {
  return limitBytes - incomingBytes;
}

export function mediaQuotaFullMessage(): string {
  return "Penyimpanan foto desa sedang penuh, jadi foto belum bisa diunggah. Hubungi perangkat desa Anda; admin desa dapat menghubungi Klandesa untuk menambah kapasitas.";
}
