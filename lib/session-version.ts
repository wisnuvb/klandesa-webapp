import { NextResponse } from "next/server";

/**
 * Pencabutan sesi web saat kata sandi berubah.
 * JWT web membawa `sv` (versi sesi akun saat login). Setiap kata sandi berubah, `users.sessionVersion` naik, sehingga cookie lama
 * (sv lebih kecil) ditolak. JWT lama sebelum fitur ini tidak punya `sv` -> dianggap 0 = sama dengan bawaan DB, jadi tidak ada
 * yang terkeluar saat rilis; baru berlaku begitu kata sandi akun itu pertama kali berubah.
 */
export function isSessionRevoked(tokenVersion: unknown, dbVersion: number): boolean {
  const t = typeof tokenVersion === "number" && Number.isInteger(tokenVersion) && tokenVersion >= 0 ? tokenVersion : 0;
  return t !== dbVersion;
}

export const SESSION_REVOKED_MESSAGE = "Sesi Anda berakhir karena kata sandi akun diubah. Silakan masuk kembali.";

export function sessionRevokedResponse(): NextResponse {
  return NextResponse.json({ error: SESSION_REVOKED_MESSAGE, code: "SESSION_REVOKED" }, { status: 401 });
}
