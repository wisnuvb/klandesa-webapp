import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";

/** Pelapor menjawab "Masalahnya sudah beres?". "Belum" membuka kembali laporan agar desa menindaklanjuti. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as { resolved?: unknown } | null;
  if (!me || !Number.isInteger(id) || typeof body?.resolved !== "boolean") {
    return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  }
  const r = await prisma.citizenReport.findFirst({
    where: { id: BigInt(id), villageId: loaded.ctx.villageId, residentId: me.id, status: "DONE", resolvedFeedback: null },
    select: { id: true },
  });
  if (!r) return mobileError("INVALID_REQUEST", "Laporan ini tidak bisa dinilai.", 404);

  if (body.resolved) {
    await prisma.citizenReport.update({ where: { id: r.id }, data: { resolvedFeedback: "RESOLVED", feedbackAt: new Date() } });
  } else {
    await prisma.$transaction([
      prisma.citizenReport.update({
        where: { id: r.id },
        data: { resolvedFeedback: "NOT_RESOLVED", feedbackAt: new Date(), status: "PENDING", doneById: null },
      }),
      prisma.citizenReportResponse.create({
        data: {
          citizenReportId: r.id, villageId: loaded.ctx.villageId,
          response: "Pelapor menyatakan masalah ini belum selesai dan meminta ditinjau kembali.",
          responderName: me.name, responderRole: "Warga (pelapor)",
        },
      }),
    ]);
  }
  return new NextResponse(null, { status: 204 });
}
