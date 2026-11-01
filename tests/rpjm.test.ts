import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addMonthsIso, buildSteps, draftReadyBlockers, legacyPlanEditBlock, perdesBlockers, planFlags, programWarnings, teamWarnings, type FlagInput, type StepInput } from "../lib/rpjm/steps";
import { budgetMatrix } from "../lib/rpjm/calc";
import { FIELD_KEYS, RPJM_RULES, isChangeReason, isFieldCode, isTeamRole } from "../lib/rpjm/catalog";
import { isMethod, isPaguSource } from "../lib/rkpdes/catalog";
import { rpjmCan, rpjmdesAllows } from "../lib/rpjm/http";
import { parsePlanCreate, parsePlanPatch, parseProgramInput, parseReopen, parseTeamInput } from "../lib/rpjm/schema";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";
import { bidangName } from "../lib/apbdes/catalog";

const NOW = new Date("2026-11-01T03:00:00Z");

const stepIn = (o: Partial<StepInput> = {}): StepInput => ({ headInauguratedOn: null, teamFormedAt: null, reviewDoneAt: null, musdesHeldOn: null, draftReadyAt: null, draftApprovedAt: null, draftMeetingHeldOn: null, perdesEnactedOn: null, enactedBeforeApp: false, ...o });
const flagIn = (o: Partial<FlagInput> = {}): FlagInput => ({ periodStart: 2026, periodEnd: 2033, vision: "v", mission: "m", policyDirection: "p", headInauguratedOn: null, perdesEnactedOn: null, locked: false, programs: [], sdgsPlanRecordedAt: "2026-05-01", untouched: false, ...o });

describe("RPJM Desa: tanggal dan tahapan", () => {
  it("tambah bulan: akhir bulan dipangkas ke hari terakhir bulan tujuan, tahun kabisat benar", () => {
    assert.equal(addMonthsIso("2026-11-30", 3), "2027-02-28");
    assert.equal(addMonthsIso("2027-11-30", 3), "2028-02-29");
    assert.equal(addMonthsIso("2026-01-15", 3), "2026-04-15");
    assert.equal(addMonthsIso("2026-11-01", 96), "2034-11-01");
    assert.equal(addMonthsIso("2026-12-31", 2), "2027-02-28");
  });

  it("tujuh tahap berurutan; tenggat Perdes = pelantikan + 3 bulan hanya bila tanggal pelantikan diisi", () => {
    const none = buildSteps(stepIn(), NOW);
    assert.deepEqual(none.map((s) => s.key), ["tim", "pengkajian", "musdes", "rancangan", "disetujui", "pembahasan", "perdes"]);
    assert.equal(none.find((s) => s.key === "perdes")!.due, null);
    assert.equal(none.every((s) => s.state === "open"), true);

    const withDate = buildSteps(stepIn({ headInauguratedOn: "2026-08-15" }), NOW);
    const perdes = withDate.find((s) => s.key === "perdes")!;
    assert.equal(perdes.due, "2026-11-15");
    assert.equal(perdes.state, "soon");
    assert.equal(buildSteps(stepIn({ headInauguratedOn: "2026-07-01" }), NOW).find((s) => s.key === "perdes")!.state, "overdue");
    assert.equal(buildSteps(stepIn({ headInauguratedOn: "2026-10-01" }), NOW).find((s) => s.key === "perdes")!.state, "upcoming");
  });

  it("setelah dibuka untuk perubahan tidak ada tenggat 3 bulan; tenggat lewat tanpa Perdes menjadi bendera yang sama dengan status Terlambat", () => {
    const amend = buildSteps(stepIn({ headInauguratedOn: "2026-01-10", amendment: true }), NOW).find((s) => s.key === "perdes")!;
    assert.equal(amend.due, null);
    assert.notEqual(amend.state, "overdue");
    assert.match(amend.basis, /perubahan/);
    const overdue = buildSteps(stepIn({ headInauguratedOn: "2026-01-10" }), NOW).find((s) => s.key === "perdes")!;
    assert.equal(overdue.state, "overdue");
    const flag = planFlags(flagIn({ perdesOverdueDue: overdue.due }), NOW).find((f) => f.code === "PERDES_OVERDUE")!;
    assert.equal(flag.level, "perlu");
    assert.match(flag.message, /2026-04-10/);
    assert.equal(planFlags(flagIn({ perdesOverdueDue: null }), NOW).some((f) => f.code === "PERDES_OVERDUE"), false);
  });

  it("selesai terlambat dan tak ada tenggat untuk Perdes yang sudah ada sebelum aplikasi", () => {
    const late = buildSteps(stepIn({ headInauguratedOn: "2026-01-10", perdesEnactedOn: "2026-06-01" }), NOW).find((s) => s.key === "perdes")!;
    assert.equal(late.state, "done");
    assert.equal(late.doneLate, true);
    const legacy = buildSteps(stepIn({ headInauguratedOn: "2019-01-10", perdesEnactedOn: "2019-05-01", enactedBeforeApp: true }), NOW).find((s) => s.key === "perdes")!;
    assert.equal(legacy.due, null);
    assert.equal(legacy.doneLate, false);
  });
});

