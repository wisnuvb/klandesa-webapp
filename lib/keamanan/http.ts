import { NextResponse } from "next/server";
import { permissions } from "@/lib/apbdes/http";
import type { VillageApiContext } from "@/lib/api-village-context";
import { normalizeVillageRole, roleCan, type PermissionAction } from "@/lib/permissions";

/** Izin aksi pengguna pada resource "keamanan" (dikirim ke layar agar tombol yang tak berlaku disembunyikan). */
export const keamananCan = (ctx: VillageApiContext) => permissions(ctx, "keamanan");

/** Baca rinci (nama pihak mediasi tanpa penyamaran, telepon anggota) = aksi export. */
export const hasDetail = (ctx: VillageApiContext): boolean => roleCan("keamanan", "export", normalizeVillageRole(ctx.dbUser.role));

/** Kunci catatan audit. Detail audit tidak memuat nama pihak, uraian, atau isi kesepakatan. */
export const AUDIT = {
  event: "incident_events",
  response: "incident_responses",
  member: "security_members",
  equipment: "security_equipment",
  group: "security_ronda_groups",
  person: "security_ronda_people",
  shift: "security_ronda_shifts",
  swap: "security_ronda_swaps",
  rondaLog: "security_ronda_logs",
  mediation: "security_mediations",
  party: "security_mediation_parties",
  followup: "security_followups",
  link: "security_report_links",
  risk: "security_risk_areas",
  contact: "security_contacts",
} as const;

/**
 * Sabuk pengaman izin di dalam handler untuk aksi yang lebih tinggi dari "create": memeriksa peran DB langsung (bukan pola gerbang kasar),
 * jadi tetap menolak walau pemetaan jalur gagal cocok. Mengembalikan respons 403 atau null.
 */
export function denyUnless(ctx: VillageApiContext, action: PermissionAction): NextResponse | null {
  return roleCan("keamanan", action, normalizeVillageRole(ctx.dbUser.role)) ? null : NextResponse.json({ error: "Anda tidak berhak melakukan aksi ini." }, { status: 403 });
}
