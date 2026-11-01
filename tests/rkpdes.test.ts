import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHANGE_REASONS, METHODS, PAGU_SOURCES, TEAM_LIMITS } from "../lib/rkpdes/catalog";
import { parseActivityInput, parseDocumentCreate, parseDocumentPatch, parseIncomingInput, parsePaguInput, parseTeamInput } from "../lib/rkpdes/schema";
import { termInfo } from "../lib/rkpdes/service";
import { activityWarnings, buildSteps, paguWarnings, teamWarnings, type ActivityLite, type StepInput } from "../lib/rkpdes/steps";

const empty = (year = 2027, revision = 0): StepInput => ({ year, revision, musdesHeldOn: null, teamFormedAt: null, paguReceivedAt: null, draftReadyAt: null, draftApprovedAt: null, musrenbangHeldOn: null, perdesEnactedOn: null, usulanSubmittedAt: null });
const byKey = (s: ReturnType<typeof buildSteps>) => Object.fromEntries(s.map((x) => [x.key, x]));

describe("tahapan dan tenggat RKP Desa (Permendagri 114/2014)", () => {
  it("RKP Desa 2027 disusun pada 2026: tenggat Juni, Juli, akhir September, dan 31 Desember", () => {
    const s = byKey(buildSteps(empty(), new Date("2026-05-01T00:00:00Z")));
    assert.equal(s.musdes.due, "2026-06-30");
    assert.equal(s.tim.due, "2026-06-30");
    assert.equal(s.pagu.due, "2026-07-31");
    assert.equal(s.perdes.due, "2026-09-30");
    assert.equal(s.usulan.due, "2026-12-31");
    assert.equal(s.rancangan.due, null);
  });

  it("tenggat yang lewat bertanda terlambat; yang tinggal ≤14 hari bertanda segera; selebihnya akan datang", () => {
    const now = new Date("2026-11-01T05:00:00Z");
    const s = byKey(buildSteps(empty(), now));
    assert.equal(s.perdes.state, "overdue", "30 September sudah lewat");
    assert.equal(s.musdes.state, "overdue");
    assert.equal(s.usulan.state, "upcoming", "60 hari lagi");
    assert.equal(byKey(buildSteps(empty(), new Date("2026-12-20T00:00:00Z"))).usulan.state, "soon");
    assert.equal(s.rancangan.state, "open", "tanpa tenggat baku");
  });

  it("hari tenggat itu sendiri belum terlambat", () => {
    assert.equal(byKey(buildSteps(empty(), new Date("2026-09-30T23:00:00Z"))).perdes.state, "soon");
    assert.equal(byKey(buildSteps(empty(), new Date("2026-10-01T00:00:00Z"))).perdes.state, "overdue");
  });

  it("langkah selesai ditandai, dan selesai setelah tenggat tercatat terlambat", () => {
    const s = byKey(buildSteps({ ...empty(), musdesHeldOn: "2026-06-10", perdesEnactedOn: "2026-10-15" }, new Date("2026-11-01T00:00:00Z")));
    assert.equal(s.musdes.state, "done");
    assert.equal(s.musdes.doneLate, false);
    assert.equal(s.perdes.state, "done");
    assert.equal(s.perdes.doneLate, true);
  });

  it("RKP Desa perubahan hanya tiga langkah dan tanpa tenggat baku (Pasal 49-50)", () => {
    const s = buildSteps(empty(2026, 1), new Date("2026-11-01T00:00:00Z"));
    assert.deepEqual(s.map((x) => x.key), ["rancangan", "musrenbang", "perdes"]);
    assert.ok(s.every((x) => x.due === null));
  });
});

describe("tim penyusun (Pasal 33)", () => {
  const ok = [
    { role: "PEMBINA", gender: "L" },
    { role: "KETUA", gender: "L" },
    { role: "SEKRETARIS", gender: "P" },
    ...Array.from({ length: 4 }, () => ({ role: "ANGGOTA", gender: "L" })),
  ];
  it("tujuh orang dengan satu pembina/ketua/sekretaris dan seorang perempuan: tanpa peringatan", () => {
    assert.equal(ok.length, TEAM_LIMITS.min);
    assert.deepEqual(teamWarnings(ok), []);
  });
  it("kurang dari tujuh, lebih dari sebelas, tanpa perempuan, peran ganda atau kosong", () => {
    assert.ok(teamWarnings(ok.slice(0, 6)).some((w) => w.includes("paling sedikit 7")));
    const many = [...ok, ...Array.from({ length: 5 }, () => ({ role: "ANGGOTA", gender: "P" }))];
    assert.ok(teamWarnings(many).some((w) => w.includes("melebihi batas 11")));
    assert.ok(teamWarnings(ok.map((m) => ({ ...m, gender: "L" }))).some((w) => w.includes("perempuan")));
    assert.ok(teamWarnings([...ok, { role: "KETUA", gender: "L" }]).some((w) => w.includes("satu ketua")));
    assert.ok(teamWarnings([]).length >= 5);
  });
});

