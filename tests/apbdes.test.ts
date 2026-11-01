import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AKUN, BIDANG, KEGIATAN, SUB_BIDANG } from "../lib/apbdes/codes";
import { accountKind, accountName, isKegiatanCode, isLeafAccountCode, kegiatanName } from "../lib/apbdes/catalog";
import { parseEntryInput, parseLineInput } from "../lib/apbdes/schema";
import { buildBankBook, buildBku, buildTaxBook, checkLedger, effectOf, type LedgerEntry } from "../lib/apbdes/ledger";
import { budgetBalance, buildActivityRecap, buildRealization, buildRealizationSummary, type BudgetLine } from "../lib/apbdes/reports";
import { fmt } from "../lib/apbdes/tables";

const NOW = new Date("2026-11-01T03:00:00Z");
const rp = (n: number) => BigInt(n) * 100n;

describe("daftar kode Permendagri 20/2018 (dibangkitkan dari teks resmi)", () => {
  it("jumlah sesuai lampiran: 5 bidang, 27 sub bidang, 175 kegiatan", () => {
    assert.equal(BIDANG.length, 5);
    assert.equal(SUB_BIDANG.length, 27);
    assert.equal(KEGIATAN.length, 175);
  });
  it("setiap kegiatan punya sub bidang dan bidang induk; setiap sub bidang punya bidang", () => {
    const subs = new Set(SUB_BIDANG.map((s) => s.code));
    const bidang = new Set(BIDANG.map((b) => b.code));
    for (const k of KEGIATAN) assert.ok(subs.has(k.code.split(".").slice(0, 2).join(".")), `induk ${k.code}`);
    for (const s of SUB_BIDANG) assert.ok(bidang.has(s.code.split(".")[0]!), `induk ${s.code}`);
  });
  it("setiap rekening objek punya induk jenis dan kelompok; tak ada nama kosong atau terpotong", () => {
    const codes = new Set(AKUN.map((a) => a.code));
    for (const a of AKUN) {
      assert.ok(a.name.length > 3, a.code);
      const parts = a.code.split(".");
      for (let i = 1; i < parts.length; i++) assert.ok(codes.has(parts.slice(0, i).join(".")), `induk ${a.code}`);
    }
    assert.equal(AKUN.filter((a) => a.code.startsWith("4.")).length > 30, true);
  });
  it("nilai yang diketahui dari peraturan", () => {
    assert.equal(kegiatanName("1.1.01"), "Penyediaan Penghasilan Tetap dan Tunjangan Kepala Desa");
    assert.equal(kegiatanName("2.2.02")?.startsWith("Penyelenggaraan Posyandu"), true);
    assert.equal(kegiatanName("5.1.00"), "Penanggulangan Bencana");
    assert.equal(accountName("5.2.1.01"), "Belanja Perlengkapan Alat Tulis Kantor dan Benda Pos");
    assert.equal(accountName("4.2.1.01"), "Dana Desa");
    assert.equal(accountName("6.1.1.01"), "SILPA Tahun Sebelumnya");
    assert.equal(KEGIATAN.find((k) => k.code === "2.3.08")?.name, "Pemeliharaan Embung Milik Desa");
  });
  it("kode lain-lain 90-99 dikenali, kode ngawur ditolak", () => {
    assert.ok(isKegiatanCode("1.1.95"));
    assert.ok(isLeafAccountCode("5.2.1.93"));
    assert.ok(!isKegiatanCode("1.1.50"));
    assert.ok(!isKegiatanCode("9.9.01"));
    assert.ok(!isLeafAccountCode("5.2.1")); // bukan tingkat objek
    assert.ok(!isLeafAccountCode("5.2.1.55"));
    assert.equal(accountKind("5.3.4.01"), "BELANJA");
  });
});

