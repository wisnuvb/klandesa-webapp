/**
 * Laporan lanjutan Permendagri 20/2018: RKA/RKK/RAB dan RAK Desa (Lampiran H, J), SPP dan Pernyataan Tanggung Jawab Belanja (M.1, M.2),
 * Buku Pembantu Panjar (Q.3), Laporan Realisasi Kegiatan (T.3), Program Sektoral (T.4), dan Catatan atas Laporan Keuangan (T.2.b).
 * Pembangun tabel murni; pemuatan data ada di loadMoreReport.
 */
import type { Prisma } from "@prisma/client";
import { fail, isoDay, type Result } from "@/lib/form-input";
import { fromCents, type Cents } from "@/lib/coop/loan-math";
import { FUND_SOURCES, MONTHS, accountName, type FundSource } from "./catalog";
import { balancesOf, buildTaxBook } from "./ledger";
import { buildActivityRecap, buildRealization, type BudgetLine, type Realization } from "./reports";
import { planOverview, type ActivityPlanView } from "./dpa";
import { activeDocument, loadEntries, toBudgetLines } from "./service";
import { listPanjar, listRequests, type PanjarView, type SppView } from "./spp";
import { fmt, type ReportContext, type ReportTable, type ReportTableRow } from "./tables";
import { yearContext } from "./report-data";

type Db = Prisma.TransactionClient;

export const MORE_KINDS = ["rka", "rab", "rkk", "rak", "spp", "ptjb", "panjar", "kegiatan-t3", "sektoral", "calk"] as const;
export type MoreKind = (typeof MORE_KINDS)[number];
export const isMoreKind = (v: unknown): v is MoreKind => typeof v === "string" && (MORE_KINDS as readonly string[]).includes(v);

const cents = (s: string): Cents => BigInt(s.replace(".", ""));
const blank = (c: Cents): string => (c === 0n ? "" : fmt(c));
const head = (ctx: ReportContext, extra: string[] = []): string[] => [`Pemerintah Desa ${ctx.villageName}`, `Tahun Anggaran ${ctx.year}`, ...extra];
const SHORT = MONTHS.map((m) => m.slice(0, 3));
const num = (c: string | null): string => (c === null ? "" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(c)));

const activityHead = (a: ActivityPlanView): string => `${a.activityCode} ${a.name}`;

export function rkaTable(ctx: ReportContext, a: ActivityPlanView, fundByAccount: Map<string, string>): ReportTable {
  const rows: ReportTableRow[] = a.accounts.map((x) => ({ cells: [`${a.activityCode} ${x.accountCode}`, x.accountName, fmt(cents(x.budget)), fundByAccount.get(x.accountCode) ?? "", ...x.months.map((m) => blank(cents(m))), fmt(cents(x.planned))] }));
  const sum = (f: (x: ActivityPlanView["accounts"][number]) => Cents) => a.accounts.reduce((acc, x) => acc + f(x), 0n);
  rows.push({ cells: ["", "JUMLAH", fmt(sum((x) => cents(x.budget))), "", ...Array.from({ length: 12 }, (_, i) => blank(sum((x) => cents(x.months[i]!)))), fmt(sum((x) => cents(x.planned)))], bold: true });
  return {
    kind: "rka",
    title: "Rencana Kegiatan dan Anggaran (DPA)",
    subtitle: head(ctx, [activityHead(a), `Pelaksana: ${a.executorName ?? "-"}`, `Status: ${a.status === "DISETUJUI" ? "disetujui Kepala Desa" : a.status === "DIVERIFIKASI" ? "diverifikasi Sekretaris Desa" : "draf"}`]),
    columns: [{ label: "Kode Rekening" }, { label: "Uraian" }, { label: "Anggaran (Rp)", num: true }, { label: "Sumber" }, ...SHORT.map((m) => ({ label: m, num: true })), { label: "Jumlah (Rp)", num: true }],
    rows,
    notes: ["Rencana penarikan anggaran per bulan menjadi dasar RAK Desa dan batas pengajuan SPP (Pasal 45, 48, 53)."],
    signers: [{ role: "Kaur/Kasi Pelaksana", name: a.executorName }, { role: "Diverifikasi Sekretaris Desa", name: ctx.secretaryName }, { role: "Disetujui Kepala Desa", name: ctx.villageHeadName }],
  };
}

