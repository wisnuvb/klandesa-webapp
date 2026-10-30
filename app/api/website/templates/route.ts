import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillageAdminResponse } from "@/lib/access-policy";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { parseCustomization } from "@/lib/website-engine/normalize";
import { customizationToJsonObject } from "@/lib/website-engine/customization-json";
import {
  editingSnapshot,
  setDraftFromSnapshot,
} from "@/lib/website-engine/customization-store";
import type {
  WebsiteCustomization,
  WebsiteCustomizationSnapshot,
} from "@/lib/website-engine/types";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const sub = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      select: { customization: true },
    });
    const cz = parseCustomization(sub?.customization);
    const rows = (cz.savedTemplates ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    return NextResponse.json({ rows });
  } catch (e) {
    console.error("GET /api/website/templates error:", e);
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
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const body = await req.json().catch(() => ({}));
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
    const apply = Boolean(body?.apply);

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
    const now = new Date().toISOString();
    const entry = {
      id: crypto.randomUUID(),
      name,
      ...(description ? { description } : {}),
      // Variasi yang disimpan = yang sedang diedit di CMS (draf bila ada).
      snapshot: editingSnapshot(parsed),
      createdAt: now,
      updatedAt: now,
    } satisfies NonNullable<WebsiteCustomization["savedTemplates"]>[number];

    const nextTemplates = [...(parsed.savedTemplates ?? []), entry].slice(-50);
    const nextCustomization: WebsiteCustomization = {
      ...parsed,
      savedTemplates: nextTemplates,
    };

    // "Terapkan" masuk sebagai draf; situs publik berubah setelah desa menerbitkan.
    const stored = apply
      ? setDraftFromSnapshot(
          customizationToJsonObject(nextCustomization),
          entry.snapshot,
        )
      : customizationToJsonObject(nextCustomization);

    await prisma.websiteSubscription.update({
      where: { id: sub.id },
      data: {
        customization: stored as never,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      created: {
        id: entry.id,
        name: entry.name,
        description: entry.description ?? "",
      },
    });
  } catch (e) {
    console.error("POST /api/website/templates error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const body = await req.json().catch(() => ({}));
    const name =
      typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
    const description =
      typeof body?.description === "string"
        ? body.description.trim().slice(0, 300)
        : "";
    const snapshot = body?.snapshot as unknown;
    if (!name || !snapshot || typeof snapshot !== "object") {
      return NextResponse.json(
        { error: "Payload import tidak valid" },
        { status: 400 },
      );
    }
    const apply = Boolean(body?.apply);

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
    const now = new Date().toISOString();
    const entry = {
      id: crypto.randomUUID(),
      name,
      ...(description ? { description } : {}),
      snapshot: snapshot as WebsiteCustomizationSnapshot,
      createdAt: now,
      updatedAt: now,
    } satisfies NonNullable<WebsiteCustomization["savedTemplates"]>[number];

    const nextTemplates = [...(parsed.savedTemplates ?? []), entry].slice(-50);
    const nextCustomization: WebsiteCustomization = {
      ...parsed,
      savedTemplates: nextTemplates,
    };

    // "Terapkan" masuk sebagai draf; situs publik berubah setelah desa menerbitkan.
    const stored = apply
      ? setDraftFromSnapshot(
          customizationToJsonObject(nextCustomization),
          entry.snapshot,
        )
      : customizationToJsonObject(nextCustomization);

    await prisma.websiteSubscription.update({
      where: { id: sub.id },
      data: {
        customization: stored as never,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      imported: {
        id: entry.id,
        name: entry.name,
        description: entry.description ?? "",
      },
    });
  } catch (e) {
    console.error("PUT /api/website/templates error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
