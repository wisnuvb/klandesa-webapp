import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { inspectActivity, inspectHealth, inspectModules, inspectUsers } from "@/lib/platform/villages/queries";
import { badId, notFound, parseVillageId, type VillageRouteCtx } from "@/lib/platform/villages/route-helpers";

export const dynamic = "force-dynamic";

const SECTIONS = ["users", "activity", "health", "modules"] as const;

/**
 * Inspektur Desa BACA-SAJA. Hanya agregat dan data tersamar (email disamarkan; tanpa NIK/telepon; `changes` audit tidak
 * dikembalikan, hanya nama kolom tak sensitif). Melihat data pribadi sengaja tidak tersedia di sini.
 */
export async function GET(req: NextRequest, ctx: VillageRouteCtx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const id = parseVillageId((await ctx.params).id);
  if (id == null) return badId();

  const section = req.nextUrl.searchParams.get("section") ?? "";
  if (!(SECTIONS as readonly string[]).includes(section)) {
    return NextResponse.json({ error: `Bagian tidak dikenal. Pilihan: ${SECTIONS.join(", ")}.` }, { status: 400 });
  }
  const limitRaw = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 50;

  const exists = await prisma.village.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return notFound();

  const noStore = { "Cache-Control": "no-store" };
  switch (section) {
    case "users":
      return NextResponse.json(await inspectUsers(id, limit), { headers: noStore });
    case "activity":
      return NextResponse.json(await inspectActivity(id, limit), { headers: noStore });
    case "modules":
      return NextResponse.json(await inspectModules(id), { headers: noStore });
    default: {
      const health = await inspectHealth(id);
      if (!health) return notFound();
      return NextResponse.json(health, { headers: noStore });
    }
  }
}