export function rabTable(ctx: ReportContext, a: ActivityPlanView): ReportTable {
  const rows: ReportTableRow[] = a.costItems.map((x, i) => ({ cells: [String(i + 1), `${x.accountCode} ${accountName(x.accountCode) ?? ""}`, x.description, num(x.volume), x.unit, fmt(cents(x.unitPrice)), fmt(cents(x.amount))] }));
  const total = a.costItems.reduce((acc, x) => acc + cents(x.amount), 0n);
  rows.push({ cells: ["", "", "JUMLAH", "", "", "", fmt(total)], bold: true });
  return {
    kind: "rab",
    title: "Rencana Anggaran Biaya",
    subtitle: head(ctx, [activityHead(a)]),
    columns: [{ label: "No" }, { label: "Rekening" }, { label: "Uraian" }, { label: "Volume", num: true }, { label: "Satuan" }, { label: "Harga Satuan (Rp)", num: true }, { label: "Jumlah (Rp)", num: true }],
    rows,
    notes: ["Jumlah = volume x harga satuan, dibulatkan ke sen terdekat."],
    signers: [{ role: "Kaur/Kasi Pelaksana", name: a.executorName }, { role: "Disetujui Kepala Desa", name: ctx.villageHeadName }],
  };
}

export function rkkTable(ctx: ReportContext, activities: ActivityPlanView[]): ReportTable {
  const rows: ReportTableRow[] = activities
    .filter((a) => a.hasPlan)
    .map((a, i) => ({ cells: [String(i + 1), activityHead(a), a.location ?? "", num(a.outputVolume), a.outputUnit ?? "", fmt(cents(a.budget)), a.target ?? "", a.startMonth ? MONTHS[a.startMonth - 1]! : "", a.endMonth ? MONTHS[a.endMonth - 1]! : "", a.executorName ?? "", a.team ?? ""] }));
  return {
    kind: "rkk",
    title: "Rencana Kerja Kegiatan Desa",
    subtitle: head(ctx),
    columns: [{ label: "No" }, { label: "Bidang/Sub Bidang/Kegiatan" }, { label: "Lokasi" }, { label: "Volume", num: true }, { label: "Satuan" }, { label: "Biaya (Rp)", num: true }, { label: "Sasaran" }, { label: "Mulai" }, { label: "Selesai" }, { label: "Pelaksana" }, { label: "Tim" }],
    rows,
    notes: ["Hanya kegiatan yang Rencana Kerjanya sudah diisi. Rincian sasaran per jenis kelamin dan A-RTM pada Lampiran H.2 belum dicatat; tulis dalam kolom Sasaran bila perlu."],
    signers: [{ role: "Disetujui Kepala Desa", name: ctx.villageHeadName }],
  };
}

/** RAK Desa (Lampiran J): arus kas keluar per bulan dari DPA yang sudah disetujui. */
export function rakTable(ctx: ReportContext, activities: ActivityPlanView[]): ReportTable {
  const approved = activities.filter((a) => a.status === "DISETUJUI");
  const rows: ReportTableRow[] = [];
  const totals = Array.from({ length: 12 }, () => 0n);
  for (const a of approved) {
    rows.push({ cells: [a.activityCode, a.name, ...Array(13).fill("")], bold: true });
    for (const x of a.accounts) {
      rows.push({ cells: [x.accountCode, x.accountName, ...x.months.map((m) => blank(cents(m))), fmt(cents(x.planned))], indent: 1 });
      x.months.forEach((m, i) => (totals[i]! += cents(m)));
    }
  }
  const all = totals.reduce((a, b) => a + b, 0n);
  rows.push({ cells: ["", "ARUS KAS KELUAR", ...totals.map((t) => fmt(t)), fmt(all)], bold: true });
  let run = 0n;
  rows.push({ cells: ["", "Kumulatif", ...totals.map((t) => fmt((run += t))), ""], bold: true });
  return {
    kind: "rak",
    title: "Rencana Anggaran Kas Desa",
    subtitle: head(ctx),
    columns: [{ label: "Kode" }, { label: "Uraian" }, ...SHORT.map((m) => ({ label: m, num: true })), { label: "Jumlah (Rp)", num: true }],
    rows,
    notes: [`Dari ${approved.length} DPA yang sudah disetujui Kepala Desa (dari ${activities.length} kegiatan).`, "Hanya arus kas keluar (rencana penarikan belanja). Rencana arus kas masuk (pendapatan) per bulan belum dicatat; anggaran pendapatan tahunan ada di APB Desa (Pasal 48-51)."],
    signers: [{ role: "Kaur Keuangan", name: ctx.treasurerName }, { role: "Diverifikasi Sekretaris Desa", name: ctx.secretaryName }, { role: "Disetujui Kepala Desa", name: ctx.villageHeadName }],
  };
}

