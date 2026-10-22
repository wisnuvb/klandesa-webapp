import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { roleCan, normalizeVillageRole } from "@/lib/permissions";

/** Antrean pendaftaran warga yang menunggu persetujuan (mode desa "approval"). */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  if (!roleCan("residents", "read", normalizeVillageRole(ctx.role))) {
    return mobileError("FORBIDDEN", "Anda tidak punya akses.", 403);
  }
  const rows = await prisma.citizenAccount.findMany({
    where: { villageId: ctx.villageId, status: "PENDING_VERIFY" },
    include: { resident: { select: { name: true, nik: true, rt: true, rw: true, address: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  return NextResponse.json({
    items: rows.map((a) => ({
      id: a.id, username: a.username, createdAt: a.createdAt,
      name: a.resident.name, nikMasked: `${a.resident.nik.slice(0, 4)}••••••••${a.resident.nik.slice(-4)}`,
      rt: a.resident.rt, rw: a.resident.rw, address: a.resident.address,
    })),
  });
}
