import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { enrichRows } from "@/lib/mail/request-queue";
import { findIssuedLetter } from "@/lib/mobile/mail-data";

/** Rincian satu permohonan: baris + pemeriksaan server, data warga di desa, jenis surat, dan surat terbit (bila ada). */
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

    const [[item], resident, template, letter, history] = await Promise.all([
      enrichRows(village.id, [row]),
      row.residentId
        ? prisma.resident.findFirst({
            where: { id: row.residentId, villageId: village.id },
            select: { id: true, name: true, address: true, rt: true, rw: true, phone: true, isAlive: true },
          })
        : prisma.resident.findFirst({
            where: { villageId: village.id, nik: row.nik },
            select: { id: true, name: true, address: true, rt: true, rw: true, phone: true, isAlive: true },
          }),
      row.templateId
        ? prisma.mailTemplate.findFirst({ where: { id: row.templateId }, select: { id: true, name: true } })
        : prisma.mailTemplate.findFirst({
            where: { name: row.mailType, isActive: true, OR: [{ villageId: village.id }, { villageId: null }] },
            select: { id: true, name: true },
          }),
      row.mailServiceId != null
        ? prisma.mailService.findFirst({
            where: { id: row.mailServiceId, villageId: village.id },
            select: { id: true, letterNumber: true, letterDate: true, status: true },
          })
        : row.status === "approved"
          ? findIssuedLetter(row).then((l) => (l ? { ...l, status: "completed" } : null))
          : Promise.resolve(null),
      // Riwayat pemohon yang sama (tanpa status RT/isi) untuk konteks cepat.
      prisma.mailRequest.findMany({
        where: { villageId: village.id, nik: row.nik, id: { not: row.id } },
        orderBy: { requestDate: "desc" },
        take: 5,
        select: { id: true, requestNumber: true, mailType: true, status: true, requestDate: true },
      }),
    ]);

    const formNote =
      row.formData && typeof row.formData === "object" && !Array.isArray(row.formData) && typeof (row.formData as { note?: unknown }).note === "string"
        ? String((row.formData as { note: string }).note).slice(0, 500)
        : null;

    return NextResponse.json({
      request: item,
      formNote,
      resident: resident
        ? { id: resident.id, name: resident.name, address: resident.address, rt: resident.rt, rw: resident.rw, phone: resident.phone, isAlive: resident.isAlive }
        : null,
      template: template ? { id: template.id, name: template.name } : null,
      letter: letter ? { id: Number(letter.id), letterNumber: letter.letterNumber, letterDate: letter.letterDate.toISOString(), status: letter.status } : null,
      history: history.map((h) => ({
        id: Number(h.id),
        requestNumber: h.requestNumber,
        mailType: h.mailType,
        status: h.status,
        requestDate: h.requestDate.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/mail-requests/[id] error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
