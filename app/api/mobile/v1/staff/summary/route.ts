import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";
import { roleCan, normalizeVillageRole } from "@/lib/permissions";

/** Ringkasan beranda perangkat desa. Hitungan hanya untuk modul yang boleh dibaca perannya. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const role = normalizeVillageRole(ctx.role);
  const can = (r: Parameters<typeof roleCan>[0], a: Parameters<typeof roleCan>[1]) => roleCan(r, a, role);
  const v = ctx.villageId;

  const [pendingMail, oldestMail, newReports, processingReports, pendingSignups, unread, village, user] = await Promise.all([
    can("mail", "read") ? prisma.mailRequest.count({ where: { villageId: v, status: "pending" } }) : Promise.resolve(null),
    can("mail", "read") ? prisma.mailRequest.findFirst({ where: { villageId: v, status: "pending" }, orderBy: { requestDate: "asc" }, select: { requestDate: true } }) : Promise.resolve(null),
    can("citizen_reports", "read") ? prisma.citizenReport.count({ where: { villageId: v, status: "PENDING" } }) : Promise.resolve(null),
    can("citizen_reports", "read") ? prisma.citizenReport.count({ where: { villageId: v, status: "PROCESS" } }) : Promise.resolve(null),
    can("residents", "update") ? prisma.citizenAccount.count({ where: { villageId: v, status: "PENDING_VERIFY" } }) : Promise.resolve(null),
    prisma.userNotification.count({ where: { accountType: "staff", accountId: ctx.accountId, readAt: null } }),
    prisma.village.findUnique({ where: { id: v }, select: { name: true, logoUrl: true } }),
    prisma.user.findUnique({ where: { id: ctx.accountId }, select: { name: true } }),
  ]);

  return NextResponse.json({
    village, userName: user?.name ?? "", role: ctx.role, unreadNotifications: unread,
    permissions: { mail: can("mail", "update"), reports: can("citizen_reports", "update"), signups: can("residents", "update") },
    counts: { pendingMail, newReports, processingReports, pendingSignups },
    oldestPendingMailHours: oldestMail ? Math.floor((Date.now() - oldestMail.requestDate.getTime()) / 3_600_000) : null,
  });
}
