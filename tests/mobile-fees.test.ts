import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addPeriods, cashBalance, chargeStatus, comparePeriods, csvCell, currentPeriod, dueDateOf, isPeriod, needsReminder,
  periodsToGenerate, pickHead, summarize, toCsv, validateCashEntry, validatePayment, validateSchedule,
} from "../lib/mobile/fees-logic.ts";

const NOW = new Date("2026-10-29T03:00:00Z"); // 10:00 WIB

describe("periode", () => {
  it("periode sekarang memakai WIB (akhir bulan malam UTC sudah bulan depan di WIB)", () => {
    assert.equal(currentPeriod(NOW), "2026-10");
    assert.equal(currentPeriod(new Date("2026-10-31T18:00:00Z")), "2026-11");
    assert.equal(currentPeriod(new Date("2026-12-31T17:30:00Z")), "2027-01");
  });
  it("validasi dan aritmetika periode", () => {
    for (const bad of ["2026-13", "2026-00", "26-10", "2026-1", null, 5, "2019-12", "2101-01"]) assert.equal(isPeriod(bad), false, String(bad));
    assert.equal(addPeriods("2026-11", 3), "2027-02");
    assert.equal(addPeriods("2026-01", -1), "2025-12");
    assert.ok(comparePeriods("2026-10", "2026-09") > 0);
  });
  it("jatuh tempo: hari dibatasi panjang bulan, akhir hari WIB", () => {
    assert.equal(dueDateOf("2026-02", 31).toISOString(), "2026-02-28T16:59:59.000Z");
    assert.equal(dueDateOf("2026-10", 10).toISOString(), "2026-10-10T16:59:59.000Z");
  });
  it("tagihan yang dibuat: bulanan dari periode mulai s.d. sekarang, maksimal 12 bulan ke belakang", () => {
    assert.deepEqual(periodsToGenerate({ recurrence: "monthly", startPeriod: "2026-08", endPeriod: null }, NOW), ["2026-08", "2026-09", "2026-10"]);
    assert.equal(periodsToGenerate({ recurrence: "monthly", startPeriod: "2020-01", endPeriod: null }, NOW).length, 12);
    assert.deepEqual(periodsToGenerate({ recurrence: "monthly", startPeriod: "2026-08", endPeriod: "2026-09" }, NOW), ["2026-08", "2026-09"]);
    assert.deepEqual(periodsToGenerate({ recurrence: "monthly", startPeriod: "2026-12", endPeriod: null }, NOW), []);
    assert.deepEqual(periodsToGenerate({ recurrence: "once", startPeriod: "2026-09", endPeriod: null }, NOW), ["2026-09"]);
    assert.deepEqual(periodsToGenerate({ recurrence: "once", startPeriod: "2026-11", endPeriod: null }, NOW), []);
  });
});

describe("validasi jadwal", () => {
  const ok = { name: " Iuran  Ronda ", category: "keamanan", amount: 25000, recurrence: "monthly" };
  it("menerima dan merapikan; bawaan: mulai bulan ini, jatuh tempo tanggal 10", () => {
    const r = validateSchedule(ok, NOW);
    assert.ok(r.ok);
    if (r.ok) { assert.equal(r.value.name, "Iuran Ronda"); assert.equal(r.value.startPeriod, "2026-10"); assert.equal(r.value.dueDay, 10); }
  });
  it("menolak nominal tidak bulat/di luar batas, jenis asing, tanggal aneh, periode mundur", () => {
    for (const bad of [{ amount: 500 }, { amount: 12.5 }, { amount: 99_999_999 }, { amount: "abc" }, { category: "hack" }, { name: "ab" }, { recurrence: "weekly" }, { dueDay: 31 }, { startPeriod: "2030-01" }, { endPeriod: "2026-01" }]) {
      assert.equal(validateSchedule({ ...ok, ...bad }, NOW).ok, false, JSON.stringify(bad));
    }
  });
});

describe("validasi pembayaran", () => {
  it("bawaan = lunasi sisa; tidak boleh melebihi sisa atau nol", () => {
    assert.deepEqual(validatePayment({ method: "cash" }, 25000), { ok: true, amount: 25000, method: "cash", note: null });
    assert.equal(validatePayment({ method: "cash", amount: 30000 }, 25000).ok, false);
    assert.equal(validatePayment({ method: "cash", amount: 0 }, 25000).ok, false);
    assert.equal(validatePayment({ method: "cash", amount: 10.5 }, 25000).ok, false);
    assert.equal(validatePayment({ method: "bitcoin" }, 25000).ok, false);
    assert.equal(validatePayment({ method: "cash" }, 0).ok, false);
  });
  it("cicilan sah", () => assert.equal(validatePayment({ method: "transfer", amount: 10000 }, 25000).ok, true));
});

describe("validasi kas", () => {
  it("pengeluaran sah, tanggal masa depan jauh ditolak", () => {
    assert.ok(validateCashEntry({ type: "out", amount: 150000, description: "Beli lampu pos ronda", category: "perlengkapan", entryDate: "2026-10-28" }, NOW).ok);
    assert.equal(validateCashEntry({ type: "out", amount: 150000, description: "Beli lampu", entryDate: "2027-05-01" }, NOW).ok, false);
    assert.equal(validateCashEntry({ type: "out", amount: -5, description: "xxx" }, NOW).ok, false);
    assert.equal(validateCashEntry({ type: "transfer", amount: 5, description: "xxx" }, NOW).ok, false);
    assert.equal(validateCashEntry({ type: "in", amount: 5, description: "xxx", entryDate: "2026-02-30" }, NOW).ok, false);
  });
});

