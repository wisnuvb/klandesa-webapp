import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { SCHEMA_ROLES } from "@/lib/custom-data/http";
import { listGallery, listInstalls } from "@/lib/village-apps/service";

/** Galeri Aplikasi Desa: templat yang sudah ditinjau, templat milik desa ini (semua status), dan aplikasi yang sudah terpasang. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const [gallery, installs] = await Promise.all([listGallery(prisma, ctx.village.id), listInstalls(prisma, ctx.village.id)]);
    return NextResponse.json({ canManage: SCHEMA_ROLES.has(ctx.dbUser.role), ...gallery, installs });
  } catch (e) {
    console.error("GET /api/custom-data/gallery error:", e);
    return NextResponse.json({ error: "Gagal memuat galeri" }, { status: 500 });
  }
}
