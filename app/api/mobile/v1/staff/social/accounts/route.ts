import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { notifyAccount } from "@/lib/mobile/notify";

/** Sanksi akun di fitur Warga: `{ accountId, action: "mute"|"ban"|"clear", days? }`. */
export async function POST(req: NextRequest) {
  const g = await requireStaff(req, "forum", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const body = (await req.json().catch(() => null)) as { accountId?: unknown; action?: unknown; days?: unknown } | null;
  const accountId = Number(body?.accountId);
  const action = body?.action;
  if (!Number.isInteger(accountId) || (action !== "mute" && action !== "ban" && action !== "clear")) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const acc = await prisma.citizenAccount.findFirst({ where: { id: accountId, villageId: ctx.villageId }, select: { id: true } });
  if (!acc) return mobileError("INVALID_REQUEST", "Akun tidak ditemukan.", 404);

  if (action === "mute") {
    const days = Math.min(30, Math.max(1, Number(body?.days) || 7));
    await prisma.citizenAccount.update({ where: { id: accountId }, data: { socialStatus: "MUTED", socialMutedUntil: new Date(Date.now() + days * 86_400_000) } });
    void notifyAccount("citizen", accountId, ctx.villageId, { type: "system", title: "Akun Anda dibisukan di Warga", body: `${days} hari karena melanggar aturan komunitas. Anda masih bisa membaca.` });
  } else if (action === "ban") {
    await prisma.citizenAccount.update({ where: { id: accountId }, data: { socialStatus: "BANNED", socialMutedUntil: null } });
  } else {
    await prisma.citizenAccount.update({ where: { id: accountId }, data: { socialStatus: "OK", socialMutedUntil: null } });
  }
  void audit(ctx, req, `social_account_${action}`, "citizen_accounts", accountId, { days: body?.days });
  return new NextResponse(null, { status: 204 });
}
