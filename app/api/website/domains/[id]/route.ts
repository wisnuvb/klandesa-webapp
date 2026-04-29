import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { createWebsiteDomainEvent } from "@/lib/domain/service";

function requireVillageAdmin(session: unknown) {
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function DELETE(
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

    await prisma.$transaction(async (tx) => {
      await tx.websiteDomainEvent.deleteMany({
        where: { domainId: domain.id },
      });
      await tx.websiteDomain.delete({ where: { id: domain.id } });

      if (domain.type === "custom") {
        await tx.websiteSubscription.updateMany({
          where: { villageId: village.id, customDomain: domain.hostname },
          data: { customDomain: null },
        });
      }
      if (domain.type === "subdomain") {
        await tx.village.update({
          where: { id: village.id },
          data: { website: null },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/website/domains/[id] error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PATCH(
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

    const body = await req.json().catch(() => ({}));
    const makePrimary = body.is_primary === true;
    const routingConfig =
      body.routing_config && typeof body.routing_config === "object"
        ? body.routing_config
        : null;
    const sslStatus =
      typeof body.ssl_status === "string" && body.ssl_status.length > 0
        ? String(body.ssl_status)
        : null;

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      if (makePrimary) {
        await tx.websiteDomain.updateMany({
          where: { villageId: village.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const row = await tx.websiteDomain.update({
        where: { id: domain.id },
        data: {
          isPrimary: makePrimary ? true : undefined,
          routingConfig: routingConfig ? (routingConfig as never) : undefined,
          sslStatus: sslStatus ?? undefined,
          sslIssuedAt: sslStatus === "active" ? now : undefined,
        },
      });

      if (makePrimary && domain.type === "custom") {
        await tx.websiteSubscription.updateMany({
          where: { villageId: village.id },
          data: { customDomain: domain.hostname },
        });
      }
      if (makePrimary && domain.type === "subdomain") {
        await tx.village.update({
          where: { id: village.id },
          data: { website: domain.hostname },
        });
      }

      return row;
    });

    if (makePrimary) {
      await createWebsiteDomainEvent({
        domainId: updated.id,
        kind: "primary_set",
        message: "Domain dijadikan primary",
      });
    }
    if (routingConfig) {
      await createWebsiteDomainEvent({
        domainId: updated.id,
        kind: "routing_updated",
        message: "Routing rules diperbarui",
      });
    }
    if (sslStatus) {
      await createWebsiteDomainEvent({
        domainId: updated.id,
        kind: "ssl_updated",
        message: `SSL status: ${sslStatus}`,
      });
    }

    return NextResponse.json({
      ok: true,
      domain: {
        id: updated.id,
        hostname: updated.hostname,
        is_primary: updated.isPrimary,
        status: updated.status,
        ssl_status: updated.sslStatus,
      },
    });
  } catch (e) {
    console.error("PATCH /api/website/domains/[id] error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
