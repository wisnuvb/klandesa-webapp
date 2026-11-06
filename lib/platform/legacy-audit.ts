import { NextResponse } from "next/server";
import { auditPlatformStrict, type PlatformAuditActor, type PlatformAuditEntry } from "@/lib/platform/audit";

/**
 * Pembantu jejak audit untuk rute `/api/admin/*` lama (Paket E). Dipisah dari `audit.ts` (berkas bersama, tidak diubah).
 */

type AdminAuth = { admin: { platformUserId: number; email: string } };

/** Aktor jejak dari hasil `requirePlatformSession`. */
export function actorOf(auth: AdminAuth): PlatformAuditActor {
  return { platformUserId: auth.admin.platformUserId, email: auth.admin.email };
}

/**
 * Tulis jejak SEBELUM efek yang tak bisa dibatalkan (uang/akses). Mengembalikan `null` bila tercatat; bila gagal mengembalikan
 * respons 500 yang harus langsung dikembalikan pemanggil (aksi dibatalkan, tidak ada efek samping).
 */
export async function auditBefore(req: Request, actor: PlatformAuditActor, entry: PlatformAuditEntry): Promise<NextResponse | null> {
  try {
    await auditPlatformStrict(req, actor, entry);
    return null;
  } catch (err) {
    console.error("[platform-audit] gagal mencatat (aksi dibatalkan):", err);
    return NextResponse.json(
      { error: "Jejak audit gagal dicatat sehingga aksi dibatalkan. Coba lagi." },
      { status: 500 },
    );
  }
}

/** Potong teks untuk summary/metadata. */
export function clip(s: unknown, n: number): string {
  const t = typeof s === "string" ? s : String(s ?? "");
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** Nomor rekening disamarkan: hanya 4 digit terakhir. */
export function maskAccountNumber(n: string | null | undefined): string {
  const digits = String(n ?? "").replace(/\s+/g, "");
  if (!digits) return "";
  return `••••${digits.slice(-4)}`;
}

/** ID bilangan bulat positif dari segmen URL ("12" ya, "12abc"/"1e3"/"1.5"/"-1" tidak). */
export function parsePositiveInt(raw: string | undefined | null, max = 2_147_483_647): number | null {
  if (!raw || !/^\d{1,10}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= max ? n : null;
}

/** Angka dari input JSON: number atau string numerik (bukan "", bool, null). NaN bila tidak valid. */
export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return Number.NaN;
}

export function formatRupiah(n: number): string {
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}
