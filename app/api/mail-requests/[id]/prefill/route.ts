import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

/** Bahan untuk mengisi otomatis form Buat Surat dari satu permohonan: warga (bila ada di data desa), keperluan, nomor. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const idRaw = (await params).id;
    if (!/^\d{1,18}$/.test(idRaw)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const row = await prisma.mailRequest.findFirst({ where: { id: BigInt(idRaw), villageId: village.id } });
    if (!row) return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
    if (row.status === "rejected") return NextResponse.json({ error: "Permohonan ini sudah ditolak." }, { status: 409 });
    if (row.rtStatus === "pending" || row.rtStatus === "rejected") {
      return NextResponse.json({ error: "Permohonan ini belum mendapat pengantar Ketua RT." }, { status: 409 });
    }

    const resident = row.residentId
      ? await prisma.resident.findFirst({ where: { id: row.residentId, villageId: village.id }, select: { id: true } })
      : await prisma.resident.findFirst({ where: { villageId: village.id, nik: row.nik }, select: { id: true } });

    return NextResponse.json({
      requestNumber: row.requestNumber,
      name: row.name,
      purpose: row.purpose,
      residentId: resident?.id ?? null,
    });
  } catch (err) {
    console.error("GET /api/mail-requests/[id]/prefill error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
