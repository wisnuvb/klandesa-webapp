import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type EmailConflict =
  | { kind: "partner"; partnerId: number; status: string }
  | { kind: "platform_user" }
  | { kind: "regional_user" };

/**
 * Apakah email pelamar mitra sudah dimiliki akun lain yang TIDAK boleh disentuh pendaftaran publik?
 * Formulir publik menerima email + sandi tanpa bukti kepemilikan email, jadi persetujuan tidak boleh menimpa sandi/profil
 * akun mitra yang sudah ada (pengambilalihan akun), maupun membuat akun mitra berbagi email dengan admin platform / akun pemda.
 * Sengaja TIDAK memeriksa akun pengguna desa: satu email boleh dipakai portal desa + portal mitra (akses ganda, lihat
 * `resolveLinkedPartnerIdForVillageEmail`).
 */
export async function findPartnerEmailConflict(db: Db, rawEmail: string): Promise<EmailConflict | null> {
  const trimmed = rawEmail.trim();
  const email = trimmed.toLowerCase();
  if (!email) return null;
  const partner = await db.partner.findFirst({ where: { email: { in: [...new Set([trimmed, email])] } }, select: { id: true, status: true } });
  if (partner) return { kind: "partner", partnerId: partner.id, status: partner.status };
  const platform = await db.platformUser.findUnique({ where: { email }, select: { id: true } });
  if (platform) return { kind: "platform_user" };
  const regional = await db.regionalUser.findUnique({ where: { email }, select: { id: true } });
  if (regional) return { kind: "regional_user" };
  return null;
}
