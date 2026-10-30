import { requireVillageApiContext } from "@/lib/api-village-context";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { readJsonBody } from "@/lib/http/read-json";
import { villageTemplateScope } from "@/lib/mail/template-access";
import { TEMPLATE_LIMITS, validateTemplateInput } from "@/lib/mail/template-guard";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    // Daftar ringan: tanpa dokumen (templateStructure) & contentTemplate, yang ±90% dari ukuran baris dan tidak
    // dipakai UI daftar. Hanya dokumen v2 (format lama tidak lagi dipakai); dokumen lengkap lewat GET /api/mail-templates/[id].
    const templates = await prisma.mailTemplate.findMany({
      where: {
        ...villageTemplateScope(village.id),
        isActive: true,
        templateStructure: { path: "$.schemaVersion", equals: 2 },
      },
      select: {
        id: true,
        villageId: true,
        name: true,
        description: true,
        category: true,
        isGlobal: true,
        isActive: true,
        catalogKey: true,
        inheritsCatalogKey: true,
        usageCount: true,
        createdAt: true,
        updatedAt: true,
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

    return NextResponse.json(filtered.map((t) => ({ ...t, schemaVersion: 2 })));
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

    const parsed = await readJsonBody(req, TEMPLATE_LIMITS.requestBytes);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const checked = validateTemplateInput(parsed.body, "create");
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }
    const { name, description, category, templateStructure, contentTemplate } =
      checked.value;

    const template = await prisma.mailTemplate.create({
      data: {
        villageId: village.id,
        name: name!,
        description: description ?? "",
        category: category!,
        templateStructure: templateStructure as Prisma.InputJsonValue,
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

    const parsed = await readJsonBody(req, TEMPLATE_LIMITS.requestBytes);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const body = parsed.body as Record<string, unknown> | null;
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Field id wajib dan valid" }, { status: 400 });
    }

    const checked = validateTemplateInput(body, "update");
    if (!checked.ok) {
      return NextResponse.json({ error: checked.error }, { status: 400 });
    }

    const owned = await prisma.mailTemplate.findFirst({
      where: { id, villageId: village.id },
      select: { id: true },
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

    const { name, description, category, templateStructure, contentTemplate, isActive } =
      checked.value;
    const data: Prisma.MailTemplateUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (templateStructure !== undefined)
      data.templateStructure = templateStructure as Prisma.InputJsonValue;
    if (contentTemplate !== undefined) data.contentTemplate = contentTemplate;
    if (isActive !== undefined) data.isActive = isActive;

    // Penyimpanan otomatis dari editor mengirim `expectedUpdatedAt`: bila template sudah diubah
    // di tempat lain sejak dimuat, tolak (409) agar dua operator tidak saling menimpa.
    const expectedRaw = body?.expectedUpdatedAt;
    if (expectedRaw !== undefined) {
      const expected = typeof expectedRaw === "string" ? new Date(expectedRaw) : null;
      if (!expected || Number.isNaN(expected.getTime())) {
        return NextResponse.json({ error: "expectedUpdatedAt tidak valid" }, { status: 400 });
      }
      const res = await prisma.mailTemplate.updateMany({
        where: { id, villageId: village.id, updatedAt: expected },
        data: data as Prisma.MailTemplateUpdateManyMutationInput,
      });
      if (res.count === 0) {
        return NextResponse.json(
          { error: "Template ini sudah diubah di tempat lain. Muat ulang untuk melihat versi terbaru." },
          { status: 409 },
        );
      }
      return NextResponse.json(await prisma.mailTemplate.findUnique({ where: { id } }));
    }

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
