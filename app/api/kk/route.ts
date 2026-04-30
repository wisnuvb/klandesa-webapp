import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? 10),
    );
    const sortKey = url.searchParams.get("sortKey") ?? undefined;
    const sortOrder =
      (url.searchParams.get("sortOrder") as "asc" | "desc") ?? "asc";
    const search = url.searchParams.get("search") ?? undefined;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const where: any = { villageId: village.id, kk: { not: null } };
    if (search) {
      where.OR = [
        { kk: { contains: search } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const grouped = await prisma.resident.groupBy({
      by: ["kk"],
      where,
      _count: { _all: true },
    });

    const summaries = await Promise.all(
      grouped.map(async (g) => {
        const kk = g.kk as string;
        const head = await prisma.resident.findFirst({
          where: { villageId: village.id, kk, familyRole: "Kepala Keluarga" },
        });
        const anyMember = head
          ? head
          : await prisma.resident.findFirst({
              where: { villageId: village.id, kk },
              orderBy: { createdAt: "asc" },
            });
        return {
          id: kk,
          family_card_number: kk,
          kepalaKeluarga: head?.name ?? anyMember?.name ?? "-",
          alamat: anyMember?.address ?? "-",
          rt: anyMember?.rt ?? "-",
          rw: anyMember?.rw ?? "-",
          hamlet: anyMember?.hamlet ?? "-",
          jumlahAnggota: g._count._all,
        };
      }),
    );

    const sorted = summaries.sort((a: any, b: any) => {
      const dir = sortOrder === "desc" ? -1 : 1;
      const key = sortKey ?? "family_card_number";
      const va: any =
        key === "jumlahAnggota" ? a.jumlahAnggota : (a as any)[key];
      const vb: any =
        key === "jumlahAnggota" ? b.jumlahAnggota : (b as any)[key];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total = sorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const rows = sorted.slice(start, end);

    return NextResponse.json({ rows, total });
  } catch (err) {
    console.error("GET /api/kk error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