describe("parseLineInput", () => {
  it("belanja wajib berkegiatan; pendapatan tak boleh berkegiatan", () => {
    assert.equal(parseLineInput({ accountCode: "5.2.1.01", amount: "1000000" }).ok, false);
    assert.equal(parseLineInput({ accountCode: "4.2.1.01", activityCode: "1.1.01", amount: "1000000" }).ok, false);
    const p = parseLineInput({ accountCode: "5.2.1.01", activityCode: "1.1.04", amount: "1500000.5" });
    assert.equal(p.ok && p.value.amountCents, 150000050n);
    const q = parseLineInput({ accountCode: "4.2.1.01", amount: 500 });
    assert.equal(q.ok && q.value.description, "Dana Desa"); // uraian bawaan dari nama rekening
  });
  it("jumlah nol, negatif, berpecahan 3 digit, dan sumber dana asing ditolak", () => {
    for (const amount of [0, "-5", "10.123", "abc", ""]) assert.equal(parseLineInput({ accountCode: "4.2.1.01", amount }).ok, false, String(amount));
    assert.equal(parseLineInput({ accountCode: "4.2.1.01", amount: 10, fundSource: "KANTONG" }).ok, false);
  });
});

describe("parseEntryInput", () => {
  const base = { entryDate: "2026-10-05", voucherNo: "BKT-1", description: "uji", amount: 1000 };
  it("penerimaan hanya pendapatan atau penerimaan pembiayaan; pengeluaran hanya belanja atau pengeluaran pembiayaan", () => {
    assert.equal(parseEntryInput({ ...base, type: "PENERIMAAN", channel: "BANK", accountCode: "5.2.1.01" }, NOW).ok, false);
    assert.equal(parseEntryInput({ ...base, type: "PENERIMAAN", channel: "BANK", accountCode: "6.2.1.01" }, NOW).ok, false);
    assert.equal(parseEntryInput({ ...base, type: "PENERIMAAN", channel: "BANK", accountCode: "6.1.1.01" }, NOW).ok, true);
    assert.equal(parseEntryInput({ ...base, type: "PENGELUARAN", channel: "BANK", accountCode: "5.2.1.01" }, NOW).ok, false); // tanpa kegiatan
    assert.equal(parseEntryInput({ ...base, type: "PENGELUARAN", channel: "BANK", accountCode: "5.2.1.01", activityCode: "1.1.04" }, NOW).ok, true);
  });
  it("pajak: hanya pada pengeluaran, tak melebihi jumlah, jenisnya wajib", () => {
    const e = { ...base, type: "PENGELUARAN", channel: "TUNAI", accountCode: "5.2.1.01", activityCode: "1.1.04" };
    assert.equal(parseEntryInput({ ...e, taxAmount: 100, taxKind: "PPN" }, NOW).ok, true);
    assert.equal(parseEntryInput({ ...e, taxAmount: 100 }, NOW).ok, false);
    assert.equal(parseEntryInput({ ...e, taxAmount: 2000, taxKind: "PPN" }, NOW).ok, false);
    assert.equal(parseEntryInput({ ...base, type: "PENERIMAAN", channel: "BANK", accountCode: "4.2.1.01", taxAmount: 10, taxKind: "PPN" }, NOW).ok, false);
  });
  it("tanggal masa depan ditolak; tarik/setor tunai menetapkan kanalnya sendiri dan tak boleh berkode", () => {
    assert.equal(parseEntryInput({ ...base, entryDate: "2026-12-25", type: "SETOR_PAJAK", channel: "BANK" }, NOW).ok, false);
    const t = parseEntryInput({ ...base, type: "TARIK_BANK" }, NOW);
    assert.ok(t.ok && t.value.channel === "BANK");
    const s = parseEntryInput({ ...base, type: "SETOR_BANK" }, NOW);
    assert.ok(s.ok && s.value.channel === "TUNAI");
    assert.equal(parseEntryInput({ ...base, type: "TARIK_BANK", accountCode: "5.2.1.01" }, NOW).ok, false);
  });
  it("biaya administrasi bank memaksa kanal bank", () => {
    const p = parseEntryInput({ ...base, type: "PENGELUARAN", channel: "TUNAI", accountCode: "5.2.5.90", activityCode: "1.1.04", bankFee: true }, NOW);
    assert.ok(p.ok && p.value.channel === "BANK" && p.value.bankFee);
  });
});

let seq = 0;
function entry(o: Partial<LedgerEntry> & Pick<LedgerEntry, "type" | "entryDate" | "amountCents">): LedgerEntry {
  seq += 1;
  return { id: seq, voucherNo: `B${seq}`, channel: "BANK", activityCode: null, accountCode: null, description: `uji ${seq}`, taxCents: 0n, taxKind: null, bankFee: false, ...o };
}
const recv = (date: string, amt: number, code = "4.2.1.01", channel: "BANK" | "TUNAI" = "BANK") => entry({ type: "PENERIMAAN", entryDate: date, amountCents: rp(amt), accountCode: code, channel });
const spend = (date: string, amt: number, o: Partial<LedgerEntry> = {}) => entry({ type: "PENGELUARAN", entryDate: date, amountCents: rp(amt), accountCode: "5.2.1.01", activityCode: "1.1.04", ...o });

