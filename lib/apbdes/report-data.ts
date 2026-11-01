/** Memuat data tahun anggaran dari basis data lalu menyusun ringkasan layar dan tabel laporan. */
import type { Prisma } from "@prisma/client";
import { fail, isoDay, type Result } from "@/lib/form-input";
import { fromCents } from "@/lib/coop/loan-math";
import { DEADLINES, MONTHS } from "./catalog";
import { balancesOf, buildBankBook, buildBku, buildTaxBook } from "./ledger";
import { buildActivityRecap, buildRealization, type BudgetLine } from "./reports";
import { activeDocument, ensureYear, listDocuments, loadEntries, monthStatuses, toBudgetLines } from "./service";
import { publicInfoTable, activityTable, bankTable, bkuTable, realizationDetailTable, realizationTable, semesterOneTable, taxTable, type ReportContext, type ReportTable } from "./tables";

type Db = Prisma.TransactionClient;

export const REPORT_KINDS = ["bku", "bank", "pajak", "semester1", "realisasi", "rincian", "kegiatan", "publik"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const isReportKind = (v: unknown): v is ReportKind => typeof v === "string" && (REPORT_KINDS as readonly string[]).includes(v);

export async function yearContext(db: Db, villageId: number, year: number): Promise<ReportContext> {
  const [village, s] = await Promise.all([db.village.findUnique({ where: { id: villageId }, select: { name: true, address: true, phone: true, email: true } }), ensureYear(db, villageId, year)]);
  const bank = [s.bankName, s.bankBranch ? `Cabang ${s.bankBranch}` : null, s.bankAccountNo ? `No. Rekening ${s.bankAccountNo}` : null].filter(Boolean).join(", ");
  const complaint = [village?.address, village?.phone ? `Telp. ${village.phone}` : null, village?.email].filter(Boolean).join(", ");
  return { villageName: village?.name ?? "", year, bankLine: bank || null, villageHeadName: s.villageHeadName, secretaryName: s.secretaryName, treasurerName: s.treasurerName, complaintAddress: complaint || null };
}

/** Tenggat yang sudah lewat atau mendekat, dari Pasal 63, 67, 68, dan 70. Hanya peringatan; tidak memblokir apa pun. */
function alertsFor(year: number, months: { month: number; state: string; entryCount: number }[], now: Date): string[] {
  const out: string[] = [];
  for (const m of months) {
    if (m.state !== "BUKA" || m.entryCount === 0) continue;
    const due = Date.UTC(year, m.month, DEADLINES.bkuToSecretaryDay + 1); // tanggal 10 bulan berikutnya, berakhir pukul 24:00
    if (now.getTime() >= due) out.push(`Buku kas ${MONTHS[m.month - 1]} ${year} belum ditutup dan sudah lewat tanggal ${DEADLINES.bkuToSecretaryDay} bulan berikutnya (Pasal 67).`);
  }
  return out;
}

export async function overview(db: Db, villageId: number, year: number, now: Date = new Date()) {
  const [settings, docs, entries, months, active] = await Promise.all([
    ensureYear(db, villageId, year),
    listDocuments(db, villageId, year),
    loadEntries(db, villageId, year),
    monthStatuses(db, villageId, year),
    activeDocument(db, villageId, year),
  ]);
  const lines = active ? toBudgetLines(active.lines) : [];
  const r = buildRealization(lines, entries);
  const bal = balancesOf(entries);
  const alerts = alertsFor(year, months, now);
  if (!active) alerts.push("APB Desa tahun ini belum ditetapkan, sehingga belanja belum dapat dicatat.");
  return {
    year,
    settings: {
      bankName: settings.bankName,
      bankBranch: settings.bankBranch,
      bankAccountNo: settings.bankAccountNo,
      villageHeadName: settings.villageHeadName,
      secretaryName: settings.secretaryName,
      treasurerName: settings.treasurerName,
    },
    documents: docs,
    activeDocumentId: active?.id ?? null,
    activeLabel: active ? (active.version === 0 ? "APB Desa" : `Perubahan APB Desa ke-${active.version}`) : null,
    balances: { tunai: fromCents(bal.tunai), bank: fromCents(bal.bank), pajak: fromCents(bal.pajak), total: fromCents(bal.tunai + bal.bank) },
    summary: {
      incomeBudget: fromCents(r.totals.incomeBudget),
      incomeRealized: fromCents(r.totals.incomeRealized),
      expenseBudget: fromCents(r.totals.expenseBudget),
      expenseRealized: fromCents(r.totals.expenseRealized),
      silpaRealized: fromCents(r.silpaRealized),
    },
    months,
    alerts,
    deadlines: { semesterOne: DEADLINES.semesterOneLabel, accountability: DEADLINES.accountabilityLabel },
    entryCount: entries.length,
  };
}

export async function buildReport(db: Db, villageId: number, year: number, kind: ReportKind, month?: number): Promise<Result<ReportTable>> {
  if (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12)) return fail(400, "Bulan tidak valid.");
  const [ctx, entries, active] = await Promise.all([yearContext(db, villageId, year), loadEntries(db, villageId, year), activeDocument(db, villageId, year)]);
  const lines: BudgetLine[] = active ? toBudgetLines(active.lines) : [];
  let table: ReportTable;
  switch (kind) {
    case "bku":
      table = bkuTable(ctx, buildBku(entries, month), month);
      break;
    case "bank":
      table = bankTable(ctx, buildBankBook(entries, month), month);
      break;
    case "pajak":
      table = taxTable(ctx, buildTaxBook(entries));
      break;
    case "semester1":
      table = semesterOneTable(ctx, buildRealization(lines, entries, `${year}-06-30`));
      break;
    case "realisasi":
      table = realizationTable(ctx, buildRealization(lines, entries));
      break;
    case "rincian":
      table = realizationDetailTable(ctx, buildRealization(lines, entries));
      break;
    case "kegiatan":
      table = activityTable(ctx, buildActivityRecap(lines, entries));
      break;
    case "publik":
      table = publicInfoTable(ctx, buildRealization(lines, entries), buildActivityRecap(lines, entries));
      break;
  }
  if (!active && (kind === "semester1" || kind === "realisasi" || kind === "rincian" || kind === "kegiatan" || kind === "publik")) {
    table.notes.unshift("APB Desa tahun ini belum ditetapkan: kolom anggaran kosong.");
  }
  return { ok: true, data: table };
}

export { isoDay };