describe("RPJM Desa: gerbang", () => {
  it("rancangan selesai butuh visi, misi, arah kebijakan, dan minimal satu program", () => {
    assert.equal(draftReadyBlockers({ vision: "a", mission: "b", policyDirection: "c", programCount: 1 }).length, 0);
    assert.equal(draftReadyBlockers({ vision: " ", mission: null, policyDirection: "", programCount: 0 }).length, 4);
    assert.equal(draftReadyBlockers({ vision: "a", mission: "b", policyDirection: "c", programCount: 0 }).length, 1);
  });

  it("Perdes butuh rancangan selesai, disetujui Kepala Desa, dan pembahasan terlaksana, kecuali dokumen lama yang dicatat tegas", () => {
    const ok = { draftReadyAt: "2026-09-01", draftApprovedAt: "2026-09-02", draftMeetingHeld: true, enactedBeforeApp: false };
    assert.equal(perdesBlockers(ok).length, 0);
    assert.equal(perdesBlockers({ ...ok, draftReadyAt: null }).length, 1);
    assert.equal(perdesBlockers({ ...ok, draftApprovedAt: null }).length, 1, "tanpa persetujuan Kepala Desa");
    assert.match(perdesBlockers({ ...ok, draftApprovedAt: null })[0], /disetujui Kepala Desa/);
    assert.equal(perdesBlockers({ ...ok, draftMeetingHeld: false }).length, 1);
    assert.equal(perdesBlockers({ draftReadyAt: null, draftApprovedAt: null, draftMeetingHeld: false, enactedBeforeApp: false }).length, 3);
    assert.equal(perdesBlockers({ draftReadyAt: null, draftApprovedAt: null, draftMeetingHeld: false, enactedBeforeApp: true }).length, 0);
  });
});

