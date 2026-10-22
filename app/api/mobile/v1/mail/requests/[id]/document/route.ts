import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { findIssuedLetter } from "@/lib/mobile/mail-data";

/** HTML surat yang sudah diterbitkan; app mengubahnya menjadi PDF di perangkat (expo-print). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  const id = Number((await params).id);
  if (!me || !Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const r = await prisma.mailRequest.findFirst({ where: { id: BigInt(id), villageId: loaded.ctx.villageId, residentId: me.id, status: "approved" } });
  const letter = r ? await findIssuedLetter(r) : null;
  if (!r || !letter) return mobileError("INVALID_REQUEST", "Surat belum tersedia untuk diunduh.", 404);

  const full = await prisma.mailService.findUnique({ where: { id: letter.id }, select: { contentHtml: true, letterNumber: true, templateName: true } });
  if (!full?.contentHtml) return mobileError("INVALID_REQUEST", "Surat belum tersedia untuk diunduh. Hubungi kantor desa.", 404);
  await prisma.mailHistory.create({ data: { mailServiceId: letter.id, action: "downloaded_mobile", changes: { residentId: me.id } } }).catch(() => undefined);

  return NextResponse.json({ title: full.templateName, letterNumber: full.letterNumber, html: full.contentHtml });
}
