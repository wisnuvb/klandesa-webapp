import { NextRequest, NextResponse } from "next/server";
import { normalizeVillageRole, roleCan, type PermissionAction, type PermissionResource } from "@/lib/permissions";
import type { Result } from "@/lib/form-input";

export function failResponse(r: Extract<Result<unknown>, { ok: false }>) {
  return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
}

export const parseIntId = (raw: string): number | null => (/^\d{1,10}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null);

/** Izin tiap aksi untuk peran pengguna, dikirim ke layar agar tombol yang tak berlaku disembunyikan. */
export function can(resource: PermissionResource, role: string, actions: PermissionAction[]): Record<PermissionAction, boolean> {
  const r = normalizeVillageRole(role);
  return Object.fromEntries(actions.map((a) => [a, roleCan(resource, a, r)])) as Record<PermissionAction, boolean>;
}

export const denied = (msg: string) => NextResponse.json({ error: msg }, { status: 403 });

/** Parameter daftar bersama: halaman, ukuran, pencarian, tahun. */
export function listParams(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const year = Number(sp.get("year"));
  return {
    sp,
    page: Math.max(1, Math.min(100000, Number(sp.get("page")) || 1)),
    pageSize: Math.max(1, Math.min(100, Number(sp.get("pageSize")) || 25)),
    search: sp.get("search")?.trim().slice(0, 100) || undefined,
    year: Number.isInteger(year) && year >= 1900 && year <= 2200 ? year : undefined,
  };
}
