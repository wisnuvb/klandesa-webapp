import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFormationInput, serializeFormation, STEPS } from "../lib/coop/formation";

const NOW = new Date("2026-11-01T03:00:00Z");

describe("pelacak pembentukan Kopdes", () => {
  it("semua kolom boleh kosong (diisi bertahap)", () => {
    const r = parseFormationInput({}, NOW);
    assert.ok(r.ok);
    if (r.ok) assert.ok(Object.values(r.value).every((v) => v === null));
  });
  it("urutan proses: akta setelah musdesus, SK dan penyampaian setelah akta, NPWP setelah SK", () => {
    assert.ok(parseFormationInput({ musdesusAt: "2026-03-01", deedDate: "2026-03-10", skDate: "2026-04-01", submittedToRegencyAt: "2026-03-20", npwpAt: "2026-04-05" }, NOW).ok);
    for (const [bad, key] of [
      [{ musdesusAt: "2026-03-10", deedDate: "2026-03-01" }, "deedDate"],
      [{ deedDate: "2026-03-10", skDate: "2026-03-01" }, "skDate"],
      [{ deedDate: "2026-03-10", submittedToRegencyAt: "2026-03-01" }, "submittedToRegencyAt"],
      [{ skDate: "2026-04-10", npwpAt: "2026-04-01" }, "npwpAt"],
    ] as const) {
      const r = parseFormationInput(bad, NOW);
      assert.ok(!r.ok, key);
      if (!r.ok) assert.ok(r.fieldErrors[key], key);
    }
  });
  it("tanggal masa depan, tanggal fiktif, dan nilai negatif ditolak; nilai disimpan dua desimal", () => {
    assert.ok(!parseFormationInput({ musdesusAt: "2027-01-01" }, NOW).ok);
    assert.ok(!parseFormationInput({ deedDate: "2026-02-30" }, NOW).ok);
    assert.ok(!parseFormationInput({ commitmentAmount: -5 }, NOW).ok);
    assert.ok(!parseFormationInput({ commitmentAmount: "1e9" }, NOW).ok);
    const r = parseFormationInput({ commitmentAmount: "250000000" }, NOW);
    assert.ok(r.ok && r.value.commitmentAmount === "250000000.00");
  });
  it("teks dirapikan dan dibatasi; bukan objek ditolak", () => {
    const r = parseFormationInput({ musdesusRef: "  BA   01/2026 " }, NOW);
    assert.ok(r.ok && r.value.musdesusRef === "BA 01/2026");
    assert.ok(!parseFormationInput({ notes: "x".repeat(1001) }, NOW).ok);
    assert.ok(!parseFormationInput(null, NOW).ok);
  });
  it("langkah dianggap selesai hanya bila isian kuncinya lengkap", () => {
    const empty = serializeFormation(null);
    assert.equal(empty.steps.length, STEPS.length);
    assert.ok(empty.steps.every((s) => !s.done));
    const row = { musdesusAt: new Date("2026-03-01"), musdesusRef: null, deedNumber: "03", deedDate: new Date("2026-03-10"), skNumber: null, skDate: new Date("2026-04-01") } as never;
    const v = serializeFormation(row);
    const done = Object.fromEntries(v.steps.map((s) => [s.key, s.done]));
    assert.equal(done.musdesus, false, "tanggal tanpa nomor BA belum cukup");
    assert.equal(done.akta, true);
    assert.equal(done.sk, false, "tanggal tanpa nomor SK belum cukup");
  });
});
