import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillageAdminResponse } from "@/lib/access-policy";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { parseCustomization } from "@/lib/website-engine/normalize";
import type {
  WebsiteCustomization,
  WebsiteCustomizationSnapshot,
} from "@/lib/website-engine/types";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";
import { customizationToJsonObject } from "@/lib/website-engine/customization-json";
import { setDraftFromSnapshot } from "@/lib/website-engine/customization-store";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const { id } = await context.params;
    const sub = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      include: { template: { select: { structure: true } } },
    });
    if (!sub?.template) {
      return NextResponse.json(
        { error: "Website belum aktif" },
        { status: 404 },
      );
    }
    const cz = parseCustomization(sub.customization);
    const found = (cz.savedTemplates ?? []).find((t) => t.id === id);
    if (!found) {
      return NextResponse.json(
        { error: "Template tidak ditemukan" },
        { status: 404 },
      );
    }
    const templateKey = parseTemplateStructureManifest(
      sub.template.structure,
    ).templateKey;
    return NextResponse.json({
      templateKey,
      exportedAt: new Date().toISOString(),
      id: found.id,
      name: found.name,
      description: found.description ?? "",
      snapshot: found.snapshot,
    });
  } catch (e) {
    console.error("GET /api/website/templates/[id] error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";

    const sub = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      select: { id: true, customization: true },
    });
    if (!sub) {
      return NextResponse.json(
        { error: "Website belum aktif" },
        { status: 404 },
      );
    }

    const parsed = parseCustomization(sub.customization);
    const templates = [...(parsed.savedTemplates ?? [])];
    const idx = templates.findIndex((t) => t.id === id);
    if (idx < 0) {
      return NextResponse.json(
        { error: "Template tidak ditemukan" },
        { status: 404 },
      );
    }

    const now = new Date().toISOString();

    if (action === "apply") {
      const snap = templates[idx]!.snapshot as WebsiteCustomizationSnapshot;
      // Diterapkan sebagai draf: situs publik tidak berubah sampai desa menerbitkannya.
      const base = customizationToJsonObject({ ...parsed, savedTemplates: templates });
      await prisma.websiteSubscription.update({
        where: { id: sub.id },
        data: { customization: setDraftFromSnapshot(base, snap) as never },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "duplicate") {
      const src = templates[idx]!;
      const copy = {
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} (copy)`.slice(0, 80),
        createdAt: now,
        updatedAt: now,
      };
      templates.push(copy);
      const next: WebsiteCustomization = {
        ...parsed,
        savedTemplates: templates.slice(-50),
      };
      await prisma.websiteSubscription.update({
        where: { id: sub.id },
        data: { customization: customizationToJsonObject(next) as never },
      });
      return NextResponse.json({ ok: true, createdId: copy.id });
    }

    if (action === "rename") {
      const name =
        typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
      const description =
        typeof body?.description === "string"
          ? body.description.trim().slice(0, 300)
          : "";
      if (!name) {
        return NextResponse.json(
          { error: "Nama template wajib diisi" },
          { status: 400 },
        );
      }
      templates[idx] = {
        ...templates[idx]!,
        name,
        ...(description ? { description } : {}),
        updatedAt: now,
      };
      const next: WebsiteCustomization = {
        ...parsed,
        savedTemplates: templates,
      };
      await prisma.websiteSubscription.update({
        where: { id: sub.id },
        data: { customization: customizationToJsonObject(next) as never },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/website/templates/[id] error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const { id } = await context.params;
    const sub = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      select: { id: true, customization: true },
    });
    if (!sub) {
      return NextResponse.json(
        { error: "Website belum aktif" },
        { status: 404 },
      );
    }
    const parsed = parseCustomization(sub.customization);
    const nextTemplates = (parsed.savedTemplates ?? []).filter(
      (t) => t.id !== id,
    );
    const next: WebsiteCustomization = {
      ...parsed,
      savedTemplates: nextTemplates,
    };
    await prisma.websiteSubscription.update({
      where: { id: sub.id },
      data: { customization: customizationToJsonObject(next) as never },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/website/templates/[id] error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