describe("RPJM Desa: tim, program, dan bendera", () => {
  const team = (n: number, women = 2, extra: { role: string }[] = []) => [
    { role: "PEMBINA", gender: "L" },
    { role: "KETUA", gender: "L" },
    { role: "SEKRETARIS", gender: women > 0 ? "P" : "L" },
    ...Array.from({ length: n - 3 }, (_, i) => ({ role: "ANGGOTA", gender: i < women - 1 ? "P" : "L" })),
    ...extra.map((e) => ({ role: e.role, gender: "L" })),
  ];
  it("tim 7 orang berperan lengkap dengan perempuan cukup: tanpa peringatan", () => {
    assert.deepEqual(teamWarnings(team(7, 3)), []);
  });
  it("peringatan umum (kurang 7, tanpa perempuan, peran) berbeda dari catatan satu sumber berlabel", () => {
    const w = teamWarnings(team(5, 0));
    assert.ok(w.some((x) => x.includes("baru 5 orang")));
    assert.ok(w.some((x) => x.includes("Belum ada perempuan")));
    const big = teamWarnings(team(12, 6));
    assert.ok(big.some((x) => x.startsWith("Catatan satu sumber") && x.includes("paling banyak 11")));
    const even = teamWarnings(team(8, 4));
    assert.ok(even.some((x) => x.includes("ganjil") && x.startsWith("Catatan satu sumber")));
    const lowWomen = teamWarnings(team(9, 1));
    assert.ok(lowWomen.some((x) => x.includes("30%")));
    // dua pembina memicu peringatan peran
    assert.ok(teamWarnings(team(7, 3, [{ role: "PEMBINA" }])).some((x) => x.includes("satu pembina")));
    assert.ok(teamWarnings([]).length >= 4);
  });

  it("kelengkapan program", () => {
    const full = { title: "t", activityCode: "2.1.01", location: "x", outputVolume: "1.00", benefit: "b", budget: "1.00", fundSource: "DD", method: "SWAKELOLA" };
    assert.deepEqual(programWarnings(full), []);
    assert.equal(programWarnings({ ...full, activityCode: null, budget: null }).length, 2);
  });

  it("jangka waktu: 8 tahun bersih; 6 tahun ditandai aturan lama (perlu); lain-lain ditandai; tidak ada yang memblokir", () => {
    assert.equal(planFlags(flagIn(), NOW).filter((f) => f.level === "perlu").length, 0);
    const six = planFlags(flagIn({ periodStart: 2022, periodEnd: 2027 }), NOW);
    assert.equal(six.find((f) => f.code === "TERM_LEGACY")?.level, "perlu");
    assert.match(six.find((f) => f.code === "TERM_LEGACY")!.message, /Belum ditemukan ketentuan peralihan/);
    assert.equal(planFlags(flagIn({ periodStart: 2022, periodEnd: 2030 }), NOW).find((f) => f.code === "TERM_OTHER")?.level, "perlu");
  });

  it("selaras dengan masa jabatan: mismatch hanya catatan (bukan aturan eksplisit); Perdes lewat 3 bulan dicatat", () => {
    const ok = planFlags(flagIn({ headInauguratedOn: "2026-02-01" }), NOW);
    assert.equal(ok.find((f) => f.code === "TENURE_MISMATCH"), undefined);
    const bad = planFlags(flagIn({ headInauguratedOn: "2025-02-01" }), NOW).find((f) => f.code === "TENURE_MISMATCH")!;
    assert.equal(bad.level, "info");
    assert.match(bad.message, /tidak menyatakan keduanya harus identik/);
    assert.ok(planFlags(flagIn({ headInauguratedOn: "2026-01-01", perdesEnactedOn: "2026-05-01" }), NOW).some((f) => f.code === "ENACTED_LATE"));
    assert.equal(planFlags(flagIn({ headInauguratedOn: "2026-01-01", perdesEnactedOn: "2026-04-01" }), NOW).some((f) => f.code === "ENACTED_LATE"), false);
  });

  it("dokumen lama yang belum disentuh tidak dinilai isinya; yang sudah disentuh dinilai", () => {
    const untouched = planFlags(flagIn({ vision: null, mission: null, policyDirection: null, untouched: true }), NOW);
    assert.equal(untouched.some((f) => f.code === "NO_VISION_MISSION" || f.code === "NO_POLICY"), false);
    const touched = planFlags(flagIn({ vision: null, policyDirection: null }), NOW);
    assert.ok(touched.some((f) => f.code === "NO_VISION_MISSION"));
    assert.ok(touched.some((f) => f.code === "NO_POLICY"));
  });

  it("program di luar periode, bidang kosong, tahun tanpa program", () => {
    const f = planFlags(flagIn({ programs: [{ year: 2026, fieldCode: "2" }, { year: 2040, fieldCode: "2" }] }), NOW);
    assert.ok(f.some((x) => x.code === "PROGRAM_OUT_OF_PERIOD" && x.level === "perlu"));
    assert.ok(f.some((x) => x.code === "EMPTY_FIELD"));
    assert.ok(f.some((x) => x.code === "YEAR_WITHOUT_PROGRAM"));
    assert.equal(planFlags(flagIn({ programs: [] }), NOW).some((x) => x.code === "EMPTY_FIELD"), false);
  });

  it("catatan SDGs: tampil bila belum dicatat dan menyebut tenggat sesudah lewat", () => {
    const f = planFlags(flagIn({ sdgsPlanRecordedAt: null }), NOW).find((x) => x.code === "SDGS_NOT_RECORDED")!;
    assert.equal(f.level, "info");
    assert.match(f.message, /2026-12-04/);
    assert.doesNotMatch(f.message, /sudah lewat/);
    assert.match(planFlags(flagIn({ sdgsPlanRecordedAt: null }), new Date("2027-01-05T00:00:00Z")).find((x) => x.code === "SDGS_NOT_RECORDED")!.message, /sudah lewat/);
  });
});

