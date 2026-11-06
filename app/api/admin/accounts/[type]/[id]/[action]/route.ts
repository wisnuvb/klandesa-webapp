import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatform, auditPlatformStrict } from "@/lib/platform/audit";
import { ACTIONS_BY_KIND, runAccountAction } from "@/lib/platform/accounts/actions";
import { NO_STORE, readRiskyBody } from "@/lib/platform/accounts/route-helpers";
import { parseAccountKind, parseId } from "@/lib/platform/accounts/validate";

/**
 * POST /api/admin/accounts/[staff|citizen]/[id]/[action]
 * staff: reset-link | deactivate | activate | force-logout | change-email | ai-credits | unlock
 * citizen: reset-code | deactivate | activate | force-logout | unlock
 * Body: { confirmPassword, reason, ...parameter aksi } (deactivate admin terakhir: force=true; change-email: newEmail; ai-credits: set|delta).
 * Respons `manualLink` (reset-link) dan `code` (reset-code) muncul SEKALI dan tidak disimpan/dicatat.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ type: string; id: string; action: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const p = await ctx.params;
  const kind = parseAccountKind(p.type);
  const id = parseId(p.id);
  if (!kind || id == null) return NextResponse.json({ error: "Jenis atau ID akun tidak valid." }, { status: 400 });
  if (!ACTIONS_BY_KIND[kind].includes(p.action)) return NextResponse.json({ error: "Aksi tidak dikenal untuk jenis akun ini." }, { status: 404 });

  const input = await readRiskyBody(req, auth.admin);
  if (!input.ok) return input.response;

  const actor = { platformUserId: auth.admin.platformUserId, email: auth.admin.email };
  const result = await runAccountAction(
    {
      db: prisma,
      reason: input.reason,
      audit: (e) => auditPlatform(req, actor, e),
      auditStrict: (e) => auditPlatformStrict(req, actor, e),
    },
    kind, id, p.action, input.body,
  ).catch((err) => {
    console.error("[admin/accounts] aksi gagal:", p.action, err instanceof Error ? err.message : err);
    return null;
  });
  if (!result) return NextResponse.json({ error: "Aksi gagal dijalankan. Coba lagi." }, { status: 500 });
  if (!result.ok) return NextResponse.json({ error: result.error, ...(result.code ? { code: result.code } : {}) }, { status: result.status });
  return NextResponse.json({ ok: true, ...result.data }, { headers: NO_STORE });
}
