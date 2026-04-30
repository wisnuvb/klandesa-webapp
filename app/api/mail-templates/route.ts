import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const templates = await prisma.mailTemplate.findMany({
      where: {
        OR: [{ villageId: village.id }, { isGlobal: true }],
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const forkKeys = new Set(
      templates
        .filter((t) => t.villageId === village.id && t.inheritsCatalogKey)
        .map((t) => t.inheritsCatalogKey as string),
    );

    const filtered = templates.filter((t) => {
      const isGlobalCatalog =
        t.isGlobal && (t.villageId == null || t.villageId === undefined);
      if (
        isGlobalCatalog &&
        t.catalogKey &&
        forkKeys.has(t.catalogKey)
      ) {
        return false;
      }
      return true;
    });

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("GET /api/mail-templates error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const { name, description, category, templateStructure, contentTemplate } = body;

    if (!name?.trim() || !category?.trim() || templateStructure == null) {
      return NextResponse.json(
        { error: "Missing required fields: name, category, or templateStructure" },
        { status: 400 },
      );
    }

    const template = await prisma.mailTemplate.create({
      data: {
        villageId: village.id,
        name,
        description: description || "",
        category,
        templateStructure,
        contentTemplate: contentTemplate ?? "",
        isGlobal: false,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("POST /api/mail-templates error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/**
 * Update parsial — hanya template yang `villageId`-nya sama dengan desa sesi.
 * Template katalog (global / tanpa village) tidak boleh diubah dari sini.
 */
export async function PATCH(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Field id wajib dan valid" }, { status: 400 });
    }

    const owned = await prisma.mailTemplate.findFirst({
      where: { id, villageId: village.id },
    });

    if (!owned) {
      return NextResponse.json(
        {
          error:
            "Template tidak ditemukan atau Anda tidak dapat mengubah template katalog sistem. Salin ke desa Anda terlebih dahulu.",
        },
        { status: 403 },
      );
    }

    const data: Prisma.MailTemplateUpdateInput = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.category === "string" && body.category.trim())
      data.category = body.category.trim();
    if (body.templateStructure !== undefined) data.templateStructure = body.templateStructure;
    if (typeof body.contentTemplate === "string") data.contentTemplate = body.contentTemplate;
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const updated = await prisma.mailTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/mail-templates error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
