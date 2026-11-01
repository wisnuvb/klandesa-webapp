import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { presignResidentPhoto } from "@/lib/residents/photo-server";

/**
 * Presigned PUT untuk foto profil satu warga (dipanggil dua kali: foto penuh dan thumbnail).
 * Dipisah dari /api/residents/[id] agar izin yang dipakai "ubah" (lihat api-route-map), bukan "tambah".
 */
export async function POST(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const { village } = loaded.ctx;

  const body = (await req.json().catch(() => null)) as { residentId?: unknown; contentType?: unknown; fileSize?: unknown } | null;
  const residentId = Number(body?.residentId);
  if (!Number.isInteger(residentId) || residentId <= 0) return NextResponse.json({ error: "Data warga tidak valid." }, { status: 400 });

  const exists = await prisma.resident.findFirst({ where: { id: residentId, villageId: village.id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "Data warga tidak ditemukan." }, { status: 404 });

  const r = await presignResidentPhoto(village, residentId, body?.contentType, body?.fileSize);
  if (!r.ok) return NextResponse.json({ error: r.message, ...(r.reason ? { reason: r.reason } : {}) }, { status: r.status });
  return NextResponse.json({ uploadUrl: r.uploadUrl, fileUrl: r.fileUrl, uploadHeaders: r.uploadHeaders });
}
