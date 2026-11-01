import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SCHEDULE, VACCINE_CODES } from "../lib/gizi/immunization-catalog";
import { doseStatuses } from "../lib/gizi/immunization";

const D = (s: string) => new Date(`${s}T00:00:00Z`);

describe("jadwal imunisasi", () => {
  it("kode unik, usia anjuran tidak turun, dan dosis berurutan dalam satu jenis", () => {
    assert.equal(VACCINE_CODES.size, SCHEDULE.length);
    for (let i = 1; i < SCHEDULE.length; i++) assert.ok(SCHEDULE[i].dueMonths >= SCHEDULE[i - 1].dueMonths, SCHEDULE[i].code);
    const due = (c: string) => SCHEDULE.find((v) => v.code === c)!.dueMonths;
    for (const [a, b] of [["DPT1", "DPT2"], ["DPT2", "DPT3"], ["OPV1", "OPV2"], ["OPV3", "OPV4"], ["PCV1", "PCV2"], ["PCV2", "PCV3"], ["RV1", "RV2"], ["RV2", "RV3"], ["MR1", "MR2"], ["IPV1", "IPV2"]]) assert.ok(due(a) <= due(b), `${a} <= ${b}`);
  });
  it("sesuai jadwal Kemenkes: HB0/BCG/OPV1 saat lahir, MR1 dan IPV2 pada 9 bulan, MR2 pada 18 bulan", () => {
    const due = Object.fromEntries(SCHEDULE.map((v) => [v.code, v.dueMonths]));
    assert.deepEqual([due.HB0, due.BCG, due.OPV1], [0, 0, 0]);
    assert.deepEqual([due.DPT1, due.PCV1, due.RV1], [2, 2, 2]);
    assert.deepEqual([due.MR1, due.IPV2], [9, 9]);
    assert.equal(due.MR2, 18);
  });
});

describe("doseStatuses", () => {
  const birth = D("2026-01-01");
  it("bayi baru lahir: dosis saat lahir sudah waktunya, sisanya belum", () => {
    const s = doseStatuses(birth, new Map(), D("2026-01-05"));
    const by = Object.fromEntries(s.map((x) => [x.code, x.state]));
    assert.deepEqual([by.HB0, by.BCG, by.OPV1], ["WAKTUNYA", "WAKTUNYA", "WAKTUNYA"]);
    assert.equal(by.DPT1, "BELUM_WAKTUNYA");
  });
  it("yang sudah diberikan tetap DIBERIKAN sekalipun belum waktunya (diberikan lebih awal)", () => {
    const s = doseStatuses(birth, new Map([["DPT1", D("2026-01-20")]]), D("2026-01-25"));
    assert.equal(s.find((x) => x.code === "DPT1")?.state, "DIBERIKAN");
    assert.equal(s.find((x) => x.code === "DPT1")?.givenAt, "2026-01-20");
  });
  it("usia 5 bulan: dosis sampai 4 bulan waktunya, MR1 (9 bln) belum", () => {
    const s = doseStatuses(birth, new Map(), D("2026-06-10"));
    const pending = s.filter((x) => x.state === "WAKTUNYA").map((x) => x.code);
    assert.ok(pending.includes("DPT3") && pending.includes("RV3") && pending.includes("IPV1"));
    assert.ok(!pending.includes("MR1"));
  });
  it("anak 24 bulan tanpa catatan: semua dosis jadwal sudah waktunya", () => {
    const s = doseStatuses(birth, new Map(), D("2028-01-02"));
    assert.ok(s.every((x) => x.state === "WAKTUNYA"));
  });
});
