import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addMonths, buildSchedule, distributeShu, fromCents, loanPosition, toCents } from "../lib/coop/loan-math";

const D = (s: string) => new Date(`${s}T00:00:00Z`);
const c = (v: string) => toCents(v)!;
const sum = (xs: bigint[]) => xs.reduce((a, b) => a + b, 0n);

describe("sen", () => {
  it("toCents/fromCents bolak-balik dan menolak masukan aneh", () => {
    assert.equal(toCents("1500000.5"), 150_000_050n);
    assert.equal(toCents(10), 1000n);
    assert.equal(fromCents(150_000_050n), "1500000.50");
    assert.equal(fromCents(5n), "0.05");
    for (const bad of ["", "-1", "1e3", "1,5", "1.234", "abc", "12345678901234"]) assert.equal(toCents(bad), null, bad);
    assert.equal(toCents(Number.NaN), null);
  });
  it("addMonths memangkas ke akhir bulan", () => {
    assert.equal(addMonths(D("2026-01-31"), 1).toISOString().slice(0, 10), "2026-02-28");
    assert.equal(addMonths(D("2024-01-31"), 1).toISOString().slice(0, 10), "2024-02-29");
    assert.equal(addMonths(D("2026-11-15"), 3).toISOString().slice(0, 10), "2027-02-15");
    assert.equal(addMonths(D("2026-12-31"), 2).toISOString().slice(0, 10), "2027-02-28");
  });
});

describe("jadwal angsuran flat", () => {
  it("1.200.000, 1% per bulan, 6 bulan: bunga total 72.000, angsuran 212.000", () => {
    const s = buildSchedule({ principal: c("1200000"), ratePercent: "1.00", termMonths: 6, disbursedAt: D("2026-01-15") })!;
    assert.equal(s.length, 6);
    assert.equal(sum(s.map((x) => x.principal)), c("1200000"));
    assert.equal(sum(s.map((x) => x.interest)), c("72000"));
    assert.ok(s.every((x) => x.total === c("212000")));
    assert.equal(s[0].dueDate.toISOString().slice(0, 10), "2026-02-15");
  });
  it("sisa pembulatan masuk angsuran terakhir; jumlah selalu tepat", () => {
    const s = buildSchedule({ principal: c("1000000"), ratePercent: "1.50", termMonths: 7, disbursedAt: D("2026-01-31") })!;
    assert.equal(sum(s.map((x) => x.principal)), c("1000000"));
    assert.equal(sum(s.map((x) => x.interest)), c("105000"), "1.000.000 x 1,5% x 7");
    const first = s[0].total;
    assert.ok(s.slice(0, -1).every((x) => x.total === first));
  });
  it("tanpa bunga bila 0%; menolak masukan tak sah", () => {
    const s = buildSchedule({ principal: c("500000"), ratePercent: "0", termMonths: 5, disbursedAt: D("2026-01-01") })!;
    assert.ok(s.every((x) => x.interest === 0n));
    assert.equal(buildSchedule({ principal: 0n, ratePercent: "1", termMonths: 5, disbursedAt: D("2026-01-01") }), null);
    assert.equal(buildSchedule({ principal: 100n, ratePercent: "1", termMonths: 0, disbursedAt: D("2026-01-01") }), null);
    assert.equal(buildSchedule({ principal: 100n, ratePercent: "x", termMonths: 3, disbursedAt: D("2026-01-01") }), null);
  });
  it("pokok sangat kecil lebih sedikit dari lama pinjaman tak menghasilkan angka negatif", () => {
    const s = buildSchedule({ principal: 5n, ratePercent: "1", termMonths: 12, disbursedAt: D("2026-01-01") })!;
    assert.ok(s.every((x) => x.principal >= 0n && x.interest >= 0n));
    assert.equal(sum(s.map((x) => x.principal)), 5n);
  });
});

