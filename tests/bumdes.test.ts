import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, it } from "node:test";
import { ACCOUNTS, APBDES_CAPITAL_ACCOUNT, APBDES_PROFIT_SHARE_ACCOUNT, CASH_ACCOUNTS, RK_PUSAT_ACCOUNT, RK_UNIT_ACCOUNT, accountOf, isAccountCode } from "../lib/bumdes/catalog";
import { buildReport, cashJournalLines, checkCashAccounts, checkLines, halfEnded, periodOfDate, rangeOf, reservedAccountViolation, totalsOf, voucherNumber, type BalanceRow, type JLine } from "../lib/bumdes/calc";
import { parseCash, parseFlow, parseJournal, parseLegal, parseOfficer, parsePeriodAction, parseReason, parseResolution } from "../lib/bumdes/schema";
import { accountName as apbdesAccountName, isLeafAccountCode } from "../lib/apbdes/catalog";
import { csvCell, formatVillageRegion } from "../lib/bumdes/export";
import { canManageBumdes, requireBumdesManageForRole, requireBumdesReadForRole } from "../lib/bumdes/access";

const L = (accountCode: string, debit: bigint, credit: bigint): JLine => ({ accountCode, debitCents: debit, creditCents: credit, memo: null });
const NOW = new Date("2026-11-01T03:00:00Z");

/** Mengubah daftar jurnal (per entitas) menjadi barisan saldo per akun untuk periode tertentu, memakai tanggal tiap jurnal. */
function rowsOf(range: ReturnType<typeof rangeOf>, journals: { unitId: number | null; date: string; lines: JLine[] }[]): BalanceRow[] {
  const m = new Map<string, BalanceRow>();
  for (const j of journals) {
    if (j.date > range.end) continue;
    for (const l of j.lines) {
      const k = `${j.unitId}|${l.accountCode}`;
      const r = m.get(k) ?? { unitId: j.unitId, accountCode: l.accountCode, prior: 0n, ytdBefore: 0n, inPeriod: 0n };
      const d = l.debitCents - l.creditCents;
      if (j.date < range.yearStart) r.prior += d;
      else if (j.date < range.start) r.ytdBefore += d;
      else r.inPeriod += d;
      m.set(k, r);
    }
  }
  return [...m.values()];
}

describe("BUMDes: bagan akun (Kepmendes PDTT 136/2022)", () => {
  it("kode unik, 4 tingkat X.X.XX.XX, dan golongan 1-7", () => {
    const seen = new Set<string>();
    for (const a of ACCOUNTS) {
      assert.match(a.code, /^[1-7]\.\d\.\d{2}\.\d{2}$/, a.code);
      assert.ok(!seen.has(a.code), `duplikat ${a.code}`);
      seen.add(a.code);
      assert.ok(a.name.length > 3);
    }
    assert.ok(ACCOUNTS.length > 100);
  });

  it("saldo normal: aset/beban debit, kewajiban/pendapatan kredit, akun kontra berlawanan", () => {
    assert.equal(accountOf("1.1.01.01")!.normal, "D");
    assert.equal(accountOf("1.1.04.01")!.normal, "K", "penyisihan piutang = kontra aset");
    assert.equal(accountOf("1.3.07.04")!.normal, "K", "akumulasi penyusutan = kontra aset");
    assert.equal(accountOf("2.1.01.01")!.normal, "K");
    assert.equal(accountOf("3.1.01.01")!.normal, "K");
    assert.equal(accountOf("3.2.01.01")!.normal, "D", "bagi hasil = pengambilan oleh pemilik");
    assert.equal(accountOf("4.1.01.01")!.normal, "K");
    assert.equal(accountOf("4.2.01.99")!.normal, "D", "diskon penjualan");
    assert.equal(accountOf("6.1.04.01")!.normal, "D");
    assert.equal(accountOf("7.1.01.01")!.cls, "PENDAPATAN_LAIN");
    assert.equal(accountOf("7.2.02.01")!.cls, "BEBAN_LAIN");
    assert.equal(accountOf("7.3.01.10")!.cls, "BEBAN_PAJAK");
  });

  it("akun kas, akun resiprokal, dan rekening APB Desa yang dirujuk memang ada", () => {
    assert.ok(CASH_ACCOUNTS.length >= 5 && CASH_ACCOUNTS.every((a) => a.cls === "ASET"));
    assert.ok(isAccountCode(RK_UNIT_ACCOUNT) && isAccountCode(RK_PUSAT_ACCOUNT));
    assert.ok(isLeafAccountCode(APBDES_CAPITAL_ACCOUNT) && /Penyertaan Modal/.test(apbdesAccountName(APBDES_CAPITAL_ACCOUNT)!));
    assert.ok(isLeafAccountCode(APBDES_PROFIT_SHARE_ACCOUNT) && /Bagi Hasil BUMDes/.test(apbdesAccountName(APBDES_PROFIT_SHARE_ACCOUNT)!));
  });
});

