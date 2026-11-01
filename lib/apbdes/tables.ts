/**
 * Mengubah hasil hitungan menjadi tabel umum yang dipakai layar cetak dan unduhan CSV. Murni.
 * Kolom dan judul mengikuti lampiran Permendagri 20/2018: P (BKU), Q.1 (Buku Bank), Q.2 (Buku Pajak),
 * S (Semester Pertama), T.2.a (Laporan Realisasi APB Desa).
 */
import type { Cents } from "@/lib/coop/loan-math";
import { FUND_SOURCES, MONTHS, type FundSource } from "./catalog";
import type { BankBook, Bku, TaxBook } from "./ledger";
import type { ActivityRecap, Realization, SummaryRow } from "./reports";
import { buildRealizationSummary } from "./reports";

export interface ReportColumn {
  label: string;
  num?: boolean;
}
export interface ReportTableRow {
  cells: string[];
  bold?: boolean;
  indent?: number;
}
export interface ReportTable {
  kind: string;
  title: string;
  subtitle: string[];
  columns: ReportColumn[];
  rows: ReportTableRow[];
  notes: string[];
  signers: { role: string; name: string | null }[];
}

export interface ReportContext {
  villageName: string;
  year: number;
  bankLine: string | null;
  villageHeadName: string | null;
  secretaryName: string | null;
  treasurerName: string | null;
  /** Alamat, telepon, dan surel desa untuk bagian alamat pengaduan (Pasal 72). */
  complaintAddress: string | null;
}

/** 1234567.5 sen → "1.234.567,50"; negatif dalam kurung. Nol tampil "0,00". */
export function fmt(c: Cents): string {
  const neg = c < 0n;
  const a = neg ? -c : c;
  const body = `${(a / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${String(a % 100n).padStart(2, "0")}`;
  return neg ? `(${body})` : body;
}
const blank = (c: Cents): string => (c === 0n ? "" : fmt(c));

const dateId = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const head = (ctx: ReportContext, extra: string[] = []): string[] => [`Pemerintah Desa ${ctx.villageName}`, `Tahun Anggaran ${ctx.year}`, ...extra];

export function bkuTable(ctx: ReportContext, bku: Bku, month?: number): ReportTable {
  const rows: ReportTableRow[] = [];
  rows.push({ cells: ["", "", "", "Saldo awal", "", "", "", "", fmt(bku.openingBalance)], bold: true });
  for (const r of bku.rows) rows.push({ cells: [String(r.no), dateId(r.date), r.accountCode, r.description, blank(r.receipt), blank(r.expense), r.voucherNo, fmt(r.net), fmt(r.balance)] });
  rows.push({ cells: ["", "", "", "JUMLAH", fmt(bku.totalReceipt), fmt(bku.totalExpense), "", fmt(bku.totalReceipt - bku.totalExpense), fmt(bku.closingBalance)], bold: true });
  return {
    kind: "bku",
    title: "Buku Kas Umum",
    subtitle: head(ctx, month ? [`Bulan ${MONTHS[month - 1]}`] : []),
    columns: [{ label: "No" }, { label: "Tanggal" }, { label: "Kode Rekening" }, { label: "Uraian" }, { label: "Penerimaan (Rp)", num: true }, { label: "Pengeluaran (Rp)", num: true }, { label: "Nomor Bukti" }, { label: "Netto (Rp)", num: true }, { label: "Saldo (Rp)", num: true }],
    rows,
    notes: ["Saldo kas gabungan (tunai dan rekening bank). Pemotongan pajak dicatat sebagai penerimaan dan setoran pajak sebagai pengeluaran. Tarik dan setor tunai tidak mengubah saldo gabungan sehingga tidak tampil di sini."],
    signers: [
      { role: "Diverifikasi oleh Sekretaris Desa", name: ctx.secretaryName },
      { role: "Disetujui oleh Kepala Desa", name: ctx.villageHeadName },
      { role: "Kaur Keuangan", name: ctx.treasurerName },
    ],
  };
}

