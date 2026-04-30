import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { createHash, randomBytes } from "crypto";

function createKioskKey(): string {
  return randomBytes(32).toString("base64url");
}

function hashKioskKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const devices = await prisma.kioskDevice.findMany({
      where: { villageId: village.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        locationLabel: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      devices: devices.map((d) => ({
        id: String(d.id),
        name: d.name,
        locationLabel: d.locationLabel,
        isActive: d.isActive,
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
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

    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      locationLabel?: unknown;
    } | null;
    const name = String(body?.name ?? "").trim();
    const locationLabel = String(body?.locationLabel ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Nama perangkat wajib" },
        { status: 400 },
      );
    }

    const kioskKey = createKioskKey();
    const keyHash = hashKioskKey(kioskKey);

    const created = await prisma.kioskDevice.create({
      data: {
        villageId: village.id,
        name,
        locationLabel: locationLabel || null,
        keyHash,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        locationLabel: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      device: {
        id: String(created.id),
        name: created.name,
        locationLabel: created.locationLabel,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
      },
      kioskKey,
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

    const body = (await req.json().catch(() => null)) as {
      id?: unknown;
      isActive?: unknown;
      rotateKey?: unknown;
    } | null;
    const idRaw = String(body?.id ?? "").trim();
    if (!idRaw) {
      return NextResponse.json({ error: "ID wajib" }, { status: 400 });
    }

    const rotateKey = body?.rotateKey === true;
    const isActive =
      typeof body?.isActive === "boolean" ? body.isActive : undefined;

    const deviceId = BigInt(idRaw);
    const existing = await prisma.kioskDevice.findFirst({
      where: { id: deviceId, villageId: village.id },
      select: {
        id: true,
        name: true,
        locationLabel: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Perangkat tidak ditemukan" },
        { status: 404 },
      );
    }

    const updateData: {
      isActive?: boolean;
      keyHash?: string;
    } = {};

    let newKey: string | null = null;
    if (rotateKey) {
      newKey = createKioskKey();
      updateData.keyHash = hashKioskKey(newKey);
    }
    if (typeof isActive === "boolean") {
      updateData.isActive = isActive;
    }
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada perubahan" },
        { status: 400 },
      );
    }

    const updated = await prisma.kioskDevice.update({
      where: { id: existing.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        locationLabel: true,
        isActive: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      device: {
        id: String(updated.id),
        name: updated.name,
        locationLabel: updated.locationLabel,
        isActive: updated.isActive,
        lastSeenAt: updated.lastSeenAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
      },
      kioskKey: newKey,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
