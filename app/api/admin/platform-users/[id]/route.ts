import { NextRequest } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { requireStepUp } from "@/lib/platform/step-up";
import { forceLogoutAdmin, resetAdminTwoFactor, sendAdminAccessLink, setAdminActive, unlockAdmin } from "@/lib/platform/admins/service";
import { REASON_ERROR, isAdminAction, parsePositiveInt, parseReason } from "@/lib/platform/admins/validation";
import { jsonNoStore, readBody } from "@/lib/platform/admins/http";

export const dynamic = "force-dynamic";

/**
 * Aksi pada admin platform lain (atau diri sendiri untuk force_logout): body `{ action, confirmPassword, reason }`.
 * action: deactivate | activate | force_logout | reset_link | resend_invite | reset_2fa | unlock (buka kunci laju login/2FA). Semuanya step-up + alasan + audit.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const body = await readBody(req);

  const step = await requireStepUp(admin.platformUserId, body.confirmPassword, { totpCode: body.totpCode, req });
  if (!step.ok) return step.response;
  const reason = parseReason(body.reason);
  if (!reason) return jsonNoStore({ error: REASON_ERROR }, { status: 400 });
  const targetId = parsePositiveInt((await ctx.params).id);
  if (!targetId) return jsonNoStore({ error: "ID admin tidak valid." }, { status: 400 });
  if (!isAdminAction(body.action)) return jsonNoStore({ error: "Aksi tidak dikenal." }, { status: 400 });

  const actor = { platformUserId: admin.platformUserId, email: admin.email };
  switch (body.action) {
    case "deactivate":
    case "activate": {
      const r = await setAdminActive(req, actor, targetId, body.action === "activate", reason);
      return r.ok ? jsonNoStore({ ok: true }) : jsonNoStore({ error: r.error }, { status: r.status });
    }
    case "force_logout": {
      const r = await forceLogoutAdmin(req, actor, targetId, reason);
      return r.ok ? jsonNoStore({ ok: true }) : jsonNoStore({ error: r.error }, { status: r.status });
    }
    case "reset_2fa": {
      const r = await resetAdminTwoFactor(req, actor, targetId, reason);
      return r.ok ? jsonNoStore({ ok: true }) : jsonNoStore({ error: r.error }, { status: r.status });
    }
    case "unlock": {
      const r = await unlockAdmin(req, actor, targetId, reason);
      return r.ok ? jsonNoStore({ ok: true, cleared: r.cleared }) : jsonNoStore({ error: r.error }, { status: r.status });
    }
    case "reset_link":
    case "resend_invite": {
      const r = await sendAdminAccessLink(req, actor, targetId, body.action === "resend_invite" ? "INVITE" : "RESET", reason);
      return r.ok ? jsonNoStore({ ok: true, delivery: r.delivery }) : jsonNoStore({ error: r.error }, { status: r.status });
    }
  }
}
