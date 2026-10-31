import { prisma } from "@/lib/prisma";

type AuditCtx = { userId?: number | null; village: { id: number } };

/** Catat tindakan staf web ke AuditLog; gagal mencatat tidak menggagalkan aksi (sama dengan audit mobile). */
export async function auditWeb(
  req: Request,
  ctx: AuditCtx,
  action: string,
  entity: string,
  entityId: string | number | bigint,
  changes?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        villageId: ctx.village.id,
        userId: ctx.userId ?? null,
        action,
        entity,
        entityId: String(entityId),
        changes: changes as never,
        metadata: { via: "web" } as never,
        ipAddress: (req.headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 50) || null,
        userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    console.error("audit failed:", err);
  }
}
