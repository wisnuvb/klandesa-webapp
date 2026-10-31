/** Pembantu rute /api/kependudukan/*: bendera desa, serialisasi aman (BigInt, tanpa NIK lengkap). */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isKependudukanV2 } from "./sync";

export function flagOffResponse() {
  return NextResponse.json(
    { error: "Fitur kependudukan v2 belum diaktifkan untuk desa ini.", code: "KEPENDUDUKAN_V2_OFF" },
    { status: 409 },
  );
}

export const requireV2 = (village: { settings: unknown }): NextResponse | null => (isKependudukanV2(village.settings) ? null : flagOffResponse());

type MutationRow = {
  id: bigint;
  type: string;
  status: string;
  source: string;
  effectiveDate: Date;
  residentId: number | null;
  residentName: string | null;
  residentNikLast4: string | null;
  rt: string | null;
  rw: string | null;
  householdKk: string | null;
  details: unknown;
  requestedById: number | null;
  decidedById: number | null;
  decidedAt: Date | null;
  rejectionReason: string | null;
  appliedAt: Date | null;
  createdAt: Date;
};

export async function serializeMutations(rows: MutationRow[]) {
  const userIds = [...new Set(rows.flatMap((r) => [r.requestedById, r.decidedById]).filter((x): x is number => x != null))];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  const nameOf = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => ({
    id: String(r.id),
    type: r.type,
    status: r.status,
    source: r.source,
    effectiveDate: r.effectiveDate.toISOString().slice(0, 10),
    residentId: r.residentId,
    residentName: r.residentName,
    residentNikLast4: r.residentNikLast4,
    rt: r.rt,
    rw: r.rw,
    householdKk: r.householdKk,
    details: r.details ?? null,
    requestedBy: r.requestedById != null ? (nameOf.get(r.requestedById) ?? null) : null,
    decidedBy: r.decidedById != null ? (nameOf.get(r.decidedById) ?? null) : null,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
  }));
}

export const parseId = (v: unknown): bigint | null => {
  const s = String(v ?? "");
  return /^\d{1,18}$/.test(s) ? BigInt(s) : null;
};
