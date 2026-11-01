import { permissions } from "@/lib/apbdes/http";
import type { VillageApiContext } from "@/lib/api-village-context";
import { normalizeVillageRole, roleCan } from "@/lib/permissions";

/** Izin aksi pengguna pada resource "bencana" (dikirim ke layar agar tombol yang tak berlaku disembunyikan). */
export const bencanaCan = (ctx: VillageApiContext) => permissions(ctx, "bencana");

/** Baca rinci (nama penerima per KK, kontak relawan) = aksi export. */
export const hasDetail = (ctx: VillageApiContext): boolean => roleCan("bencana", "export", normalizeVillageRole(ctx.dbUser.role));

/** Kunci catatan audit entitas. */
export const AUDIT = { event: "incident_events", response: "incident_responses", logistic: "incident_logistics", alert: "drm_alerts" } as const;
