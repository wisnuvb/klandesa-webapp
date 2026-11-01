import { prisma } from "@/lib/prisma";

/**
 * Jejak audit untuk pelaku yang bukan akun staf, yaitu Ketua RT (akun warga dengan penugasan RT).
 * AuditLog.userId hanya untuk staf, jadi pelaku RT dicatat di metadata.actor (userId kosong).
 */
export type AuditActor =
  | { type: "staff"; userId: number }
  | { type: "rt"; residentId: number; name: string; rt: string | null; rw: string | null }
  | { type: "citizen"; residentId: number };

export type AuditEntry = {
  villageId: number;
  userId: number | null;
  action: string;
  entity: string;
  entityId: string;
  changes: Record<string, unknown> | undefined;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
};

/** Susun baris AuditLog (murni, tanpa DB). Nilai non-JSON (BigInt, Date) dinormalkan. */
export function buildAuditEntry(
  villageId: number,
  actor: AuditActor,
  headers: { forwardedFor?: string | null; userAgent?: string | null },
  action: string,
  entity: string,
  entityId: string | number | bigint,
  changes?: Record<string, unknown>,
): AuditEntry {
  const safe = changes ? (JSON.parse(JSON.stringify(changes, (_k, v) => (typeof v === "bigint" ? v.toString() : v))) as Record<string, unknown>) : undefined;
  return {
    villageId,
    userId: actor.type === "staff" ? actor.userId : null,
    action,
    entity,
    entityId: String(entityId),
    changes: safe,
    metadata: actor.type === "rt" ? { via: "mobile", actor: { type: "rt", residentId: actor.residentId, name: actor.name, rt: actor.rt, rw: actor.rw } }
      : actor.type === "citizen" ? { via: "mobile", actor: { type: "citizen", residentId: actor.residentId } }
      : { via: "mobile" },
    ipAddress: (headers.forwardedFor?.split(",")[0] ?? "").trim().slice(0, 50) || null,
    userAgent: headers.userAgent?.slice(0, 500) ?? null,
  };
}

/** Catat tindakan; gagal mencatat tidak menggagalkan aksi (sama dengan audit staf). */
export async function auditAs(
  req: Request,
  villageId: number,
  actor: AuditActor,
  action: string,
  entity: string,
  entityId: string | number | bigint,
  changes?: Record<string, unknown>,
): Promise<void> {
  try {
    const e = buildAuditEntry(villageId, actor, { forwardedFor: req.headers.get("x-forwarded-for"), userAgent: req.headers.get("user-agent") }, action, entity, entityId, changes);
    await prisma.auditLog.create({
      data: {
        villageId: e.villageId, userId: e.userId, action: e.action, entity: e.entity, entityId: e.entityId,
        changes: e.changes as never, metadata: e.metadata as never, ipAddress: e.ipAddress, userAgent: e.userAgent,
      },
    });
  } catch (err) {
    console.error("audit failed:", err);
  }
}