describe("RPJM Desa: katalog dan matriks anggaran", () => {
  it("angka aturan dan bidang sesuai teks resmi", () => {
    assert.equal(RPJM_RULES.termYears, 8);
    assert.equal(RPJM_RULES.perdesMonthsAfterInauguration, 3);
    assert.deepEqual(FIELD_KEYS, ["1", "2", "3", "4"]);
    for (const k of FIELD_KEYS) assert.ok(bidangName(k), `bidang ${k} ada di Permendagri 20/2018`);
  });

  it("matriks per bidang per tahun dalam sen tepat; program di luar periode dihitung terpisah", () => {
    const m = budgetMatrix(
      [
        { year: 2026, fieldCode: "2", budgetCents: 10_000_000_000_000n },
        { year: 2026, fieldCode: "2", budgetCents: 1n },
        { year: 2028, fieldCode: "1", budgetCents: 250n },
        { year: 2028, fieldCode: "4", budgetCents: null },
        { year: 2099, fieldCode: "2", budgetCents: 77n },
        { year: 2027, fieldCode: "9", budgetCents: 5n },
      ],
      2026,
      2033,
    );
    assert.equal(m.years.length, 8);
    assert.equal(m.fields.find((f) => f.code === "2")!.perYear[0], 10_000_000_000_001n);
    assert.equal(m.fields.find((f) => f.code === "1")!.perYear[2], 250n);
    assert.equal(m.total, 10_000_000_000_251n);
    assert.equal(m.yearTotals[0], 10_000_000_000_001n);
    assert.deepEqual(m.outside, { count: 2, total: 82n });
    assert.equal(m.fields.find((f) => f.code === "4")!.count, 1);
  });
});

