import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { decideTemplate, setTemplateOfficial, unpublishTemplate } from "@/lib/village-apps/service";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf, clip } from "@/lib/platform/legacy-audit";
import { requireRisky } from "@/lib/platform/legacy-risky";

/**
 * Keputusan admin: { decision: "approve" | "reject" | "unpublish" | "official" | "unofficial", note?, official?, confirmPassword?, reason? }.
 * Memberi/mencabut status Resmi (decision official/unofficial, atau approve dengan official:true) wajib konfirmasi sandi admin + alasan.
 * Penolakan dan pencabutan wajib beralasan. `unpublish` mencabut templat terbit dari galeri (pemasangan lama tetap jalan).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const raw = (await params).id;
  // Int32: id lebih besar dari itu pasti tidak ada (dan akan menjadi galat basis data).
  if (!/^\d{1,10}$/.test(raw) || Number(raw) > 2_147_483_647) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  const id = Number(raw);
  if (decision !== "unpublish" && decision !== "official" && decision !== "unofficial" && decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: 'decision harus "approve", "reject", "unpublish", "official", atau "unofficial".' }, { status: 400 });
  }
  // Lencana "Resmi" = kepercayaan/penempatan istimewa di galeri: wajib konfirmasi sandi admin + alasan.
  let reason: string | null = null;
  if (decision === "official" || decision === "unofficial" || (decision === "approve" && body.official === true)) {
    const step = await requireRisky(auth.admin, body as Record<string, unknown>, req);
    if (!step.ok) return step.response;
    reason = step.reason;
  }
  const tpl = await prisma.appTemplate.findUnique({ where: { id }, select: { name: true, status: true, official: true, publisherName: true } });
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const audit = async (after: Record<string, unknown>) => {
    const verb = { approve: "Menyetujui & menerbitkan", reject: "Menolak", unpublish: "Mencabut dari galeri", official: "Memberi lencana Resmi pada", unofficial: "Mencabut lencana Resmi dari" }[decision as string];
    await auditPlatform(req, actorOf(auth), {
      action: "app_template.decision",
      targetType: "system",
      targetId: `app_template:${id}`,
      summary: `${verb} templat aplikasi desa "${clip(tpl?.name ?? "?", 80)}" (#${id}, penerbit ${clip(tpl?.publisherName ?? "?", 60)})`,
      metadata: { templateId: id, decision, ...(reason ? { reason } : {}), before: { status: tpl?.status ?? null, official: tpl?.official ?? null }, after, ...(note ? { note: clip(note, 300) } : {}) },
    });
  };
  if (decision === "unpublish" || decision === "official" || decision === "unofficial") {
    const r = decision === "unpublish" ? await unpublishTemplate(prisma, { id, adminId: auth.admin.platformUserId, reason: body?.note }) : await setTemplateOfficial(prisma, { id, official: decision === "official" });
    if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
    await audit({ ...r.data });
    return NextResponse.json({ success: true, ...r.data });
  }
  const r = await decideTemplate(prisma, { id, adminId: auth.admin.platformUserId, decision, note: body.note, official: body.official === true });
  if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
  await audit({ status: r.data.status, ...(decision === "approve" ? { official: body.official === true } : {}) });
  return NextResponse.json({ success: true, status: r.data.status });
}
