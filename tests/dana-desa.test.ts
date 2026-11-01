import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeDanaDesa, prohibitionsOf, scanProhibitions, type DdLine } from "../lib/dana-desa/compliance";
import { addMonths, averageOutput, dueState, outputPct, stagePlan } from "../lib/dana-desa/reports";
import { PROHIBITIONS, RULES, rulesFor, suggestFocus, type FocusKey } from "../lib/dana-desa/rules";
import { parseException, parsePublication, parseTag, parseYearSetting } from "../lib/dana-desa/schema";

const R = RULES[2026]!;
const line = (accountCode: string, description: string, amountCents: bigint, activityCode: string | null = "2.3.01"): DdLine => ({ activityCode, accountCode, description, amountCents, fundSource: "DD" });
const keys = (l: DdLine) => prohibitionsOf(l, R).map((h) => `${h.ruleKey}:${h.basis}`);

describe("katalog aturan Dana Desa berversi per tahun", () => {
  it("angka TA 2026 sesuai teks resmi", () => {
    assert.equal(R.bltMaxMonthlyCents, 30_000_000n, "BLT Rp300.000 per bulan (Permendesa 16/2025 Pasal 3)");
    assert.equal(R.bltMaxMonthsAtOnce, 3);
    assert.equal(R.operationalCapBps, 300, "operasional 3% (Pasal 2(3))");
    assert.equal(R.kdmpShareBps, 5803, "KDMP 58,03% (PMK 7/2026 Pasal 15(3))");
    assert.equal(R.officeRehabMaxCents, 2_500_000_000n, "rehab kantor desa Rp25 juta (Lampiran II.J.4)");
    assert.deepEqual(R.stages.regular, [40, 60]);
    assert.deepEqual(R.stages.mandiri, [60, 40], "Desa mandiri kebalikannya (PMK Pasal 23)");
    assert.equal(R.focusReportMonths, 1);
    assert.equal(PROHIBITIONS.length, 8);
  });

  it("tahun tanpa katalog memakai yang terdekat dan ditandai tidak persis", () => {
    assert.equal(rulesFor(2026).exact, true);
    const r27 = rulesFor(2027);
    assert.equal(r27.exact, false);
    assert.equal(r27.rules.year, 2026);
    assert.equal(rulesFor(2020).rules.year, 2026, "sebelum katalog pertama: pakai yang pertama, tetap tidak persis");
    assert.equal(rulesFor(2020).exact, false);
  });

  it("saran fokus dari kode kegiatan hanya untuk kode yang jelas", () => {
    assert.equal(suggestFocus("1.1.01"), "OPERASIONAL");
    assert.equal(suggestFocus("5.3.00"), "IKLIM_BENCANA");
    assert.equal(suggestFocus("2.2.02"), "KESEHATAN");
    assert.equal(suggestFocus("3.1.02"), null);
  });
});

