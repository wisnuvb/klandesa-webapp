import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, CONDITION_LABEL, DISPOSAL_REASON_LABEL, LIMITS, ORIGIN_LABEL } from "@/lib/aset-desa/catalog";
import { createItem, listItems, summarize } from "@/lib/aset-desa/service";
import { failResponse } from "@/lib/aset-desa/http";
import { normalizeVillageRole, roleCan } from "@/lib/permissions";

/** Daftar barang buku inventaris (?status=ACTIVE|DISPOSED&category=&search=&page=&pageSize=) beserta ringkasan dan istilah layar. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") === "DISPOSED" ? "DISPOSED" : sp.get("status") === "ACTIVE" ? "ACTIVE" : undefined;
    const page = Math.max(1, Math.min(100000, Number(sp.get("page")) || 1));
    const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize")) || 25));
    const search = sp.get("search")?.trim().slice(0, 100) || undefined;
    const [list, summary] = await Promise.all([
      listItems(prisma, ctx.village.id, { status, category: sp.get("category") ?? undefined, search, page, pageSize }),
      summarize(prisma, ctx.village.id),
    ]);
    const role = normalizeVillageRole(ctx.dbUser.role);
    return NextResponse.json({
      ...list,
      summary,
      can: {
        create: roleCan("aset_desa", "create", role),
        update: roleCan("aset_desa", "update", role),
        dispose: roleCan("aset_desa", "delete", role),
        export: roleCan("aset_desa", "export", role),
      },
      limits: { items: LIMITS.itemsPerVillage },
      terms: { categories: CATEGORIES, origins: ORIGIN_LABEL, conditions: CONDITION_LABEL, disposalReasons: DISPOSAL_REASON_LABEL },
    });
  } catch (e) {
    console.error("GET /api/aset-desa error:", e);
    return NextResponse.json({ error: "Gagal memuat buku inventaris" }, { status: 500 });
  }
}

/** Catat barang baru ke buku inventaris. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const r = await createItem(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "inventory_items", r.data.id, { name: r.data.name, category: r.data.category, quantity: r.data.quantity });
    return NextResponse.json({ success: true, item: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/aset-desa error:", e);
    return NextResponse.json({ error: "Gagal mencatat barang" }, { status: 500 });
  }
}
