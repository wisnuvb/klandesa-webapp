import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  generateVerificationToken,
  validateHostnameFqdn,
  validateSubdomainLabel,
} from "@/lib/domain/validators";

export type WebsiteDomainStatus =
  | "pending_verification"
  | "active"
  | "inactive"
  | "error";

export type WebsiteDomainType = "subdomain" | "custom";

export async function createWebsiteDomainEvent(params: {
  domainId: number;
  kind: string;
  message?: string | null;
  meta?: unknown;
}): Promise<void> {
  try {
    await prisma.websiteDomainEvent.create({
      data: {
        domainId: params.domainId,
        kind: params.kind,
        message: params.message ?? null,
        meta: params.meta as never,
      },
    });
  } catch (e) {
    logger.warn(
      { err: e, domainId: params.domainId, kind: params.kind },
      "websiteDomainEvent.create failed",
    );
  }
}

export function websiteRootDomain(): string {
  return (process.env.WEBSITE_ROOT_DOMAIN ?? "klandesa.id").trim().toLowerCase();
}

/**
 * Cek apakah label subdomain boleh dipakai desa ini. Label yang sama dengan kode desa lain ditolak
 * karena routing mencari desa berdasarkan kode lebih dulu dan akan menayangkan situs desa lain.
 */
export async function checkSubdomainAvailability(
  label: string,
  villageId: number,
): Promise<{ ok: true; label: string; hostname: string } | { ok: false; error: string }> {
  const v = validateSubdomainLabel(label);
  if (!v.ok) return v;
  const hostname = `${v.value}.${websiteRootDomain()}`;

  const [taken, codeOwner] = await Promise.all([
    prisma.websiteDomain.findUnique({
      where: { hostname },
      select: { villageId: true },
    }),
    prisma.village.findFirst({
      where: { code: { in: [v.value, v.value.toUpperCase()] } },
      select: { id: true },
    }),
  ]);
  if (taken && taken.villageId !== villageId) {
    return { ok: false, error: "Alamat ini sudah dipakai desa lain" };
  }
  if (codeOwner && codeOwner.id !== villageId) {
    return { ok: false, error: "Alamat ini sudah dipakai desa lain" };
  }
  return { ok: true, label: v.value, hostname };
}

/** Daftarkan subdomain pilihan desa sebagai domain utama (dipanggil dari transaksi aktivasi pembayaran). */
export async function registerPrimarySubdomainInTx(
  tx: Prisma.TransactionClient,
  params: { villageId: number; label: string; makePrimary?: boolean },
): Promise<{ ok: true; hostname: string } | { ok: false; error: string }> {
  const makePrimary = params.makePrimary ?? true;
  const v = validateSubdomainLabel(params.label);
  if (!v.ok) return v;
  const hostname = `${v.value}.${websiteRootDomain()}`;

  const existing = await tx.websiteDomain.findUnique({ where: { hostname } });
  if (existing && existing.villageId !== params.villageId) {
    return { ok: false, error: "Alamat sudah dipakai desa lain" };
  }

  if (makePrimary) {
    await tx.websiteDomain.updateMany({
      where: { villageId: params.villageId, isPrimary: true },
      data: { isPrimary: false },
    });
  }
  const now = new Date();
  if (existing) {
    await tx.websiteDomain.update({
      where: { id: existing.id },
      data: {
        type: "subdomain",
        status: "active",
        ...(makePrimary ? { isPrimary: true } : {}),
        lastError: null,
      },
    });
  } else {
    await tx.websiteDomain.create({
      data: {
        villageId: params.villageId,
        hostname,
        type: "subdomain",
        status: "active",
        isPrimary: makePrimary,
        sslStatus: "active",
        sslIssuedAt: now,
      },
    });
  }
  if (makePrimary) {
    await tx.village.update({
      where: { id: params.villageId },
      data: { website: hostname },
    });
  }
  return { ok: true, hostname };
}

/**
 * Daftarkan custom domain sebagai `pending_verification`. Domain baru dipakai setelah desa
 * menyelesaikan verifikasi DNS TXT di panel domain, bukan langsung saat pembayaran.
 */
export async function registerPendingCustomDomainInTx(
  tx: Prisma.TransactionClient,
  params: { villageId: number; hostname: string },
): Promise<{ ok: true; hostname: string } | { ok: false; error: string }> {
  const v = validateHostnameFqdn(params.hostname);
  if (!v.ok) return v;

  const existing = await tx.websiteDomain.findUnique({ where: { hostname: v.value } });
  if (existing) {
    return existing.villageId === params.villageId
      ? { ok: true, hostname: v.value }
      : { ok: false, error: "Domain sudah dipakai desa lain" };
  }
  await tx.websiteDomain.create({
    data: {
      villageId: params.villageId,
      hostname: v.value,
      type: "custom",
      status: "pending_verification",
      verificationMethod: "dns_txt",
      verificationToken: generateVerificationToken(),
      verificationRequestedAt: new Date(),
      sslStatus: "pending",
    },
  });
  return { ok: true, hostname: v.value };
}
