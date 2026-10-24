import { prisma } from "@/lib/prisma";
import { roleCan, normalizeVillageRole, type PermissionResource } from "@/lib/permissions";
import { sendPushToAccount } from "./push";
import type { MobileAccountType } from "./tokens";

export type NotifyInput = {
  type: "mail_status" | "report_status" | "announcement" | "data_change" | "system";
  title: string;
  body?: string | null;
  deepLink?: string | null;
};

/** Simpan ke kotak masuk lalu kirim push. Tidak melempar. */
export async function notifyAccount(
  accountType: MobileAccountType,
  accountId: number,
  villageId: number,
  n: NotifyInput,
): Promise<void> {
  try {
    await prisma.userNotification.create({
      data: { accountType, accountId, villageId, type: n.type, title: n.title.slice(0, 160), body: n.body?.slice(0, 500) ?? null, deepLink: n.deepLink ?? null },
    });
    await sendPushToAccount(accountType, accountId, n);
  } catch (e) {
    console.error("notifyAccount failed:", e);
  }
}

/** Dipanggil saat perangkat desa mengubah status permohonan surat (route web maupun mobile). */
export async function notifyMailRequestStatus(requestId: bigint): Promise<void> {
  try {
    const r = await prisma.mailRequest.findUnique({
      where: { id: requestId },
      select: { id: true, villageId: true, residentId: true, mailType: true, status: true, rejectionReason: true },
    });
    if (!r?.residentId) return; // permohonan kiosk/portal lama: tidak ada akun mobile
    const acc = await prisma.citizenAccount.findUnique({ where: { residentId: r.residentId }, select: { id: true, status: true } });
    if (!acc || acc.status !== "ACTIVE") return;

    const deepLink = `/surat/${Number(r.id)}`;
    if (r.status === "approved") {
      return notifyAccount("citizen", acc.id, r.villageId, {
        type: "mail_status", deepLink,
        title: "Permohonan disetujui",
        body: `${r.mailType} Anda sudah disetujui desa. Buka untuk melihat langkah selanjutnya.`,
      });
    }
    if (r.status === "rejected") {
      return notifyAccount("citizen", acc.id, r.villageId, {
        type: "mail_status", deepLink,
        title: "Permohonan perlu diperbaiki",
        body: r.rejectionReason ? `${r.mailType}: ${r.rejectionReason}` : `${r.mailType} belum bisa diproses. Buka untuk detailnya.`,
      });
    }
  } catch (e) {
    console.error("notifyMailRequestStatus failed:", e);
  }
}

/** Dipanggil saat staf mengubah status laporan atau menulis tanggapan (route web). */
export async function notifyReportUpdate(reportId: bigint, kind: "status" | "response"): Promise<void> {
  try {
    const r = await prisma.citizenReport.findUnique({
      where: { id: reportId },
      select: { id: true, villageId: true, residentId: true, title: true, status: true },
    });
    if (!r?.residentId) return; // laporan dari web/lama
    const acc = await prisma.citizenAccount.findUnique({ where: { residentId: r.residentId }, select: { id: true, status: true } });
    if (!acc || acc.status !== "ACTIVE") return;
    const deepLink = `/lapor/${Number(r.id)}`;
    if (kind === "response") {
      return notifyAccount("citizen", acc.id, r.villageId, { type: "report_status", deepLink, title: "Desa menanggapi laporan Anda", body: r.title });
    }
    const text: Record<string, string> = {
      PROCESS: "Laporan Anda sedang ditangani",
      DONE: "Laporan Anda ditandai selesai",
      REJECT: "Laporan Anda belum bisa diproses",
    };
    if (text[r.status]) {
      return notifyAccount("citizen", acc.id, r.villageId, { type: "report_status", deepLink, title: text[r.status]!, body: r.title });
    }
  } catch (e) {
    console.error("notifyReportUpdate failed:", e);
  }
}

/**
 * Beri tahu semua staf aktif desa yang punya izin `update` pada resource (mis. ada surat/laporan/pendaftaran baru).
 * Dibatasi 15 penerima; tidak melempar.
 */
export async function notifyVillageStaff(
  villageId: number,
  resource: PermissionResource,
  n: NotifyInput,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({ where: { villageId, isActive: true }, select: { id: true, role: true }, take: 50 });
    const targets = users.filter((u) => roleCan(resource, "update", normalizeVillageRole(u.role))).slice(0, 15);
    await Promise.all(targets.map((u) => notifyAccount("staff", u.id, villageId, n)));
  } catch (e) {
    console.error("notifyVillageStaff failed:", e);
  }
}
