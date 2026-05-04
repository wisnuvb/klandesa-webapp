import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "User ID tidak valid" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as
    | { delta?: unknown; set?: unknown }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const delta =
    body.delta == null || body.delta === ""
      ? null
      : Number(body.delta);
  const set =
    body.set == null || body.set === ""
      ? null
      : Number(body.set);

  if (set == null && delta == null) {
    return NextResponse.json(
      { error: "Body harus berisi set atau delta" },
      { status: 400 },
    );
  }
  if (set != null && !Number.isFinite(set)) {
    return NextResponse.json({ error: "set tidak valid" }, { status: 400 });
  }
  if (delta != null && !Number.isFinite(delta)) {
    return NextResponse.json({ error: "delta tidak valid" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data:
      set != null
        ? { aiCredits: Math.max(0, Math.floor(set)) }
        : { aiCredits: { increment: Math.floor(delta as number) } },
    select: { id: true, email: true, aiCredits: true },
  });

  return NextResponse.json(
    { ok: true, user: updated, updatedBy: auth.admin.email },
    { status: 200 },
  );
}
