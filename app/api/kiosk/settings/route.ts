import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import type { Prisma } from "@prisma/client";

type KioskSettings = {
  enabled: boolean;
  allowedMailTypes: string[];
};

function readKioskSettings(raw: unknown): KioskSettings {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const kiosk =
    root.kiosk && typeof root.kiosk === "object" && !Array.isArray(root.kiosk)
      ? (root.kiosk as Record<string, unknown>)
      : {};
  const enabled = kiosk.enabled === true;
  const allowedMailTypes = Array.isArray(kiosk.allowedMailTypes)
    ? kiosk.allowedMailTypes
        .filter((v) => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  return { enabled, allowedMailTypes };
}

function mergeKioskSettings(
  raw: unknown,
  patch: Partial<KioskSettings>,
): Record<string, unknown> {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const current = readKioskSettings(root);
  const next: KioskSettings = {
    enabled: patch.enabled ?? current.enabled,
    allowedMailTypes: patch.allowedMailTypes ?? current.allowedMailTypes,
  };
  return {
    ...root,
    kiosk: {
      enabled: next.enabled,
      allowedMailTypes: next.allowedMailTypes,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const v = await prisma.village.findUnique({
      where: { id: village.id },
      select: { id: true, code: true, name: true, settings: true },
    });
    if (!v) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    return NextResponse.json({
      village: { id: v.id, code: v.code, name: v.name },
      settings: readKioskSettings(v.settings),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = (await req
      .json()
      .catch(() => null)) as Partial<KioskSettings> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    const patch: Partial<KioskSettings> = {};
    if ("enabled" in body) patch.enabled = body.enabled === true;
    if ("allowedMailTypes" in body) {
      if (!Array.isArray(body.allowedMailTypes)) {
        return NextResponse.json(
          { error: "allowedMailTypes harus array string" },
          { status: 400 },
        );
      }
      patch.allowedMailTypes = body.allowedMailTypes
        .filter((v) => typeof v === "string")
        .map((v) => v.trim())
        .filter(Boolean);
    }

    const existing = await prisma.village.findUnique({
      where: { id: village.id },
      select: { settings: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const merged = mergeKioskSettings(existing.settings, patch);
    const updated = await prisma.village.update({
      where: { id: village.id },
      data: { settings: merged as unknown as Prisma.InputJsonValue },
      select: { id: true, code: true, name: true, settings: true },
    });

    return NextResponse.json({
      village: { id: updated.id, code: updated.code, name: updated.name },
      settings: readKioskSettings(updated.settings),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