describe("kelengkapan kegiatan dan pagu", () => {
  const complete: ActivityLite = {
    title: "Rabat jalan dusun",
    activityCode: "2.1.01",
    fundSource: "DD",
    method: "SWAKELOLA",
    outputName: "Jalan",
    outputVolume: "250.00",
    executorChair: "A",
    executorSecretary: "B",
    executorTreasurer: "C",
    executorHasWoman: true,
    rabVerifiedAt: "2026-10-20",
    estimatedBudget: "100000000.00",
  };
  it("kegiatan lengkap tanpa peringatan", () => assert.deepEqual(activityWarnings(complete), []));
  it("setiap kekurangan muncul sebagai peringatan tersendiri", () => {
    const w = activityWarnings({ ...complete, activityCode: null, fundSource: null, method: null, outputName: null, executorTreasurer: null, rabVerifiedAt: null, estimatedBudget: null });
    assert.equal(w.length, 7);
    assert.ok(activityWarnings({ ...complete, executorHasWoman: false }).some((x) => x.includes("perempuan")));
    assert.ok(activityWarnings({ ...complete, executorHasWoman: null }).some((x) => x.includes("perempuan")));
  });
  it("anggaran per sumber melebihi pagu indikatif dilaporkan", () => {
    const pagu = new Map([["DD" as const, 100n]]);
    const label = (s: string) => s;
    assert.deepEqual(paguWarnings(pagu, new Map([["DD", 100n]]), label), []);
    assert.equal(paguWarnings(pagu, new Map([["DD", 101n]]), label).length, 1);
    assert.equal(paguWarnings(pagu, new Map([["ADD", 1n]]), label).length, 1, "sumber tanpa pagu = pagu 0");
  });
});

describe("jangka waktu RPJM Desa", () => {
  it("8 tahun sesuai aturan; 6 tahun ditandai lama; lainnya ditandai tak lazim", () => {
    assert.deepEqual(termInfo(2026, 2033), { termYears: 8, termNote: null });
    assert.ok(termInfo(2021, 2026).termNote?.includes("6 tahun"));
    assert.ok(termInfo(2026, 2028).termNote?.includes("3 tahun"));
  });
});

describe("validasi isian RKP Desa", () => {
  it("dokumen: tahun sah; perubahan butuh alasan", () => {
    assert.ok(parseDocumentCreate({ year: 2027 }).ok);
    assert.ok(!parseDocumentCreate({ year: 1999 }).ok);
    assert.ok(!parseDocumentCreate({ year: 2027, perubahan: true }).ok);
    const p = parseDocumentCreate({ year: 2027, perubahan: true, changeReason: "KEBIJAKAN" });
    assert.ok(p.ok);
    assert.ok(Object.keys(CHANGE_REASONS).includes("KEBIJAKAN"));
  });
  it("patch hanya memuat kolom yang dikirim dan mengosongkan lewat string kosong", () => {
    const p = parseDocumentPatch({ teamFormedAt: "2026-06-01", teamDecreeRef: "", musdesMeetingId: "7", legalDocumentId: null });
    assert.ok(p.ok);
    if (p.ok) {
      assert.deepEqual(Object.keys(p.value).sort(), ["legalDocumentId", "musdesMeetingId", "teamDecreeRef", "teamFormedAt"]);
      assert.equal(p.value.teamDecreeRef, null);
      assert.equal(p.value.musdesMeetingId, 7);
      assert.equal(p.value.legalDocumentId, null);
    }
    assert.ok(!parseDocumentPatch({ teamFormedAt: "2026-02-31" }).ok);
    assert.ok(!parseDocumentPatch({ musdesMeetingId: "abc" }).ok);
  });
  it("tim, pagu, dan program masuk", () => {
    assert.ok(!parseTeamInput({ role: "KETUA" }).ok);
    assert.ok(parseTeamInput({ name: "Budi", role: "KETUA", gender: "L" }).ok);
    assert.ok(!parseTeamInput({ name: "Budi", role: "BOS" }).ok);
    assert.ok(Object.keys(PAGU_SOURCES).includes("DD"));
    const p = parsePaguInput({ source: "DD", amount: "1500000000.5" });
    assert.ok(p.ok);
    if (p.ok) assert.equal(p.value.amountCents, 150000000050n);
    assert.ok(!parsePaguInput({ source: "XX", amount: 1 }).ok);
    assert.ok(!parsePaguInput({ source: "DD", amount: "1.000.000" }).ok);
    assert.ok(!parseIncomingInput({ level: "PUSAT", name: "" }).ok);
    assert.ok(parseIncomingInput({ level: "KABUPATEN", name: "Perbaikan jalan kabupaten", amount: "500000000" }).ok);
  });
  it("kegiatan: kode kegiatan harus ada di Permendagri 20/2018, volume > 0, anggaran angka rupiah", () => {
    const base = { title: "Rabat jalan", activityCode: "2.1.01", estimatedBudget: "100000000", outputVolume: "250.5", outputUnit: "meter", fundSource: "DD", method: "SWAKELOLA", executorHasWoman: true, proposeToRegency: true };
    const ok = parseActivityInput(base);
    assert.ok(ok.ok);
    if (ok.ok) {
      assert.equal(ok.value.outputVolume, "250.50");
      assert.equal(ok.value.estimatedBudget, "100000000.00");
      assert.equal(ok.value.proposeToRegency, true);
    }
    for (const bad of [{ activityCode: "9.9.99" }, { outputVolume: "0" }, { outputVolume: "-3" }, { estimatedBudget: "1.5jt" }, { fundSource: "X" }, { method: "Y" }, { title: "" }]) {
      assert.ok(!parseActivityInput({ ...base, ...bad }).ok, JSON.stringify(bad));
    }
    assert.ok(Object.keys(METHODS).length === 3);
  });
});
