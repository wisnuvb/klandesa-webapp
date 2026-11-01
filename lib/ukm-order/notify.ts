import { prisma } from "@/lib/prisma";
import { notifyAccount, notifyVillageStaff } from "@/lib/mobile/notify";

/** Tautan dalam aplikasi ke daftar pesanan UKM. */
export const ORDER_DEEPLINK = (id: number): string => `/ukm/pesanan/${id}`;

/** Beri tahu warga (akun mobile aktifnya) atau, bila produk dikelola desa, staf yang berizin UKM. Tidak melempar. */
export async function notifyOrderParty(args: { villageId: number; residentId: number | null; title: string; body: string; orderId: number }): Promise<void> {
  try {
    const n = { type: "system" as const, title: args.title, body: args.body, deepLink: ORDER_DEEPLINK(args.orderId) };
    if (args.residentId === null) return void (await notifyVillageStaff(args.villageId, "ukm", { ...n, deepLink: null }));
    const acc = await prisma.citizenAccount.findUnique({ where: { residentId: args.residentId }, select: { id: true, status: true, villageId: true } });
    if (!acc || acc.status !== "ACTIVE" || acc.villageId !== args.villageId) return;
    await notifyAccount("citizen", acc.id, args.villageId, n);
  } catch (e) {
    console.error("notifyOrderParty failed:", e);
  }
}

/** Teks pemberitahuan untuk lawan bicara sesudah status berubah. */
export function statusNotice(to: string, productName: string, note: string | null): { title: string; body: string } {
  const n = note ? ` Catatan: ${note}` : "";
  if (to === "DIKONFIRMASI") return { title: "Pesanan dikonfirmasi", body: `Pesanan ${productName} Anda dikonfirmasi penjual.${n}` };
  if (to === "SELESAI") return { title: "Pesanan selesai", body: `Pesanan ${productName} ditandai selesai.${n}` };
  return { title: "Pesanan dibatalkan", body: `Pesanan ${productName} dibatalkan.${n}` };
}
