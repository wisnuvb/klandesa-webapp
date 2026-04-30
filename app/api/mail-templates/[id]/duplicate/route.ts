import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

/**
 * Salin template katalog sistem (isGlobal + tanpa villageId) ke DB desa aktif
 * agar dapat disesuaikan dengan PATCH.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

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
