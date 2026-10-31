import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { decideTemplate, setTemplateOfficial, unpublishTemplate } from "@/lib/village-apps/service";

/**
 * Keputusan admin: { decision: "approve" | "reject" | "unpublish" | "official" | "unofficial", note?, official? }.
 * Penolakan dan pencabutan wajib beralasan. `unpublish` mencabut templat terbit dari galeri (pemasangan lama tetap jalan).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const raw = (await params).id;
  if (!/^\d{1,10}$/.test(raw)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const decision = body?.decision;
  if (decision === "unpublish" || decision === "official" || decision === "unofficial") {
    const r = decision === "unpublish" ? await unpublishTemplate(prisma, { id: Number(raw), adminId: auth.admin.platformUserId, reason: body?.note }) : await setTemplateOfficial(prisma, { id: Number(raw), official: decision === "official" });
    if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
    return NextResponse.json({ success: true, ...r.data });
  }
  if (decision !== "approve" && decision !== "reject") return NextResponse.json({ error: 'decision harus "approve", "reject", "unpublish", "official", atau "unofficial".' }, { status: 400 });
  const r = await decideTemplate(prisma, { id: Number(raw), adminId: auth.admin.platformUserId, decision: body.decision, note: body.note, official: body.official === true });
  if (!r.ok) return NextResponse.json({ error: r.errors[0] }, { status: r.status });
  return NextResponse.json({ success: true, status: r.data.status });
}
