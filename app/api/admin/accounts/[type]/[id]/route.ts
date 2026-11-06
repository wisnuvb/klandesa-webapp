import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { parseAccountKind, parseId } from "@/lib/platform/accounts/validate";
import { loadAccountDetail } from "@/lib/platform/accounts/detail";
import { NO_STORE } from "@/lib/platform/accounts/route-helpers";

/** GET /api/admin/accounts/[staff|citizen]/[id] — detail akun (tersamar), sesi mobile aktif, status tautan atur sandi, 20 jejak audit terakhir. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const p = await ctx.params;
  const kind = parseAccountKind(p.type);
  const id = parseId(p.id);
  if (!kind || id == null) return NextResponse.json({ error: "Jenis atau ID akun tidak valid." }, { status: 400 });
  const detail = await loadAccountDetail(prisma, kind, id);
  if (!detail) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  return NextResponse.json({ account: detail }, { headers: NO_STORE });
}
