import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ageFlag, ageOn, bmi, elderFlags, expectedDeliveryDate, gestationAt, planProgress, visitFlags } from "../lib/kia/catalog";
import { parseElderInput, parseVisitInput } from "../lib/kia/service";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const NOW = new Date("2026-11-01T03:00:00Z");

describe("usia kehamilan dan HPL", () => {
  it("HPL = HPHT + 280 hari", () => {
    assert.equal(expectedDeliveryDate(d("2026-01-01")).toISOString().slice(0, 10), "2026-10-08");
    assert.equal(expectedDeliveryDate(d("2024-02-29")).toISOString().slice(0, 10), "2024-12-05");
  });
  it("minggu, hari, dan trimester (1: 0-12, 2: 13-24, 3: 25+)", () => {
    const lmp = d("2026-01-01");
    const at = (days: number) => gestationAt(lmp, new Date(lmp.getTime() + days * 86_400_000))!;
    assert.deepEqual(at(0), { weeks: 0, days: 0, trimester: 1 });
    assert.deepEqual(at(90), { weeks: 12, days: 6, trimester: 1 });
    assert.equal(at(91).weeks, 13);
    assert.equal(at(91).trimester, 2);
    assert.equal(at(7 * 24 + 6).trimester, 2);
    assert.equal(at(7 * 25).trimester, 3);
    assert.equal(gestationAt(lmp, d("2025-12-31")), null);
  });
});

describe("kemajuan kunjungan 2-1-3", () => {
  it("trimester yang sudah lewat harus tuntas; trimester berjalan hanya diingatkan bila belum ada kunjungan", () => {
    assert.deepEqual(planProgress([], 1).missing, ["trimester 1 kurang 1"]);
    assert.deepEqual(planProgress([{ trimester: 1, provider: "BIDAN" }], 1).missing, []);
    const p = planProgress([{ trimester: 1, provider: "DOKTER" }], 3);
    assert.deepEqual(p.missing, ["trimester 1 kurang 1", "trimester 2 kurang 1", "trimester 3 kurang 1"]);
    assert.equal(p.doctorTrimester1, true);
    assert.equal(p.doctorTrimester3, false);
    const full = planProgress([1, 1, 2, 3, 3, 3].map((trimester) => ({ trimester, provider: trimester === 1 || trimester === 3 ? "DOKTER" : "BIDAN" })), 3);
    assert.equal(full.total, 6);
    assert.deepEqual(full.missing, []);
  });
});

describe("penanda perlu ditinjau", () => {
  it("batas tepat: 140/90, LiLA 23,5, Hb 11, DJJ 120-160", () => {
    assert.equal(visitFlags({ systolic: 139, diastolic: 89 }).length, 0);
    assert.equal(visitFlags({ systolic: 140, diastolic: 80 }).length, 1);
    assert.equal(visitFlags({ systolic: 120, diastolic: 90 }).length, 1);
    assert.equal(visitFlags({ upperArmCm: 23.5 }).length, 0);
    assert.equal(visitFlags({ upperArmCm: 23.4 }).length, 1);
    assert.equal(visitFlags({ hemoglobin: 11 }).length, 0);
    assert.equal(visitFlags({ hemoglobin: 10.9 }).length, 1);
    assert.equal(visitFlags({ fetalHeartRate: 120 }).length, 0);
    assert.equal(visitFlags({ fetalHeartRate: 160 }).length, 0);
    assert.equal(visitFlags({ fetalHeartRate: 119 }).length, 1);
    assert.equal(visitFlags({ fetalHeartRate: 161 }).length, 1);
  });
  it("tanda bahaya yang dikenal masuk, yang asing diabaikan", () => {
    const f = visitFlags({ dangerSigns: ["PERDARAHAN", "ASING"] });
    assert.equal(f.length, 1);
    assert.match(f[0]!, /Perdarahan/);
  });
  it("umur berisiko: di bawah 20 atau di atas 35", () => {
    assert.equal(ageFlag(19), "Usia di bawah 20 tahun");
    assert.equal(ageFlag(20), null);
    assert.equal(ageFlag(35), null);
    assert.equal(ageFlag(36), "Usia di atas 35 tahun");
    assert.equal(ageOn(d("1990-06-15"), d("2026-06-14")), 35);
    assert.equal(ageOn(d("1990-06-15"), d("2026-06-15")), 36);
  });
  it("lansia: tekanan darah, gula darah puasa dan sewaktu punya batas sendiri; IMT tanpa kategori", () => {
    assert.equal(elderFlags({ glucoseMgDl: 126, glucoseType: "PUASA" }).length, 1);
    assert.equal(elderFlags({ glucoseMgDl: 125, glucoseType: "PUASA" }).length, 0);
    assert.equal(elderFlags({ glucoseMgDl: 199, glucoseType: "SEWAKTU" }).length, 0);
    assert.equal(elderFlags({ glucoseMgDl: 200, glucoseType: "SEWAKTU" }).length, 1);
    assert.equal(elderFlags({ glucoseMgDl: 150, glucoseType: "SEWAKTU" }).length, 0, "angka puasa tak berlaku untuk sewaktu");
    assert.equal(elderFlags({ systolic: 150, diastolic: 80 }).length, 1);
    assert.equal(bmi(60, 160), 23.4);
    assert.equal(bmi(null, 160), null);
  });
});

