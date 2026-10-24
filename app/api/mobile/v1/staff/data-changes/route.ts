import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/mobile/staff";
import { maskNik } from "@/lib/mobile/mail-logic";
import { CHANGE_FIELDS, canApplyAutomatically, isChangeField } from "@/lib/mobile/data-change-logic";

function shown(field: string, v: string | null): string | null {
  if (v == null) return null;
  return field === "nik" || field === "kk" ? maskNik(v) : v;
}

/** Antrean koreksi data. `?scope=pending` (default) atau `done` (30 hari terakhir). NIK/KK ditampilkan tersamar. */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "residents", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const done = req.nextUrl.searchParams.get("scope") === "done";
  const rows = await prisma.dataChangeRequest.findMany({
    where: done
      ? { villageId: ctx.villageId, status: { in: ["approved", "rejected"] }, reviewedAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } }
      : { villageId: ctx.villageId, status: "pending" },
    orderBy: done ? { reviewedAt: "desc" } : { createdAt: "asc" },
    take: 100,
  });
  const people = await prisma.resident.findMany({
    where: { villageId: ctx.villageId, id: { in: [...new Set(rows.map((r) => r.residentId))] } },
    select: { id: true, name: true, nik: true },
  });
  const byId = new Map(people.map((p) => [p.id, p]));
  return NextResponse.json({
    items: rows.map((r) => {
      const p = byId.get(r.residentId);
      const known = isChangeField(r.field);
      return {
        id: r.id, residentName: p?.name ?? "Warga", nikMasked: p ? maskNik(p.nik) : null,
        field: r.field, fieldLabel: known ? CHANGE_FIELDS[r.field as keyof typeof CHANGE_FIELDS].label : r.field,
        oldValue: shown(r.field, r.oldValue), newValue: shown(r.field, r.newValue), note: r.note,
        autoApply: known && canApplyAutomatically(r.field as keyof typeof CHANGE_FIELDS),
        status: r.status, reviewNote: r.reviewNote, applied: r.appliedAt != null, createdAt: r.createdAt,
      };
    }),
  });
}
