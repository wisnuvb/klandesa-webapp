import { Prisma, type PrismaClient } from "@prisma/client";
import { buildActivityRecap, buildRealization } from "@/lib/apbdes/reports";
import { activeDocument, loadEntries, toBudgetLines } from "@/lib/apbdes/service";
import { yearContext } from "@/lib/apbdes/report-data";
import { realizationTable, type ReportTable } from "@/lib/apbdes/tables";
import { bidangName } from "@/lib/apbdes/catalog";
import { fromCents } from "@/lib/coop/loan-math";
import { cleanText, fail, future, invalid, isRecord, isoDay, parseIsoDate, type Result } from "@/lib/form-input";
import { LIMITS, META_KEYS, SECTIONS, deadlineOf, isReportKind, type ReportKind } from "./catalog";
import { buildDocument, missingRequired, type AutoData, type ReportDocument } from "./document";

type Db = Prisma.TransactionClient;
const validYear = (y: number): boolean => Number.isInteger(y) && y >= 2000 && y <= 2100;

export interface ReportView {
  kind: ReportKind;
  year: number;
  status: "DRAFT" | "DISERAHKAN";
  sections: Record<string, string>;
  termEnd: string | null;
  deadline: string | null;
  submittedAt: string | null;
  submittedNote: string | null;
  missing: string[];
  /** Saran isi dari data yang sudah ada (belum tersimpan sampai petugas menyimpannya) */
  suggestions: { visi_misi: string | null };
}

const toSections = (raw: unknown, kind: ReportKind): Record<string, string> => {
  const out: Record<string, string> = {};
  if (!isRecord(raw)) return out;
  for (const s of [...SECTIONS[kind].map((x) => x.id), ...META_KEYS]) if (typeof raw[s] === "string") out[s] = raw[s] as string;
  return out;
};

async function planOf(db: Db, villageId: number, year: number) {
  const plans = await db.rpjmdesPlan.findMany({ where: { villageId, periodStart: { lte: year }, periodEnd: { gte: year } }, orderBy: [{ updatedAt: "desc" }], take: 5 });
  const p = plans.find((x) => x.status === "active") ?? plans[0];
  return p ? { title: p.title, vision: p.vision, mission: p.mission } : null;
}

export async function getReport(db: Db, villageId: number, kind: ReportKind, year: number): Promise<Result<ReportView>> {
  if (!validYear(year)) return fail(400, "Tahun tidak valid.");
  const row = await db.villageReport.findUnique({ where: { villageId_kind_year: { villageId, kind, year } } });
  const sections = toSections(row?.sections, kind);
  const plan = await planOf(db, villageId, year);
  const termEnd = sections.masa_jabatan_berakhir ?? null;
  const vm = plan && (plan.vision || plan.mission) ? [plan.vision ? `Visi: ${plan.vision}` : null, plan.mission ? `Misi: ${plan.mission}` : null].filter(Boolean).join("\n\n") : null;
  return {
    ok: true,
    data: {
      kind,
      year,
      status: (row?.status as ReportView["status"] | undefined) ?? "DRAFT",
      sections,
      termEnd,
      deadline: deadlineOf(kind, year, termEnd),
      submittedAt: isoDay(row?.submittedAt ?? null),
      submittedNote: row?.submittedNote ?? null,
      missing: missingRequired(kind, sections),
      suggestions: { visi_misi: vm },
    },
  };
}

