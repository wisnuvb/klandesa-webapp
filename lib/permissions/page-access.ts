import type { Session } from "next-auth";
import { resolveAreaRedirect, signInUrl } from "@/lib/auth/area-redirect";
import { getModuleByPathSegment } from "@/lib/modules/registry";
import { roleCan, type PermissionActor } from "@/lib/permissions/client";

export type PageAccessDecision = { ok: true } | { ok: false; redirectTo: string };

/**
 * Keputusan akses untuk halaman SERVER yang membaca data langsung dari DB (tanpa lewat API).
 * Setelah layout (app) menjadi statis, layout tidak lagi menjadi penjaga izin modul, jadi halaman semacam itu
 * wajib memeriksa sendiri. Fungsi murni agar bisa dites tanpa konteks request Next.
 *
 * @param actor role + penyesuaian izin akun DARI DB (bukan JWT); null bila akun tidak ditemukan di DB.
 */
export function decideVillagePageAccess(input: {
  session: Session | null;
  actor: (PermissionActor & { isActive?: boolean }) | null;
  segment: string;
}): PageAccessDecision {
  const { session, actor, segment } = input;
  const pathname = `/${segment}`;
  if (!session?.user?.id) return { ok: false, redirectTo: signInUrl(pathname) };

  const area = resolveAreaRedirect(session, pathname);
  if (area) return { ok: false, redirectTo: area };

  // Akun desa wajib ada & aktif di DB: JWT yang tersisa dari akun yang dihapus/dinonaktifkan tidak boleh membaca data.
  if (!actor || actor.isActive === false) return { ok: false, redirectTo: signInUrl(pathname) };

  const mod = getModuleByPathSegment(segment);
  if (mod && !roleCan(mod.permission, "read", actor)) {
    return { ok: false, redirectTo: "/dashboard?akses=ditolak" };
  }
  return { ok: true };
}
