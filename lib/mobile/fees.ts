import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "./context";
import { requireStaff } from "./staff";
import { requireRt } from "./rt";
import { notifyAccount } from "./notify";
import { auditAs } from "./audit-actor";
import { residentInScope, rtCodeVariants } from "./rt-logic";
import {
  chargeStatus, dueDateOf, FEE_CATEGORY_LABEL, pickHead, periodsToGenerate, type FeeCategory,
} from "./fees-logic";

export type FeeActor = {
  kind: "rt" | "desa";
  villageId: number;
  villageCode: string;
  byType: "rt" | "staff";
  byId: number;
  name: string;
  rt: string | null;
  rw: string | null;
};

/**
 * Pelaku pengelola iuran. scope=rt → Ketua RT (cakupan dari penugasan di DB); scope=desa → perangkat desa dengan izin "finance".
 * Cakupan tidak pernah diambil dari klien.
 */
export async function requireFeeActor(
  req: NextRequest,
  action: "read" | "write",
): Promise<{ ok: true; actor: FeeActor } | { ok: false; response: NextResponse }> {
  const scope = req.nextUrl.searchParams.get("scope");
  if (scope === "rt") {
    const g = await requireRt(req);
    if (!g.ok) return g;
    return { ok: true, actor: { kind: "rt", villageId: g.ctx.villageId, villageCode: g.ctx.village.code, byType: "rt", byId: g.ctx.residentId, name: g.ctx.name, rt: g.ctx.scope.rt, rw: g.ctx.scope.rw } };
  }
  if (scope === "desa") {
    const g = await requireStaff(req, "finance", action === "read" ? "read" : "create");
    if (!g.ok) return g;
    return { ok: true, actor: { kind: "desa", villageId: g.ctx.villageId, villageCode: g.ctx.village.code, byType: "staff", byId: g.ctx.userId, name: g.ctx.name, rt: null, rw: null } };
  }
  return { ok: false, response: mobileError("INVALID_REQUEST", "Cakupan tidak valid.", 400) };
}

/** Catat aksi iuran/kas ke AuditLog: staf desa lewat userId, Ketua RT lewat metadata.actor. */
export function auditFee(req: Request, a: FeeActor, action: string, entity: string, entityId: string | number | bigint, changes?: Record<string, unknown>) {
  const actor = a.kind === "rt" ? ({ type: "rt", residentId: a.byId, name: a.name, rt: a.rt, rw: a.rw } as const) : ({ type: "staff", userId: a.byId } as const);
  return auditAs(req, a.villageId, actor, action, entity, entityId, { scope: a.kind, ...changes });
}

/** Filter jadwal yang boleh disentuh pelaku. */
export function scheduleScope(a: FeeActor) {
  return a.kind === "rt"
    ? { villageId: a.villageId, scope: "rt", rt: a.rt, rw: a.rw }
    : { villageId: a.villageId, scope: "desa" };
}

/** Jadwal milik pelaku, atau null (tidak ada atau di luar cakupan: respons dibuat sama). */
export async function ownSchedule(a: FeeActor, id: number) {
  return prisma.feeSchedule.findFirst({ where: { id, ...scheduleScope(a) } });
}

/** Tagihan dalam cakupan pelaku (lewat jadwalnya). */
export async function ownCharge(a: FeeActor, id: number) {
  const c = await prisma.feeCharge.findFirst({ where: { id, villageId: a.villageId } });
  if (!c) return null;
  const s = await ownSchedule(a, c.scheduleId);
  return s ? { charge: c, schedule: s } : null;
}

/** KK (dengan anggota) dalam cakupan jadwal: RT → warga RT/RW itu; desa → semua warga hidup ber-KK. */
async function kkGroups(s: { villageId: number; scope: string; rt: string | null; rw: string | null }) {
  const where = s.scope === "rt" && s.rt
    ? { villageId: s.villageId, isAlive: true, kk: { not: null }, rt: { in: rtCodeVariants(s.rt) } }
    : { villageId: s.villageId, isAlive: true, kk: { not: null } };
  const rows = await prisma.resident.findMany({
    where, select: { id: true, kk: true, name: true, familyRole: true, birthDate: true, rt: true, rw: true }, take: 20000,
  });
  const scoped = s.scope === "rt" && s.rt ? rows.filter((r) => residentInScope(r, { rt: s.rt!, rw: s.rw })) : rows;
  const groups = new Map<string, typeof scoped>();
  for (const r of scoped) (groups.get(r.kk!) ?? groups.set(r.kk!, []).get(r.kk!)!).push(r);
  return groups;
}

