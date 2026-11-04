import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isSessionRevoked } from "@/lib/session-version";
import { decideVillagePageAccess } from "./page-access";

/**
 * Penjaga untuk halaman SERVER di (app) yang membaca data langsung dari DB (mis. /arsip, /galeri-desa, /ukm).
 * Memanggil `redirect()` bila akun tidak boleh membuka modul `segment`; jika boleh, mengembalikan sesi.
 * Role & penyesuaian izin dibaca dari DB (bukan JWT), sama seperti penjaga API.
 */
export async function requireVillagePageAccess(segment: string) {
  const session = await auth();
  const uid = Number.parseInt(String(session?.user?.id ?? ""), 10);
  const row =
    session?.user?.id && /^\d+$/.test(String(session.user.id)) && Number.isFinite(uid)
      ? await prisma.user.findUnique({ where: { id: uid }, select: { role: true, permissionOverrides: true, isActive: true, sessionVersion: true } }).catch(() => null)
      : null;

  // Kata sandi akun berubah sejak sesi ini dibuat: sesi lama berakhir.
  if (row && isSessionRevoked(session?.user?.sessionVersion, row.sessionVersion)) redirect("/auth/signin?sesi=berakhir");

  const decision = decideVillagePageAccess({
    session,
    actor: row ? { role: row.role, permissionOverrides: row.permissionOverrides, isActive: row.isActive } : null,
    segment,
  });
  if (!decision.ok) redirect(decision.redirectTo);
  return session;
}
