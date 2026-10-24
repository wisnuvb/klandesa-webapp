import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { loadBumdesApiContext, requireBumdesManage } from "@/lib/bumdes/api-context";
import { parseOptionalString, parseRequiredString } from "@/lib/bumdes/schemas";
import { isAddonActive, bumdesLimit } from "@/lib/modules/resource-limits";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";

export async function GET(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req, { requireExisting: true });
  if (!loaded.ok) return loaded.response;
  if ("needsBootstrap" in loaded && loaded.needsBootstrap) {
    return NextResponse.json({ error: "BUMDes belum dibuat" }, { status: 404 });
  }

  const { village } = loaded.ctx;
  const [addons, units] = await Promise.all([
    loadActiveModuleSubs(village.id),
    prisma.bumdesUnit.findMany({
      where: { bumdesId: loaded.ctx.bumdes!.id },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { transactions: true } },
      },
    }),
  ]);

  const hasAddon = isAddonActive("bumdes", addons);
  const limit = bumdesLimit(village.subscriptionPlan, village.subscriptionStatus, hasAddon);
  const cap = limit?.units ?? null;
  const isOverLimit = cap !== null && units.length > cap;
  const rows = cap !== null ? units.slice(0, cap) : units;

  return NextResponse.json({
    success: true,
    data: toJSONSafe(rows),
    limit: cap,
    total: units.length,
    hiddenCount: isOverLimit ? units.length - cap! : 0,
    isOverLimit,
  });
}

export async function POST(req: NextRequest) {
  const loaded = await loadBumdesApiContext(req, { requireExisting: true });
  if (!loaded.ok) return loaded.response;
  if ("needsBootstrap" in loaded && loaded.needsBootstrap) {
    return NextResponse.json({ error: "BUMDes belum dibuat" }, { status: 404 });
  }

  const deny = requireBumdesManage(loaded.ctx);
  if (deny) return deny;

  const { village } = loaded.ctx;
  const [addonsPost, currentCount] = await Promise.all([
    loadActiveModuleSubs(village.id),
    prisma.bumdesUnit.count({ where: { bumdesId: loaded.ctx.bumdes!.id } }),
  ]);
  const postLimit = bumdesLimit(village.subscriptionPlan, village.subscriptionStatus, isAddonActive("bumdes", addonsPost));
  if (postLimit !== null && currentCount >= postLimit.units) {
    return NextResponse.json(
      { error: "RESOURCE_LIMIT_REACHED", limit: postLimit.units, current: currentCount, module: "bumdes", billingUrl: "/billing?module=bumdes" },
      { status: 402 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const name = parseRequiredString(body.name, 255);
  if (!name) {
    return NextResponse.json({ error: "Nama unit wajib diisi" }, { status: 400 });
  }

  const category = parseOptionalString(body.category, 100);
  const description = parseOptionalString(body.description, 5000);

  const unit = await prisma.bumdesUnit.create({
    data: {
      bumdesId: loaded.ctx.bumdes!.id,
      name,
      category: category ?? undefined,
      description: description ?? undefined,
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(unit),
    message: "Unit usaha ditambahkan",
  });
}
