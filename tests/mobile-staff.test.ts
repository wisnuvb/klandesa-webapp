import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computePresentOrLate, evaluateGps, extractQrToken, monthRange, summarizeMonth, MAX_GPS_ACCURACY_METERS,
} from "../lib/mobile/attendance-logic.ts";
import { ageFromBirthDate, isAnnouncementCategory, planResidentSearch } from "../lib/mobile/resident-logic.ts";

describe("absensi: hadir/terlambat", () => {
  const shift = { startTime: "08:00:00", lateToleranceMinutes: 15 };
  it("tepat waktu sampai batas toleransi", () => {
    assert.equal(computePresentOrLate(new Date(2026, 9, 22, 7, 59), shift), "PRESENT");
    assert.equal(computePresentOrLate(new Date(2026, 9, 22, 8, 15, 0), shift), "PRESENT");
    assert.equal(computePresentOrLate(new Date(2026, 9, 22, 8, 15, 1), shift), "LATE");
  });
  it("jam kosong dianggap 08:00", () => {
    assert.equal(computePresentOrLate(new Date(2026, 9, 22, 9, 0), { startTime: "", lateToleranceMinutes: 0 }), "LATE");
  });
});

describe("absensi GPS", () => {
  const office = { lat: -6.2, lng: 106.8, radiusMeters: 100 };
  it("di dalam radius diterima", () => {
    const r = evaluateGps({ lat: -6.2002, lng: 106.8, accuracy: 20 }, office);
    assert.equal(r.ok, true);
  });
  it("di luar radius ditolak dengan jarak", () => {
    const r = evaluateGps({ lat: -6.21, lng: 106.8 }, office);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.code, "GPS_OUTSIDE_RADIUS");
      assert.ok((r.distanceMeters ?? 0) > 1000);
    }
  });
  it("akurasi buruk dan koordinat sampah ditolak", () => {
    const bad = evaluateGps({ lat: -6.2, lng: 106.8, accuracy: MAX_GPS_ACCURACY_METERS + 1 }, office);
    assert.equal(bad.ok === false && bad.code, "GPS_INACCURATE");
    for (const fix of [{ lat: "x", lng: 1 }, { lat: 91, lng: 0 }, { lat: NaN, lng: 0 }, {}]) {
      const r = evaluateGps(fix, office);
      assert.equal(r.ok === false && r.code, "GPS_INVALID");
    }
  });
});

describe("QR absensi & ringkasan", () => {
  const jwtLike = "aaa.bbb.ccc";
  it("mengambil token dari URL atau token mentah", () => {
    assert.equal(extractQrToken(`https://app.klandesa.com/absensi/check-in?token=${jwtLike}`), jwtLike);
    assert.equal(extractQrToken(`https://x/y?a=1&token=${jwtLike}&b=2`), jwtLike);
    assert.equal(extractQrToken(jwtLike), jwtLike);
    assert.equal(extractQrToken("halo dunia"), null);
    assert.equal(extractQrToken(""), null);
    assert.equal(extractQrToken("x".repeat(3000)), null);
  });
  it("ringkasan & rentang bulan", () => {
    assert.deepEqual(summarizeMonth([{ status: "PRESENT" }, { status: "LATE" }, { status: "LATE" }, { status: "LEAVE" }, { status: "ABSENT" }]), { present: 1, late: 2, leave: 1, total: 5 });
    const r = monthRange("2026-10");
    assert.equal(r?.from.getMonth(), 9);
    assert.equal(r?.to.getMonth(), 10);
    assert.equal(monthRange("2026-13"), null);
    assert.equal(monthRange("okt"), null);
  });
});

describe("cari warga & pengumuman", () => {
  it("rencana pencarian", () => {
    assert.deepEqual(planResidentSearch("3201010101010001"), { kind: "nik-or-kk", digits: "3201010101010001" });
    assert.deepEqual(planResidentSearch("3201 0101 0101 0001"), { kind: "nik-or-kk", digits: "3201010101010001" });
    assert.deepEqual(planResidentSearch("siti"), { kind: "name", term: "siti" });
    assert.equal(planResidentSearch("ab").kind, "none");
    assert.equal(planResidentSearch("12345").kind, "none");
    assert.equal(planResidentSearch(null).kind, "none");
    assert.deepEqual(planResidentSearch("si%_ti"), { kind: "name", term: "siti" });
  });
  it("umur dan kategori", () => {
    assert.equal(ageFromBirthDate(new Date(1990, 9, 23), new Date(2026, 9, 22)), 35);
    assert.equal(ageFromBirthDate(new Date(1990, 9, 22), new Date(2026, 9, 22)), 36);
    assert.equal(isAnnouncementCategory("Berita"), true);
    assert.equal(isAnnouncementCategory("Iklan"), false);
  });
});
