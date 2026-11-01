import type { Prisma } from "@prisma/client";
import { cleanText, isoDay, isRecord, parseIsoDate, future, type Parsed } from "@/lib/form-input";

type Db = Prisma.TransactionClient;

const DATE_FIELDS = ["musdesusAt", "kadesApprovedAt", "deedDate", "submittedToRegencyAt", "skDate", "npwpAt", "simkopdesAt"] as const;
const TEXT_FIELDS: Record<string, [label: string, max: number]> = {
  musdesusRef: ["Nomor berita acara musdesus", 150],
  musdesusNotes: ["Ringkasan keputusan musdesus", 2000],
  deedNumber: ["Nomor akta pendirian", 100],
  notaryName: ["Nama notaris", 150],
  commitmentRef: ["Nomor surat komitmen modal awal", 150],
  skNumber: ["Nomor SK pengesahan", 100],
  notes: ["Catatan", 1000],
};
const DATE_LABEL: Record<(typeof DATE_FIELDS)[number], string> = {
  musdesusAt: "Tanggal musdesus",
  kadesApprovedAt: "Tanggal persetujuan kepala desa",
  deedDate: "Tanggal akta",
  submittedToRegencyAt: "Tanggal disampaikan ke pemkab",
  skDate: "Tanggal SK pengesahan",
  npwpAt: "Tanggal NPWP",
  simkopdesAt: "Tanggal akun Simkopdes",
};

export type FormationInput = Record<(typeof DATE_FIELDS)[number], Date | null> & Record<keyof typeof TEXT_FIELDS, string | null> & { commitmentAmount: string | null };

export function parseFormationInput(body: unknown, now: Date = new Date()): Parsed<FormationInput> {
  const fe: Record<string, string> = {};
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const out: Record<string, unknown> = {};

  for (const k of DATE_FIELDS) {
    const raw = body[k];
    if (raw === undefined || raw === null || raw === "") { out[k] = null; continue; }
    const d = parseIsoDate(raw);
    if (!d) fe[k] = `${DATE_LABEL[k]} tidak valid.`;
    else if (future(d, now)) fe[k] = `${DATE_LABEL[k]} tidak boleh di masa depan.`;
    out[k] = d;
  }
  for (const [k, [label, max]] of Object.entries(TEXT_FIELDS)) {
    const t = cleanText(body[k], max);
    if (t.bad || t.tooLong) fe[k] = `${label} maksimal ${max} karakter.`;
    out[k] = t.value;
  }
  const raw = body.commitmentAmount;
  if (raw === undefined || raw === null || raw === "") out.commitmentAmount = null;
  else {
    const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,13}(\.\d{1,2})?$/.test(raw.trim()) ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n < 0 || n > 9_999_999_999_999) fe.commitmentAmount = "Nilai komitmen harus angka rupiah, tidak negatif.";
    else out.commitmentAmount = n.toFixed(2);
  }

  // Urutan proses pembentukan: akta setelah musdesus; pengesahan dan penyampaian ke pemkab setelah akta.
  const at = (k: string) => (out[k] instanceof Date ? (out[k] as Date).getTime() : null);
  const after = (later: string, earlier: string, msg: string) => {
    const a = at(later), b = at(earlier);
    if (a !== null && b !== null && a < b && !fe[later]) fe[later] = msg;
  };
  after("deedDate", "musdesusAt", "Tanggal akta tidak boleh sebelum musdesus.");
  after("submittedToRegencyAt", "deedDate", "Tanggal disampaikan tidak boleh sebelum tanggal akta.");
  after("skDate", "deedDate", "Tanggal SK tidak boleh sebelum tanggal akta.");
  after("npwpAt", "skDate", "Tanggal NPWP tidak boleh sebelum tanggal SK pengesahan.");

  if (Object.keys(fe).length) return { ok: false, errors: Object.values(fe), fieldErrors: fe };
  return { ok: true, value: out as FormationInput };
}

export const STEPS = [
  { key: "musdesus", label: "Musyawarah Desa Khusus (berita acara)", done: (f: Row) => Boolean(f.musdesusAt && f.musdesusRef) },
  { key: "kades", label: "Persetujuan kepala desa", done: (f: Row) => Boolean(f.kadesApprovedAt) },
  { key: "akta", label: "Akta pendirian dari notaris", done: (f: Row) => Boolean(f.deedNumber && f.deedDate) },
  { key: "komitmen", label: "Surat komitmen modal awal APBDesa", done: (f: Row) => Boolean(f.commitmentRef) },
  { key: "pemkab", label: "Disampaikan ke pemerintah kabupaten/kota", done: (f: Row) => Boolean(f.submittedToRegencyAt) },
  { key: "sk", label: "SK pengesahan akta pendirian", done: (f: Row) => Boolean(f.skNumber && f.skDate) },
  { key: "npwp", label: "NPWP koperasi", done: (f: Row) => Boolean(f.npwpAt) },
  { key: "simkopdes", label: "Akun Simkopdes", done: (f: Row) => Boolean(f.simkopdesAt) },
] as const;

type Row = Prisma.CooperativeFormationGetPayload<object>;
const EMPTY = Object.fromEntries([...DATE_FIELDS, ...Object.keys(TEXT_FIELDS), "commitmentAmount"].map((k) => [k, null])) as Record<string, null>;

export function serializeFormation(r: Row | null) {
  const row = (r ?? EMPTY) as Row;
  return {
    musdesusAt: isoDay(row.musdesusAt ?? null),
    musdesusRef: row.musdesusRef ?? null,
    musdesusNotes: row.musdesusNotes ?? null,
    kadesApprovedAt: isoDay(row.kadesApprovedAt ?? null),
    deedNumber: row.deedNumber ?? null,
    deedDate: isoDay(row.deedDate ?? null),
    notaryName: row.notaryName ?? null,
    commitmentRef: row.commitmentRef ?? null,
    commitmentAmount: row.commitmentAmount ? row.commitmentAmount.toFixed(2) : null,
    submittedToRegencyAt: isoDay(row.submittedToRegencyAt ?? null),
    skNumber: row.skNumber ?? null,
    skDate: isoDay(row.skDate ?? null),
    npwpAt: isoDay(row.npwpAt ?? null),
    simkopdesAt: isoDay(row.simkopdesAt ?? null),
    notes: row.notes ?? null,
    steps: STEPS.map((s) => ({ key: s.key, label: s.label, done: r ? s.done(r) : false })),
  };
}
export type FormationView = ReturnType<typeof serializeFormation>;

export async function getFormation(db: Db, cooperativeId: number): Promise<FormationView> {
  return serializeFormation(await db.cooperativeFormation.findUnique({ where: { cooperativeId } }));
}

export async function saveFormation(db: Db, args: { cooperativeId: number; userId: number; input: unknown; now?: Date }): Promise<{ ok: true; data: FormationView } | { ok: false; errors: string[]; fieldErrors: Record<string, string> }> {
  const p = parseFormationInput(args.input, args.now);
  if (!p.ok) return p;
  const row = await db.cooperativeFormation.upsert({
    where: { cooperativeId: args.cooperativeId },
    create: { cooperativeId: args.cooperativeId, updatedById: args.userId, ...p.value },
    update: { updatedById: args.userId, ...p.value },
  });
  return { ok: true, data: serializeFormation(row) };
}
