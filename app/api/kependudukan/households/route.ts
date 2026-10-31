import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireV2 } from "@/lib/kependudukan/api";

/** Daftar rumah tangga (KK). Filter: q (nama kepala / akhir nomor KK), status, tanpaKepala=1, wilayahId. NIK tidak dikirim. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;
    const off = requireV2(village);
    if (off) return off;

    const sp = req.nextUrl.searchParams;
    const q = (sp.get("q") ?? "").trim().slice(0, 100);
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));
    const status = sp.get("status") === "INACTIVE" ? "INACTIVE" : sp.get("status") === "ALL" ? undefined : "ACTIVE";
    const wilayahId = parseInt(sp.get("wilayahId") ?? "", 10);

    const where: Prisma.HouseholdWhereInput = {
      villageId: village.id,
      ...(status ? { status } : {}),
      ...(sp.get("tanpaKepala") === "1" ? { headResidentId: null } : {}),
      ...(Number.isInteger(wilayahId) ? { wilayahUnitId: wilayahId } : {}),
      ...(q ? { OR: [{ kkNumber: { endsWith: q.replace(/\D/g, "") || "__none__" } }, { members: { some: { name: { contains: q } } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.household.findMany({
        where,
        orderBy: { id: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          kkNumber: true,
          status: true,
          address: true,
          rt: true,
          rw: true,
          hamlet: true,
          headResident: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }),
      prisma.household.count({ where }),
    ]);
    return NextResponse.json({
      total,
      page,
      limit,
      items: rows.map((h) => ({
        id: h.id,
        kkNumber: h.kkNumber,
        status: h.status,
        address: h.address,
        rt: h.rt,
        rw: h.rw,
        hamlet: h.hamlet,
        head: h.headResident,
        memberCount: h._count.members,
      })),
    });
  } catch (e) {
    console.error("GET /api/kependudukan/households error:", e);
    return NextResponse.json({ error: "Gagal memuat rumah tangga" }, { status: 500 });
  }
}