export function sppTable(ctx: ReportContext, s: SppView): ReportTable {
  const rows: ReportTableRow[] = s.lines.map((l, i) => ({ cells: [String(i + 1), `${l.accountCode} ${l.description}`, fmt(cents(l.pagu)), fmt(cents(l.previous)), fmt(cents(l.amount)), fmt(cents(l.total)), fmt(cents(l.remaining))] }));
  const sum = (f: (l: SppView["lines"][number]) => string) => s.lines.reduce((a, l) => a + cents(f(l)), 0n);
  rows.push({ cells: ["", "JUMLAH", fmt(sum((l) => l.pagu)), fmt(sum((l) => l.previous)), fmt(sum((l) => l.amount)), fmt(sum((l) => l.total)), fmt(sum((l) => l.remaining))], bold: true });
  return {
    kind: "spp",
    title: "Surat Permintaan Pembayaran (SPP)",
    subtitle: head(ctx, [s.label, `Kegiatan: ${s.activityCode} ${s.activityName}`, `Waktu pelaksanaan: ${s.workPeriod ?? "-"}`, `Pelaksanaan: ${s.mode === "SWAKELOLA" ? "swakelola" : "penyedia barang/jasa"}`, `Status: ${s.status}`]),
    columns: [{ label: "No" }, { label: "Uraian" }, { label: "Pagu Anggaran (Rp)", num: true }, { label: "Pencairan s.d. yang Lalu (Rp)", num: true }, { label: "Permintaan Sekarang (Rp)", num: true }, { label: "Jumlah s.d. Saat Ini (Rp)", num: true }, { label: "Sisa Dana (Rp)", num: true }],
    rows,
    notes: ["Pencairan lalu dihitung dari SPP yang sudah dibayar dengan nomor lebih kecil pada kegiatan yang sama."],
    signers: [{ role: "Telah dilakukan verifikasi, Sekretaris Desa", name: ctx.secretaryName }, { role: `Kaur/Kasi ${s.executorName ?? ""}`.trim(), name: s.executorName }, { role: "Disetujui untuk dibayarkan, Kepala Desa", name: ctx.villageHeadName }, { role: "Telah dibayar lunas, Kaur Keuangan", name: ctx.treasurerName }],
  };
}

export function ptjbTable(ctx: ReportContext, s: SppView): ReportTable {
  const rows: ReportTableRow[] = s.lines.map((l, i) => ({ cells: [String(i + 1), l.payee ?? "", `${l.description} (${l.accountCode})`, fmt(cents(l.amount))] }));
  rows.push({ cells: ["", "", "JUMLAH (Rp)", fmt(s.lines.reduce((a, l) => a + cents(l.amount), 0n))], bold: true });
  return {
    kind: "ptjb",
    title: "Pernyataan Tanggung Jawab Belanja",
    subtitle: head(ctx, [s.label, `Kegiatan: ${s.activityCode} ${s.activityName}`]),
    columns: [{ label: "No" }, { label: "Penerima" }, { label: "Uraian" }, { label: "Jumlah (Rp)", num: true }],
    rows,
    notes: ["Bukti-bukti pengeluaran atau belanja tersebut di atas terlampir untuk kelengkapan pembayaran. Demikian pernyataan ini dibuat dengan sebenarnya."],
    signers: [{ role: `Kaur/Kasi ${s.executorName ?? ""}`.trim(), name: s.executorName }],
  };
}