/**
 * Pastikan tagihan semua periode yang berlaku ada (idempoten: unik per jadwal+KK+periode).
 * Tagihan periode berjalan yang baru dibuat memberi tahu kepala KK; periode lama (susulan) tidak.
 */
export async function ensureCharges(
  s: { id: number; villageId: number; scope: string; rt: string | null; rw: string | null; name: string; amount: number; recurrence: string; startPeriod: string; endPeriod: string | null; dueDay: number; category: string },
  now = new Date(),
): Promise<number> {
  const periods = periodsToGenerate(s, now);
  if (periods.length === 0) return 0;
  const [groups, existing] = await Promise.all([
    kkGroups(s),
    prisma.feeCharge.findMany({ where: { scheduleId: s.id, period: { in: periods } }, select: { kk: true, period: true } }),
  ]);
  const have = new Set(existing.map((e) => `${e.kk}|${e.period}`));
  const data: { villageId: number; scheduleId: number; kk: string; headResidentId: number; headName: string; period: string; amount: number }[] = [];
  for (const [kk, members] of groups) {
    const head = pickHead(members);
    if (!head) continue;
    for (const period of periods) {
      if (!have.has(`${kk}|${period}`)) data.push({ villageId: s.villageId, scheduleId: s.id, kk, headResidentId: head.id, headName: head.name, period, amount: s.amount });
    }
  }
  if (data.length === 0) return 0;
  await prisma.feeCharge.createMany({ data, skipDuplicates: true });

  const latest = periods[periods.length - 1]!;
  const fresh = data.filter((d) => d.period === latest).slice(0, 500);
  if (fresh.length > 0) {
    const accounts = await prisma.citizenAccount.findMany({ where: { residentId: { in: fresh.map((f) => f.headResidentId) }, status: "ACTIVE" }, select: { id: true, residentId: true } });
    const due = dueDateOf(latest, s.dueDay);
    await Promise.all(accounts.map((a) => notifyAccount("citizen", a.id, s.villageId, {
      type: "system", deepLink: "/tagihan",
      title: `Tagihan baru: ${s.name}`,
      body: `Rp${s.amount.toLocaleString("id-ID")} · jatuh tempo ${due.toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "Asia/Jakarta" })}`,
    })));
  }
  return data.length;
}

type ChargeRow = { id: number; amount: number; waivedAt: Date | null; period: string; scheduleId: number };

/** Tambahkan jumlah terkonfirmasi/menunggu ke tiap tagihan, lalu hitung statusnya. */
export async function withStatus<T extends ChargeRow>(charges: T[], dueDayBySchedule: Map<number, number>, now = new Date()) {
  const pays = charges.length
    ? await prisma.feePayment.groupBy({ by: ["chargeId", "status"], where: { chargeId: { in: charges.map((c) => c.id) }, status: { in: ["confirmed", "pending"] } }, _sum: { amount: true } })
    : [];
  const confirmed = new Map<number, number>();
  const pending = new Map<number, number>();
  for (const p of pays) (p.status === "confirmed" ? confirmed : pending).set(p.chargeId, p._sum.amount ?? 0);
  return charges.map((c) => {
    const dueDate = dueDateOf(c.period, dueDayBySchedule.get(c.scheduleId) ?? 10);
    const conf = confirmed.get(c.id) ?? 0;
    const pend = pending.get(c.id) ?? 0;
    const st = chargeStatus({ amount: c.amount, waived: c.waivedAt != null, confirmed: conf, pending: pend, dueDate, now });
    return { ...c, dueDate, confirmed: conf, pending: pend, status: st.status, outstanding: st.outstanding };
  });
}

export const categoryLabel = (c: string) => FEE_CATEGORY_LABEL[c as FeeCategory] ?? c;
