import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { createHash } from "crypto";

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

function hashKioskKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function GET(req: NextRequest) {
  try {
    const kioskKey = String(req.headers.get("x-kiosk-key") ?? "").trim();
    if (!kioskKey) {
      return NextResponse.json({ error: "Kiosk key wajib" }, { status: 401 });
    }

    const device = await prisma.kioskDevice.findUnique({
      where: { keyHash: hashKioskKey(kioskKey) },
      select: { id: true, villageId: true, name: true, isActive: true },
    });
    if (!device || !device.isActive) {
      return NextResponse.json({ error: "Kiosk tidak valid" }, { status: 403 });
    }

    const village = await prisma.village.findUnique({
      where: { id: device.villageId },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        settings: true,
      },
    });
    if (!village || !village.isActive) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const settings = readKioskSettings(village.settings);
    if (!settings.enabled) {
      return NextResponse.json(
        { error: "Layanan mandiri belum diaktifkan" },
        { status: 403 },
      );
    }

    await prisma.kioskDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
      select: { id: true },
    });

    return NextResponse.json({
      village: { id: village.id, code: village.code, name: village.name },
      device: { id: String(device.id), name: device.name },
      services: settings.allowedMailTypes.map((t) => ({ mailType: t })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