describe("indikasi larangan penggunaan Dana Desa (Lampiran II.J)", () => {
  it("rekening yang pasti dilarang: penghasilan tetap, jaminan sosial aparatur, perjalanan luar kabupaten", () => {
    assert.deepEqual(keys(line("5.1.2.01", "Penghasilan tetap perangkat", 1n)), ["L1:KODE"]);
    assert.deepEqual(keys(line("5.1.4.01", "Tunjangan BPD", 1n)), ["L1:KODE"]);
    assert.deepEqual(keys(line("5.1.3.03", "Jaminan ketenagakerjaan kepala desa", 1n)), ["L3:KODE"]);
    assert.deepEqual(keys(line("5.2.3.02", "Perjalanan dinas", 1n)), ["L2:KODE"]);
  });

  it("kata kunci: bimtek aparatur, studi banding, utang tahun lalu, bantuan hukum, pembangunan balai desa", () => {
    assert.deepEqual(keys(line("5.2.3.03", "Bimtek perangkat desa", 1n)), ["L5:KATA_KUNCI"]);
    assert.deepEqual(keys(line("5.2.3.03", "Studi banding ke kabupaten lain", 1n)), ["L6:KATA_KUNCI"]);
    assert.deepEqual(keys(line("5.2.1.07", "Pembayaran hutang material tahun lalu", 1n)), ["L7:KATA_KUNCI"]);
    assert.deepEqual(keys(line("5.2.1.07", "Bantuan hukum kepala desa", 1n)), ["L8:KATA_KUNCI"]);
    assert.deepEqual(keys(line("5.3.1.01", "Pembangunan balai desa baru", 1n)), ["L4:KATA_KUNCI"]);
  });

  it("rehabilitasi kantor desa hanya ditandai bila di atas Rp25 juta", () => {
    assert.deepEqual(keys(line("5.3.1.01", "Rehab kantor desa", 2_500_000_000n)), [], "tepat Rp25 juta masih boleh");
    assert.deepEqual(keys(line("5.3.1.01", "Rehab kantor desa", 2_500_000_001n)), ["L4:KATA_KUNCI"]);
  });

  it("tidak salah menandai kegiatan yang sah", () => {
    assert.deepEqual(keys(line("5.2.3.03", "Pelatihan budidaya ikan untuk kelompok tani", 1n)), [], "pelatihan masyarakat boleh");
    assert.deepEqual(keys(line("5.2.2.03", "Honor pelatih posyandu", 1n)), [], "honor selain aparatur tidak ditandai");
    assert.deepEqual(keys(line("5.2.1.07", "Material jalan rabat beton", 1n)), []);
    assert.deepEqual(keys(line("5.2.3.01", "Jaminan sosial ketenagakerjaan pekerja padat karya", 1n)), [], "jaminan pekerja PKTD diperbolehkan (Lampiran II.F.7)");
  });

  it("pengecualian beralasan menggugurkan peringatan tetapi tetap tercatat pada hasil", () => {
    const l = line("5.2.3.02", "Perjalanan dinas", 100n);
    const hits = scanProhibitions([l], R, new Map([["L2|2.3.01|5.2.3.02", "Undangan resmi kementerian"]]));
    assert.equal(hits[0]!.exceptionReason, "Undangan resmi kementerian");
    const a = analyzeDanaDesa({ rules: R, regularCents: 10_000n, kdmpCents: null, lines: [l], tags: new Map(), exceptions: new Map([["L2|2.3.01|5.2.3.02", "x"]]), docVersion: 0 });
    assert.equal(a.findings.some((f) => f.code.startsWith("PROHIBITED")), false);
  });
});

