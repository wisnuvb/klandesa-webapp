import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { findIssuedLetter } from "@/lib/mobile/mail-data";
import { describeMailRequest, formatEstimate, medianProcessHours } from "@/lib/mobile/mail-logic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  const id = Number((await params).id);
  if (!me || !Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const r = await prisma.mailRequest.findFirst({ where: { id: BigInt(id), villageId: loaded.ctx.villageId, residentId: me.id } });
  if (!r) return mobileError("INVALID_REQUEST", "Permohonan tidak ditemukan.", 404);

  const letter = r.status === "approved" ? await findIssuedLetter(r) : null;
  const view = describeMailRequest(r, !!letter);

  let estimate: string | null = null;
  if (r.status === "pending") {
    const done = await prisma.mailRequest.findMany({
      where: { villageId: r.villageId, mailType: r.mailType, status: "approved", processedDate: { not: null }, requestDate: { gte: new Date(Date.now() - 90 * 24 * 3600 * 1000) } },
      select: { requestDate: true, processedDate: true },
      take: 200,
    });
    estimate = formatEstimate(medianProcessHours(done.map((d) => d.processedDate!.getTime() - d.requestDate.getTime())));
  }

  return NextResponse.json({
    id: Number(r.id), number: r.requestNumber, type: r.mailType, forName: r.name, purpose: r.purpose,
    onBehalf: r.onBehalfResidentId != null, createdAt: r.requestDate,
    stage: view.stage, title: view.title, next: view.next, steps: view.steps, estimate,
    canDownload: !!letter, canRetry: r.status === "rejected", templateId: r.templateId,
  });
}