describe("saldo Buku Kas Umum", () => {
  it("pajak yang dipotong tertahan di kas sampai disetor", () => {
    const list = [recv("2026-01-05", 1000), spend("2026-01-10", 400, { taxCents: rp(40), taxKind: "PPN" })];
    const fx = list.map(effectOf);
    assert.equal(fx[1]!.bank, -rp(360)); // keluar bersih
    assert.equal(fx[1]!.pajak, rp(40));
    const dep = entry({ type: "SETOR_PAJAK", entryDate: "2026-01-20", amountCents: rp(40) });
    assert.equal(checkLedger([...list, dep]), null);
    // setor pajak lebih besar dari yang dipotong ditolak
    assert.match(checkLedger([...list, entry({ type: "SETOR_PAJAK", entryDate: "2026-01-21", amountCents: rp(41) })]) ?? "", /pajak/i);
  });
  it("saldo minus ditolak per kanal dan menurut urutan tanggal (catatan mundur yang menjebol saldo ditolak)", () => {
    const base = [recv("2026-02-01", 500), spend("2026-02-10", 400)];
    assert.equal(checkLedger(base), null);
    assert.match(checkLedger([...base, spend("2026-02-05", 200)]) ?? "", /bank kurang/i); // tanggal lebih awal membuat 10 Feb jadi minus
    assert.match(checkLedger([recv("2026-02-01", 500), spend("2026-02-02", 100, { channel: "TUNAI" })]) ?? "", /tunai kurang/i);
  });
  it("tarik tunai memindahkan bank ke tunai dan tak mengubah saldo gabungan", () => {
    const list = [recv("2026-03-01", 1000), entry({ type: "TARIK_BANK", entryDate: "2026-03-02", amountCents: rp(300) }), spend("2026-03-03", 300, { channel: "TUNAI" })];
    assert.equal(checkLedger(list), null);
    const bku = buildBku(list);
    assert.equal(bku.rows.length, 2); // tarik tunai tak tampil
    assert.equal(bku.closingBalance, rp(700));
    const bank = buildBankBook(list);
    assert.equal(bank.closingBalance, rp(700));
    assert.equal(bank.total.withdrawal, rp(300));
  });
});

describe("BKU, Buku Bank, Buku Pajak per bulan", () => {
  const list = [
    recv("2026-01-05", 2000),
    spend("2026-01-10", 500, { taxCents: rp(50), taxKind: "PPh 22" }),
    entry({ type: "SETOR_PAJAK", entryDate: "2026-01-20", amountCents: rp(50) }),
    recv("2026-02-03", 100, "4.3.6.01"),
    spend("2026-02-04", 10, { accountCode: "5.2.5.90", bankFee: true }),
  ];
  it("BKU: saldo awal bulan dibawa dan pemotongan pajak jadi penerimaan terpisah", () => {
    const jan = buildBku(list, 1);
    assert.equal(jan.openingBalance, 0n);
    assert.equal(jan.rows.map((r) => r.description.startsWith("Pemotongan")).filter(Boolean).length, 1);
    assert.equal(jan.closingBalance, rp(1500)); // 2000 - 500 + 50 - 50
    const feb = buildBku(list, 2);
    assert.equal(feb.openingBalance, rp(1500));
    assert.equal(feb.closingBalance, rp(1500 + 100 - 10));
  });
  it("Buku Bank: bunga dan biaya admin di kolomnya sendiri; penarikan belanja bersih dari pajak", () => {
    const jan = buildBankBook(list, 1);
    assert.equal(jan.total.deposit, rp(2000));
    assert.equal(jan.total.withdrawal, rp(450));
    assert.equal(jan.total.tax, rp(50));
    const feb = buildBankBook(list, 2);
    assert.equal(feb.openingBalance, rp(1500));
    assert.equal(feb.total.interest, rp(100));
    assert.equal(feb.total.fee, rp(10));
    assert.equal(feb.closingBalance, rp(1590));
  });
  it("Buku Pajak: pemotongan, penyetoran, saldo", () => {
    const t = buildTaxBook(list);
    assert.equal(t.totalWithheld, rp(50));
    assert.equal(t.totalDeposited, rp(50));
    assert.equal(t.balance, 0n);
  });
});