describe("analisis kepatuhan Dana Desa", () => {
  const tags = (o: Record<string, FocusKey>) => new Map(Object.entries(o));
  const base = { rules: R, kdmpCents: null as bigint | null, exceptions: new Map<string, string>(), docVersion: 0 };
  const codes = (a: ReturnType<typeof analyzeDanaDesa>) => a.findings.map((f) => f.code).sort();

  it("operasional di atas 3% pagu reguler = galat; tepat 3% = lolos", () => {
    const over = analyzeDanaDesa({ ...base, regularCents: 100_000_000n, lines: [line("5.2.5.01", "Listrik kantor", 3_000_001n, "1.2.03")], tags: tags({ "1.2.03": "OPERASIONAL" }) });
    assert.equal(over.operationalCapCents, 3_000_000n);
    assert.ok(codes(over).includes("OPS_OVER"));
    const edge = analyzeDanaDesa({ ...base, regularCents: 100_000_000n, lines: [line("5.2.5.01", "Listrik kantor", 3_000_000n, "1.2.03")], tags: tags({ "1.2.03": "OPERASIONAL" }) });
    assert.equal(codes(edge).includes("OPS_OVER"), false);
    assert.equal(edge.operationalBps, 300);
  });

  it("tanpa pagu: pemeriksaan batas ditunda dengan keterangan, bukan lolos diam-diam", () => {
    const a = analyzeDanaDesa({ ...base, regularCents: null, lines: [line("5.2.5.01", "Listrik", 500n, "1.2.03")], tags: tags({ "1.2.03": "OPERASIONAL" }) });
    assert.deepEqual(codes(a), ["NO_CEILING", "OPS_NO_CEILING"]);
    assert.equal(a.operationalCapCents, null);
  });

  it("KDMP dibandingkan dengan pagu KDMP sendiri, tidak mengurangi pagu reguler", () => {
    const lines = [line("5.3.1.01", "Angsuran gerai KDMP", 6_000n, "4.1.01"), line("5.3.1.02", "Rabat jalan", 90_000n)];
    const ok = analyzeDanaDesa({ ...base, regularCents: 90_000n, kdmpCents: 6_000n, lines, tags: tags({ "4.1.01": "KDMP", "2.3.01": "PADAT_KARYA" }), docVersion: 1 });
    assert.equal(ok.nonKdmpCents, 90_000n);
    assert.equal(ok.kdmpBudgetCents, 6_000n);
    assert.deepEqual(codes(ok), []);
    const over = analyzeDanaDesa({ ...base, regularCents: 80_000n, kdmpCents: 5_000n, lines, tags: tags({ "4.1.01": "KDMP", "2.3.01": "PADAT_KARYA" }), docVersion: 1 });
    assert.deepEqual(codes(over), ["OVER_KDMP", "OVER_REGULAR"]);
  });

  it("KDMP: belum dianggarkan memperingatkan; di APB Desa awal diberi catatan perubahan APB Desa", () => {
    const none = analyzeDanaDesa({ ...base, regularCents: 10_000n, kdmpCents: 5_000n, lines: [line("5.2.1.07", "Material", 1_000n)], tags: tags({ "2.3.01": "PADAT_KARYA" }) });
    assert.ok(codes(none).includes("KDMP_NOT_BUDGETED"));
    const inBase = analyzeDanaDesa({ ...base, regularCents: 10_000n, kdmpCents: 5_000n, lines: [line("5.3.1.01", "Angsuran", 5_000n, "4.1.01")], tags: tags({ "4.1.01": "KDMP" }), docVersion: 0 });
    assert.ok(codes(inBase).includes("KDMP_IN_BASE"));
    assert.equal(codes(analyzeDanaDesa({ ...base, regularCents: 10_000n, kdmpCents: 5_000n, lines: [line("5.3.1.01", "Angsuran", 5_000n, "4.1.01")], tags: tags({ "4.1.01": "KDMP" }), docVersion: 1 })).includes("KDMP_IN_BASE"), false);
  });

  it("kegiatan belum bertanda dilaporkan beserta sarannya; sebaran per fokus menjumlah ke total belanja", () => {
    const a = analyzeDanaDesa({ ...base, regularCents: 1_000_000n, lines: [line("5.2.1.07", "Material", 600n, "2.3.01"), line("5.2.1.10", "Obat", 400n, "2.2.02")], tags: tags({ "2.3.01": "PADAT_KARYA" }) });
    assert.deepEqual(a.untagged.map((u) => [u.activityCode, u.suggestion]), [["2.2.02", "KESEHATAN"]]);
    assert.equal(a.byFocus.find((f) => f.focus === "PADAT_KARYA")!.shareBps, 6000);
    assert.ok(codes(a).includes("UNTAGGED"));
    assert.equal(a.byFocus.reduce((s, f) => s + f.budgetCents, 0n) + a.untagged.reduce((s, u) => s + u.budgetCents, 0n), a.spendCents);
  });

  it("pengeluaran pembiayaan DD dihitung dalam total tetapi tidak dalam sebaran belanja", () => {
    const a = analyzeDanaDesa({ ...base, regularCents: 10_000n, lines: [line("5.2.1.07", "Material", 600n), { activityCode: null, accountCode: "6.2.1.01", description: "Penyertaan modal BUMDes", amountCents: 400n, fundSource: "DD" }], tags: tags({ "2.3.01": "PADAT_KARYA" }) });
    assert.equal(a.spendCents, 600n);
    assert.equal(a.financingCents, 400n);
    assert.equal(a.totalCents, 1000n);
  });
});