/** Menyimpan bagian naratif (hanya selama draf). Bagian yang tidak dikirim tidak diubah; kirim "" untuk mengosongkan. */
export async function saveReport(db: PrismaClient, args: { villageId: number; userId: number | null; kind: ReportKind; year: number; input: unknown }): Promise<Result<{ saved: number }>> {
  if (!validYear(args.year)) return fail(400, "Tahun tidak valid.");
  const body = isRecord(args.input) && isRecord(args.input.sections) ? args.input.sections : null;
  if (!body) return fail(400, "Isian tidak terbaca.");
  const known = new Set<string>([...SECTIONS[args.kind].map((s) => s.id), ...META_KEYS]);
  const fe: Record<string, string> = {};
  const patch: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!known.has(k)) { fe[k] = "Bagian tidak dikenal"; continue; }
    if (k === "masa_jabatan_berakhir") {
      if (v !== "" && !parseIsoDate(v)) fe[k] = "Tanggal tidak valid";
      else patch[k] = typeof v === "string" ? v : "";
      continue;
    }
    if (typeof v !== "string") { fe[k] = "Isian harus berupa teks"; continue; }
    // Paragraf (baris kosong) harus tetap ada, jadi teks tidak dirapikan seperti isian satu baris; hanya spasi ujung baris dipangkas.
    const text = v.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();
    if (text.length > LIMITS.sectionChars) { fe[k] = `Maksimal ${LIMITS.sectionChars} karakter`; continue; }
    patch[k] = text;
  }
  if (Object.keys(fe).length) return invalid({ errors: Object.values(fe), fieldErrors: fe });
  if ((await db.villageReport.count({ where: { villageId: args.villageId } })) >= LIMITS.reportsPerVillage) {
    const exists = await db.villageReport.findUnique({ where: { villageId_kind_year: { villageId: args.villageId, kind: args.kind, year: args.year } }, select: { id: true } });
    if (!exists) return fail(409, "Batas jumlah laporan desa tercapai.");
  }
  return db.$transaction(async (tx) => {
    const cur = await tx.villageReport.findUnique({ where: { villageId_kind_year: { villageId: args.villageId, kind: args.kind, year: args.year } } });
    if (cur?.status === "DISERAHKAN") return fail(409, "Laporan ini sudah ditandai diserahkan. Buka kembali untuk mengubahnya.");
    const merged = { ...toSections(cur?.sections, args.kind), ...patch };
    for (const k of Object.keys(merged)) if (merged[k] === "") delete merged[k];
    await tx.villageReport.upsert({
      where: { villageId_kind_year: { villageId: args.villageId, kind: args.kind, year: args.year } },
      create: { villageId: args.villageId, kind: args.kind, year: args.year, sections: merged, createdById: args.userId },
      update: { sections: merged },
    });
    return { ok: true as const, data: { saved: Object.keys(patch).length } };
  });
}

/** Menandai laporan sudah diserahkan (dengan tanggal dan keterangan). Semua bagian wajib harus terisi. */
export async function submitReport(db: PrismaClient, args: { villageId: number; kind: ReportKind; year: number; input: unknown; now?: Date }): Promise<Result<{ id: number }>> {
  const b = isRecord(args.input) ? args.input : {};
  const at = parseIsoDate(b.submittedAt);
  if (!at) return invalid({ errors: ["Isi tanggal penyerahan."], fieldErrors: { submittedAt: "Isi tanggal penyerahan" } });
  if (future(at, args.now ?? new Date())) return invalid({ errors: ["Tanggal penyerahan tidak boleh di masa depan."], fieldErrors: { submittedAt: "Tanggal masa depan" } });
  const note = cleanText(b.note, 200);
  if (note.bad || note.tooLong) return invalid({ errors: ["Keterangan maksimal 200 karakter."], fieldErrors: { note: "Maksimal 200 karakter" } });
  const row = await db.villageReport.findUnique({ where: { villageId_kind_year: { villageId: args.villageId, kind: args.kind, year: args.year } } });
  if (!row) return fail(404, "Laporan belum disusun.");
  if (row.status === "DISERAHKAN") return fail(409, "Laporan ini sudah ditandai diserahkan.");
  const missing = missingRequired(args.kind, toSections(row.sections, args.kind));
  if (missing.length) return fail(409, `Bagian wajib belum diisi: ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? ` (+${missing.length - 3} lagi)` : ""}.`);
  if (args.kind === "LPPD_JABATAN" && !toSections(row.sections, args.kind).masa_jabatan_berakhir) return fail(409, "Isi tanggal berakhirnya masa jabatan.");
  await db.villageReport.update({ where: { id: row.id }, data: { status: "DISERAHKAN", submittedAt: at, submittedNote: note.value } });
  return { ok: true, data: { id: row.id } };
}

