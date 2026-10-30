import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { reviewThemePack, type ReviewAction } from "@/lib/website-engine/theme-pack-service";

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
  return NextResponse.json({ ok: true, status: result.status, templateId: result.templateId });
}
