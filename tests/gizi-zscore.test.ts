import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WHO_LMS } from "../lib/gizi/who-lms";
import { ageInMonths, assess, hazCategory, lmsAt, sexOf, whzCategory, wazCategory, zScore } from "../lib/gizi/zscore";

const BIRTH = new Date("2024-01-15T00:00:00Z");
const onAgeMonths = (m: number) => new Date(BIRTH.getTime() + Math.round(m * 30.4375) * 86_400_000);
const near = (a: number | null, b: number, tol: number, msg: string) => assert.ok(a !== null && Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

describe("tabel WHO", () => {
  it("lengkap: 0-24 bln berbaring, 24-60 bln berdiri, BB/PB 45-110 cm, BB/TB 65-120 cm, urut naik", () => {
    for (const s of ["M", "F"] as const) {
      assert.deepEqual([WHO_LMS.lhfaLying[s][0][0], WHO_LMS.lhfaLying[s].at(-1)![0]], [0, 24]);
      assert.deepEqual([WHO_LMS.lhfaStanding[s][0][0], WHO_LMS.lhfaStanding[s].at(-1)![0]], [24, 60]);
      assert.deepEqual([WHO_LMS.wfa[s][0][0], WHO_LMS.wfa[s].at(-1)![0]], [0, 60]);
      assert.deepEqual([WHO_LMS.wfl[s][0][0], WHO_LMS.wfl[s].at(-1)![0]], [45, 110]);
      assert.deepEqual([WHO_LMS.wfh[s][0][0], WHO_LMS.wfh[s].at(-1)![0]], [65, 120]);
      for (const t of [WHO_LMS.lhfaLying[s], WHO_LMS.lhfaStanding[s], WHO_LMS.wfa[s], WHO_LMS.wfl[s], WHO_LMS.wfh[s]]) {
        for (let i = 1; i < t.length; i++) assert.ok(t[i][0] > t[i - 1][0]);
        assert.ok(t.every((r) => r[2] > 0 && r[3] > 0));
      }
    }
  });
  it("interpolasi linear dan menolak di luar rentang", () => {
    const a = lmsAt(WHO_LMS.lhfaLying.M, 12)!;
    const b = lmsAt(WHO_LMS.lhfaLying.M, 13)!;
    const mid = lmsAt(WHO_LMS.lhfaLying.M, 12.5)!;
    near(mid.M, (a.M + b.M) / 2, 1e-9, "tengah");
    assert.equal(lmsAt(WHO_LMS.lhfaLying.M, -0.1), null);
    assert.equal(lmsAt(WHO_LMS.wfl.M, 110.5), null);
    assert.equal(lmsAt(WHO_LMS.wfl.M, Number.NaN), null);
  });
});

describe("z-score terhadap nilai terbit WHO (kolom SD dibulatkan 0,1; toleransi 0,12)", () => {
  // Jangkar dari berkas WHO: [nilai pada -3,-2,-1,0,+1,+2,+3 SD]
  it("TB/U laki-laki 12 bln: 68.6, 71, 73.4, 75.7, 78.1, 80.5, 82.9", () => {
    [-3, -2, -1, 0, 1, 2, 3].forEach((z, i) => {
      const r = assess({ sex: "M", birthDate: BIRTH, measuredOn: onAgeMonths(12), weightKg: null, heightCm: [68.6, 71, 73.4, 75.7, 78.1, 80.5, 82.9][i] });
      assert.ok(r.ok);
      if (r.ok) near(r.value.haz, z, 0.12, `HAZ ${z}`);
    });
  });
  it("TB/U perempuan 36 bln (berdiri): 83.6 ≈ -3, 91.2 ≈ -1, 95.1 ≈ 0, 102.7 ≈ +2", () => {
    for (const [h, z] of [[83.6, -3], [91.2, -1], [95.1, 0], [102.7, 2]] as const) {
      const r = assess({ sex: "F", birthDate: BIRTH, measuredOn: onAgeMonths(36), weightKg: null, heightCm: h });
      assert.ok(r.ok);
      if (r.ok) near(r.value.haz, z, 0.12, `HAZ ${h}`);
    }
  });
  it("BB/U laki-laki 6 bln: 5.7 ≈ -3, 7.1 ≈ -1, 7.9 ≈ 0, 9.8 ≈ +2, 10.9 ≈ +3", () => {
    for (const [w, z] of [[5.7, -3], [7.1, -1], [7.9, 0], [9.8, 2], [10.9, 3]] as const) {
      const r = assess({ sex: "M", birthDate: BIRTH, measuredOn: onAgeMonths(6), weightKg: w, heightCm: null });
      assert.ok(r.ok);
      if (r.ok) near(r.value.waz, z, 0.15, `WAZ ${w}`);
    }
  });
  it("BB/PB laki-laki panjang 70 cm (usia <24 bln): 6.6 ≈ -3, 8.4 ≈ 0, 10.9 ≈ +3", () => {
    for (const [w, z] of [[6.6, -3], [8.4, 0], [10.9, 3]] as const) {
      const r = assess({ sex: "M", birthDate: BIRTH, measuredOn: onAgeMonths(10), weightKg: w, heightCm: 70 });
      assert.ok(r.ok);
      if (r.ok) near(r.value.whz, z, 0.15, `WHZ ${w}`);
    }
  });
  it("BB/TB perempuan tinggi 90 cm (usia >=24 bln): 9.8 ≈ -3, 12.6 ≈ 0, 16.8 ≈ +3", () => {
    for (const [w, z] of [[9.8, -3], [12.6, 0], [16.8, 3]] as const) {
      const r = assess({ sex: "F", birthDate: BIRTH, measuredOn: onAgeMonths(30), weightKg: w, heightCm: 90 });
      assert.ok(r.ok);
      if (r.ok) near(r.value.whz, z, 0.15, `WHZ ${w}`);
    }
  });
});

describe("koreksi di luar ±3 SD dan kategori", () => {
  it("BB/U di luar ±3 SD dikoreksi mengikuti rumus WHO (ekstrapolasi SD2-SD3), di dalam ±3 tak berubah", () => {
    const lms = lmsAt(WHO_LMS.wfa.M, 6)!;
    const raw = zScore(14, lms, false)!;
    const adj = zScore(14, lms, true)!;
    assert.ok(raw > 3 && adj > 3 && adj !== raw);
    assert.equal(zScore(8, lms, true), zScore(8, lms, false), "dalam ±3 tak dikoreksi");
    const neg = zScore(4, lms, true)!;
    assert.ok(neg < -3);
  });
  it("TB/U (L=1) memakai rumus polos (y/M - 1)/S", () => {
    const hl = lmsAt(WHO_LMS.lhfaLying.M, 12)!;
    near(zScore(70, hl, false), (70 / hl.M - 1) / hl.S, 1e-9, "L=1");
  });
  it("batas kategori", () => {
    assert.equal(hazCategory(-3.01), "SANGAT_PENDEK");
    assert.equal(hazCategory(-3), "PENDEK");
    assert.equal(hazCategory(-2.01), "PENDEK");
    assert.equal(hazCategory(-2), "NORMAL");
    assert.equal(hazCategory(3), "NORMAL");
    assert.equal(hazCategory(3.01), "TINGGI");
    assert.equal(wazCategory(-2.5), "BB_KURANG");
    assert.equal(wazCategory(1), "NORMAL");
    assert.equal(wazCategory(1.01), "RISIKO_BB_LEBIH");
    for (const [z, c] of [[-3.5, "GIZI_BURUK"], [-2.5, "GIZI_KURANG"], [0, "GIZI_BAIK"], [1.5, "RISIKO_GIZI_LEBIH"], [2.5, "GIZI_LEBIH"], [3.5, "OBESITAS"]] as const) assert.equal(whzCategory(z), c);
  });
});

describe("assess: penjaga masukan", () => {
  const ok = { sex: "F" as const, birthDate: BIRTH, measuredOn: onAgeMonths(18), weightKg: 10, heightCm: 80 };
  it("menolak tanpa jenis kelamin/tanggal lahir/ukuran, lahir setelah ukur, dan di atas 60 bulan", () => {
    assert.ok(!assess({ ...ok, sex: null }).ok);
    assert.ok(!assess({ ...ok, birthDate: null }).ok);
    assert.ok(!assess({ ...ok, weightKg: null, heightCm: null }).ok);
    assert.ok(!assess({ ...ok, measuredOn: new Date(BIRTH.getTime() - 86_400_000) }).ok);
    assert.ok(!assess({ ...ok, measuredOn: onAgeMonths(61) }).ok);
    assert.ok(assess({ ...ok, measuredOn: onAgeMonths(60) }).ok);
  });
  it("hanya berat -> hanya BB/U; hanya tinggi -> hanya TB/U; nol/negatif dianggap belum diukur", () => {
    const w = assess({ ...ok, heightCm: null });
    assert.ok(w.ok && w.value.waz !== null && w.value.haz === null && w.value.whz === null && w.value.stunted === null);
    const h = assess({ ...ok, weightKg: null });
    assert.ok(h.ok && h.value.haz !== null && h.value.waz === null && h.value.whz === null);
    assert.ok(!assess({ ...ok, weightKg: 0, heightCm: -5 }).ok);
  });
  it("tinggi di luar tabel BB/PB tidak melempar galat; z BB/PB kosong", () => {
    const r = assess({ ...ok, heightCm: 130 });
    assert.ok(r.ok && r.value.whz === null);
  });
  it("tanda stunting hanya bila TB/U < -2 SD; salah ukur ditandai tidak wajar", () => {
    const stunted = assess({ ...ok, weightKg: null, heightCm: 72 });
    assert.ok(stunted.ok && stunted.value.stunted === true);
    const normal = assess({ ...ok, weightKg: null, heightCm: 82 });
    assert.ok(normal.ok && normal.value.stunted === false);
    const typo = assess({ ...ok, weightKg: null, heightCm: 8 });
    assert.ok(typo.ok && typo.value.implausible.length === 1);
  });
  it("sexOf dan ageInMonths", () => {
    assert.equal(sexOf("Laki-laki"), "M");
    assert.equal(sexOf("Perempuan"), "F");
    assert.equal(sexOf("L"), "M");
    assert.equal(sexOf(""), null);
    assert.equal(sexOf(null), null);
    near(ageInMonths(new Date("2024-01-01"), new Date("2025-01-01")), 12.02, 0.02, "setahun");
    assert.equal(ageInMonths(new Date("2025-01-01"), new Date("2024-01-01")), null);
  });
});
