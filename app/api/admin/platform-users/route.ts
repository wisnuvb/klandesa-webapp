import { NextRequest } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { requireStepUp } from "@/lib/platform/step-up";
import { listAdmins, inviteAdmin } from "@/lib/platform/admins/service";
import { REASON_ERROR, parseInviteInput, parseReason } from "@/lib/platform/admins/validation";
import { jsonNoStore, readBody } from "@/lib/platform/admins/http";

export const dynamic = "force-dynamic";

/** Daftar admin platform (maks 100): email, nama, aktif, 2FA aktif?, login terakhir. Tanpa hash/rahasia. */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  return jsonNoStore({ admins: await listAdmins(), me: auth.admin.platformUserId });
}

/** Undang admin baru: akun tanpa sandi usable + tautan atur sandi sekali pakai lewat email. Step-up + alasan wajib. */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const body = await readBody(req);

  const step = await requireStepUp(admin.platformUserId, body.confirmPassword, { totpCode: body.totpCode, req });
  if (!step.ok) return step.response;
  const reason = parseReason(body.reason);
  if (!reason) return jsonNoStore({ error: REASON_ERROR }, { status: 400 });
  const input = parseInviteInput(body);
  if (!input.ok) return jsonNoStore({ error: input.error }, { status: 400 });

  const res = await inviteAdmin(req, { platformUserId: admin.platformUserId, email: admin.email }, { email: input.email, name: input.name, reason });
  if (!res.ok) return jsonNoStore({ error: res.error }, { status: res.status });
  return jsonNoStore({ ok: true, admin: res.admin, delivery: res.delivery }, { status: 201 });
}
