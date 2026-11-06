import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { reviewThemePack, type ReviewAction } from "@/lib/website-engine/theme-pack-service";
import { prisma } from "@/lib/prisma";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf, clip } from "@/lib/platform/legacy-audit";
import { requireRisky } from "@/lib/platform/legacy-risky";

const ACTIONS = new Set<ReviewAction>(["approve", "reject", "withdraw"]);

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { action?: unknown; note?: unknown; price?: unknown } | null;
  const action = body?.action;
  if (typeof action !== "string" || !ACTIONS.has(action as ReviewAction)) {
    return NextResponse.json({ error: "action harus approve, reject, atau withdraw" }, { status: 400 });
  }

  // Menetapkan harga paket tema yang ditayangkan = menentukan tagihan desa: wajib konfirmasi sandi admin + alasan.
  // (Menolak/menarik/menyetujui tanpa harga tidak menyentuh uang.)
  let reason: string | null = null;
  if (action === "approve" && body?.price != null && body.price !== "") {
    const step = await requireRisky(auth.admin, body as Record<string, unknown>, req);
    if (!step.ok) return step.response;
    reason = step.reason;
  }

  const pack = await prisma.websiteThemePack.findUnique({ where: { id }, select: { key: true, version: true, name: true, status: true } });
  const result = await reviewThemePack({
    id,
    action: action as ReviewAction,
    note: typeof body?.note === "string" ? body.note.slice(0, 2000) : undefined,
    price: body?.price,
    reviewerId: auth.admin.platformUserId,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, errors: result.errors }, { status: result.status });
  }
  const note = typeof body?.note === "string" ? body.note.trim() : "";
  const label = { approve: "Menyetujui (menayangkan)", reject: "Menolak", withdraw: "Menarik dari katalog" }[action as ReviewAction];
  await auditPlatform(req, actorOf(auth), {
    action: "theme_pack.review",
    targetType: "system",
    targetId: `theme_pack:${id}`,
    summary: `${label} paket tema "${clip(pack?.name ?? "?", 80)}" (${pack?.key ?? "?"}@${pack?.version ?? "?"})`,
    metadata: {
      themePackId: id,
      review: action,
      ...(reason ? { reason } : {}),
      before: { status: pack?.status ?? null },
      after: { status: result.status, templateId: result.templateId ?? null },
      ...(typeof body?.price === "number" ? { priceIdr: body.price } : {}),
      ...(note ? { note: clip(note, 300) } : {}),
    },
  });
  return NextResponse.json({ ok: true, status: result.status, templateId: result.templateId });
}
