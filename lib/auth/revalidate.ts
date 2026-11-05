import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { isRegionalRole } from "@/lib/regional-policy";
import { buildRegionalScopeFromUser } from "@/lib/regional-scope-user";
import { resolveLinkedPartnerIdForVillageEmail } from "@/lib/partner/resolve-linked-partner";
import { isSessionRevoked } from "@/lib/session-version";
import { getPartnerSession, type ParsedPartnerSession } from "@/lib/partner-session";
import type { ParsedPlatformSession } from "@/lib/platform-session";
import type { ParsedRegionalSession } from "@/lib/regional-session";

/**
 * Sesi platform/regional/mitra adalah JWT 30 hari yang dulu dipercaya apa adanya: admin platform yang dinonaktifkan, regional
 * yang lingkupnya dipersempit, atau mitra yang ditangguhkan tetap punya akses sampai JWT habis. Fungsi di sini membaca
 * baris akun dari DB pada SETIAP request lane itu (1 query berindeks PK; lane ini bukan jalur panas) dan mengembalikan nilai
 * TERBARU (role, lingkup) atau null bila akun sudah tidak berhak. Sengaja tanpa cache lintas request (8 worker PM2).
 */

export async function freshPlatformSession(admin: ParsedPlatformSession): Promise<ParsedPlatformSession | null> {
  const row = await prisma.platformUser.findUnique({
    where: { id: admin.platformUserId },
    select: { isActive: true, role: true, email: true, name: true },
  });
  if (!row || !row.isActive) return null;
  return { ...admin, role: row.role, email: row.email, name: row.name };
}

export async function freshRegionalSession(regional: ParsedRegionalSession): Promise<ParsedRegionalSession | null> {
  const row = await prisma.regionalUser.findUnique({
    where: { id: regional.regionalUserId },
    select: {
      isActive: true, role: true, email: true, name: true,
      scopeProvince: true, scopeRegency: true, scopeDistrict: true, scopeKodeProvinsi: true, scopeKodeKabKota: true,
    },
  });
  if (!row || !row.isActive || !isRegionalRole(row.role)) return null;
  // Lingkup dari DB (bukan salinan di JWT): penyempitan wilayah oleh admin berlaku pada permintaan berikutnya.
  const scope = buildRegionalScopeFromUser(row);
  if (!scope) return null;
  return { ...regional, role: row.role, scope, email: row.email, name: row.name };
}

/**
 * Sesi mitra terverifikasi. Dua bentuk akun yang boleh masuk portal /mitra:
 * - akun Partner murni: baris `partners` harus berstatus "active";
 * - akun desa dengan mitra tertaut (`partnerId` di JWT, dihitung saat login lewat kecocokan email): akun desanya harus masih
 *   aktif/tidak dicabut, dan tautan email ke mitra aktif itu masih berlaku.
 */
export async function getVerifiedPartnerSession(session: Session | null): Promise<ParsedPartnerSession | null> {
  const partner = getPartnerSession(session);
  if (!partner || !session?.user) return null;
  const u = session.user as Session["user"] & { accountType?: string; sessionVersion?: number };

  if (u.accountType === "village") {
    const uid = Number.parseInt(String(u.id), 10);
    if (!Number.isFinite(uid)) return null;
    const row = await prisma.user.findUnique({ where: { id: uid }, select: { isActive: true, sessionVersion: true, email: true } });
    if (!row || !row.isActive || isSessionRevoked(u.sessionVersion, row.sessionVersion)) return null;
    const linked = await resolveLinkedPartnerIdForVillageEmail(row.email);
    if (linked !== partner.partnerId) return null;
    return { ...partner, email: row.email };
  }

  const row = await prisma.partner.findUnique({ where: { id: partner.partnerId }, select: { status: true, email: true, name: true } });
  if (!row || row.status !== "active") return null;
  return { ...partner, email: row.email, name: row.name };
}
