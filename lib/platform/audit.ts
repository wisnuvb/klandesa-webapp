import { clientIpOrNull } from "@/lib/rbac/client-ip";
import { prisma } from "@/lib/prisma";

/**
 * Jejak tindakan super admin (tabel `platform_audit_logs`, hanya-tambah).
 *
 * ATURAN: SETIAP tindakan super admin yang mengubah data, mengeluarkan tautan/akses, atau melihat data pribadi sensitif
 * WAJIB memanggil `auditPlatform`. Isi `summary`/`metadata` TIDAK BOLEH memuat sandi, token, tautan atur sandi, atau NIK utuh.
 */

export type PlatformAuditActor = { platformUserId: number | null; email: string };

export type PlatformAuditEntry = {
  /** Notasi titik, mis. "account.reset_link". Lihat daftar di docs/SUPER_ADMIN_PLAN.md. */
  action: string;
  targetType: "user" | "village" | "resident" | "invoice" | "platform_user" | "partner" | "system";
  targetId?: string | number | bigint | null;
  villageId?: number | null;
  /** Kalimat singkat Bahasa Indonesia terbaca manusia (maks 500 karakter). */
  summary: string;
  metadata?: Record<string, unknown>;
};

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

/**
 * Catat ke jejak. Mengembalikan true bila tercatat. Kegagalan mencatat TIDAK menggagalkan aksi pemanggil
 * (konsisten dengan audit desa), tetapi dicatat ke log server. Aksi paling berisiko boleh memakai
 * `auditPlatformStrict` agar aksi dibatalkan bila jejak gagal ditulis.
 */
export async function auditPlatform(
  req: Request,
  actor: PlatformAuditActor,
  entry: PlatformAuditEntry,
): Promise<boolean> {
  try {
    await writeAudit(req, actor, entry);
    return true;
  } catch (err) {
    console.error("[platform-audit] gagal mencatat:", err);
    return false;
  }
}

/** Versi ketat: melempar bila gagal. Panggil SEBELUM efek samping yang tidak bisa dibatalkan. */
export async function auditPlatformStrict(req: Request, actor: PlatformAuditActor, entry: PlatformAuditEntry): Promise<void> {
  await writeAudit(req, actor, entry);
}

async function writeAudit(req: Request, actor: PlatformAuditActor, entry: PlatformAuditEntry): Promise<void> {
  await prisma.platformAuditLog.create({
    data: {
      actorId: actor.platformUserId,
      actorEmail: clip(actor.email, 255),
      action: clip(entry.action, 80),
      targetType: entry.targetType,
      targetId: entry.targetId == null ? null : clip(String(entry.targetId), 100),
      villageId: entry.villageId ?? null,
      summary: clip(entry.summary, 500),
      metadata: (entry.metadata ?? undefined) as never,
      ipAddress: clientIpOrNull(req),
      userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    },
  });
}
