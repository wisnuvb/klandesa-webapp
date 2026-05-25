import { prisma } from "@/lib/prisma";

/**
 * Saat linking desa ke mitra referral, tetapkan `acquisitionSource` ke `referral:{code}`
 * bila ada bukti registrasi kampanye untuk desa/email yang sama (best-effort).
 */
export async function suggestReferralAcquisitionSource(
  partnerId: number,
  village: { name: string; email: string | null },
): Promise<string | undefined> {
  const rc = await prisma.referralCode.findUnique({
    where: { partnerId },
    select: { id: true, code: true },
  });
  if (!rc) return undefined;

  const name = village.name.trim();
  const email = village.email?.trim().toLowerCase() ?? "";

  const hits = await prisma.referralEvent.count({
    where: {
      referralCodeId: rc.id,
      action: "register_submit",
      OR: [
        ...(name
          ? [
              {
                villageName: { equals: name, mode: "insensitive" as const },
              },
            ]
          : []),
        ...(email && email.includes("@")
          ? [{ email: { equals: email, mode: "insensitive" as const } }]
          : []),
      ],
    },
  });

  return hits > 0 ? `referral:${rc.code}` : undefined;
}
