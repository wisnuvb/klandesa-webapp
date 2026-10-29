import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { isMe, requireSocial } from "@/lib/mobile/social";
import { notifyVillageStaff } from "@/lib/mobile/notify";
import { HIDE_REPORT_THRESHOLD, isReportReason } from "@/lib/mobile/social-logic";

/**
 * Laporkan postingan/komentar. Satu pelapor satu kali per konten; ≥3 pelapor berbeda → konten
 * disembunyikan sementara dan masuk antrean moderator.
 */
export async function POST(req: NextRequest) {
  const g = await requireSocial(req);
  if (!g.ok) return g.response;
  const { s } = g;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const targetType = body?.targetType === "post" || body?.targetType === "comment" ? body.targetType : null;
  const targetIdRaw = String(body?.targetId ?? "");
  if (!targetType || !/^\d{1,18}$/.test(targetIdRaw) || !isReportReason(body?.reason)) {
    return mobileError("INVALID_REQUEST", "Pilih alasan laporan.", 400);
  }
  const targetId = BigInt(targetIdRaw);
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 300) || null : null;

  const target = targetType === "post"
    ? await prisma.socialPost.findFirst({ where: { id: targetId, villageId: s.ctx.villageId, status: { in: ["PUBLISHED", "HIDDEN"] } }, select: { authorType: true, authorId: true } })
    : await prisma.socialComment.findFirst({ where: { id: targetId, villageId: s.ctx.villageId, status: { in: ["PUBLISHED", "HIDDEN"] } }, select: { authorType: true, authorId: true } });
  if (!target) return mobileError("INVALID_REQUEST", "Konten tidak ditemukan.", 404);
  if (isMe(s, target.authorType, target.authorId)) return mobileError("INVALID_REQUEST", "Ini konten Anda sendiri. Gunakan Hapus.", 400);

  try {
    await prisma.socialReport.create({
      data: { villageId: s.ctx.villageId, targetType, targetId, reporterType: s.me.type, reporterId: s.account.id, reason: body!.reason as string, note },
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return new NextResponse(null, { status: 204 }); // sudah pernah melapor: idempoten
    throw e;
  }

  const unique = await prisma.socialReport.count({ where: { targetType, targetId, status: "OPEN" } });
  // Konten perangkat desa tidak disembunyikan otomatis (agar tak bisa dibungkam lewat laporan massal); moderator tetap diberi tahu.
  const autoHide = target.authorType !== "staff";
  const update = { reportsCount: unique, ...(autoHide && unique >= HIDE_REPORT_THRESHOLD ? { status: "HIDDEN" } : {}) };
  if (targetType === "post") await prisma.socialPost.updateMany({ where: { id: targetId, status: { in: ["PUBLISHED", "HIDDEN"] } }, data: update });
  else await prisma.socialComment.updateMany({ where: { id: targetId, status: { in: ["PUBLISHED", "HIDDEN"] } }, data: update });

  if (unique === HIDE_REPORT_THRESHOLD) {
    void notifyVillageStaff(s.ctx.villageId, "forum", { type: "system", title: autoHide ? "Konten warga disembunyikan karena dilaporkan" : "Konten perangkat desa dilaporkan warga", body: `${unique} laporan. Tinjau sekarang.`, deepLink: "/staff/moderasi" });
  }
  return new NextResponse(null, { status: 204 });
}
