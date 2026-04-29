import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

async function resolveVillage(req: NextRequest, session?: any) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }

  return await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
}

/**
 * Salin template katalog sistem (isGlobal + tanpa villageId) ke DB desa aktif
 * agar dapat disesuaikan dengan PATCH.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage(req, session);

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: raw } = await context.params;
    const sourceId = Number(raw);
    if (!Number.isFinite(sourceId)) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const source = await prisma.mailTemplate.findFirst({
      where: {
        id: sourceId,
        isGlobal: true,
        villageId: null,
      },
    });

    if (!source) {
      return NextResponse.json(
        { error: "Hanya template katalog bawaan yang dapat disalin ke desa." },
        { status: 404 },
      );
    }

    const catalogKey = source.catalogKey?.trim() ?? null;
    if (catalogKey) {
      const existingFork = await prisma.mailTemplate.findFirst({
        where: {
          villageId: village.id,
          inheritsCatalogKey: catalogKey,
        },
      });
      if (existingFork) {
        return NextResponse.json(existingFork, { status: 200 });
      }
    }

    const dup = await prisma.mailTemplate.create({
      data: {
        villageId: village.id,
        name: source.name,
        description: source.description,
        category: source.category,
        templateStructure:
          source.templateStructure === null
            ? {}
            : (source.templateStructure as object),
        contentTemplate: source.contentTemplate,
        isGlobal: false,
        isActive: true,
        inheritsCatalogKey: catalogKey,
      },
    });

    return NextResponse.json(dup, { status: 201 });
  } catch (err) {
    console.error("POST /api/mail-templates/[id]/duplicate error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