describe("penyaluran, tenggat, dan capaian keluaran", () => {
  it("tahap 40/60; Desa mandiri 60/40; jumlah selalu sama dengan pagu (tanpa sisa pembulatan)", () => {
    const s = stagePlan(R, 100_000_001n, false)!;
    assert.deepEqual(s.map((x) => x.pct), [40, 60]);
    assert.equal(s[0]!.cents + s[1]!.cents, 100_000_001n);
    assert.deepEqual(stagePlan(R, 1_000n, true)!.map((x) => [x.pct, x.cents]), [[60, 600n], [40, 400n]]);
    assert.equal(stagePlan(R, null, false), null);
  });

  it("tambah bulan memangkas ke akhir bulan tujuan dan melewati pergantian tahun", () => {
    assert.equal(addMonths("2026-09-30", 1), "2026-10-30");
    assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
    assert.equal(addMonths("2026-12-15", 1), "2027-01-15");
  });

  it("status tenggat: selesai, terlambat, segera, akan datang, tanpa tenggat", () => {
    assert.equal(dueState("2026-10-30", "2026-10-01", "2026-11-01"), "done");
    assert.equal(dueState("2026-10-30", null, "2026-11-01"), "overdue");
    assert.equal(dueState("2026-11-10", null, "2026-11-01"), "soon");
    assert.equal(dueState("2026-12-30", null, "2026-11-01"), "upcoming");
    assert.equal(dueState(null, null, "2026-11-01"), "open");
  });

  it("capaian keluaran: rata-rata seluruh kegiatan, yang belum diisi dihitung 0% dan dilaporkan", () => {
    assert.equal(outputPct(250, 125), 50);
    assert.equal(outputPct(null, 5), null);
    assert.equal(outputPct(0, 5), null);
    const rows = [
      { activityCode: "a", outputName: "x", volume: 100, unit: "m", realized: 100, pct: 100 },
      { activityCode: "b", outputName: "y", volume: 10, unit: "m", realized: 5, pct: 50 },
      { activityCode: "c", outputName: null, volume: null, unit: null, realized: null, pct: null },
    ];
    const avg = averageOutput(rows);
    assert.equal(avg.averagePct, 50);
    assert.deepEqual([avg.filled, avg.missing], [2, 1]);
    assert.equal(averageOutput([]).averagePct, null);
  });
});

describe("validasi isian Dana Desa", () => {
  it("pagu dan tanggal: hanya kolom yang dikirim yang diubah; nilai ngawur ditolak", () => {
    const ok = parseYearSetting({ regular: "1500000000", isMandiri: true, focusReportedOn: "2026-10-15" });
    assert.ok(ok.ok && ok.value.regularCents === 150_000_000_000n && ok.value.isMandiri === true && !("kdmpCents" in ok.value));
    assert.ok(parseYearSetting({ regular: "" }).ok, "kosong = hapus pagu");
    assert.equal(parseYearSetting({ regular: "abc" }).ok, false);
    assert.equal(parseYearSetting({ focusReportedOn: "2026-02-30" }).ok, false);
    assert.equal(parseYearSetting({ isMandiri: "ya" }).ok, false);
    assert.equal(parseYearSetting(null).ok, false);
  });

  it("penandaan fokus, pengecualian (alasan ≥15 huruf), dan publikasi", () => {
    assert.ok(parseTag({ activityCode: "2.3.01", focus: "PADAT_KARYA" }).ok);
    assert.equal(parseTag({ activityCode: "9.9.99", focus: "PADAT_KARYA" }).ok, false);
    assert.equal(parseTag({ activityCode: "2.3.01", focus: "NGAWUR" }).ok, false);
    assert.ok(parseException({ ruleKey: "L2", activityCode: "2.3.01", accountCode: "5.2.3.02", reason: "Undangan resmi dari kementerian" }).ok);
    assert.equal(parseException({ ruleKey: "L2", activityCode: "2.3.01", accountCode: "5.2.3.02", reason: "singkat" }).ok, false);
    assert.equal(parseException({ ruleKey: "L9", activityCode: "2.3.01", accountCode: "5.2.3.02", reason: "Undangan resmi dari kementerian" }).ok, false);
    assert.equal(parseException({ ruleKey: "L2", activityCode: "2.3.01", accountCode: "'; DROP", reason: "Undangan resmi dari kementerian" }).ok, false);
    assert.ok(parsePublication({ channel: "BALIHO", publishedOn: "2026-10-01", location: "Depan balai desa" }).ok);
    assert.equal(parsePublication({ channel: "TV", publishedOn: "2026-10-01" }).ok, false);
    assert.equal(parsePublication({ channel: "BALIHO", publishedOn: "kemarin" }).ok, false);
  });
});
