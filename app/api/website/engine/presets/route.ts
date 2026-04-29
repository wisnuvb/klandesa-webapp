import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { listPresetOptions } from "@/lib/website-engine/preset-options";
import { parseCustomization } from "@/lib/website-engine/normalize";

function requireVillageAdmin(session: unknown) {
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const forbidden = requireVillageAdmin(session);
    if (forbidden) return forbidden;
    const village = await resolveVillage({ req, session });
    if (!village)
      return NextResponse.json(
        { error: "Desa tidak ditemukan" },
        { status: 404 },
      );
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const subscription = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      include: { template: true },
    });
    if (!subscription?.template) {
      return NextResponse.json(
        { error: "Website belum aktif" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      presets: listPresetOptions(subscription.template.structure),
    });
  } catch (e) {
    console.error("GET /api/website/engine/presets error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const forbidden = requireVillageAdmin(session);
    if (forbidden) return forbidden;

    const village = await resolveVillage({ req, session });
    if (!village)
      return NextResponse.json(
        { error: "Desa tidak ditemukan" },
        { status: 404 },
      );
    if (!isVillageSubscriptionActive(village))
      return subscriptionBlockedResponse(village);

    const subscription = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      include: { template: true },
    });
    if (!subscription?.template) {
      return NextResponse.json(
        { error: "Website belum aktif" },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");

    const current = parseCustomization(subscription.customization);
    const saved = current.savedPresets ?? [];

    if (action === "save") {
      const key = String(body.key ?? "").trim();
      const name = String(body.name ?? "").trim();
      const overrides =
        body.overrides && typeof body.overrides === "object"
          ? body.overrides
          : null;
      if (!key || !name || !overrides) {
        return NextResponse.json(
          { error: "key, name, overrides wajib" },
          { status: 400 },
        );
      }
      if (saved.some((p) => p.key === key)) {
        return NextResponse.json(
          { error: "Preset key sudah ada" },
          { status: 409 },
        );
      }
      const next = {
        ...current,
        savedPresets: [
          ...saved,
          { key, name, overrides, createdAt: new Date().toISOString() },
        ],
      };
      const updated = await prisma.websiteSubscription.update({
        where: { id: subscription.id },
        data: { customization: next as never },
        select: { customization: true },
      });
      return NextResponse.json(
        { ok: true, customization: parseCustomization(updated.customization) },
        { status: 201 },
      );
    }

    if (action === "apply") {
      const source = String(body.source ?? "");
      const key = String(body.key ?? "").trim();
      if (!key)
        return NextResponse.json({ error: "key wajib" }, { status: 400 });

      if (source === "builtin") {
        const allowed = new Set(
          listPresetOptions(subscription.template.structure).map((p) => p.key),
        );
        if (!allowed.has(key)) {
          return NextResponse.json(
            { error: "Preset tidak ditemukan" },
            { status: 404 },
          );
        }
        const next = { ...current, presetKey: key };
        const updated = await prisma.websiteSubscription.update({
          where: { id: subscription.id },
          data: { customization: next as never },
          select: { customization: true },
        });
        return NextResponse.json({
          ok: true,
          customization: parseCustomization(updated.customization),
        });
      }

      if (source === "saved") {
        const p = saved.find((x) => x.key === key);
        if (!p)
          return NextResponse.json(
            { error: "Preset tidak ditemukan" },
            { status: 404 },
          );
        const next = { ...current, overrides: p.overrides };
        const updated = await prisma.websiteSubscription.update({
          where: { id: subscription.id },
          data: { customization: next as never },
          select: { customization: true },
        });
        return NextResponse.json({
          ok: true,
          customization: parseCustomization(updated.customization),
        });
      }

      return NextResponse.json(
        { error: "source tidak valid" },
        { status: 400 },
      );
    }

    if (action === "delete") {
      const key = String(body.key ?? "").trim();
      if (!key)
        return NextResponse.json({ error: "key wajib" }, { status: 400 });
      const nextSaved = saved.filter((p) => p.key !== key);
      const next = { ...current, savedPresets: nextSaved };
      const updated = await prisma.websiteSubscription.update({
        where: { id: subscription.id },
        data: { customization: next as never },
        select: { customization: true },
      });
      return NextResponse.json({
        ok: true,
        customization: parseCustomization(updated.customization),
      });
    }

    return NextResponse.json({ error: "action tidak valid" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/website/engine/presets error:", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