export function bankTable(ctx: ReportContext, bank: BankBook, month?: number): ReportTable {
  const rows: ReportTableRow[] = [{ cells: ["", "", "Saldo awal", "", "", "", "", "", "", fmt(bank.openingBalance)], bold: true }];
  for (const r of bank.rows) rows.push({ cells: [String(r.no), dateId(r.date), r.description, r.voucherNo, blank(r.deposit), blank(r.interest), blank(r.withdrawal), blank(r.tax), blank(r.fee), fmt(r.balance)] });
  const t = bank.total;
  rows.push({ cells: ["", "", "TOTAL TRANSAKSI BULAN INI", "", fmt(t.deposit), fmt(t.interest), fmt(t.withdrawal), fmt(t.tax), fmt(t.fee), fmt(bank.closingBalance)], bold: true });
  const c = bank.cumulative;
  rows.push({ cells: ["", "", "TOTAL TRANSAKSI KUMULATIF", "", fmt(c.deposit), fmt(c.interest), fmt(c.withdrawal), fmt(c.tax), fmt(c.fee), fmt(bank.closingBalance)], bold: true });
  return {
    kind: "bank",
    title: "Buku Pembantu Bank",
    subtitle: head(ctx, [...(month ? [`Bulan ${MONTHS[month - 1]}`] : []), ...(ctx.bankLine ? [ctx.bankLine] : [])]),
    columns: [{ label: "No" }, { label: "Tanggal" }, { label: "Uraian Transaksi" }, { label: "Bukti" }, { label: "Setoran (Rp)", num: true }, { label: "Bunga Bank (Rp)", num: true }, { label: "Penarikan (Rp)", num: true }, { label: "Pajak (Rp)", num: true }, { label: "Biaya Adm (Rp)", num: true }, { label: "Saldo (Rp)", num: true }],
    rows,
    notes: ["Penarikan belanja dihitung sebesar jumlah bersih setelah pajak dipotong; pajak yang tertahan keluar saat disetor."],
    signers: [{ role: "Kaur Keuangan", name: ctx.treasurerName }],
  };
}

export function taxTable(ctx: ReportContext, tax: TaxBook): ReportTable {
  const rows: ReportTableRow[] = tax.rows.map((r) => ({ cells: [String(r.no), dateId(r.date), r.description, blank(r.withheld), blank(r.deposited), fmt(r.balance)] }));
  rows.push({ cells: ["", "", "JUMLAH", fmt(tax.totalWithheld), fmt(tax.totalDeposited), fmt(tax.balance)], bold: true });
  return {
    kind: "pajak",
    title: "Buku Kas Pembantu Pajak",
    subtitle: head(ctx),
    columns: [{ label: "No" }, { label: "Tanggal" }, { label: "Uraian" }, { label: "Pemotongan (Rp)", num: true }, { label: "Penyetoran (Rp)", num: true }, { label: "Saldo (Rp)", num: true }],
    rows,
    notes: ["Saldo adalah pajak yang sudah dipotong tetapi belum disetor. Tarif dan jenis pajak mengikuti ketentuan perpajakan yang berlaku (Pasal 58)."],
    signers: [{ role: "Kaur Keuangan", name: ctx.treasurerName }],
  };
}

function realizationRows(r: Realization): ReportTableRow[] {
  return r.rows.map((row) => {
    const funds = row.fundSources.map((f) => FUND_SOURCES[f as FundSource] ?? f).join(", ");
    return { cells: [row.code, row.name, fmt(row.budget), fmt(row.realized), fmt(row.budget - row.realized), funds], indent: row.level, bold: row.level === 0 };
  });
}

const COLS_S: ReportColumn[] = [{ label: "Kode Rekening" }, { label: "Uraian" }, { label: "Anggaran (Rp)", num: true }, { label: "Realisasi (Rp)", num: true }, { label: "(Lebih)/Kurang (Rp)", num: true }, { label: "Sumber Dana" }];

