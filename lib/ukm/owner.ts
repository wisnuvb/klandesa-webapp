/** Tautan produk UKM ke warga pemilik (sisi web/admin). */
import { prisma } from "@/lib/prisma";
import { notifyAccount } from "@/lib/mobile/notify";

export const ADMIN_UKM_STATUSES = ["active", "inactive"] as const;
export type AdminUkmStatus = (typeof ADMIN_UKM_STATUSES)[number];

export const isAdminUkmStatus = (v: unknown): v is AdminUkmStatus => (ADMIN_UKM_STATUSES as readonly unknown[]).includes(v);

/**
 * Cek id warga pemilik dari badan permintaan. `null` melepas tautan. Warga harus warga desa ini dan masih hidup,
 * supaya admin tidak bisa menautkan ke desa lain atau ke data yang sudah tidak berlaku.
 */
export async function resolveUkmOwner(
  villageId: number,
  raw: unknown,
): Promise<{ ok: true; residentId: number | null } | { ok: false; message: string }> {
  if (raw === null || raw === "") return { ok: true, residentId: null };
  const id = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Warga pemilik tidak valid." };
  const found = await prisma.resident.findFirst({ where: { id, villageId, isAlive: true }, select: { id: true } });
  return found ? { ok: true, residentId: found.id } : { ok: false, message: "Warga tidak ditemukan di desa ini." };
}

/** Beri tahu pemilik (di app mobile) bahwa admin menayangkan atau menyembunyikan produknya. Tidak melempar. */
export async function notifyUkmOwner(
  villageId: number,
  residentId: number,
  product: { id: number; name: string },
  status: AdminUkmStatus,
): Promise<void> {
  try {
    const account = await prisma.citizenAccount.findUnique({ where: { residentId }, select: { id: true, villageId: true } });
    if (!account || account.villageId !== villageId) return;
    await notifyAccount("citizen", account.id, villageId, {
      type: "system",
      title: status === "active" ? "Produk Anda sudah tayang" : "Produk Anda disembunyikan desa",
      body:
        status === "active"
          ? `“${product.name}” disetujui dan kini tampil di katalog produk desa.`
          : `“${product.name}” disembunyikan oleh admin desa. Buka produk untuk melihat langkah berikutnya.`,
      deepLink: `/ukm/${product.id}`,
    });
  } catch (e) {
    console.error("notifyUkmOwner failed:", e);
  }
}
