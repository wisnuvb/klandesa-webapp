import { NextResponse } from "next/server";
import type { ApiKeyAuth } from "@/lib/api-keys/auth";

export type AuthOk = Extract<ApiKeyAuth, { ok: true }>;

export const apiOk = (auth: AuthOk, body: unknown) => auth.respond(NextResponse.json(body));

export const apiError = (auth: AuthOk, status: number, code: string, message: string) =>
  auth.respond(NextResponse.json({ error: { code, message } }, { status }));

export const badRequest = (auth: AuthOk, message: string) => apiError(auth, 400, "invalid_request", message);
export const notFound = (auth: AuthOk, what = "Data") => apiError(auth, 404, "not_found", `${what} tidak ditemukan.`);
export const featureOff = (auth: AuthOk) =>
  apiError(auth, 409, "feature_not_enabled", "Fitur Keluarga dan Wilayah belum diaktifkan untuk desa ini. Admin desa dapat mengaktifkannya di Data Warga.");

/** Parameter id jalur: bilangan bulat positif, selain itu 400 (bukan 500). */
export const parseIdParam = (raw: string): number | null => (/^\d{1,10}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null);
