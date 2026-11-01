import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord, pickSummary } from "@/lib/audit/diff";
import { parsePlanInput } from "@/lib/rpjmdes/schemas";
import { legacyPlanEditBlock } from "@/lib/rpjm/steps";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await params;
    const planId = Number(id);
    if (!Number.isFinite(planId) || planId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const input = parsePlanInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }
    if (input.periodEnd < input.periodStart) {
      return NextResponse.json({ error: "Tahun akhir harus >= tahun awal" }, { status: 400 });
    }

    // Seluruh pemeriksaan dan penulisan di bawah kunci baris dokumen (pernyataan pertama transaksi), sama seperti alur tahapan.
    const out = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rpjmdes_plans WHERE id = ${planId} AND villageId = ${village.id} FOR UPDATE`;
      const existing = await tx.rpjmdesPlan.findFirst({ where: { id: planId, villageId: village.id } });
      if (!existing) return { error: "Rencana tidak ditemukan", status: 404 as const };
      const blocked = legacyPlanEditBlock(existing, { title: input.title, periodStart: input.periodStart, periodEnd: input.periodEnd, vision: input.vision ?? null, mission: input.mission ?? null });
      if (blocked) return { error: blocked, status: 409 as const };
      const outside = await tx.rpjmProgram.count({ where: { planId, villageId: village.id, OR: [{ year: { lt: input.periodStart } }, { year: { gt: input.periodEnd } }] } });
      if (outside > 0) {
        return { error: `Ada ${outside} program RPJM Desa di luar periode baru. Ubah atau hapus program itu dahulu.`, status: 409 as const };
      }
      const updated = await tx.rpjmdesPlan.update({
        where: { id: planId },
        data: {
          title: input.title,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          vision: input.vision,
          mission: input.mission,
          ...(input.status ? { status: input.status } : {}),
        },
      });
      return { existing, updated };
    });
    if ("error" in out) return NextResponse.json({ error: out.error }, { status: out.status });
    const { existing, updated } = out;

    await auditWeb(req, loaded.ctx, "update", "rpjmdes_plans", planId, diffRecord(existing, updated, { maskedFields: new Set(["vision", "mission"]), ignoreFields: new Set(["updatedAt"]) }));

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (e) {
    console.error("PATCH /api/rpjmdes/plans/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const loaded = await requireVillageApiContext(_req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id } = await params;
    const planId = Number(id);
    if (!Number.isInteger(planId) || planId <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }
    const out = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM rpjmdes_plans WHERE id = ${planId} AND villageId = ${village.id} FOR UPDATE`;
      const existing = await tx.rpjmdesPlan.findFirst({ where: { id: planId, villageId: village.id } });
      if (!existing) return { error: "Rencana tidak ditemukan", status: 404 as const };
      if (existing.legalDocumentId !== null) {
        return { error: "RPJM Desa ini sudah ditetapkan dengan Peraturan Desa dan tidak dapat dihapus.", status: 409 as const };
      }
      const programs = await tx.rpjmProgram.count({ where: { planId, villageId: village.id } });
      if (programs > 0) {
        return { error: `RPJM Desa ini memiliki ${programs} program. Hapus programnya dahulu di menu Tahapan RPJM Desa.`, status: 409 as const };
      }
      await tx.rpjmdesPlan.delete({ where: { id: planId } });
      return { existing };
    });
    if ("error" in out) return NextResponse.json({ error: out.error }, { status: out.status });
    const { existing } = out;
    await auditWeb(_req, loaded.ctx, "delete", "rpjmdes_plans", planId, pickSummary(existing, ["title", "periodStart", "periodEnd", "status"]));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/rpjmdes/plans/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
