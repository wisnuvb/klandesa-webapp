import { prisma } from "@/lib/prisma";

/**
 * Untuk akses portal mitra berganda: cari Partner aktif yang email-nya sama dengan User desa,
 * atau pemilik aktif ReferralCode (email sudah dinormalisasi lowercase saat provisioning).
 */
export async function resolveLinkedPartnerIdForVillageEmail(
  email: string,
): Promise<number | null> {
  const norm = email.trim().toLowerCase();
  if (!norm) return null;

  const activePartner = await prisma.partner.findFirst({
    where: {
      status: "active",
      OR: [
        { email: norm },
        {
          referralCode: {
            is: {
              status: "active",
              ownerEmail: norm,
            },
          },
        },
      ],
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return activePartner?.id ?? null;
}
