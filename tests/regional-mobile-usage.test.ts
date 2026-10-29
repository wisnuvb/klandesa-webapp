import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildMobileUsage } from "../lib/regional-mobile-usage.ts";

const now = new Date("2026-10-29T00:00:00Z");
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe("pemakaian aplikasi per desa", () => {
  it("menghitung akun unik (bukan jumlah sesi) dan memisahkan 7 dan 30 hari", () => {
    const { villages } = buildMobileUsage(
      [1],
      new Map([[1, 40]]),
      [
        { villageId: 1, accountType: "citizen", accountId: 5, lastUsedAt: ago(1) },
        { villageId: 1, accountType: "citizen", accountId: 5, lastUsedAt: ago(2) }, // perangkat kedua, akun sama
        { villageId: 1, accountType: "citizen", accountId: 6, lastUsedAt: ago(20) },
        { villageId: 1, accountType: "citizen", accountId: 7, lastUsedAt: ago(45) },
        { villageId: 1, accountType: "staff", accountId: 1, lastUsedAt: ago(3) },
      ],
      now,
    );
    assert.equal(villages[0].activeCitizens7d, 1);
    assert.equal(villages[0].activeCitizens30d, 2);
    assert.equal(villages[0].activeStaff30d, 1);
    assert.equal(villages[0].status, "aktif");
  });

  it("status: belum (tanpa akun/sesi), sepi (ada akun tetapi tidak aktif 30 hari), aktif", () => {
    const r = buildMobileUsage(
      [1, 2, 3],
      new Map([[2, 10]]),
      [{ villageId: 3, accountType: "citizen", accountId: 1, lastUsedAt: ago(2) }],
      now,
    );
    assert.deepEqual(r.villages.map((v) => v.status), ["belum", "sepi", "aktif"]);
    assert.deepEqual({ belum: r.totals.belum, sepi: r.totals.sepi, aktif: r.totals.aktif }, { belum: 1, sepi: 1, aktif: 1 });
    assert.equal(r.totals.citizenAccounts, 10);
  });

  it("sesi desa di luar daftar (tidak ikut agregat) diabaikan; lastActiveAt memakai yang terbaru", () => {
    const r = buildMobileUsage(
      [1],
      new Map(),
      [
        { villageId: 99, accountType: "citizen", accountId: 1, lastUsedAt: ago(1) },
        { villageId: 1, accountType: "citizen", accountId: 2, lastUsedAt: ago(60) },
        { villageId: 1, accountType: "citizen", accountId: 3, lastUsedAt: ago(50) },
      ],
      now,
    );
    assert.equal(r.villages.length, 1);
    assert.equal(r.villages[0].status, "sepi");
    assert.equal(r.villages[0].lastActiveAt, ago(50).toISOString());
  });
});