describe("parseVisitInput", () => {
  const ok = { visitDate: "2026-10-20", provider: "BIDAN" };
  it("kunjungan minimal diterima; tekanan darah harus lengkap dan masuk akal", () => {
    assert.equal(parseVisitInput(ok, NOW).ok, true);
    assert.equal(parseVisitInput({ ...ok, systolic: 120 }, NOW).ok, false);
    assert.equal(parseVisitInput({ ...ok, systolic: 80, diastolic: 90 }, NOW).ok, false);
    assert.equal(parseVisitInput({ ...ok, systolic: 120, diastolic: 80 }, NOW).ok, true);
  });
  it("angka di luar rentang, desimal berlebih, tanggal masa depan, pemeriksa dan tanda bahaya asing ditolak", () => {
    for (const bad of [{ weightKg: 5 }, { weightKg: "60.55" }, { upperArmCm: 99 }, { hemoglobin: 0.5 }, { fetalHeartRate: 20 }, { visitDate: "2026-12-01" }, { provider: "DUKUN" }, { dangerSigns: ["PUSING"] }, { ironTablets: -1 }]) {
      assert.equal(parseVisitInput({ ...ok, ...bad }, NOW).ok, false, JSON.stringify(bad));
    }
    const p = parseVisitInput({ ...ok, weightKg: "58,5", upperArmCm: 24.0, dangerSigns: ["PERDARAHAN", "PERDARAHAN"] }, NOW);
    assert.ok(p.ok && p.value.weightKg === 58.5 && p.value.dangerSigns.length === 1);
  });
});

describe("parseElderInput", () => {
  it("wajib minimal satu hasil; gula darah butuh jenisnya", () => {
    assert.equal(parseElderInput({ checkedAt: "2026-10-20" }, NOW).ok, false);
    assert.equal(parseElderInput({ checkedAt: "2026-10-20", glucoseMgDl: 140 }, NOW).ok, false);
    assert.equal(parseElderInput({ checkedAt: "2026-10-20", glucoseMgDl: 140, glucoseType: "SEWAKTU" }, NOW).ok, true);
    assert.equal(parseElderInput({ checkedAt: "2026-10-20", adlScore: 21 }, NOW).ok, false);
    assert.equal(parseElderInput({ checkedAt: "2026-10-20", adlScore: 20 }, NOW).ok, true);
    assert.equal(parseElderInput({ checkedAt: "2026-12-20", weightKg: 60 }, NOW).ok, false);
  });
});
