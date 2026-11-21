import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf } from "@/lib/platform/legacy-audit";
import { handleFlag } from "@/lib/aspirasi/moderation";
import { failJson, parseBigId } from "@/lib/aspirasi/http";

/** Tutup laporan konten. Body: { decision: "action" | "dismiss", note? }. Tindakan atas aspirasinya (sembunyikan/hapus) lewat PATCH /api/admin/aspirasi/[id]. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const id = parseBigId((await params).id);
  if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  const body = await req.json().catch(() => null);
  const r = await handleFlag(prisma, id, { id: auth.admin.platformUserId, email: auth.admin.email }, body);
  if (!r.ok) return failJson(r);
  await auditPlatform(req, actorOf(auth), {
    action: "aspirasi.flag_handled",
    targetType: "system",
    targetId: `aspirasi_flag:${id}`,
    summary: `Laporan konten aspirasi #${id}: ${r.data.status}`,
    metadata: { status: r.data.status },
  });
  return NextResponse.json({ ok: true, status: r.data.status });
}