export function panjarTable(ctx: ReportContext, list: PanjarView[]): ReportTable {
  const rows: ReportTableRow[] = [];
  for (const p of list) {
    rows.push({ cells: ["", "", `${p.requestLabel} · ${p.activityCode} ${p.activityName}`, p.holderName, "", "", ""], bold: true });
    type Ev = { date: string; no: string; text: string; give: Cents; spj: Cents };
    const ev: Ev[] = [{ date: p.givenAt, no: p.requestLabel, text: "Pemberian panjar", give: cents(p.given), spj: 0n }];
    for (const s of p.spj) ev.push({ date: s.spjDate, no: s.voucherNo, text: s.description, give: 0n, spj: cents(s.amount) });
    for (const r of p.returns) ev.push({ date: r.date, no: "Setoran", text: `Pengembalian sisa panjar${r.accountCode ? ` (${r.accountCode})` : ""}`, give: 0n, spj: cents(r.amount) });
    ev.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.give > b.give ? -1 : 1));
    let bal = 0n;
    ev.forEach((e, i) => {
      bal += e.give - e.spj;
      rows.push({ cells: [String(i + 1), e.date, e.no, e.text, blank(e.give), blank(e.spj), fmt(bal)], indent: 1 });
    });
  }
  return {
    kind: "panjar",
    title: "Buku Pembantu Panjar",
    subtitle: head(ctx),
    columns: [{ label: "No" }, { label: "Tanggal" }, { label: "Nomor Bukti" }, { label: "Uraian" }, { label: "Pemberian (Rp)", num: true }, { label: "Pertanggungjawaban/Pengembalian (Rp)", num: true }, { label: "Saldo (Rp)", num: true }],
    rows,
    notes: ["Saldo adalah yang harus dikembalikan ke kas desa. Panjar swakelola dipertanggungjawabkan atau dikembalikan dalam 10 hari kerja (Pasal 54); hari libur nasional tidak dihitung aplikasi."],
    signers: [{ role: "Kaur Keuangan", name: ctx.treasurerName }],
  };
}

/** Realisasi per kegiatan dibagi menurut sumber dana anggaran rekeningnya: Dana Desa, ADD, lainnya. */
function fundSplit(lines: BudgetLine[], entries: { activityCode: string | null; accountCode: string | null; type: string; amountCents: bigint; entryDate: string }[], untilDate?: string) {
  const out = new Map<string, { dd: Cents; add: Cents; other: Cents }>();
  const lineSum = new Map<string, { total: Cents; byFund: Map<string, Cents> }>();
  for (const l of lines) {
    if (!l.activityCode) continue;
    const k = `${l.activityCode}|${l.accountCode}`;
    const cur = lineSum.get(k) ?? { total: 0n, byFund: new Map() };
    cur.total += l.amountCents;
    cur.byFund.set(l.fundSource ?? "-", (cur.byFund.get(l.fundSource ?? "-") ?? 0n) + l.amountCents);
    lineSum.set(k, cur);
  }
  for (const e of entries) {
    if ((e.type !== "PENGELUARAN" && e.type !== "PANJAR_KEMBALI") || !e.activityCode || !e.accountCode || (untilDate && e.entryDate > untilDate)) continue;
    const ls = lineSum.get(`${e.activityCode}|${e.accountCode}`);
    const amt = e.type === "PANJAR_KEMBALI" ? -e.amountCents : e.amountCents;
    const bucket = out.get(e.activityCode) ?? { dd: 0n, add: 0n, other: 0n };
    if (!ls || ls.total === 0n) bucket.other += amt;
    else {
      let rest = amt;
      const funds = [...ls.byFund.entries()];
      funds.forEach(([fund, budget], i) => {
        const part = i === funds.length - 1 ? rest : (amt * budget) / ls.total;
        rest -= part;
        if (fund === "DD") bucket.dd += part;
        else if (fund === "ADD") bucket.add += part;
        else bucket.other += part;
      });
    }
    out.set(e.activityCode, bucket);
  }
  return out;
}

