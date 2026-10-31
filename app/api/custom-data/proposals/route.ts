import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { SCHEMA_ROLES } from "@/lib/custom-data/http";
import { countPending, listProposals } from "@/lib/proposals/service";

/** Usulan dari aplikasi luar. `?status=all` menampilkan riwayat; bawaan hanya yang menunggu. `canDecide` = boleh menyetujui. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const all = req.nextUrl.searchParams.get("status") === "all";
    const [items, pending] = await Promise.all([
      listProposals(prisma, { villageId: ctx.village.id, status: all ? "ALL" : "PENDING" }),
      countPending(prisma, ctx.village.id),
    ]);
    return NextResponse.json({ canDecide: SCHEMA_ROLES.has(ctx.dbUser.role), pending, items });
  } catch (e) {
    console.error("GET /api/custom-data/proposals error:", e);
    return NextResponse.json({ error: "Gagal memuat usulan" }, { status: 500 });
  }
}