describe("posisi pinjaman", () => {
  const sched = () => buildSchedule({ principal: c("1200000"), ratePercent: "1.00", termMonths: 6, disbursedAt: D("2026-01-15") })!;
  it("pembayaran dialokasikan ke angsuran terlama; sebagian, lunas, dan terlambat dibedakan", () => {
    const p = loanPosition(sched(), c("300000"), D("2026-04-01"));
    assert.deepEqual(p.schedule.map((x) => x.state), ["LUNAS", "TERLAMBAT", "BELUM", "BELUM", "BELUM", "BELUM"], "angsuran 2 dibayar sebagian tapi sudah lewat tempo 15 Maret");
    assert.equal(p.schedule[1].paid, c("88000"));
    assert.equal(p.totalPaid, c("300000"));
    assert.equal(p.outstanding, c("972000"), "6 x 212.000 - 300.000");
    assert.equal(p.overdueCount, 1);
  });
  it("lunas penuh: sisa nol, tak ada tunggakan, tak ada jatuh tempo berikutnya", () => {
    const p = loanPosition(sched(), c("1272000"), D("2027-01-01"));
    assert.equal(p.outstanding, 0n);
    assert.equal(p.principalOutstanding, 0n);
    assert.equal(p.overdueCount, 0);
    assert.equal(p.nextDue, null);
    assert.ok(p.schedule.every((x) => x.state === "LUNAS"));
  });
  it("sisa pokok memperhitungkan bunga dilunasi lebih dulu pada tiap angsuran", () => {
    const p = loanPosition(sched(), c("12000"), D("2026-02-01"));
    assert.equal(p.principalOutstanding, c("1200000"), "baru membayar bunga angsuran pertama (12.000)");
    const q = loanPosition(sched(), c("212000"), D("2026-02-01"));
    assert.equal(q.principalOutstanding, c("1000000"));
  });
  it("tanpa pembayaran: jatuh tempo berikutnya angsuran pertama", () => {
    const p = loanPosition(sched(), 0n, D("2026-01-20"));
    assert.equal(p.nextDue?.toISOString().slice(0, 10), "2026-02-15");
    assert.equal(p.overdueCount, 0);
  });
});

describe("pembagian SHU", () => {
  const members = [
    { id: 1, savings: c("1000000"), loanInterestPaid: c("60000") },
    { id: 2, savings: c("3000000"), loanInterestPaid: 0n },
    { id: 3, savings: c("2000000"), loanInterestPaid: c("40000") },
  ];
  it("porsi simpanan sebanding saldo, porsi pinjaman sebanding bunga; tak pernah melebihi total", () => {
    const r = distributeShu({ total: c("1000000"), savingsSharePercent: 60, members });
    assert.equal(r.rows[0].fromSavings, c("100000"), "600.000 x 1/6");
    assert.equal(r.rows[1].fromSavings, c("300000"));
    assert.equal(r.rows[0].fromLoans, c("240000"), "400.000 x 60/100");
    assert.equal(r.rows[1].fromLoans, 0n);
    assert.equal(r.distributed + r.undistributed, c("1000000"));
    assert.ok(r.undistributed >= 0n);
  });
  it("tanpa dasar pembagi (tak ada simpanan/bunga) porsinya tidak dibagikan, bukan error", () => {
    const r = distributeShu({ total: c("1000000"), savingsSharePercent: 50, members: members.map((m) => ({ ...m, loanInterestPaid: 0n })) });
    assert.ok(r.undistributed >= c("500000") && r.undistributed < c("500000") + 3n, "porsi pinjaman utuh tak dibagikan, ditambah sisa pembulatan beberapa sen");
    const none = distributeShu({ total: c("1000"), savingsSharePercent: 100, members: [] });
    assert.equal(none.distributed, 0n);
    assert.equal(none.undistributed, c("1000"));
  });
  it("sisa pembulatan kecil dan dilaporkan", () => {
    const r = distributeShu({ total: 10n, savingsSharePercent: 100, members: [{ id: 1, savings: 1n, loanInterestPaid: 0n }, { id: 2, savings: 1n, loanInterestPaid: 0n }, { id: 3, savings: 1n, loanInterestPaid: 0n }] });
    assert.equal(r.distributed, 9n);
    assert.equal(r.undistributed, 1n);
  });
});
