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

/**
 * Folder unggahan seluler yang GRATIS (tidak memakai kuota Arsip Digital): hanya gambar di Warga (media sosial).
 * Folder seluler lain (foto profil warga, laporan, bukti iuran, produk UKM) dihitung ke kuota Arsip Digital desa.
 */
export const FREE_MOBILE_FOLDERS: readonly string[] = ["mobile-social"];

/** Folder dari kunci objek `villages/<kode>/<folder>/...`; null bila bukan folder seluler desa itu. */
export function mobileFolderOfKey(key: string, villageCode: string): string | null {
  const head = `villages/${villageCode}/`;
  if (!key.startsWith(head)) return null;
  const folder = key.slice(head.length).split("/")[0];
  return folder.startsWith("mobile-") ? folder : null;
}

/** True bila berkas di folder ini memakai kuota Arsip Digital. */
export function isChargedFolder(folder: string): boolean {
  return folder.startsWith("mobile-") && !FREE_MOBILE_FOLDERS.includes(folder);
}

/**
 * Pemakaian `chargedBytes` tertinggi yang masih membuat `incomingBytes` muat di kuota Arsip Digital bersama
 * (berkas arsip + foto seluler berbayar). Negatif bila sudah tidak muat sama sekali.
 */
export function chargedCeiling(incomingBytes: number, archiveLimitBytes: number, archiveBytes: number): number {
  return archiveLimitBytes - archiveBytes - incomingBytes;
}

export function archiveQuotaFullMessage(): string {
  return "Penyimpanan desa (Arsip Digital) sudah penuh, jadi foto belum bisa diunggah. Hubungi perangkat desa Anda; admin desa dapat menambah kapasitas penyimpanan.";
}