export function activityRealizationTable(ctx: ReportContext, lines: BudgetLine[], entries: Parameters<typeof fundSplit>[1], plans: ActivityPlanView[], semester: boolean): ReportTable {
  const until = semester ? `${ctx.year}-06-30` : undefined;
  const recap = buildActivityRecap(lines, entries as never, until);
  const split = fundSplit(lines, entries, until);
  const rows: ReportTableRow[] = recap.map((a) => {
    const p = plans.find((x) => x.activityCode === a.activityCode);
    const s = split.get(a.activityCode) ?? { dd: 0n, add: 0n, other: 0n };
    const plannedVol = p?.outputVolume ?? null;
    const realVol = p?.realizedVolume ?? null;
    const pct = plannedVol && realVol && Number(plannedVol) > 0 ? `${((Number(realVol) / Number(plannedVol)) * 100).toFixed(2).replace(".", ",")}` : "";
    return { cells: [a.activityCode, a.name, p?.outputName ?? "", num(plannedVol), p?.outputUnit ?? "", fmt(a.budget), num(realVol), p?.outputUnit ?? "", fmt(a.realized), pct, blank(s.dd), blank(s.add), blank(s.other)] };
  });
  const tb = recap.reduce((a, r) => a + r.budget, 0n);
  const tr = recap.reduce((a, r) => a + r.realized, 0n);
  rows.push({ cells: ["", "JUMLAH", "", "", "", fmt(tb), "", "", fmt(tr), "", fmt([...split.values()].reduce((a, s) => a + s.dd, 0n)), fmt([...split.values()].reduce((a, s) => a + s.add, 0n)), fmt([...split.values()].reduce((a, s) => a + s.other, 0n))], bold: true });
  return {
    kind: "kegiatan-t3",
    title: "Laporan Realisasi Kegiatan",
    subtitle: head(ctx, [semester ? "Periode 1 Januari - 30 Juni (semester pertama)" : "Periode 1 Januari - 31 Desember"]),
    columns: [{ label: "Kode" }, { label: "Uraian" }, { label: "Nama Output" }, { label: "Rencana Volume", num: true }, { label: "Satuan" }, { label: "Rencana Anggaran (Rp)", num: true }, { label: "Realisasi Volume", num: true }, { label: "Satuan" }, { label: "Realisasi Anggaran (Rp)", num: true }, { label: "Capaian (%)", num: true }, { label: "Dana Desa (Rp)", num: true }, { label: "ADD (Rp)", num: true }, { label: "Lain-lain (Rp)", num: true }],
    rows,
    notes: ["Volume rencana dari Rencana Kerja Kegiatan; capaian volume diisi petugas di menu DPA. Realisasi per sumber dana dibagi menurut komposisi sumber dana anggaran rekening yang sama. Kolom 'Bentuk Lain' pada lampiran belum dicatat."],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}

export interface ExternalProgram {
  programName: string;
  activityKind: string;
  location: string | null;
  volume: string;
  unit: string;
  amount: string;
  fundSource: string;
}

export function externalProgramsTable(ctx: ReportContext, list: ExternalProgram[]): ReportTable {
  const rows: ReportTableRow[] = list.map((p, i) => ({ cells: [String(i + 1), p.programName, p.activityKind, p.location ?? "", num(p.volume), p.unit, fmt(cents(p.amount)), p.fundSource] }));
  rows.push({ cells: ["", "JUMLAH", "", "", "", "", fmt(list.reduce((a, p) => a + cents(p.amount), 0n)), ""], bold: true });
  return {
    kind: "sektoral",
    title: "Program Sektoral, Program Daerah, dan Program Lainnya yang Masuk ke Desa",
    subtitle: head(ctx),
    columns: [{ label: "No" }, { label: "Program" }, { label: "Jenis Kegiatan" }, { label: "Lokasi" }, { label: "Volume", num: true }, { label: "Satuan" }, { label: "Jumlah (Rp)", num: true }, { label: "Sumber Dana" }],
    rows,
    notes: ["Lampiran Peraturan Desa tentang laporan pertanggungjawaban realisasi APB Desa (Lampiran T.4)."],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}

export interface CalkInput {
  ctx: ReportContext;
  address: string | null;
  realization: Realization;
  budgetLines: BudgetLine[];
  cash: { tunai: Cents; bank: Cents; pajak: Cents };
  tax: { withheld: Cents; deposited: Cents };
  transfers: { code: string; label: string; receipts: { date: string; amount: Cents }[] }[];
  asset: { count: number; value: Cents } | null;
  regulationNote: string | null;
}

/** Catatan atas Laporan Keuangan (Lampiran T.2.b). Bagian naratif tetap; angka dihitung dari APB Desa dan Buku Kas Umum. */
export function calkTable(i: CalkInput): ReportTable {
  const { ctx, realization: r } = i;
  const rows: ReportTableRow[] = [];
  const text = (t: string, bold = false, indent = 0) => rows.push({ cells: [t, "", "", ""], bold, indent });
  const amt = (label: string, b: Cents, rl: Cents, indent = 1, bold = false) => rows.push({ cells: [label, fmt(b), fmt(rl), fmt(b - rl)], indent, bold });
  const node = (key: string) => r.rows.find((x) => x.key === key);
  const pick = (label: string, key: string, indent = 1) => amt(label, node(key)?.budget ?? 0n, node(key)?.realized ?? 0n, indent);

  text("A. Informasi Umum", true);
  text(`Pemerintah Desa ${ctx.villageName}. Kepengurusan: Kepala Desa ${ctx.villageHeadName ?? "(belum diisi)"}, Sekretaris Desa ${ctx.secretaryName ?? "(belum diisi)"}, Bendahara/Kaur Keuangan ${ctx.treasurerName ?? "(belum diisi)"}.${i.regulationNote ? ` ${i.regulationNote}` : ""}`, false, 1);
  text(`Kantor Pemerintahan Desa beralamat di ${i.address ?? "(belum diisi)"}.`, false, 1);
  text("B. Dasar Penyajian Laporan Keuangan", true);
  text("Laporan keuangan desa berupa Laporan Realisasi APB Desa sesuai basis kas dengan dasar harga perolehan. Pendapatan dicatat pada saat kas diterima di bank atau kas, dan belanja dicatat pada saat kas dikeluarkan dan telah bersifat definitif.", false, 1);
  text("C. Rincian Pos Laporan Keuangan", true);

  text("1. Rekonsiliasi SiLPA dan Kas", true, 1);
  const cash = i.cash.tunai + i.cash.bank;
  rows.push({ cells: ["SiLPA tahun anggaran berjalan", "", fmt(r.silpaRealized), ""], indent: 2 });
  rows.push({ cells: ["Mutasi potongan pajak: saldo awal periode (tidak dibawa dari tahun sebelumnya; mulai 0)", "", fmt(0n), ""], indent: 2 });
  rows.push({ cells: ["Penerimaan potongan pajak tahun anggaran berjalan", "", fmt(i.tax.withheld), ""], indent: 2 });
  rows.push({ cells: ["Setoran pajak ke kas negara selama tahun anggaran berjalan", "", fmt(-i.tax.deposited), ""], indent: 2 });
  rows.push({ cells: ["Saldo akhir potongan pajak yang belum disetor", "", fmt(i.cash.pajak), ""], indent: 2, bold: true });
  rows.push({ cells: ["Saldo kas akhir tahun (tunai dan bank)", "", fmt(cash), ""], indent: 2, bold: true });
  const diff = cash - (r.silpaRealized + i.cash.pajak);
  rows.push({ cells: [diff === 0n ? "Rekonsiliasi: SiLPA + pajak belum disetor = saldo kas (sesuai)" : "Selisih rekonsiliasi (SiLPA + pajak belum disetor terhadap saldo kas) perlu diperiksa", "", fmt(diff), ""], indent: 2, bold: diff !== 0n });

  text("2. Pendapatan Asli Desa", true, 1);
  for (const [k, l] of [["4.1.1", "Hasil usaha"], ["4.1.2", "Hasil aset"], ["4.1.3", "Swadaya, partisipasi, dan gotong royong"], ["4.1.4", "Lain-lain pendapatan asli desa yang sah"]] as const) pick(l, `P|${k}`, 2);
  pick("Jumlah Pendapatan Asli Desa", "P|4.1", 2);
  const tr = (n: number, title: string, code: string, jenisKey: string) => {
    text(`${n}. ${title}`, true, 1);
    pick(`Total ${title}`, jenisKey, 2);
    const t = i.transfers.find((x) => x.code === code);
    (t?.receipts ?? []).forEach((x, idx) => rows.push({ cells: [`Penerimaan ke-${idx + 1}, ${x.date}`, "", fmt(x.amount), ""], indent: 3 }));
  };
  tr(3, "Dana Desa", "4.2.1.01", "P|4.2.1");
  tr(4, "Bagian dari Hasil Pajak dan Retribusi Daerah", "4.2.2.01", "P|4.2.2");
  tr(5, "Alokasi Dana Desa (ADD)", "4.2.3.01", "P|4.2.3");
  tr(6, "Bantuan Keuangan Provinsi", "4.2.4.01", "P|4.2.4");
  tr(7, "Bantuan Keuangan Kabupaten/Kota", "4.2.5.01", "P|4.2.5");
  text("8. Pendapatan Lain-lain", true, 1);
  pick("Jumlah Pendapatan Lain-lain", "P|4.3", 2);
  const bidang: [number, string, string][] = [[9, "Penyelenggaraan Pemerintahan Desa", "1"], [10, "Pelaksanaan Pembangunan Desa", "2"], [11, "Pembinaan Kemasyarakatan Desa", "3"], [12, "Pemberdayaan Masyarakat Desa", "4"], [13, "Penanggulangan Bencana, Keadaan Darurat dan Mendesak Desa", "5"]];
  for (const [n, title, b] of bidang) {
    text(`${n}. Belanja - Bidang ${title}`, true, 1);
    for (const x of r.rows.filter((row) => row.section === "BELANJA" && row.level === 2 && row.key.startsWith(`B|${b}.`))) amt(`${x.code} ${x.name}`, x.budget, x.realized, 2);
    pick(`Jumlah Bidang ${title}`, `B|${b}`, 2);
  }
  text("14. Belanja Desa dalam Klasifikasi Ekonomi", true, 1);
  for (const [prefix, label] of [["5.1", "Belanja Pegawai"], ["5.2", "Belanja Barang dan Jasa"], ["5.3", "Belanja Modal"], ["5.4", "Belanja Tak Terduga"]] as const) {
    const sel = r.rows.filter((row) => row.section === "BELANJA" && row.level === 3 && row.code.endsWith(`.${prefix}`));
    amt(label, sel.reduce((a, x) => a + x.budget, 0n), sel.reduce((a, x) => a + x.realized, 0n), 2);
  }
  text("15. Belanja Desa dalam Klasifikasi Sub Bidang", true, 1);
  for (const x of r.rows.filter((row) => row.section === "BELANJA" && row.level === 1)) amt(`${x.code} ${x.name}`, x.budget, x.realized, 2);
  text("16. Pembiayaan", true, 1);
  for (const [k, l] of [["6.1.1", "SiLPA tahun anggaran sebelumnya"], ["6.1.2", "Pencairan dana cadangan"], ["6.1.3", "Hasil penjualan kekayaan desa yang dipisahkan"], ["6.2.1", "Pembentukan dana cadangan"], ["6.2.2", "Penyertaan modal desa"]] as const) pick(l, `P|${k}`, 2);
  text("17. Aset Desa", true, 1);
  text(i.asset ? `Buku inventaris mencatat ${i.asset.count} butir barang aktif dengan nilai perolehan Rp${fmt(i.asset.value)}. Rincian aset tetap (Lampiran T.2.c) mengikuti Buku Inventaris Aset Desa.` : "Data aset desa tidak tersedia.", false, 2);
  text("18. Penyertaan Modal Desa", true, 1);
  pick("Penyertaan modal desa", "P|6.2.2", 2);
  text("19. Catatan lain yang perlu diungkapkan", true, 1);
  text("Isi bagian ini sesuai kebutuhan desa (mis. kejadian luar biasa, koreksi, dana cadangan). Aplikasi belum menyediakan isian bebas untuk bagian ini.", false, 2);
  return {
    kind: "calk",
    title: "Catatan atas Laporan Keuangan",
    subtitle: head(ctx),
    columns: [{ label: "Uraian" }, { label: "Anggaran (Rp)", num: true }, { label: "Realisasi (Rp)", num: true }, { label: "(Lebih)/Kurang (Rp)", num: true }],
    rows,
    notes: ["Disusun otomatis dari APB Desa yang berlaku dan Buku Kas Umum mengikuti Lampiran T.2.b. Periksa dan lengkapi sebelum ditetapkan bersama Peraturan Desa pertanggungjawaban."],
    signers: [{ role: "Kepala Desa", name: ctx.villageHeadName }],
  };
}

export interface MoreParams {
  activityCode?: string;
  id?: number;
  semester?: boolean;
}

/** Memuat data dan menyusun tabel untuk jenis laporan lanjutan. */
export async function loadMoreReport(db: Db, villageId: number, year: number, kind: MoreKind, params: MoreParams): Promise<Result<ReportTable>> {
  const ctx = await yearContext(db, villageId, year);
  const needActivity = async () => {
    const ov = await planOverview(db, villageId, year);
    const a = ov.activities.find((x) => x.activityCode === params.activityCode);
    return { ov, a };
  };
  switch (kind) {
    case "rka": {
      const { a } = await needActivity();
      if (!a) return fail(404, "Kegiatan tidak ada di APB Desa yang berlaku.");
      const doc = await activeDocument(db, villageId, year);
      const fund = new Map<string, string>();
      for (const l of doc?.lines ?? []) if (l.activityCode === a.activityCode && l.fundSource) fund.set(l.accountCode, FUND_SOURCES[l.fundSource as FundSource] ?? l.fundSource);
      return { ok: true, data: rkaTable(ctx, a, fund) };
    }
    case "rab": {
      const { a } = await needActivity();
      return a ? { ok: true, data: rabTable(ctx, a) } : fail(404, "Kegiatan tidak ada di APB Desa yang berlaku.");
    }
    case "rkk":
      return { ok: true, data: rkkTable(ctx, (await planOverview(db, villageId, year)).activities) };
    case "rak":
      return { ok: true, data: rakTable(ctx, (await planOverview(db, villageId, year)).activities) };
    case "spp":
    case "ptjb": {
      const r = params.id ? await db.apbdesPayRequest.findFirst({ where: { id: params.id, villageId, year }, select: { id: true } }) : null;
      if (!r) return fail(404, "SPP tidak ditemukan.");
      const s = (await listRequests(db, villageId, year)).find((x) => x.id === r.id);
      return s ? { ok: true, data: kind === "spp" ? sppTable(ctx, s) : ptjbTable(ctx, s) } : fail(404, "SPP tidak ditemukan.");
    }
    case "panjar":
      return { ok: true, data: panjarTable(ctx, await listPanjar(db, villageId, year)) };
    case "kegiatan-t3": {
      const [doc, entries, ov] = await Promise.all([activeDocument(db, villageId, year), loadEntries(db, villageId, year), planOverview(db, villageId, year)]);
      return { ok: true, data: activityRealizationTable(ctx, doc ? toBudgetLines(doc.lines) : [], entries, ov.activities, params.semester === true) };
    }
    case "sektoral": {
      const rows = await db.apbdesExternalProgram.findMany({ where: { villageId, year }, orderBy: { id: "asc" } });
      return { ok: true, data: externalProgramsTable(ctx, rows.map((p) => ({ programName: p.programName, activityKind: p.activityKind, location: p.location, volume: p.volume.toFixed(2), unit: p.unit, amount: fromCents(p.amountCents), fundSource: p.fundSource }))) };
    }
    case "calk": {
      const [doc, entries, village] = await Promise.all([activeDocument(db, villageId, year), loadEntries(db, villageId, year), db.village.findUnique({ where: { id: villageId }, select: { address: true } })]);
      const lines = doc ? toBudgetLines(doc.lines) : [];
      const realization = buildRealization(lines, entries);
      const bal = balancesOf(entries);
      const tax = buildTaxBook(entries);
      const codes = ["4.2.1.01", "4.2.2.01", "4.2.3.01", "4.2.4.01", "4.2.5.01"];
      const transfers = codes.map((code) => ({ code, label: accountName(code) ?? code, receipts: entries.filter((e) => e.type === "PENERIMAAN" && e.accountCode === code).map((e) => ({ date: e.entryDate, amount: e.amountCents })) }));
      const items = await db.inventoryItem.findMany({ where: { villageId, status: "ACTIVE" }, select: { quantity: true, acquisitionValue: true } });
      const value = items.reduce((a, it) => a + (it.acquisitionValue ? BigInt(Math.round(Number(it.acquisitionValue) * 100)) * BigInt(it.quantity) : 0n), 0n);
      return { ok: true, data: calkTable({ ctx, address: village?.address ?? null, realization, budgetLines: lines, cash: bal, tax: { withheld: tax.totalWithheld, deposited: tax.totalDeposited }, transfers, asset: { count: items.length, value }, regulationNote: doc?.regulationNumber ? `APB Desa ditetapkan dengan Peraturan Desa ${doc.regulationNumber}${doc.regulationDate ? ` tanggal ${isoDay(doc.regulationDate)}` : ""}.` : null }) };
    }
  }
}
