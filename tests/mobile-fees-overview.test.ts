import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOverview, groupKey } from "../lib/mobile/fees-overview-logic.ts";

const sch = [
  { id: 1, scope: "desa", rt: null, rw: null },
  { id: 2, scope: "rt", rt: "3", rw: "1" },
  { id: 3, scope: "rt", rt: "10", rw: "1" },
  { id: 4, scope: "rt", rt: "3", rw: "1" }, // jadwal kedua RT yang sama
];

describe("rekap iuran seluruh desa", () => {
  it("mengelompokkan jadwal RT yang sama dan menaruh Desa di depan", () => {
    const o = buildOverview(sch, [], [], new Map(), new Map());
    assert.deepEqual(o.groups.map((g) => g.key), ["desa", "rt:3/1", "rt:10/1"]);
    assert.equal(o.groups.find((g) => g.key === "rt:3/1")?.schedules, 2);
    assert.equal(groupKey("rt", "3", "1"), "rt:3/1");
  });

  it("menjumlahkan tagihan per kelompok, mengurutkan RT dengan sisa terbesar dulu", () => {
    const o = buildOverview(
      sch,
      [
        { scheduleId: 2, amount: 20000, status: "paid", confirmed: 20000 },
        { scheduleId: 2, amount: 20000, status: "unpaid", confirmed: 0 },
        { scheduleId: 3, amount: 20000, status: "overdue", confirmed: 5000 },
        { scheduleId: 3, amount: 20000, status: "overdue", confirmed: 0 },
        { scheduleId: 3, amount: 20000, status: "waived", confirmed: 0 },
      ],
      [],
      new Map(),
      new Map(),
    );
    const rts = o.groups.filter((g) => g.scope === "rt");
    assert.equal(rts[0].key, "rt:10/1");
    assert.equal(rts[0].summary.outstanding, 35000);
    assert.equal(rts[0].summary.waivedCount, 1);
    assert.equal(rts[1].summary.collected, 20000);
    assert.equal(o.total.billed, 80000);
    assert.equal(o.total.collectionPercent, 31);
  });

  it("saldo = iuran terkonfirmasi + kas masuk − keluar, tanpa entri batal; laporan menunggu dijumlah", () => {
    const o = buildOverview(
      sch,
      [],
      [
        { scope: "rt", rt: "3", rw: "1", type: "in", amount: 50000, voided: false },
        { scope: "rt", rt: "3", rw: "1", type: "out", amount: 30000, voided: false },
        { scope: "rt", rt: "3", rw: "1", type: "out", amount: 999999, voided: true },
      ],
      new Map([[2, 40000], [4, 10000]]),
      new Map([[2, 2], [3, 1]]),
    );
    const g = o.groups.find((x) => x.key === "rt:3/1")!;
    assert.deepEqual(g.balance, { income: 100000, expense: 30000, balance: 70000 });
    assert.equal(o.pendingClaims, 3);
  });

  it("entri kas tanpa jadwal tetap membuat kelompoknya (saldo tidak hilang)", () => {
    const o = buildOverview([], [], [{ scope: "desa", rt: null, rw: null, type: "in", amount: 1000, voided: false }], new Map(), new Map());
    assert.equal(o.groups.length, 1);
    assert.equal(o.groups[0].balance.balance, 1000);
  });
});
