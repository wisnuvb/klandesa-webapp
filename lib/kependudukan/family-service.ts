/**
 * Wizard "Tambah Keluarga" sisi server: pemeriksaan (tanpa menulis) dan penyimpanan atomik satu keluarga.
 * Satu transaksi: semua anggota (dan catatan mutasi Lahir/Datang bila Kependudukan v2 aktif) tersimpan, atau tidak ada sama sekali.
 */
import { Prisma, type PrismaClient } from "@prisma/client";
import { emitWebhookEvent } from "../webhooks/deliver";
import {
  coerceFamilyInput, deriveParents, hasBlockingIssues, toResidentData, validateFamily,
  type FamilyInput, type FamilyIssues,
} from "./family";
import { KK_HEAD_ROLE, normalizeKk } from "./household";
import { isKependudukanV2, runKependudukanSync, syncResidents } from "./sync";

type Db = Prisma.TransactionClient | PrismaClient;

export interface ExistingHousehold {
  kk: string;
  headName: string | null;
  activeMembers: number;
  address: string | null;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
}

export interface FamilyCheck {
  input: FamilyInput;
  issues: FamilyIssues;
  existing: ExistingHousehold | null;
  /** Indeks anggota yang data orang tuanya diisi otomatis dari peran. */
  parentsFilled: number[];
  blocking: boolean;
}

async function loadExisting(db: Db, villageId: number, kk: string): Promise<{ info: ExistingHousehold; hasHead: boolean } | null> {
  const rows = await db.resident.findMany({
    where: { villageId, kk },
    select: { name: true, familyRole: true, isAlive: true, moveDate: true, address: true, rt: true, rw: true, hamlet: true },
    orderBy: { id: "asc" },
    take: 60,
  });
  if (!rows.length) return null;
  const active = rows.filter((r) => r.isAlive && r.moveDate == null);
  const head = active.find((r) => r.familyRole === KK_HEAD_ROLE);
  const ref = head ?? active[0] ?? rows[0];
  return { info: { kk, headName: head?.name ?? null, activeMembers: active.length, address: ref.address, rt: ref.rt, rw: ref.rw, hamlet: ref.hamlet }, hasHead: Boolean(head) };
}

/** Validasi penuh (aturan keluarga + keberadaan KK + NIK yang sudah dipakai di desa ini). Tidak menulis apa pun. */
export async function checkFamily(db: Db, villageId: number, body: unknown, now: Date = new Date()): Promise<FamilyCheck | null> {
  const raw = coerceFamilyInput(body);
  if (!raw) return null;
  const derived = deriveParents(raw.members);
  const input: FamilyInput = { header: raw.header, members: derived.members };
  const kk = normalizeKk(input.header.kk);
  const existing = kk ? await loadExisting(db, villageId, kk) : null;
  const issues = validateFamily(input, { now, existing: existing ? { hasHead: existing.hasHead } : null });

  const niks = [...new Set(input.members.map((m) => m.nik.replace(/\D/g, "")).filter((n) => n.length === 16))];
  if (niks.length) {
    const taken = await db.resident.findMany({ where: { villageId, nik: { in: niks } }, select: { nik: true, name: true } });
    const byNik = new Map(taken.map((t) => [t.nik, t.name]));
    input.members.forEach((m, i) => {
      const owner = byNik.get(m.nik.replace(/\D/g, ""));
      if (owner && !issues.members[i].nik) issues.members[i].nik = `NIK ini sudah terdaftar di desa ini atas nama ${owner}.`;
    });
  }
  return { input, issues, existing: existing?.info ?? null, parentsFilled: derived.filled, blocking: hasBlockingIssues(issues) };
}

export type FamilyCreateResult =
  | { ok: true; data: { created: Array<{ id: number; name: string }>; mutations: number; kk: string } }
  | { ok: false; status: number; error: string; issues?: FamilyIssues };

const jsonOf = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

export async function createFamily(
  prisma: PrismaClient,
  args: { village: { id: number; settings: unknown }; userId: number | null; body: unknown; now?: Date },
): Promise<FamilyCreateResult> {
  const now = args.now ?? new Date();
  const villageId = args.village.id;
  const check = await checkFamily(prisma, villageId, args.body, now);
  if (!check) return { ok: false, status: 400, error: "Data keluarga tidak valid." };
  if (check.blocking) return { ok: false, status: 422, error: "Data keluarga belum lengkap atau bermasalah.", issues: check.issues };

  const { input } = check;
  const v2 = isKependudukanV2(args.village.settings);
  const kk = normalizeKk(input.header.kk) as string;
  const arrival = input.header.arrival.enabled ? input.header.arrival.date : "";

  let created: Array<{ id: number; name: string; nik: string; rt: string | null; rw: string | null }>;
  let mutations = 0;
  try {
    created = await prisma.$transaction(
      async (tx) => {
        const rows: typeof created = [];
        for (const m of input.members) {
          rows.push(await tx.resident.create({ data: { villageId, ...toResidentData(input.header, m) }, select: { id: true, name: true, nik: true, rt: true, rw: true } }));
        }
        if (v2) {
          const data: Prisma.ResidentMutationCreateManyInput[] = [];
          input.members.forEach((m, i) => {
            if (m.event === "NONE") return;
            const r = rows[i];
            const effective = m.event === "BIRTH" ? m.birthDate : arrival;
            if (!effective) return;
            data.push({
              villageId,
              type: m.event,
              status: "APPLIED",
              source: "web",
              effectiveDate: new Date(`${effective}T00:00:00.000Z`),
              residentId: r.id,
              residentName: r.name.slice(0, 255),
              residentNikLast4: r.nik.slice(-4),
              rt: r.rt,
              rw: r.rw,
              householdKk: kk,
              // Tanpa NIK lengkap (sama seperti buku mutasi lain).
              details: jsonOf({
                ...(m.event === "MOVE_IN" && input.header.arrival.origin.trim() ? { origin: input.header.arrival.origin.trim() } : {}),
                newResident: { name: r.name, gender: m.gender, birthplace: m.birthplace, birthDate: m.birthDate, kk, familyRole: m.familyRole },
                via: "tambah-keluarga",
              }),
              requestedById: args.userId,
              decidedById: args.userId,
              decidedAt: now,
              appliedAt: now,
            });
          });
          if (data.length) await tx.residentMutation.createMany({ data });
          mutations = data.length;
        }
        return rows;
      },
      { maxWait: 15_000, timeout: 30_000 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Balapan: NIK dipakai permintaan lain di antara pemeriksaan dan penulisan. Hitung ulang supaya pesan menunjuk anggota yang tepat.
      const again = await checkFamily(prisma, villageId, args.body, now);
      return { ok: false, status: 409, error: "Ada NIK yang baru saja didaftarkan. Periksa kembali.", ...(again ? { issues: again.issues } : {}) };
    }
    throw e;
  }

  for (const r of created) emitWebhookEvent(villageId, "penduduk.dibuat", { residentId: r.id });
  await runKependudukanSync(args.village, "family", (db) => syncResidents(db, villageId, created.map((r) => r.id)));
  return { ok: true, data: { created: created.map((r) => ({ id: r.id, name: r.name })), mutations, kk } };
}
