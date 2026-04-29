import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { buildDnsTxtVerificationName } from "@/lib/domain/validators";
import { resolveTxtRecords } from "@/lib/domain/doh";
import { createWebsiteDomainEvent } from "@/lib/domain/service";

function requireVillageAdmin(session: unknown) {
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export type VerifyDnsTxtResult =
  | {
      ok: true;
      name: string;
      records: string[];
    }
  | {
      ok: false;
      status: "error" | "pending_verification";
      name: string;
      error: string;
      records?: string[];
    };

export async function verifyDnsTxtOwnership(params: {
  hostname: string;
  token: string;
  resolveTxtRecordsFn?: typeof resolveTxtRecords;
}): Promise<VerifyDnsTxtResult> {
  const name = buildDnsTxtVerificationName(params.hostname);
  const resolveFn = params.resolveTxtRecordsFn ?? resolveTxtRecords;
  const lookup = await resolveFn(name);
  if (!lookup.ok) {
    return { ok: false, status: "error", name, error: lookup.error };
  }
  const found = lookup.records.includes(params.token);
  if (!found) {
    return {
      ok: false,
      status: "pending_verification",
      name,
      error: "Token TXT belum terdeteksi",
      records: lookup.records,
    };
  }
  return { ok: true, name, records: lookup.records };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const forbidden = requireVillageAdmin(session);
    if (forbidden) return forbidden;

    const village = await resolveVillage({ req, session });
    if (!village)
      return NextResponse.json(
        { error: "Desa tidak ditemukan" },
        { status: 404 },
      );
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const domain = await prisma.websiteDomain.findFirst({
      where: { id, villageId: village.id },
    });
    if (!domain)
      return NextResponse.json(
        { error: "Domain tidak ditemukan" },
        { status: 404 },
      );
    if (domain.type !== "custom") {
      return NextResponse.json(
        { error: "Verifikasi hanya untuk custom domain" },
        { status: 400 },
      );
    }
    if (!domain.verificationToken) {
      return NextResponse.json(
        { error: "Token verifikasi tidak tersedia" },
        { status: 400 },
      );
    }

    const now = new Date();
    const verify = await verifyDnsTxtOwnership({
      hostname: domain.hostname,
      token: domain.verificationToken,
    });

    if (!verify.ok && verify.status === "error") {
      await prisma.websiteDomain.update({
        where: { id: domain.id },
        data: {
          lastCheckedAt: now,
          lastError: verify.error.slice(0, 800),
          status: "error",
        },
      });
      await createWebsiteDomainEvent({
        domainId: domain.id,
        kind: "error",
        message: verify.error,
        meta: { step: "dns_lookup", name: verify.name },
      });
      return NextResponse.json(
        { ok: false, error: verify.error },
        { status: 502 },
      );
    }

    if (!verify.ok && verify.status === "pending_verification") {
      await prisma.websiteDomain.update({
        where: { id: domain.id },
        data: {
          lastCheckedAt: now,
          lastError: "Token TXT belum terdeteksi",
          status: "pending_verification",
        },
      });
      await createWebsiteDomainEvent({
        domainId: domain.id,
        kind: "verification_failed",
        message: "Token TXT belum terdeteksi",
        meta: { name: verify.name, records: (verify.records ?? []).slice(0, 10) },
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Token TXT belum terdeteksi",
          hint: { type: "TXT", name: verify.name, value: domain.verificationToken },
        },
        { status: 409 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.websiteDomain.updateMany({
        where: { villageId: village.id, isPrimary: true },
        data: { isPrimary: false },
      });

      const row = await tx.websiteDomain.update({
        where: { id: domain.id },
        data: {
          status: "active",
          verifiedAt: now,
          lastCheckedAt: now,
          lastError: null,
          isPrimary: true,
        },
      });

      await tx.websiteSubscription.updateMany({
        where: { villageId: village.id },
        data: { customDomain: domain.hostname },
      });

      return row;
    });

    await createWebsiteDomainEvent({
      domainId: updated.id,
      kind: "verified",
      message: "Ownership terverifikasi via DNS TXT",
      meta: { name: verify.name },
    });

    return NextResponse.json({
      ok: true,
      domain: {
        id: updated.id,
        hostname: updated.hostname,
        status: updated.status,
        verified_at: updated.verifiedAt?.toISOString(),
      },
    });
  } catch (e) {
    console.error("POST /api/website/domains/[id]/verify error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
