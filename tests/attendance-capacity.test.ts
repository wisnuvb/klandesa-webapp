import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  attendanceCapacityAdminMessage,
  attendanceCapacityEnforced,
  attendanceCapacityFullMessage,
  mapVillagePlanToTier,
  maxHistoryDaysForTier,
  staffLimitForPlan,
  staffLimitForTier,
} from "../lib/attendance/capacity.ts";

describe("kapasitas absensi", () => {
  it("Paket Lengkap: 10 perangkat dan riwayat 30 hari (sesuai yang tercantum di /harga)", () => {
    assert.equal(mapVillagePlanToTier("lengkap"), "TIER_6_10");
    assert.equal(staffLimitForPlan("lengkap"), 10);
    assert.equal(maxHistoryDaysForTier(mapVillagePlanToTier("lengkap")), 30);
  });
  it("desa paket lama tidak berubah", () => {
    assert.equal(staffLimitForPlan("starter"), 10);
    assert.equal(staffLimitForPlan("profesional"), 20);
    assert.equal(staffLimitForPlan("enterprise"), 50);
    assert.equal(maxHistoryDaysForTier("TIER_11_20"), 90);
    assert.equal(maxHistoryDaysForTier("TIER_31_50"), 365);
    assert.equal(staffLimitForTier("FREE"), 5);
  });
  it("batas dipaksakan di check-in hanya untuk Paket Lengkap", () => {
    assert.equal(attendanceCapacityEnforced("lengkap"), true);
    assert.equal(attendanceCapacityEnforced("Lengkap"), true);
    for (const p of ["starter", "profesional", "enterprise", null, undefined, ""]) {
      assert.equal(attendanceCapacityEnforced(p), false, String(p));
    }
  });
  it("pesan menyebut angka kapasitas dan arah tindakan", () => {
    assert.match(attendanceCapacityFullMessage(10), /10 perangkat/);
    assert.match(attendanceCapacityFullMessage(10), /Klandesa/);
    const m = attendanceCapacityAdminMessage(10, 3);
    assert.match(m, /10 perangkat/);
    assert.match(m, /3 perangkat lainnya/);
    assert.doesNotMatch(attendanceCapacityAdminMessage(10, 0), /lainnya/);
  });
});
