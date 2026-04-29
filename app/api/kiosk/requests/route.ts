import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { createHash, randomBytes } from "crypto";

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

function normalizeNik(nik: string): string {
  return nik.replace(/\s+/g, "").trim();
}

function isValidNik(nik: string): boolean {
  return /^[0-9]{16}$/.test(nik);
}

function createRequestNumber(villageCode: string): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `KSK-${String(villageCode).toUpperCase()}-${yyyy}${mm}${dd}-${rand}`;
}

export async function POST(req: NextRequest) {
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

    const body = (await req.json().catch(() => null)) as {
      nik?: unknown;
      name?: unknown;
      mailType?: unknown;
      purpose?: unknown;
    } | null;

    const nik = normalizeNik(String(body?.nik ?? ""));
    const name = String(body?.name ?? "").trim();
    const mailType = String(body?.mailType ?? "").trim();
    const purpose = String(body?.purpose ?? "").trim();

    if (!isValidNik(nik)) {
      return NextResponse.json({ error: "NIK tidak valid" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Nama wajib" }, { status: 400 });
    }
    if (!mailType) {
      return NextResponse.json(
        { error: "Jenis layanan wajib" },
        { status: 400 },
      );
    }
    if (!purpose) {
      return NextResponse.json({ error: "Keperluan wajib" }, { status: 400 });
    }
    if (!settings.allowedMailTypes.includes(mailType)) {
      return NextResponse.json(
        { error: "Layanan tidak tersedia di kiosk" },
        { status: 400 },
      );
    }

    await prisma.kioskDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
      select: { id: true },
    });

    const created = await prisma.mailRequest.create({
      data: {
        villageId: village.id,
        requestNumber: createRequestNumber(village.code),
        channel: "kiosk",
        kioskDeviceId: device.id,
        nik,
        name,
        mailType,
        purpose,
        status: "pending",
        requestDate: new Date(),
      },
      select: {
        id: true,
        requestNumber: true,
        status: true,
        requestDate: true,
      },
    });

    return NextResponse.json({
      request: {
        id: String(created.id),
        requestNumber: created.requestNumber,
        status: created.status,
        requestDate: created.requestDate.toISOString(),
      },
      village: { id: village.id, code: village.code, name: village.name },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