describe("RPJM Desa: validasi masukan", () => {
  it("buat dokumen: bawaan 8 tahun, periode terbalik/ terlalu panjang/ tahun jahat ditolak", () => {
    const ok = parsePlanCreate({ title: "  RPJM  Desa ", periodStart: 2026 });
    assert.ok(ok.ok && ok.value.periodEnd === 2033 && ok.value.title === "RPJM Desa");
    assert.equal(parsePlanCreate({ title: "x", periodStart: 2026, periodEnd: 2020 }).ok, false);
    assert.equal(parsePlanCreate({ title: "x", periodStart: 2000, periodEnd: 2100 }).ok, false);
    assert.equal(parsePlanCreate({ title: "", periodStart: 2026 }).ok, false);
    assert.equal(parsePlanCreate({ title: "x", periodStart: "2026abc" }).ok, false);
    assert.equal(parsePlanCreate({ title: "x", periodStart: 2026, headInauguratedOn: "2026-02-31" }).ok, false);
    assert.equal(parsePlanCreate({ title: { a: 1 }, periodStart: 2026 }).ok, false);
    assert.equal(parsePlanCreate(null).ok, false);
    assert.equal(parsePlanCreate([]).ok, false);
  });

  it("ubah dokumen: hanya kolom yang dikirim; tanggal, id, panjang, dan tipe diperiksa ketat", () => {
    const p = parsePlanPatch({ vision: "  Visi\nbaris dua ", draftReadyAt: "2026-09-01", musdesMeetingId: "12", legalDocumentId: null });
    assert.ok(p.ok);
    if (p.ok) {
      assert.equal(p.value.vision, "Visi\nbaris dua");
      assert.ok(p.value.draftReadyAt instanceof Date);
      assert.equal(p.value.musdesMeetingId, 12);
      assert.equal(p.value.legalDocumentId, null);
      assert.equal("mission" in p.value, false);
    }
    for (const bad of [{ draftReadyAt: "kemarin" }, { musdesMeetingId: "1; DROP" }, { draftMeetingId: -3 }, { vision: 5 }, { vision: "x".repeat(20001) }, { teamDecreeRef: "x".repeat(151) }, { enactedBeforeApp: "ya" }, { periodStart: 1999 }, { periodStart: 2030, periodEnd: 2026 }, { villageId: 5, legalDocumentId: 1.5 }]) {
      assert.equal(parsePlanPatch(bad).ok, false, JSON.stringify(bad));
    }
    // kolom asing diabaikan, bukan diteruskan ke basis data
    const extra = parsePlanPatch({ villageId: 99, id: 1, reopenCount: 9, vision: "ok" });
    assert.ok(extra.ok);
    if (extra.ok) assert.deepEqual(Object.keys(extra.value), ["vision"]);
  });

  it("program: kode kegiatan harus pada bidang yang sama; angka dan enum ketat", () => {
    const base = { fieldCode: "2", year: 2027, title: "Rabat jalan", activityCode: "2.1.01", budget: "15000000", fundSource: "DD", method: "SWAKELOLA", outputVolume: "120.5" };
    const ok = parseProgramInput(base);
    assert.ok(ok.ok);
    if (ok.ok) {
      assert.equal(ok.value.budgetCents, 1_500_000_000n);
      assert.equal(ok.value.outputVolume, "120.50");
    }
    assert.equal(parseProgramInput({ ...base, activityCode: "1.1.01" }).ok, false, "kegiatan bidang 1 pada bidang 2");
    assert.equal(parseProgramInput({ ...base, fieldCode: "5" }).ok, false);
    assert.equal(parseProgramInput({ ...base, year: 1990 }).ok, false);
    assert.equal(parseProgramInput({ ...base, budget: "-5" }).ok, false);
    assert.equal(parseProgramInput({ ...base, budget: "1e9" }).ok, false);
    assert.equal(parseProgramInput({ ...base, fundSource: "ADA" }).ok, false);
    assert.equal(parseProgramInput({ ...base, method: "X" }).ok, false);
    assert.equal(parseProgramInput({ ...base, outputVolume: "0" }).ok, false);
    assert.equal(parseProgramInput({ ...base, title: "" }).ok, false);
    assert.equal(parseProgramInput({ ...base, title: "x".repeat(256) }).ok, false);
    assert.equal(parseProgramInput({ ...base, activityCode: "2.9.99" }).ok, false, "kode tak ada di katalog");
    assert.ok(parseProgramInput({ fieldCode: "3", year: "2030", title: "Pembinaan" }).ok, "semua kolom pelengkap opsional");
  });

  it("anggota tim dan pembukaan kunci", () => {
    assert.equal(parseTeamInput({ name: "A", role: "BUPATI" }).ok, false);
    assert.equal(parseTeamInput({ role: "ANGGOTA" }).ok, false, "nama atau warga wajib");
    assert.ok(parseTeamInput({ residentId: 4, role: "ANGGOTA" }).ok);
    assert.equal(parseTeamInput({ name: "A", role: "ANGGOTA", gender: "X" }).ok, false);
    assert.equal(parseReopen({ reason: "PERISTIWA_KHUSUS", note: "pendek" }).ok, false);
    assert.equal(parseReopen({ reason: "LAIN", note: "Banjir bandang merusak jalan desa" }).ok, false);
    assert.ok(parseReopen({ reason: "KEBIJAKAN", note: "Perubahan kebijakan kabupaten tentang tata ruang" }).ok);
  });
});