describe("BUMDes: jurnal berpasangan", () => {
  it("jurnal seimbang lolos; tidak seimbang ditolak dengan pesan jumlah", () => {
    assert.deepEqual(checkLines([L("1.1.01.01", 1000n, 0n), L("4.1.05.99", 0n, 1000n)]), []);
    const e = checkLines([L("1.1.01.01", 1000n, 0n), L("4.1.05.99", 0n, 999n)]);
    assert.match(e[0]!, /tidak seimbang/);
  });
  it("satu sisi per baris, tanpa negatif/nol/ganda, akun dikenal, minimal dua baris", () => {
    assert.ok(checkLines([L("1.1.01.01", 5n, 5n), L("4.1.05.99", 0n, 0n)]).length);
    assert.ok(checkLines([L("1.1.01.01", 0n, 0n), L("4.1.05.99", 0n, 0n)]).length);
    assert.ok(checkLines([L("1.1.01.01", -5n, 0n), L("4.1.05.99", 0n, -5n)]).length);
    assert.ok(checkLines([L("9.9.99.99", 5n, 0n), L("4.1.05.99", 0n, 5n)]).length);
    assert.ok(checkLines([L("1.1.01.01", 5n, 0n)]).length);
    assert.ok(checkLines([]).length);
    assert.ok(checkLines(Array.from({ length: 41 }, (_, i) => L("1.1.01.01", i % 2 ? 1n : 0n, i % 2 ? 0n : 1n))).length);
  });
  it("jurnal tiga baris dengan dua debit seimbang terhadap satu kredit", () => {
    assert.deepEqual(checkLines([L("1.1.01.01", 700n, 0n), L("1.1.03.01", 300n, 0n), L("4.1.05.99", 0n, 1000n)]), []);
  });
  it("jurnal turunan kas selalu seimbang dan sisi benar", () => {
    const inc = cashJournalLines({ direction: "income", amountCents: 12_345n, cashAccount: "1.1.01.01", counterAccount: "4.1.05.99", memo: null });
    assert.equal(inc[0]!.debitCents, 12_345n);
    assert.equal(inc[1]!.creditCents, 12_345n);
    const exp = cashJournalLines({ direction: "expense", amountCents: 500n, cashAccount: "1.1.01.02", counterAccount: "6.2.99.99", memo: null });
    assert.equal(exp[0]!.accountCode, "6.2.99.99");
    assert.equal(exp[0]!.debitCents, 500n);
    assert.equal(exp[1]!.creditCents, 500n);
    assert.deepEqual(checkLines(inc), []);
    assert.deepEqual(checkLines(exp), []);
    assert.deepEqual(totalsOf(exp), { debit: 500n, credit: 500n });
  });
  it("aturan akun kas: harus 1.1.01.xx; akun lawan tak boleh sama", () => {
    assert.equal(checkCashAccounts("1.1.01.01", "4.1.05.99"), null);
    assert.ok(checkCashAccounts("1.1.03.01", "4.1.05.99"));
    assert.ok(checkCashAccounts("1.1.01.01", "1.1.01.01"));
    assert.ok(checkCashAccounts("1.1.01.01", "0.0.00.00"));
  });
});

describe("BUMDes: periode semester dan nomor bukti", () => {
  it("semester dari tanggal dan rentangnya", () => {
    assert.deepEqual(periodOfDate("2026-06-30"), { year: 2026, half: 1 });
    assert.deepEqual(periodOfDate("2026-07-01"), { year: 2026, half: 2 });
    assert.deepEqual([rangeOf(2026, "S1").start, rangeOf(2026, "S1").end], ["2026-01-01", "2026-06-30"]);
    assert.deepEqual([rangeOf(2026, "S2").start, rangeOf(2026, "S2").end], ["2026-07-01", "2026-12-31"]);
    assert.deepEqual([rangeOf(2026, "TAHUN").start, rangeOf(2026, "TAHUN").end], ["2026-01-01", "2026-12-31"]);
    assert.equal(rangeOf(2026, "S2").yearStart, "2026-01-01");
  });
  it("periode baru dapat ditutup setelah berakhir", () => {
    assert.equal(halfEnded(2026, 1, new Date("2026-06-30T23:00:00Z")), false);
    assert.equal(halfEnded(2026, 1, new Date("2026-07-01T00:00:00Z")), true);
    assert.equal(halfEnded(2026, 2, new Date("2026-12-31T12:00:00Z")), false);
    assert.equal(halfEnded(2026, 2, new Date("2027-01-01T00:00:00Z")), true);
  });
  it("nomor bukti: No. urut/No. bulan/Kode unit/Tahun", () => {
    assert.equal(voucherNumber(7, "2026-03-15", null), "0007/03/PUSAT/2026");
    assert.equal(voucherNumber(123, "2026-11-01", 42), "0123/11/U42/2026");
  });
});

