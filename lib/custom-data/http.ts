import { NextResponse } from "next/server";
import type { Result } from "./service";

/** Peran yang boleh mengubah SKEMA tabel (buat tabel, tambah/arsip kolom). Baris data mengikuti matriks izin `custom_data`. */
export const SCHEMA_ROLES: ReadonlySet<string> = new Set(["admin", "secretary"]);

export const schemaForbidden = () => NextResponse.json({ error: "Hanya admin atau sekretaris desa yang dapat mengubah susunan tabel." }, { status: 403 });

export function failResponse(r: Extract<Result<unknown>, { ok: false }>) {
  return NextResponse.json({ error: r.errors[0], errors: r.errors, ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}) }, { status: r.status });
}

export const parseIntId = (raw: string): number | null => (/^\d{1,10}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null);
export const parseBigId = (raw: string): bigint | null => (/^\d{1,18}$/.test(raw) && raw !== "0" ? BigInt(raw) : null);
