/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";
import { authOptions } from "@/auth";

async function resolveVillage(
  req: NextRequest,
  queryVillageCode?: string,
  session?: any
) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }
  if (queryVillageCode) {
    const village = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (village) return village;
  }
  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const village = await prisma.village.findUnique({
      where: { code: defaultCode },
    });
    if (village) return village;
  }
  const firstVillage = await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
  if (firstVillage) return firstVillage;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.max(
      1,
      Number(url.searchParams.get("pageSize") ?? 10)
    );
    const sortKey = url.searchParams.get("sortKey") ?? undefined; // family_card_number | kepalaKeluarga | jumlahAnggota
    const sortOrder =
      (url.searchParams.get("sortOrder") as "asc" | "desc") ?? "asc";
    const search = url.searchParams.get("search") ?? undefined;
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage(req, villageCode, session);
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia." },
        { status: 404 }
      );
    }

    const where: any = { villageId: village.id, kk: { not: null } };
    if (search) {
      where.OR = [
        { kk: { contains: search } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Group by KK to get counts
    const grouped = await prisma.resident.groupBy({
      by: ["kk"],
      where,
      _count: { _all: true },
    });

    // Build summary rows for current page
    // Sort in-memory based on requested sortKey
    const summaries = await Promise.all(
      grouped.map(async (g) => {
        const kk = g.kk as string;
        // Kepala keluarga if exists
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
      })
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
      { status: 500 }
    );
  }
}