describe("BUMDes: neraca dan laba rugi", () => {
  const range = rangeOf(2026, "TAHUN");
  const entities = [
    { unitId: null, name: "Kantor Pusat" },
    { unitId: 1, name: "Unit Wisata" },
    { unitId: 2, name: "Unit Simpan Pinjam" },
  ];

  const journals = [
    // Kantor pusat menerima penyertaan modal Desa
    { unitId: null, date: "2026-01-05", lines: [L("1.1.01.02", 100_000_000n, 0n), L("3.1.01.01", 0n, 100_000_000n)] },
    // Pusat menyalurkan Rp40 juta ke Unit Wisata (resiprokal)
    { unitId: null, date: "2026-01-10", lines: [L(RK_UNIT_ACCOUNT, 40_000_000n, 0n), L("1.1.01.02", 0n, 40_000_000n)] },
    { unitId: 1, date: "2026-01-10", lines: [L("1.1.01.01", 40_000_000n, 0n), L(RK_PUSAT_ACCOUNT, 0n, 40_000_000n)] },
    // Unit Wisata: beli peralatan, jual tiket, bayar beban
    { unitId: 1, date: "2026-02-01", lines: [L("1.3.03.01", 10_000_000n, 0n), L("1.1.01.01", 0n, 10_000_000n)] },
    { unitId: 1, date: "2026-03-01", lines: [L("1.1.01.01", 25_000_000n, 0n), L("4.1.01.01", 0n, 25_000_000n)] },
    { unitId: 1, date: "2026-03-05", lines: [L("6.2.01.01", 6_000_000n, 0n), L("1.1.01.01", 0n, 6_000_000n)] },
    { unitId: 1, date: "2026-03-06", lines: [L("6.1.07.03", 1_000_000n, 0n), L("1.3.07.02", 0n, 1_000_000n)] },
    // Unit Simpan Pinjam: bunga dengan piutang, pajak final
    { unitId: 2, date: "2026-04-01", lines: [L("1.1.03.01", 8_000_000n, 0n), L("4.1.08.01", 0n, 8_000_000n)] },
    { unitId: 2, date: "2026-04-02", lines: [L("7.3.01.10", 80_000n, 0n), L("2.1.02.02", 0n, 80_000n)] },
    // Tahun lalu: pusat mencatat laba tahun lalu 2 juta
    { unitId: null, date: "2025-12-31", lines: [L("1.1.01.01", 5_000_000n, 0n), L("4.1.05.99", 0n, 5_000_000n)] },
    { unitId: null, date: "2025-12-31", lines: [L("6.1.02.01", 3_000_000n, 0n), L("1.1.01.01", 0n, 3_000_000n)] },
  ];
  const report = buildReport({ range, entities, rows: rowsOf(range, journals) });
  const by = (id: number | null) => report.entities.find((e) => e.unitId === id)!;

  it("neraca setiap entitas seimbang (aset = kewajiban + ekuitas + laba)", () => {
    for (const e of report.entities) assert.equal(e.neraca.balanced, true, `${e.name}: selisih ${e.neraca.difference}`);
    assert.equal(report.consolidated.neraca.balanced, true);
  });

  it("laba rugi unit: pendapatan, beban, penyusutan; akun nominal tahun lalu jadi laba ditahan", () => {
    const w = by(1).labaRugi;
    assert.equal(w.pendapatan.total, 25_000_000n);
    assert.equal(w.beban.total, 7_000_000n);
    assert.equal(w.labaBersih, 18_000_000n);
    const pusat = by(null);
    assert.equal(pusat.labaRugi.labaBersih, 0n, "tahun lalu tidak masuk laba rugi 2026");
    const lalu = pusat.neraca.ekuitas.lines.find((l) => l.code === "LABA-LALU")!;
    assert.equal(lalu.amount, 2_000_000n);
    const sp = by(2).labaRugi;
    assert.equal(sp.labaSebelumPajak, 8_000_000n);
    assert.equal(sp.bebanPajak.total, 80_000n);
    assert.equal(sp.labaBersih, 7_920_000n);
  });

  it("akun kontra (akumulasi penyusutan) mengurangi aset", () => {
    const aset = by(1).neraca.aset;
    const acc = aset.lines.find((l) => l.code === "1.3.07.02")!;
    assert.equal(acc.amount, -1_000_000n);
    // kas 40-10+25-6 = 49 juta; peralatan 10 juta; akumulasi -1 juta
    assert.equal(aset.total, 58_000_000n);
  });

  it("konsolidasi menjumlahkan unit dan pusat serta mengeliminasi RK sampai nol", () => {
    const c = report.consolidated;
    assert.equal(report.elimination.rkUnit, 40_000_000n);
    assert.equal(report.elimination.rkPusat, -40_000_000n);
    assert.equal(report.elimination.residual, 0n);
    assert.ok(!c.neraca.aset.lines.some((l) => l.code === RK_UNIT_ACCOUNT), "RK unit disembunyikan");
    assert.ok(!c.neraca.ekuitas.lines.some((l) => l.code === RK_PUSAT_ACCOUNT), "RK pusat disembunyikan");
    assert.equal(c.labaRugi.labaBersih, by(null).labaRugi.labaBersih + by(1).labaRugi.labaBersih + by(2).labaRugi.labaBersih);
    assert.equal(c.labaRugi.labaBersih, 25_920_000n);
    // aset gabungan = jumlah aset semua entitas dikurangi RK
    const sum = report.entities.reduce((t, e) => t + e.neraca.totalAset, 0n);
    assert.equal(c.neraca.totalAset, sum - report.elimination.rkUnit);
    // modal: 100 juta; kas bank 60 juta + kas 49 + 5 - 3 = ; piutang 8 juta; peralatan 9 juta bersih
    assert.equal(c.neraca.ekuitas.lines.find((l) => l.code === "3.1.01.01")!.amount, 100_000_000n);
  });

  it("RK yang tidak saling meniadakan terlihat sebagai selisih, neraca gabungan tidak lagi dianggap seimbang", () => {
    const skewed = [...journals, { unitId: null, date: "2026-05-01", lines: [L(RK_UNIT_ACCOUNT, 1_000n, 0n), L("1.1.01.02", 0n, 1_000n)] }];
    const r = buildReport({ range, entities, rows: rowsOf(range, skewed) });
    assert.equal(r.elimination.residual, 1_000n);
    assert.equal(r.consolidated.neraca.balanced, false);
    assert.equal(r.consolidated.neraca.difference, -1_000n);
    for (const e of r.entities) assert.equal(e.neraca.balanced, true, "per entitas tetap seimbang");
  });

  it("semester: laba rugi hanya periode; neraca kumulatif; laba berjalan = awal tahun s.d. akhir periode", () => {
    const s1 = rangeOf(2026, "S1");
    const s2 = rangeOf(2026, "S2");
    const more = [...journals, { unitId: 1, date: "2026-08-01", lines: [L("1.1.01.01", 3_000_000n, 0n), L("4.1.01.01", 0n, 3_000_000n)] }];
    const r1 = buildReport({ range: s1, entities, rows: rowsOf(s1, more) });
    const r2 = buildReport({ range: s2, entities, rows: rowsOf(s2, more) });
    assert.equal(r1.consolidated.labaRugi.labaBersih, 25_920_000n);
    assert.equal(r2.consolidated.labaRugi.labaBersih, 3_000_000n);
    const lb1 = r1.consolidated.neraca.ekuitas.lines.find((l) => l.code === "LABA-BERJALAN")!.amount;
    const lb2 = r2.consolidated.neraca.ekuitas.lines.find((l) => l.code === "LABA-BERJALAN")!.amount;
    assert.equal(lb1, 25_920_000n);
    assert.equal(lb2, 28_920_000n);
    for (const r of [r1, r2]) {
      for (const e of r.entities) assert.equal(e.neraca.balanced, true);
      assert.equal(r.consolidated.neraca.balanced, true);
    }
  });

  it("sifat: jurnal acak yang masing-masing seimbang selalu menghasilkan neraca seimbang pada semua periode", () => {
    let seed = 12345;
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const pool = ACCOUNTS.map((a) => a.code);
    const js: { unitId: number | null; date: string; lines: JLine[] }[] = [];
    for (let i = 0; i < 400; i++) {
      const a = pool[rnd(pool.length)]!;
      let b = pool[rnd(pool.length)]!;
      if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length]!;
      const amt = BigInt(1 + rnd(5_000_000));
      const split = amt > 1n ? BigInt(1 + rnd(Number(amt - 1n))) : amt;
      const lines = amt > 1n && rnd(3) === 0 ? [L(a, amt, 0n), L(b, 0n, split), L(pool[rnd(pool.length)]!, 0n, amt - split)] : [L(a, amt, 0n), L(b, 0n, amt)];
      const month = 1 + rnd(12);
      const year = rnd(5) === 0 ? 2025 : 2026;
      js.push({ unitId: [null, 1, 2][rnd(3)]!, date: `${year}-${String(month).padStart(2, "0")}-${String(1 + rnd(28)).padStart(2, "0")}`, lines });
    }
    for (const j of js) assert.deepEqual(checkLines(j.lines), []);
    for (const kind of ["S1", "S2", "TAHUN"] as const) {
      const rg = rangeOf(2026, kind);
      const r = buildReport({ range: rg, entities, rows: rowsOf(rg, js) });
      for (const e of r.entities) assert.equal(e.neraca.balanced, true, `${kind} ${e.name} selisih ${e.neraca.difference}`);
      assert.equal(r.consolidated.neraca.difference, -r.elimination.residual, `${kind}: selisih gabungan = -sisa RK`);
    }
  });

  it("detektor ketidakseimbangan hidup: baris saldo yang timpang membuat neraca tidak seimbang", () => {
    const rows = rowsOf(range, journals);
    const broken = rows.map((r) => (r.unitId === 1 && r.accountCode === "1.1.01.01" ? { ...r, inPeriod: r.inPeriod + 1n } : r));
    const r = buildReport({ range, entities, rows: broken });
    assert.equal(by(1).neraca.balanced, true);
    assert.equal(r.entities.find((e) => e.unitId === 1)!.neraca.balanced, false);
  });
});

