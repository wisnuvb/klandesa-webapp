import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTurnstile } from "@/lib/turnstile";
import { RATE, isFlagReason } from "@/lib/aspirasi/catalog";
import { failJson, ipHashOf, limitOrNull } from "@/lib/aspirasi/http";
import { isAspirationCode } from "@/lib/aspirasi/slug";
import { createFlag } from "@/lib/aspirasi/service";
import { notifyOwnerAspirasi } from "@/lib/aspirasi/notify";

/** Laporkan konten sebuah aspirasi (publik): data pribadi, fitnah, hoaks, spam, sudah selesai, atau lainnya. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code: raw } = await params;
    const code = raw.toLowerCase();
    if (!isAspirationCode(code)) return NextResponse.json({ error: "Laporan tidak ditemukan." }, { status: 404 });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const turnstile = await requireTurnstile(req, typeof body?.turnstileToken === "string" ? body.turnstileToken : null);
    if (!turnstile.ok) return turnstile.response;
    const ipHash = ipHashOf(req);
    const limited = await limitOrNull("aspirasi-flag-ip", ipHash, RATE.flagPerIp);
    if (limited) return limited;

    const r = await createFlag(prisma, code, { source: "PUBLIC", ipHash }, body);
    if (!r.ok) return failJson(r);
    const a = await prisma.aspiration.findUnique({ where: { code }, select: { title: true } });
    if (a && isFlagReason(body?.reason)) void notifyOwnerAspirasi({ kind: "flag", code, title: a.title, reason: body.reason, source: "PUBLIC", hidden: r.data.hidden });
    return NextResponse.json({ ok: true, hidden: r.data.hidden }, { status: 201 });
  } catch (e) {
    console.error("POST /api/aspirasi/[code]/flag error:", e);
    return NextResponse.json({ error: "Gagal mengirim laporan konten." }, { status: 500 });
  }
}
