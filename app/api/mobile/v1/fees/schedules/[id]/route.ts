import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { ownSchedule, requireFeeActor } from "@/lib/mobile/fees";
import { isOwnReportPhotoUrl } from "@/lib/mobile/report-logic";
import { getSpacesConfig } from "@/lib/spaces";
import { isPeriod, comparePeriods } from "@/lib/mobile/fees-logic";

/** Ubah jadwal: nama, cara bayar, QRIS, nonaktifkan, atau tetapkan periode akhir. Nominal tidak diubah agar tagihan lama tetap konsisten. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireFeeActor(req, "write");
  if (!g.ok) return g.response;
  const id = Number((await params).id);
  const s = Number.isInteger(id) ? await ownSchedule(g.actor, id) : null;
  if (!s) return mobileError("INVALID_REQUEST", "Jadwal tidak ditemukan.", 404);
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const data: Record<string, unknown> = {};
  if (typeof b?.name === "string") {
    const n = b.name.trim().replace(/\s+/g, " ");
    if (n.length < 3 || n.length > 80) return mobileError("INVALID_REQUEST", "Nama iuran 3–80 huruf.", 400);
    data.name = n;
  }
  if (typeof b?.payInfo === "string") data.payInfo = b.payInfo.trim().slice(0, 500) || null;
  if (b && "payQrUrl" in b) {
    if (b.payQrUrl === null || b.payQrUrl === "") data.payQrUrl = null;
    else if (isOwnReportPhotoUrl(b.payQrUrl, getSpacesConfig().cdnBaseUrl, g.actor.villageCode, "mobile-fees")) data.payQrUrl = b.payQrUrl;
    else return mobileError("INVALID_REQUEST", "Gambar QRIS tidak valid.", 400);
  }
  if (typeof b?.isActive === "boolean") data.isActive = b.isActive;
  if (b && "endPeriod" in b) {
    if (b.endPeriod === null) data.endPeriod = null;
    else if (isPeriod(b.endPeriod) && comparePeriods(b.endPeriod, s.startPeriod) >= 0) data.endPeriod = b.endPeriod;
    else return mobileError("INVALID_REQUEST", "Periode akhir tidak valid.", 400);
  }
  if (Object.keys(data).length === 0) return mobileError("INVALID_REQUEST", "Tidak ada yang diubah.", 400);
  await prisma.feeSchedule.update({ where: { id: s.id }, data });
  return new NextResponse(null, { status: 204 });
}