describe("RPJM Desa: rute lama dan izin dua pintu", () => {
  const base = { title: "T", periodStart: 2026, periodEnd: 2033, vision: "v", mission: "m" };
  it("rute lama menolak ubah isi bila terkunci atau sudah disetujui; tanpa perubahan isi (hanya status) tetap boleh", () => {
    assert.equal(legacyPlanEditBlock({ ...base, legalDocumentId: null, draftApprovedAt: null }, { ...base, vision: "baru" }), null);
    assert.match(legacyPlanEditBlock({ ...base, legalDocumentId: 3, draftApprovedAt: null }, { ...base, vision: "baru" })!, /terkunci/);
    assert.match(legacyPlanEditBlock({ ...base, legalDocumentId: null, draftApprovedAt: new Date() }, { ...base, mission: "baru" })!, /sudah disetujui Kepala Desa/);
    assert.match(legacyPlanEditBlock({ ...base, legalDocumentId: null, draftApprovedAt: new Date() }, { ...base, periodEnd: 2040 })!, /sudah disetujui/);
    assert.equal(legacyPlanEditBlock({ ...base, legalDocumentId: 3, draftApprovedAt: new Date() }, { ...base }), null, "tak ada perubahan isi");
    assert.equal(legacyPlanEditBlock({ ...base, vision: null, legalDocumentId: 3, draftApprovedAt: null }, { ...base, vision: null }), null);
  });

  const ctx = (role: string) => ({ dbUser: { role } }) as unknown as import("../lib/api-village-context").VillageApiContext;
  it("izin tulis RPJM baru = irisan perencanaan dan rpjmdes: staf hanya membaca; persetujuan hanya Kepala Desa/admin", () => {
    assert.equal(rpjmdesAllows(ctx("staff"), "read"), true);
    for (const a of ["create", "update", "delete", "approve"] as const) assert.equal(rpjmdesAllows(ctx("staff"), a), false, `staf ${a}`);
    assert.deepEqual(Object.entries(rpjmCan(ctx("staff"))).filter(([, v]) => v).map(([k]) => k), ["read"]);
    assert.equal(rpjmCan(ctx("secretary")).update, true);
    assert.equal(rpjmCan(ctx("secretary")).approve, false);
    assert.equal(rpjmCan(ctx("admin")).approve, true, "admin setara lewat update");
    assert.equal(rpjmCan(ctx("village_head")).approve, true);
    assert.equal(rpjmCan(ctx("village_head")).update, false);
  });

  it("penjaga enum menolak kunci prototipe", () => {
    for (const k of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"]) {
      assert.equal(isFieldCode(k), false, k);
      assert.equal(isTeamRole(k), false, k);
      assert.equal(isChangeReason(k), false, k);
      assert.equal(isPaguSource(k), false, k);
      assert.equal(isMethod(k), false, k);
      assert.equal(parseProgramInput({ fieldCode: "2", year: 2027, title: "x", fundSource: k }).ok, false, `fundSource ${k}`);
      assert.equal(parseProgramInput({ fieldCode: "2", year: 2027, title: "x", method: k }).ok, false, `method ${k}`);
      assert.equal(parseProgramInput({ fieldCode: k, year: 2027, title: "x" }).ok, false, `fieldCode ${k}`);
      assert.equal(parseTeamInput({ name: "A", role: k }).ok, false, `role ${k}`);
      assert.equal(parseReopen({ reason: k, note: "Penjelasan yang cukup panjang" }).ok, false, `reason ${k}`);
    }
    assert.equal(isFieldCode("2"), true);
    assert.equal(isMethod("SWAKELOLA"), true);
  });
});

describe("RPJM Desa: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method)!;
    return roleCan(r.resource, r.action, role);
  };
  it("persetujuan dan buka kunci: hanya admin dan Kepala Desa; tulis biasa mengikuti metode", () => {
    for (const leaf of ["persetujuan", "buka-kunci"]) {
      const p = `/api/perencanaan/rpjm/5/${leaf}`;
      assert.equal(gate(p, "POST", "village_head"), true, leaf);
      assert.equal(gate(p, "POST", "admin"), true, leaf);
      assert.equal(gate(p, "POST", "secretary"), false, leaf);
      assert.equal(gate(p, "POST", "staff"), false, leaf);
    }
    assert.equal(resolveApiPermission("/api/perencanaan/rpjm/5/program", "POST")!.resource, "perencanaan");
    assert.equal(gate("/api/perencanaan/rpjm/5/program", "POST", "village_head"), false);
    assert.equal(gate("/api/perencanaan/rpjm/5", "GET", "village_head"), true);
    assert.equal(gate("/api/perencanaan/rpjm/5/program/9", "DELETE", "staff"), false);
    assert.equal(gate("/api/perencanaan/rpjm/5/program/9", "DELETE", "secretary"), true);
  });
});
