import { randomBytes } from "crypto";
import type { DbTx } from "@/lib/partner/commission";
import { normalizePublicSlug } from "@/lib/partner/public-page";
import { normalizeReferralCode } from "@/lib/referrals/tracking";

export type PartnerReferralOwner = {
  name: string;
  email: string;
  phone: string | null;
};

function emailLocalPart(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 20);
}

export function buildReferralCodeCandidates(
  partnerId: number,
  email: string,
  name?: string | null,
): string[] {
  const fromEmail = emailLocalPart(email);
  const fromName = String(name ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);

  const suffix = randomBytes(3).toString("hex").toUpperCase();
  const candidates = [
    `MITRA${partnerId}`,
    fromEmail ? `${fromEmail}${partnerId}` : "",
    fromName ? `${fromName}${partnerId}` : "",
    `MITRA${partnerId}${suffix}`,
    `KLND${partnerId}${suffix}`,
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const code = normalizeReferralCode(raw);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/**
 * Pastikan mitra punya kode referral aktif (1:1). Buat otomatis jika belum ada.
 */
export async function ensurePartnerReferralCodeTx(
  tx: DbTx,
  partnerId: number,
  owner: PartnerReferralOwner,
): Promise<{ code: string; created: boolean; sharePath: string | null }> {
  const existing = await tx.referralCode.findUnique({
    where: { partnerId },
    select: { code: true, status: true },
  });

  if (existing) {
    const slug =
      normalizePublicSlug(existing.code) ?? String(existing.code).toLowerCase();
    return {
      code: existing.code,
      created: false,
      sharePath: `/m/${slug}`,
    };
  }

  const candidates = buildReferralCodeCandidates(
    partnerId,
    owner.email,
    owner.name,
  );

  for (const candidate of candidates) {
    const code = normalizeReferralCode(candidate);
    if (!code) continue;

    const taken = await tx.referralCode.findUnique({
      where: { code },
      select: { id: true },
    });
    if (taken) continue;

    await tx.referralCode.create({
      data: {
        code,
        label: `Mitra — ${owner.name}`.slice(0, 120),
        ownerName: owner.name.slice(0, 120),
        ownerPhone: owner.phone?.trim()?.slice(0, 40) || null,
        ownerEmail: owner.email.trim().toLowerCase().slice(0, 254),
        status: "active",
        landingPath: "/m",
        partnerId,
      },
    });

    const partner = await tx.partner.findUnique({
      where: { id: partnerId },
      select: { publicSlug: true },
    });
    if (!partner?.publicSlug) {
      const slugCandidate =
        normalizePublicSlug(`mitra-${partnerId}`) ??
        normalizePublicSlug(code);
      if (slugCandidate) {
        const slugTaken = await tx.partner.findFirst({
          where: {
            publicSlug: slugCandidate,
            NOT: { id: partnerId },
          },
          select: { id: true },
        });
        if (!slugTaken) {
          await tx.partner.update({
            where: { id: partnerId },
            data: { publicSlug: slugCandidate },
          });
        }
      }
    }

    const slug = normalizePublicSlug(code) ?? code.toLowerCase();
    return { code, created: true, sharePath: `/m/${slug}` };
  }

  throw new Error("Gagal membuat kode referral unik untuk mitra ini.");
}
