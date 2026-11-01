import type { NextResponse } from "next/server";
import type { VillageApiContext } from "@/lib/api-village-context";
import type { PermissionAction } from "@/lib/permissions";
import { forbidden, permissions } from "@/lib/apbdes/http";

/**
 * RPJM Desa punya dua pintu: menu lama (resource `rpjmdes`) dan tahapan baru (resource `perencanaan`). Matriks keduanya berbeda
 * (mis. staf hanya `read` di `rpjmdes`). Supaya pintu baru tidak melonggarkan kebijakan lama, setiap rute RPJM baru juga
 * mensyaratkan izin `rpjmdes` yang setara. `approve` pada `rpjmdes` hanya dimiliki Kepala Desa; admin setara lewat `update`.
 */
export function rpjmdesAllows(ctx: VillageApiContext, action: PermissionAction): boolean {
  const can = permissions(ctx, "rpjmdes");
  return action === "approve" ? can.approve || can.update : can[action];
}

/** null bila boleh; kalau tidak, jawaban 403 siap kirim. */
export function rpjmdesGate(ctx: VillageApiContext, action: PermissionAction): NextResponse | null {
  return rpjmdesAllows(ctx, action) ? null : forbidden("Peran Anda tidak memiliki izin untuk tindakan ini pada RPJM Desa.");
}

/** Izin yang dikirim ke layar: irisan resource `perencanaan` dan `rpjmdes` agar tombol yang pasti ditolak tidak tampil. */
export function rpjmCan(ctx: VillageApiContext): Record<PermissionAction, boolean> {
  const p = permissions(ctx, "perencanaan");
  return Object.fromEntries((Object.keys(p) as PermissionAction[]).map((a) => [a, p[a] && rpjmdesAllows(ctx, a)])) as Record<PermissionAction, boolean>;
}
