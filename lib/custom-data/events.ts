/** Kejadian webhook untuk baris data kustom. Dipanggil setelah data tersimpan; tidak pernah melempar galat. */
import { prisma } from "@/lib/prisma";
import { emitWebhookEvent } from "@/lib/webhooks/deliver";

export function emitRecordEvent(villageId: number, type: "data-kustom.baris.dibuat" | "data-kustom.baris.diubah", tableId: number, recordId: bigint | string): void {
  void prisma.customTable
    .findFirst({ where: { id: tableId, villageId }, select: { slug: true } })
    .then((t) => {
      if (t) emitWebhookEvent(villageId, type, { tableId, tableSlug: t.slug, recordId: String(recordId) });
    })
    .catch((e) => console.error("[webhook] gagal membaca tabel untuk kejadian:", e instanceof Error ? e.message : e));
}
