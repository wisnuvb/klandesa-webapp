import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { createFamily } from "@/lib/kependudukan/family-service";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

/** Simpan satu keluarga (satu KK, banyak anggota) sekaligus. Atomik: bila ada yang bermasalah, tidak ada yang tersimpan. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!isVillageSubscriptionActive(ctx.village)) return subscriptionBlockedResponse(ctx.village);

    const r = await createFamily(prisma, { village: ctx.village, userId: ctx.userId ?? null, body: await req.json().catch(() => null) });
    if (!r.ok) return NextResponse.json({ error: r.error, ...(r.issues ? { issues: r.issues } : {}) }, { status: r.status });

    // Tanpa NIK, nama, atau alamat: hanya jumlah dan 4 digit akhir KK.
    await auditWeb(req, ctx, "create", "residents", "keluarga", { kkLast4: r.data.kk.slice(-4), members: r.data.created.length, mutations: r.data.mutations });
    return NextResponse.json({ success: true, created: r.data.created, mutations: r.data.mutations }, { status: 201 });
  } catch (e) {
    console.error("POST /api/residents/keluarga error:", e);
    return NextResponse.json({ error: "Gagal menyimpan keluarga" }, { status: 500 });
  }
}
