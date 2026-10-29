import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requirePermissionResponse } from "@/lib/permissions/require-permission";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { RESIDENT_SELECT, residentToPerson, type ResidentLike } from "@/lib/letters/registry";

/**
 * GET — isian orang untuk satu warga, hanya kolom allowlist registry (tanpa data kesehatan,
 * disabilitas, foto, dll.). Dipakai pratinjau surat setelah operator memilih warga.
 * Selain izin surat, wajib izin baca data warga.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);
    const denied = requirePermissionResponse(session, "residents", "read");
    if (denied) return denied;

    const { id: raw } = await ctx.params;
    const id = /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
    if (id <= 0) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const row = await prisma.resident.findFirst({
      where: { id, villageId: village.id },
      select: { id: true, ...RESIDENT_SELECT },
    });
    if (!row) return NextResponse.json({ error: "Warga tidak ditemukan" }, { status: 404 });

    const { id: _id, ...rest } = row;
    void _id;
    return NextResponse.json({ id: row.id, person: residentToPerson(rest as ResidentLike) });
  } catch (err) {
    console.error("GET /api/letters/residents/[id] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
