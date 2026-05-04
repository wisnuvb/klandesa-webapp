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
import { invalidateTenantPublicPageCache } from "@/lib/website-engine/site-renderer";

function snapshotFromCustomization(
  cz: WebsiteCustomization,
): WebsiteCustomizationSnapshot {
  return {
    ...(cz.presetKey !== undefined ? { presetKey: cz.presetKey } : {}),
    ...(cz.overrides !== undefined ? { overrides: cz.overrides } : {}),
    ...(cz.theme !== undefined ? { theme: cz.theme } : {}),
    ...(cz.layout !== undefined ? { layout: cz.layout } : {}),
    ...(cz.siteSeo !== undefined ? { siteSeo: cz.siteSeo } : {}),
    ...(cz.faviconUrl !== undefined ? { faviconUrl: cz.faviconUrl } : {}),
  };
}

function customizationToJsonObject(
  c: WebsiteCustomization,
): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  if (c.presetKey !== undefined) o.presetKey = c.presetKey;
  if (c.overrides !== undefined) o.overrides = c.overrides;
  if (c.theme !== undefined) o.theme = c.theme;
  if (c.layout !== undefined) o.layout = c.layout;
  if (c.siteSeo !== undefined) o.siteSeo = c.siteSeo;
  if (c.faviconUrl !== undefined) o.faviconUrl = c.faviconUrl;
  if (c.savedPresets !== undefined) o.savedPresets = c.savedPresets;
  if (c.savedTemplates !== undefined) o.savedTemplates = c.savedTemplates;
  return o;
}

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
      snapshot: snapshotFromCustomization(parsed),
      createdAt: now,
      updatedAt: now,
    } satisfies NonNullable<WebsiteCustomization["savedTemplates"]>[number];

    const nextTemplates = [...(parsed.savedTemplates ?? []), entry].slice(-50);
    const nextCustomization: WebsiteCustomization = {
      ...parsed,
      savedTemplates: nextTemplates,
    };

    const appliedCustomization: WebsiteCustomization = apply
      ? {
          ...parsed,
          ...entry.snapshot,
          savedTemplates: nextTemplates,
          savedPresets: parsed.savedPresets,
        }
      : nextCustomization;

    await prisma.websiteSubscription.update({
      where: { id: sub.id },
      data: {
        customization: customizationToJsonObject(appliedCustomization) as never,
      },
      select: { id: true },
    });
    invalidateTenantPublicPageCache(village.id);

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

    const appliedCustomization: WebsiteCustomization = apply
      ? {
          ...parsed,
          ...(entry.snapshot as WebsiteCustomizationSnapshot),
          savedTemplates: nextTemplates,
          savedPresets: parsed.savedPresets,
        }
      : nextCustomization;

    await prisma.websiteSubscription.update({
      where: { id: sub.id },
      data: {
        customization: customizationToJsonObject(appliedCustomization) as never,
      },
      select: { id: true },
    });
    invalidateTenantPublicPageCache(village.id);

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
