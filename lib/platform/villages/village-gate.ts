import { NextResponse } from "next/server";

/**
 * Penegakan `Village.isActive` untuk lane WEB (login web + API desa). Lane seluler, kios, kunci API, dan halaman publik sudah
 * menegakkannya sendiri. Dibuat sebagai pembantu murni agar titik pemasangannya cukup satu baris (lihat laporan Paket B).
 */

export const VILLAGE_INACTIVE_CODE = "VILLAGE_INACTIVE";
export const VILLAGE_INACTIVE_MESSAGE = "Layanan desa Anda sedang dinonaktifkan. Hubungi admin Klandesa untuk bantuan.";

export function isVillageEnabled(village: { isActive?: boolean | null } | null | undefined): boolean {
  return village?.isActive === true;
}

/** 403 seragam untuk API (kode stabil agar klien bisa menampilkan layar khusus). */
export function villageInactiveResponse(): NextResponse {
  return NextResponse.json({ error: VILLAGE_INACTIVE_MESSAGE, code: VILLAGE_INACTIVE_CODE }, { status: 403 });
}

/**
 * Pemeriksaan satu baris untuk guard/login.
 * `null` = lolos; selain itu kembalikan responsnya. Contoh: `const g = gateVillage(village); if (g) return g;`
 */
export function gateVillage(village: { isActive?: boolean | null } | null | undefined): NextResponse | null {
  return isVillageEnabled(village) ? null : villageInactiveResponse();
}
