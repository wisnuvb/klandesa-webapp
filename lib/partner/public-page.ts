import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeReferralCode } from "@/lib/referrals/tracking";

export const PUBLIC_PAGE_MAX_LEN = {
  slug: 80,
  headline: 200,
  bio: 2000,
  whatsapp: 40,
} as const;

export type PartnerPublicProfile = {
  slug: string;
  referralCode: string;
  name: string;
  region: string | null;
  publicHeadline: string | null;
  publicBio: string | null;
  publicWhatsapp: string | null;
  acquiredVillageCount: number;
};

export function normalizePublicSlug(value: unknown): string | null {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug || slug.length < 2) return null;
  return slug.slice(0, PUBLIC_PAGE_MAX_LEN.slug);
}

export function validatePublicSlug(value: unknown): string | null {
  const slug = normalizePublicSlug(value);
  if (!slug) return "Slug minimal 2 karakter (huruf, angka, strip).";
  if (slug.length > PUBLIC_PAGE_MAX_LEN.slug) {
    return "Slug terlalu panjang.";
  }
  return null;
}

export function resolvePublicSlug(
  publicSlug: string | null | undefined,
  referralCode: string | null | undefined,
): string | null {
  const fromCustom = normalizePublicSlug(publicSlug);
  if (fromCustom) return fromCustom;
  const fromCode = normalizePublicSlug(referralCode);
  if (fromCode) return fromCode;
  return null;
}

export function buildPartnerSharePath(
  publicSlug: string | null | undefined,
  referralCode: string | null | undefined,
): string | null {
  const slug = resolvePublicSlug(publicSlug, referralCode);
  if (!slug) return null;
  return `/m/${slug}`;
}

export function buildPartnerShareUrl(
  origin: string,
  publicSlug: string | null | undefined,
  referralCode: string | null | undefined,
): string | null {
  const path = buildPartnerSharePath(publicSlug, referralCode);
  if (!path) return null;
  const base = origin.replace(/\/$/, "");
  return `${base}${path}`;
}

function normalizeRouteSlug(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, PUBLIC_PAGE_MAX_LEN.slug);
}

export async function resolvePartnerPublicProfile(
  slugInput: string,
  client: PrismaClient = prisma,
): Promise<PartnerPublicProfile | null> {
  const routeSlug = normalizeRouteSlug(slugInput);
  if (!routeSlug) return null;

  const codeCandidate =
    normalizeReferralCode(slugInput) || normalizeReferralCode(routeSlug);

  const row = await client.partner.findFirst({
    where: {
      status: "active",
      publicPageEnabled: true,
      referralCode: {
        is: {
          status: "active",
        },
      },
      OR: [
        { publicSlug: routeSlug },
        ...(codeCandidate
          ? [{ referralCode: { is: { code: codeCandidate } } }]
          : []),
      ],
    },
    select: {
      name: true,
      region: true,
      publicHeadline: true,
      publicBio: true,
      publicWhatsapp: true,
      publicSlug: true,
      phone: true,
      referralCode: {
        select: {
          code: true,
        },
      },
      _count: {
        select: {
          acquiredVillages: true,
        },
      },
    },
  });

  if (!row?.referralCode?.code) return null;

  const slug = resolvePublicSlug(row.publicSlug, row.referralCode.code);
  if (!slug) return null;

  return {
    slug,
    referralCode: row.referralCode.code,
    name: row.name,
    region: row.region,
    publicHeadline: row.publicHeadline,
    publicBio: row.publicBio,
    publicWhatsapp: row.publicWhatsapp ?? row.phone,
    acquiredVillageCount: row._count.acquiredVillages,
  };
}

export function normalizeWhatsappDigits(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 18) return null;
  return digits.slice(0, PUBLIC_PAGE_MAX_LEN.whatsapp);
}

export function buildWhatsappUrl(phoneDigits: string, message: string): string {
  const normalized = phoneDigits.startsWith("62")
    ? phoneDigits
    : phoneDigits.startsWith("0")
      ? `62${phoneDigits.slice(1)}`
      : phoneDigits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