describe("status tagihan", () => {
  const due = new Date("2026-10-10T16:59:59Z");
  const base = { amount: 25000, waived: false, confirmed: 0, pending: 0, dueDate: due };
  it("belum bayar → lewat tempo setelah jatuh tempo", () => {
    assert.equal(chargeStatus({ ...base, now: new Date("2026-10-05T00:00:00Z") }).status, "unpaid");
    assert.equal(chargeStatus({ ...base, now: NOW }).status, "overdue");
  });
  it("lunas, cicilan, menunggu dicek, dibebaskan", () => {
    assert.deepEqual(chargeStatus({ ...base, confirmed: 25000, now: NOW }), { status: "paid", outstanding: 0 });
    assert.deepEqual(chargeStatus({ ...base, confirmed: 10000, now: new Date("2026-10-05T00:00:00Z") }), { status: "partial", outstanding: 15000 });
    assert.equal(chargeStatus({ ...base, pending: 25000, now: NOW }).status, "claimed");
    assert.deepEqual(chargeStatus({ ...base, waived: true, now: NOW }), { status: "waived", outstanding: 0 });
  });
  it("pembayaran berlebih tidak membuat sisa negatif", () => assert.equal(chargeStatus({ ...base, confirmed: 99999, now: NOW }).outstanding, 0));
});

describe("rekap dan kas", () => {
  it("dibebaskan tidak masuk tagihan; terkumpul dibatasi nominal tagihan; persentase", () => {
    const s = summarize([
      { amount: 25000, status: "paid", confirmed: 25000 },
      { amount: 25000, status: "partial", confirmed: 10000 },
      { amount: 25000, status: "overdue", confirmed: 0 },
      { amount: 25000, status: "waived", confirmed: 0 },
      { amount: 25000, status: "claimed", confirmed: 0 },
    ]);
    assert.equal(s.billed, 100000);
    assert.equal(s.collected, 35000);
    assert.equal(s.outstanding, 65000);
    assert.equal(s.waived, 25000);
    assert.equal(s.collectionPercent, 35);
    assert.deepEqual([s.paid, s.partial, s.overdue, s.claimed, s.waivedCount], [1, 1, 1, 1, 1]);
    assert.equal(summarize([]).collectionPercent, null);
  });
  it("saldo kas: iuran + pemasukan − pengeluaran, entri batal diabaikan", () => {
    const b = cashBalance({ feesConfirmed: 300000, cash: [{ type: "in", amount: 50000, voided: false }, { type: "out", amount: 120000, voided: false }, { type: "out", amount: 999999, voided: true }] });
    assert.deepEqual(b, { income: 350000, expense: 120000, balance: 230000 });
  });
});

describe("pengingat dan kepala KK", () => {
  const due = new Date("2026-10-10T16:59:59Z");
  it("pengingat: setelah 3 hari lewat tempo, lalu paling cepat seminggu sekali", () => {
    assert.equal(needsReminder({ status: "overdue", dueDate: due, lastRemindedAt: null, now: new Date("2026-10-12T00:00:00Z") }), false);
    assert.equal(needsReminder({ status: "overdue", dueDate: due, lastRemindedAt: null, now: new Date("2026-10-15T00:00:00Z") }), true);
    assert.equal(needsReminder({ status: "overdue", dueDate: due, lastRemindedAt: new Date("2026-10-14T00:00:00Z"), now: new Date("2026-10-18T00:00:00Z") }), false);
    assert.equal(needsReminder({ status: "overdue", dueDate: due, lastRemindedAt: new Date("2026-10-14T00:00:00Z"), now: new Date("2026-10-22T00:00:00Z") }), true);
    for (const st of ["paid", "waived", "claimed", "unpaid"] as const) assert.equal(needsReminder({ status: st, dueDate: due, lastRemindedAt: null, now: new Date("2026-12-01T00:00:00Z") }), false, st);
  });
  it("kepala KK: berstatus kepala, kalau tidak ada yang tertua", () => {
    const m = [{ name: "Anak", familyRole: "Anak", birthDate: new Date("2010-01-01") }, { name: "Ayah", familyRole: "Kepala Keluarga", birthDate: new Date("1980-01-01") }];
    assert.equal(pickHead(m)!.name, "Ayah");
    assert.equal(pickHead([m[0], { name: "Nenek", familyRole: "Famili lain", birthDate: new Date("1950-01-01") }])!.name, "Nenek");
    assert.equal(pickHead([]), null);
  });
});

describe("CSV", () => {
  it("menetralkan rumus spreadsheet dan mengutip koma/kutip", () => {
    assert.equal(csvCell("=HYPERLINK(\"x\")"), '"\'=HYPERLINK(""x"")"');
    assert.equal(csvCell("+62812"), "'+62812");
    assert.equal(csvCell("Budi, S.Pd"), '"Budi, S.Pd"');
    assert.equal(csvCell(null), "");
    assert.equal(csvCell(25000), "25000");
    assert.equal(toCsv(["a", "b"], [[1, "x,y"]]), 'a,b\r\n1,"x,y"\r\n');
  });
});