describe("BUMDes: validasi isian", () => {
  const base = { unitId: 3, entryDate: "2026-10-01", direction: "income", amount: "150000", category: "Tiket" };

  it("transaksi kas: akun bawaan terisi, koersi ketat, tanggal tak boleh di masa depan", () => {
    const ok = parseCash(base, NOW);
    assert.ok(ok.ok && ok.value.accountCode === "4.1.05.99" && ok.value.cashAccountCode === "1.1.01.01" && ok.value.amountCents === 15_000_000n);
    const ex = parseCash({ ...base, direction: "expense" }, NOW);
    assert.ok(ex.ok && ex.value.accountCode === "6.2.99.99");
    for (const amount of ["1e3", "0x10", [5], true, "-5", "0", "abc", "1.234", "", null, "99999999999999.9"]) assert.equal(parseCash({ ...base, amount }, NOW).ok, false, String(amount));
    for (const unitId of ["1e3", "0x10", [3], true, -1, 0, null]) assert.equal(parseCash({ ...base, unitId }, NOW).ok, false, String(unitId));
    assert.equal(parseCash({ ...base, entryDate: "2026-11-09" }, NOW).ok, false);
    assert.equal(parseCash({ ...base, entryDate: "0001-01-01" }, NOW).ok, false);
    assert.equal(parseCash({ ...base, direction: "lain" }, NOW).ok, false);
    assert.equal(parseCash({ ...base, category: "  " }, NOW).ok, false);
    assert.equal(parseCash({ ...base, category: "x".repeat(101) }, NOW).ok, false);
    assert.equal(parseCash({ ...base, cashAccountCode: "1.1.03.01" }, NOW).ok, false, "bukan akun kas");
    assert.equal(parseCash({ ...base, accountCode: "1.1.01.01" }, NOW).ok, false, "lawan = kas");
    assert.equal(parseCash({ ...base, accountCode: "9.9.99.99" }, NOW).ok, false);
  });

  it("perubahan transaksi mewarisi nilai lama untuk isian yang tidak dikirim", () => {
    const p = parseCash({ amount: "200000" }, NOW, { unitId: 3, entryDate: "2026-10-01", direction: "income", amountCents: 15_000_000n, category: "Tiket", description: null, accountCode: "4.1.01.01", cashAccountCode: "1.1.01.02" });
    assert.ok(p.ok && p.value.amountCents === 20_000_000n && p.value.category === "Tiket" && p.value.accountCode === "4.1.01.01" && p.value.cashAccountCode === "1.1.01.02" && p.value.unitId === 3);
  });

  it("jurnal manual: debit harus sama kredit; pusat boleh tanpa unit", () => {
    const j = { unitId: null, entryDate: "2026-10-01", description: "Saldo awal", lines: [{ accountCode: "1.1.01.01", debit: "100", credit: "" }, { accountCode: "3.3.01.01", debit: "", credit: "100" }] };
    assert.ok(parseJournal(j, NOW).ok);
    assert.equal(parseJournal({ ...j, unitId: "PUSAT" }, NOW).ok, true);
    const bad = parseJournal({ ...j, lines: [{ accountCode: "1.1.01.01", debit: "100" }, { accountCode: "3.3.01.01", credit: "99" }] }, NOW);
    assert.ok(!bad.ok && /tidak seimbang/.test(bad.errors[0]!));
    assert.equal(parseJournal({ ...j, lines: [{ accountCode: "1.1.01.01", debit: "100", credit: "100" }, { accountCode: "3.3.01.01", credit: "0" }] }, NOW).ok, false);
    assert.equal(parseJournal({ ...j, lines: "x" }, NOW).ok, false);
    assert.equal(parseJournal({ ...j, description: "" }, NOW).ok, false);
    assert.equal(parseJournal({ ...j, unitId: "1e3" }, NOW).ok, false);
    assert.equal(parseJournal({ ...j, lines: [{ accountCode: "1.1.01.01", debit: "1e2" }, { accountCode: "3.3.01.01", credit: "100" }] }, NOW).ok, false);
  });

  it("alasan koreksi wajib (5-300 karakter)", () => {
    assert.equal(parseReason({}).ok, false);
    assert.equal(parseReason({ reason: "ab" }).ok, false);
    assert.equal(parseReason({ reason: "x".repeat(301) }).ok, false);
    assert.equal(parseReason({ reason: 5 }).ok, false);
    assert.ok(parseReason({ reason: "Salah nominal" }).ok);
  });

  it("aksi periode: buka kembali wajib beralasan", () => {
    assert.ok(parsePeriodAction({ year: 2026, half: 1, action: "tutup" }).ok);
    assert.equal(parsePeriodAction({ year: 2026, half: 1, action: "buka" }).ok, false);
    assert.ok(parsePeriodAction({ year: 2026, half: 2, action: "buka", reason: "Koreksi sewa" }).ok);
    for (const half of [0, 3, "1e0", "x", null]) assert.equal(parsePeriodAction({ year: 2026, half, action: "tutup" }).ok, false, String(half));
    assert.equal(parsePeriodAction({ year: 1999, half: 1, action: "tutup" }).ok, false);
    assert.equal(parsePeriodAction({ year: 2026, half: 1, action: "hapus" }).ok, false);
  });

  it("legalitas: NIB 13 angka, NPWP 15/16 angka, badan hukum butuh nomor sertifikat", () => {
    assert.ok(parseLegal({ legalStatus: "PROSES", nib: "1234567890123", npwp: "01.234.567.8-901.000" }).ok);
    assert.ok(parseLegal({ npwp: "0123456789012345" }).ok);
    assert.equal(parseLegal({ nib: "123" }).ok, false);
    assert.equal(parseLegal({ npwp: "12345" }).ok, false);
    assert.equal(parseLegal({ legalStatus: "BADAN_HUKUM" }).ok, false);
    assert.ok(parseLegal({ legalStatus: "BADAN_HUKUM", certificateNo: "AHU-1" }).ok);
    assert.equal(parseLegal({ legalStatus: "XX" }).ok, false);
    assert.equal(parseLegal({ rankingLevel: "E" }).ok, false);
    assert.equal(parseLegal({ initialCapital: "1e5" }).ok, false);
    assert.equal(parseLegal({ perdesDate: "0001-01-01" }).ok, false);
  });

  it("pengurus: jabatan dikenal, tanggal akhir tak sebelum mulai", () => {
    assert.ok(parseOfficer({ role: "BENDAHARA", name: "Sari" }).ok);
    assert.equal(parseOfficer({ role: "DIREKTUR", name: "Sari" }).ok, false);
    assert.equal(parseOfficer({ role: "BENDAHARA", name: "" }).ok, false);
    assert.equal(parseOfficer({ role: "BENDAHARA", name: "S", startOn: "2026-05-01", endOn: "2026-04-01" }).ok, false);
  });

  it("arus APB Desa: bersandar pada keputusan Musyawarah Desa; tahun buku datang dari keputusan", () => {
    const b = { kind: "PENYERTAAN_MODAL", flowDate: "2026-10-01", amount: "5000000", resolutionId: 4, cashAccountCode: "1.1.01.02" };
    assert.ok(parseFlow(b, NOW).ok);
    assert.equal(parseFlow({ ...b, resolutionId: null }, NOW).ok, false);
    assert.equal(parseFlow({ ...b, resolutionId: "1e1" }, NOW).ok, false);
    assert.equal(parseFlow({ ...b, resolutionId: 0 }, NOW).ok, false);
    assert.equal(parseFlow({ ...b, cashAccountCode: "4.1.01.01" }, NOW).ok, false);
    assert.ok(parseFlow({ ...b, kind: "BAGI_HASIL" }, NOW).ok, "tahun buku diambil dari keputusan");
    assert.equal(parseFlow({ ...b, kind: "LAIN" }, NOW).ok, false);
    assert.equal(parseFlow({ ...b, villageChannel: "KARTU" }, NOW).ok, false);
    assert.equal(parseFlow({ ...b, amount: "0" }, NOW).ok, false);
    assert.equal(parseFlow({ ...b, flowDate: "2026-12-31" }, NOW).ok, false);
  });

  it("keputusan Musyawarah Desa: rapat, butir, jumlah, dan tahun buku (bagi hasil) wajib", () => {
    const r = { kind: "PENYERTAAN_MODAL", musdesMeetingId: 3, decisionId: 9, amount: "250000" };
    assert.ok(parseResolution(r).ok);
    assert.equal(parseResolution({ ...r, decisionId: null }).ok, false);
    assert.equal(parseResolution({ ...r, musdesMeetingId: "x" }).ok, false);
    assert.equal(parseResolution({ ...r, amount: "0" }).ok, false);
    assert.equal(parseResolution({ ...r, amount: "1e3" }).ok, false);
    assert.equal(parseResolution({ ...r, kind: "BAGI_HASIL" }).ok, false, "tahun buku wajib");
    assert.ok(parseResolution({ ...r, kind: "BAGI_HASIL", fiscalYear: 2025 }).ok);
    assert.equal(parseResolution({ ...r, kind: "BAGI_HASIL", fiscalYear: 1999 }).ok, false);
  });

  it("akun Penyertaan Modal/Bagi Hasil tertutup bagi transaksi kas dan jurnal manual; pembukaan hanya untuk modal", () => {
    const base = { unitId: 3, entryDate: "2026-10-01", direction: "income", amount: "1000", category: "x" };
    for (const accountCode of ["3.1.01.01", "3.2.01.01"]) assert.equal(parseCash({ ...base, accountCode }, NOW).ok, false, accountCode);
    const j = (acc: string, extra: Record<string, unknown> = {}) => ({ unitId: null, entryDate: "2026-10-01", description: "x", lines: [{ accountCode: "1.1.01.02", debit: "100" }, { accountCode: acc, credit: "100" }], ...extra });
    assert.equal(parseJournal(j("3.1.01.01"), NOW).ok, false);
    assert.equal(parseJournal(j("3.2.01.01"), NOW).ok, false);
    assert.equal(parseJournal(j("3.2.01.01", { opening: true }), NOW).ok, false);
    const op = parseJournal(j("3.1.01.01", { opening: true }), NOW);
    assert.ok(op.ok && op.value.opening === true);
    assert.equal(parseJournal(j("3.1.01.01", { opening: true, unitId: 3 }), NOW).ok, false);
    assert.ok(parseJournal(j("3.3.01.01"), NOW).ok);
    assert.equal(parseJournal(j("3.1.01.01", { opening: "true" }), NOW).ok, false, "hanya boolean true");
  });

  it("pemeriksa akun khusus per sumber jurnal", () => {
    const l = (a: string): JLine[] => [L("1.1.01.02", 5n, 0n), L(a, 0n, 5n)];
    assert.equal(reservedAccountViolation("MODAL", l("3.1.01.01")), null);
    assert.ok(reservedAccountViolation("MODAL", l("3.2.01.01")));
    assert.equal(reservedAccountViolation("BAGI_HASIL", [L("3.2.01.01", 5n, 0n), L("1.1.01.01", 0n, 5n)]), null);
    assert.ok(reservedAccountViolation("BAGI_HASIL", l("3.1.01.01")));
    assert.equal(reservedAccountViolation("SALDO_AWAL", l("3.1.01.01")), null);
    assert.ok(reservedAccountViolation("SALDO_AWAL", [L("3.2.01.01", 5n, 0n), L("1.1.01.01", 0n, 5n)]));
    for (const s of ["MANUAL", "KAS"]) for (const a of ["3.1.01.01", "3.2.01.01"]) assert.ok(reservedAccountViolation(s, l(a)), `${s} ${a}`);
    assert.equal(reservedAccountViolation("MANUAL", l("3.3.01.01")), null);
  });

  it("izin berbasis peran database: staf/sekretaris tak mengelola, peran tak dikenal tak membaca", () => {
    assert.equal(requireBumdesManageForRole("admin"), null);
    assert.equal(requireBumdesManageForRole("village_head"), null);
    assert.ok(requireBumdesManageForRole("staff"));
    assert.ok(requireBumdesManageForRole("secretary"));
    assert.ok(requireBumdesManageForRole(undefined));
    assert.equal(requireBumdesReadForRole("staff"), null);
    assert.ok(requireBumdesReadForRole("tamu"));
    assert.ok(requireBumdesReadForRole(null));
  });

  it("jumlah terlalu besar dijawab dengan pesan batas, bukan pesan 'lebih dari nol'", () => {
    for (const amount of ["99999999999999", "1000000000000", "999999999999999"]) {
      const r = parseCash({ unitId: 3, entryDate: "2026-10-01", direction: "income", amount, category: "x" }, NOW);
      assert.ok(!r.ok && /terlalu besar \(maksimal Rp999\.999\.999\.999,99\)/.test(r.fieldErrors.amount!), `${amount}: ${JSON.stringify(r)}`);
    }
    const bad = parseCash({ unitId: 3, entryDate: "2026-10-01", direction: "income", amount: "abc", category: "x" }, NOW);
    assert.ok(!bad.ok && /lebih dari nol/.test(bad.fieldErrors.amount!), "bentuk salah tetap pesan lama");
    const j = parseJournal({ unitId: null, entryDate: "2026-10-01", description: "x", lines: [{ accountCode: "1.1.01.01", debit: "99999999999999999" }, { accountCode: "3.3.01.01", credit: "1" }] }, NOW);
    assert.ok(!j.ok && /terlalu besar/.test(j.fieldErrors.lines!));
    assert.ok(parseCash({ unitId: 3, entryDate: "2026-10-01", direction: "income", amount: "999999999999.99", category: "x" }, NOW).ok, "tepat di batas masih sah");
    const f = parseResolution({ kind: "PENYERTAAN_MODAL", musdesMeetingId: 1, decisionId: 1, amount: "99999999999999999" });
    assert.ok(!f.ok && /terlalu besar/.test(f.fieldErrors.amount!));
  });

  it("baris wilayah cetak tanpa awalan ganda", () => {
    assert.equal(formatVillageRegion({ district: "Kecamatan Sawangan", regency: "Kabupaten Kota Depok", province: "Jawa Barat" }), "Kec. Sawangan, Kota Depok, Jawa Barat");
    assert.equal(formatVillageRegion({ district: "Sawangan", regency: "Kota Depok", province: "Jawa Barat" }), "Kec. Sawangan, Kota Depok, Jawa Barat");
    assert.equal(formatVillageRegion({ district: "Kec. Jatiyoso", regency: "Kab. Karanganyar", province: "Jawa Tengah" }), "Kec. Jatiyoso, Kabupaten Karanganyar, Jawa Tengah");
    assert.equal(formatVillageRegion({ district: "kecamatan  Jatiyoso", regency: "kabupaten Karanganyar", province: "Jawa Tengah" }), "Kec. Jatiyoso, Kabupaten Karanganyar, Jawa Tengah");
    assert.equal(formatVillageRegion({ district: "Jatiyoso", regency: "Karanganyar", province: "Jawa Tengah" }), "Kec. Jatiyoso, Karanganyar, Jawa Tengah", "tanpa awalan: apa adanya");
    assert.equal(formatVillageRegion({ district: "", regency: null, province: "Jawa Tengah" }), "Jawa Tengah");
    assert.equal(formatVillageRegion(null), "");
  });

  it("CSV: sel berawalan rumus dinetralkan", () => {
    assert.equal(csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
    assert.equal(csvCell("+1"), "'+1");
    assert.equal(csvCell("a,b"), '"a,b"');
    assert.equal(csvCell("biasa"), "biasa");
  });
});

describe("BUMDes: izin dan guard rute", () => {
  it("hanya admin dan kepala desa yang mengelola; sekretaris dan staf hanya membaca", () => {
    assert.equal(canManageBumdes("admin"), true);
    assert.equal(canManageBumdes("village_head"), true);
    assert.equal(canManageBumdes("secretary"), false);
    assert.equal(canManageBumdes("staff"), false);
    assert.equal(canManageBumdes(undefined), false);
  });

  const root = join(process.cwd(), "app", "api", "bumdes");
  const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : n === "route.ts" ? [join(dir, n)] : []));
  const routes = files(root).map((f) => relative(process.cwd(), f).split(sep).join("/"));
  const NEW = routes.filter((f) => !/^app\/api\/bumdes\/(route|units\/route|summary\/route)\.ts$/.test(f));

  it("setiap handler memanggil requireVillageApiContext secara eksplisit dan dibungkus attempt()", () => {
    assert.ok(NEW.length >= 14, `rute baru ${NEW.length}`);
    for (const f of NEW) {
      const src = readFileSync(f, "utf8");
      const handlers = [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
      assert.equal([...src.matchAll(/await requireVillageApiContext\(/g)].length, handlers.length, f);
      assert.equal([...src.matchAll(/return attempt\(/g)].length, handlers.length, f);
      assert.ok(src.includes("bumdesScope("), f);
    }
  });

  it("handler tulis meminta izin kelola (write: true) dan memanggil auditWeb; villageId tak pernah dari body/query", () => {
    for (const f of NEW) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b[\s\S]*?(?=\nexport\s+async\s+function|\s*$)/g)) {
        assert.ok(/bumdesScope\([^)]*write:\s*true/.test(m[0]), `${f} ${m[1]} tanpa write:true`);
        assert.ok(m[0].includes("auditWeb("), `${f} ${m[1]} tanpa audit`);
      }
      assert.ok(!/villageId:\s*(body|b|input)\b/.test(src) && !/searchParams\.get\(["']villageId/.test(src), f);
    }
  });

  it("rute dana-desa memeriksa izin mencatat/menghapus di APB Desa", () => {
    const post = readFileSync("app/api/bumdes/dana-desa/route.ts", "utf8");
    assert.ok(/permissions\(s\.ctx, "apbdes"\)\.create/.test(post));
    const batal = readFileSync("app/api/bumdes/dana-desa/[id]/batal/route.ts", "utf8");
    assert.ok(/can\.delete && can\.create/.test(batal));
  });
});