export async function reopenReport(db: PrismaClient, args: { villageId: number; kind: ReportKind; year: number }): Promise<Result<{ id: number }>> {
  const res = await db.villageReport.updateMany({ where: { villageId: args.villageId, kind: args.kind, year: args.year, status: "DISERAHKAN" }, data: { status: "DRAFT", submittedAt: null, submittedNote: null } });
  return res.count === 0 ? fail(404, "Laporan tidak ditemukan atau belum diserahkan.") : { ok: true, data: { id: 0 } };
}

async function populationTable(db: Db, villageId: number, year: number, ctx: Awaited<ReturnType<typeof yearContext>>): Promise<ReportTable> {
  const [byGender, households, mutations] = await Promise.all([
    db.resident.groupBy({ by: ["gender"], where: { villageId, isAlive: true, moveDate: null }, _count: { _all: true } }),
    db.household.count({ where: { villageId } }),
    db.residentMutation.groupBy({ by: ["type"], where: { villageId, status: "APPLIED", effectiveDate: { gte: new Date(Date.UTC(year, 0, 1)), lte: new Date(Date.UTC(year, 11, 31)) } }, _count: { _all: true } }),
  ]);
  const g = (p: string) => byGender.filter((x) => x.gender.toLowerCase().startsWith(p)).reduce((a, x) => a + x._count._all, 0);
  const l = g("l");
  const pr = g("p");
  const m = (t: string) => mutations.find((x) => x.type === t)?._count._all ?? 0;
  const row = (label: string, v: number | string, bold = false) => ({ cells: [label, String(v)], bold });
  return {
    kind: "penduduk",
    title: "Rekapitulasi Jumlah Penduduk",
    subtitle: [`Pemerintah Desa ${ctx.villageName}`, `Keadaan data warga saat laporan disusun; mutasi selama tahun ${year}`],
    columns: [{ label: "Uraian" }, { label: "Jumlah", num: true }],
    rows: [row("Penduduk laki-laki", l), row("Penduduk perempuan", pr), row("Jumlah penduduk", l + pr, true), row("Jumlah kepala keluarga", households), row(`Kelahiran ${year}`, m("BIRTH")), row(`Kematian ${year}`, m("DEATH")), row(`Pindah datang ${year}`, m("MOVE_IN")), row(`Pindah keluar ${year}`, m("MOVE_OUT"))],
    notes: ["Aplikasi menyimpan data warga saat ini, bukan potret akhir bulan Desember. Untuk tahun yang sudah lewat, jumlah penduduk bisa berbeda dari keadaan 31 Desember; periksa sebelum dilampirkan (Pasal 3 ayat 11)."],
    signers: [],
  };
}

export async function loadAutoData(db: Db, villageId: number, year: number): Promise<AutoData> {
  const ctx = await yearContext(db, villageId, year);
  const [doc, entries, plan] = await Promise.all([activeDocument(db, villageId, year), loadEntries(db, villageId, year), planOf(db, villageId, year)]);
  const lines = doc ? toBudgetLines(doc.lines) : [];
  const realization = doc ? realizationTable(ctx, buildRealization(lines, entries)) : null;
  const recap = buildActivityRecap(lines, entries);
  const activities = ["1", "2", "3", "4", "5"].map((b) => ({
    bidang: bidangName(b) ?? b,
    items: recap.filter((a) => a.activityCode.startsWith(`${b}.`)).map((a) => ({ code: a.activityCode, name: a.name, budget: fromCents(a.budget), realized: fromCents(a.realized) })),
  }));
  return {
    village: { name: ctx.villageName, address: ctx.complaintAddress },
    year,
    headName: ctx.villageHeadName,
    plan,
    perdes: doc ? { number: doc.regulationNumber, date: isoDay(doc.regulationDate), label: doc.version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${doc.version}` } : null,
    realization,
    activities,
    population: await populationTable(db, villageId, year, ctx),
  };
}

export async function loadDocument(db: Db, villageId: number, kind: ReportKind, year: number): Promise<Result<ReportDocument & { status: string }>> {
  if (!isReportKind(kind)) return fail(400, "Jenis laporan tidak dikenal.");
  const r = await getReport(db, villageId, kind, year);
  if (!r.ok) return r;
  const data = await loadAutoData(db, villageId, year);
  const doc = buildDocument(kind, r.data.sections, data);
  return { ok: true, data: { ...doc, status: r.data.status } };
}
