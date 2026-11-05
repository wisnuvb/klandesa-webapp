import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { isSessionRevoked } from "@/lib/session-version";
import { isVillageRole } from "@/lib/permissions/roles";

/**
 * Salinan sesi dengan role & penyesuaian izin SEGAR dari DB. Untuk rute yang tidak lewat requireVillageApiContext
 * tetapi memakai canVillageUser/requireVillagePermissionResponse: JWT bisa usang hingga 30 hari, sehingga perubahan
 * Admin (turun peran, cabut izin) tidak boleh dibaca dari JWT. Mengembalikan null bila akun tak ada/tidak aktif.
 */
export async function sessionWithFreshPermissions(session: Session | null): Promise<Session | null> {
  const id = Number.parseInt(String(session?.user?.id ?? ""), 10);
  if (!session?.user || !Number.isFinite(id)) return null;
  const row = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true, permissionOverrides: true, sessionVersion: true } });
  if (!row || !row.isActive || !isVillageRole(row.role) || isSessionRevoked(session.user.sessionVersion, row.sessionVersion)) return null;
  return { ...session, user: { ...session.user, role: row.role, permissionOverrides: row.permissionOverrides } };
}