/** Lampiran S: Laporan Pelaksanaan APB Desa Semester Pertama (realisasi sampai 30 Juni). */
export function semesterOneTable(ctx: ReportContext, r: Realization): ReportTable {
  const rows = realizationRows(r);
  rows.push({ cells: ["", "JUMLAH PENDAPATAN", fmt(r.totals.incomeBudget), fmt(r.totals.incomeRealized), fmt(r.totals.incomeBudget - r.totals.incomeRealized), ""], bold: true });
  rows.push({ cells: ["", "JUMLAH BELANJA", fmt(r.totals.expenseBudget), fmt(r.totals.expenseRealized), fmt(r.totals.expenseBudget - r.totals.expenseRealized), ""], bold: true });
  rows.push({ cells: ["", "SURPLUS/(DEFISIT)", fmt(r.surplusBudget), fmt(r.surplusRealized), fmt(r.surplusBudget - r.surplusRealized), ""], bold: true });
  rows.push({ cells: ["", "SELISIH PEMBIAYAAN", fmt(r.financingNetBudget), fmt(r.financingNetRealized), fmt(r.financingNetBudget - r.financingNetRealized), ""], bold: true });
  return {
    kind: "semester1",
    title: "Laporan Pelaksanaan APB Desa Semester Pertama",
    subtitle: head(ctx, ["Realisasi sampai dengan 30 Juni"]),
    columns: COLS_S,
    rows,
    notes: ["Disampaikan Kepala Desa kepada Bupati/Wali Kota melalui camat paling lambat minggu kedua Juli (Pasal 68). Bersama laporan ini dilampirkan laporan realisasi kegiatan (rekap per kegiatan)."],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}

/** Lampiran T.2.a: Laporan Realisasi APB Desa akhir tahun. */
export function realizationTable(ctx: ReportContext, r: Realization): ReportTable {
  const heading = new Set(["PENDAPATAN", "BELANJA", "PEMBIAYAAN"]);
  const rows = buildRealizationSummary(r).map((s: SummaryRow): ReportTableRow => {
    if (heading.has(s.label)) return { cells: [s.label, "", "", ""], bold: true, indent: s.indent };
    return { cells: [s.label, fmt(s.budget), fmt(s.realized), fmt(s.budget - s.realized)], bold: s.bold, indent: s.indent };
  });
  return {
    kind: "realisasi",
    title: "Laporan Realisasi APB Desa",
    subtitle: head(ctx),
    columns: [{ label: "Uraian" }, { label: "Anggaran (Rp)", num: true }, { label: "Realisasi (Rp)", num: true }, { label: "(Lebih)/Kurang (Rp)", num: true }],
    rows,
    notes: [
      "Ringkasan menurut Lampiran T.2.a. Laporan pertanggungjawaban lengkap (Pasal 70) juga memuat catatan atas laporan keuangan, laporan realisasi kegiatan, dan daftar program sektoral/daerah yang masuk ke desa; tiga bagian itu disusun terpisah.",
      "Anggaran adalah APB Desa terakhir yang ditetapkan (setelah perubahan, bila ada).",
    ],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}

/** Rincian realisasi bertingkat (bidang, sub bidang, kegiatan, rekening) untuk lampiran laporan. */
export function realizationDetailTable(ctx: ReportContext, r: Realization): ReportTable {
  return {
    kind: "rincian",
    title: "Rincian Realisasi APB Desa",
    subtitle: head(ctx),
    columns: COLS_S,
    rows: realizationRows(r),
    notes: r.unbudgeted.length ? [`${r.unbudgeted.length} rekening memiliki realisasi tetapi tidak ada di anggaran (anggaran 0).`] : [],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}

export function activityTable(ctx: ReportContext, recap: ActivityRecap[]): ReportTable {
  const rows: ReportTableRow[] = recap.map((a) => ({ cells: [a.activityCode, a.name, fmt(a.budget), fmt(a.realized), fmt(a.remaining), `${a.percent.toFixed(2).replace(".", ",")}%`, blank(a.byType.personnel), blank(a.byType.goods), blank(a.byType.capital), blank(a.byType.unexpected)] }));
  const sum = (f: (a: ActivityRecap) => Cents) => recap.reduce((x, a) => x + f(a), 0n);
  const b = sum((a) => a.budget);
  const rl = sum((a) => a.realized);
  rows.push({ cells: ["", "JUMLAH", fmt(b), fmt(rl), fmt(b - rl), b > 0n ? `${(Number((rl * 10000n) / b) / 100).toFixed(2).replace(".", ",")}%` : "", fmt(sum((a) => a.byType.personnel)), fmt(sum((a) => a.byType.goods)), fmt(sum((a) => a.byType.capital)), fmt(sum((a) => a.byType.unexpected))], bold: true });
  return {
    kind: "kegiatan",
    title: "Rekap Realisasi per Kegiatan",
    subtitle: head(ctx),
    columns: [{ label: "Kode" }, { label: "Kegiatan" }, { label: "Anggaran (Rp)", num: true }, { label: "Realisasi (Rp)", num: true }, { label: "Sisa (Rp)", num: true }, { label: "%", num: true }, { label: "Pegawai (Rp)", num: true }, { label: "Barang/Jasa (Rp)", num: true }, { label: "Modal (Rp)", num: true }, { label: "Tak Terduga (Rp)", num: true }],
    rows,
    notes: ["Ringkasan realisasi dan sisa anggaran tiap kegiatan. Bukan format Buku Kas Pembantu Kegiatan (K.1), yang mencatat uang yang dipegang pelaksana kegiatan."],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}

/** CSV dari tabel: judul, kolom, baris. */
export function tableToCsvRows(t: ReportTable): string[][] {
  return t.rows.map((r) => r.cells);
}

/** Informasi kepada masyarakat menurut Pasal 72: realisasi APB Desa, realisasi kegiatan, kegiatan belum selesai/tidak terlaksana, sisa anggaran, alamat pengaduan. */
export function publicInfoTable(ctx: ReportContext, r: Realization, recap: ActivityRecap[]): ReportTable {
  const rows: ReportTableRow[] = [];
  const section = (label: string) => rows.push({ cells: [label, "", "", "", ""], bold: true });
  section("A. Realisasi APB Desa");
  const heading = new Set(["PENDAPATAN", "BELANJA", "PEMBIAYAAN"]);
  for (const s of buildRealizationSummary(r)) {
    if (heading.has(s.label)) rows.push({ cells: [s.label, "", "", "", ""], bold: true, indent: 1 });
    else rows.push({ cells: [s.label, fmt(s.budget), fmt(s.realized), fmt(s.budget - s.realized), ""], bold: s.bold, indent: s.indent + 1 });
  }
  section("B. Realisasi kegiatan");
  for (const a of recap) rows.push({ cells: [`${a.activityCode} ${a.name}`, fmt(a.budget), fmt(a.realized), fmt(a.remaining), `${a.percent.toFixed(2).replace(".", ",")}%`], indent: 1 });
  section("C. Kegiatan yang belum selesai dan/atau tidak terlaksana");
  const open = recap.filter((a) => a.budget > 0n && a.realized < a.budget);
  if (open.length === 0) rows.push({ cells: ["Tidak ada", "", "", "", ""], indent: 1 });
  for (const a of open) rows.push({ cells: [`${a.activityCode} ${a.name}`, fmt(a.budget), fmt(a.realized), fmt(a.remaining), a.realized === 0n ? "Tidak terlaksana (belum ada realisasi)" : `Belum selesai (${a.percent.toFixed(2).replace(".", ",")}%)`], indent: 1 });
  section("D. Sisa anggaran");
  rows.push({ cells: ["SiLPA tahun berjalan (surplus/defisit + pembiayaan netto)", "", fmt(r.silpaRealized), "", ""], indent: 1 });
  section("E. Alamat pengaduan");
  rows.push({ cells: [ctx.complaintAddress ?? "Isi alamat desa di pengaturan desa", "", "", "", ""], indent: 1 });
  return {
    kind: "publik",
    title: "Informasi Realisasi APB Desa untuk Masyarakat",
    subtitle: head(ctx),
    columns: [{ label: "Uraian" }, { label: "Anggaran (Rp)", num: true }, { label: "Realisasi (Rp)", num: true }, { label: "Sisa (Rp)", num: true }, { label: "Keterangan" }],
    rows,
    notes: [
      "Bagian A sampai E mengikuti isi minimal informasi kepada masyarakat menurut Pasal 72 ayat 2.",
      "Kegiatan dicantumkan 'belum selesai/tidak terlaksana' bila realisasinya di bawah anggaran; kegiatan yang selesai dengan hemat juga bisa tampil. Periksa dulu sebelum diumumkan.",
    ],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}