describe("realisasi dan laporan", () => {
  const lines: BudgetLine[] = [
    { activityCode: null, accountCode: "4.2.1.01", description: "DD", amountCents: rp(1000), fundSource: "DD" },
    { activityCode: null, accountCode: "6.1.1.01", description: "SiLPA", amountCents: rp(200), fundSource: null },
    { activityCode: "1.1.04", accountCode: "5.2.1.01", description: "ATK", amountCents: rp(600), fundSource: "ADD" },
    { activityCode: "2.3.01", accountCode: "5.2.6.05", description: "jalan", amountCents: rp(500), fundSource: "DD" },
    { activityCode: "1.1.01", accountCode: "5.1.1.01", description: "siltap", amountCents: rp(100), fundSource: "ADD" },
  ];
  const entries = [
    recv("2026-01-05", 700),
    recv("2026-01-06", 200, "6.1.1.01"),
    spend("2026-02-10", 300),
    spend("2026-08-10", 100, { activityCode: "2.3.01", accountCode: "5.2.6.05" }),
    recv("2026-09-01", 300),
    recv("2026-09-02", 50, "4.3.6.01"), // tak dianggarkan
  ];
  it("anggaran seimbang: pendapatan + penerimaan pembiayaan - belanja = 0", () => {
    const b = budgetBalance(lines);
    assert.equal(b.income, rp(1000));
    assert.equal(b.expense, rp(1200));
    assert.equal(b.difference, 0n);
    assert.notEqual(budgetBalance(lines.slice(1)).difference, 0n);
  });
  it("pohon realisasi menjumlahkan ke atas dan SiLPA = surplus + pembiayaan netto", () => {
    const r = buildRealization(lines, entries);
    assert.equal(r.totals.incomeBudget, rp(1000));
    assert.equal(r.totals.incomeRealized, rp(1050));
    assert.equal(r.totals.expenseBudget, rp(1200));
    assert.equal(r.totals.expenseRealized, rp(400));
    assert.equal(r.silpaRealized, rp(1050 - 400 + 200));
    assert.equal(r.silpaBudget, 0n);
    assert.equal(r.rows.find((x) => x.key === "B|1")?.realized, rp(300));
    assert.equal(r.rows.find((x) => x.key === "B|2.3")?.budget, rp(500));
    assert.equal(r.rows.find((x) => x.key === "P|4.2")?.realized, rp(1000));
    assert.deepEqual(r.unbudgeted.map((u) => u.accountCode), ["4.3.6.01"]);
    assert.equal(r.rows.find((x) => x.key === "P|4.3.6.01")?.budget, 0n);
  });
  it("semester pertama hanya menghitung sampai 30 Juni", () => {
    const r = buildRealization(lines, entries, "2026-06-30");
    assert.equal(r.totals.expenseRealized, rp(300));
    assert.equal(r.totals.incomeRealized, rp(700));
  });
  it("ringkasan T.2.a memuat lima bidang dan menutup dengan SiLPA", () => {
    const s = buildRealizationSummary(buildRealization(lines, entries));
    assert.equal(s.filter((x) => x.label.startsWith("Bidang ")).length, 5);
    assert.equal(s[s.length - 1]!.label, "SILPA TAHUN BERJALAN");
  });
  it("rekap kegiatan: jenis belanja, sisa, dan persen", () => {
    const rec = buildActivityRecap(lines, entries);
    const atk = rec.find((x) => x.activityCode === "1.1.04")!;
    assert.equal(atk.remaining, rp(300));
    assert.equal(atk.percent, 50);
    assert.equal(atk.byType.goods, rp(300));
    assert.equal(rec.map((x) => x.activityCode).join(), "1.1.01,1.1.04,2.3.01");
  });
});

describe("format rupiah", () => {
  it("pemisah ribuan titik, desimal koma, negatif dalam kurung", () => {
    assert.equal(fmt(123456789n), "1.234.567,89");
    assert.equal(fmt(0n), "0,00");
    assert.equal(fmt(-5000n), "(50,00)");
  });
});
