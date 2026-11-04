import type { JWT } from "next-auth/jwt";

/**
 * Cookie sesi (JWT NextAuth) ikut terkirim di SETIAP request ke domain yang sama, termasuk aset statis. Isinya dulu memuat:
 * - `accessToken`/`refreshToken` dari /api/auth/login: tidak dibaca kode web mana pun (hanya disalin lewat auth.ts), dan
 *   penegakan akses memakai cookie sesi + DB, bukan token ini. Pembuangan terukur: 1.545 -> 627 byte (-59%).
 * - seluruh objek `village` (alamat, telepon, email, logoUrl...). Klien hanya memakai nama/kecamatan (Sidebar, Statistik);
 *   `logoUrl` bahkan berpotensi sangat panjang (data URL) sehingga NextAuth memecah cookie jadi beberapa bagian.
 *
 * Dijalankan di callback `jwt` pada SETIAP pembacaan sesi, jadi cookie sesi lama ikut mengecil tanpa login ulang.
 * Data desa lengkap tetap tersedia dari DB lewat API.
 */
export const SLIM_VILLAGE_KEYS = ["id", "code", "name", "district", "regency", "province"] as const;

export function slimJwt(token: JWT): JWT {
  const t = token as JWT & { accessToken?: unknown; refreshToken?: unknown };
  delete t.accessToken;
  delete t.refreshToken;

  const v = token.village as Record<string, unknown> | undefined | null;
  if (v && typeof v === "object") {
    const slim: Record<string, unknown> = {};
    for (const k of SLIM_VILLAGE_KEYS) if (v[k] !== undefined) slim[k] = v[k];
    token.village = slim as unknown as JWT["village"];
  }
  return token;
}
