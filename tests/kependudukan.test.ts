import { test } from "node:test";
import assert from "node:assert/strict";
import { planHouseholdBackfill, normalizeKk, sameRtRw, KK_HEAD_ROLE, type ResidentLite } from "../lib/kependudukan/household";
import { planWilayahBackfill, canonicalWilayahToken } from "../lib/kependudukan/wilayah";
import { validateMutation, planMutationEffect, detectLegacyEditMutations, type MutationInput, type MutationResidentRef } from "../lib/kependudukan/mutation";
import { summarizeByMonth, summarizeByRtRw, netPopulationChange } from "../lib/kependudukan/report";

const KK1 = "3508010101010001";
const KK2 = "3508010101010002";

const res = (id: number, over: Partial<ResidentLite> = {}): ResidentLite => ({
  id, kk: KK1, familyRole: "Anak", isAlive: true, moveDate: null, rt: "01", rw: "01", hamlet: "Mawar", address: `Jl. ${id}`, birthDate: new Date("1990-01-01"), ...over,
});

// ------------------------------------------------------------------ KK
test("normalizeKk hanya menerima tepat 16 digit", () => {
  assert.equal(normalizeKk("3508 0101 0101 0001"), KK1);
  assert.equal(normalizeKk("123"), null);
  assert.equal(normalizeKk(null), null);
  assert.equal(normalizeKk("35080101010100012"), null);
});

test("backfill membentuk satu rumah tangga per KK dengan kepala dan alamat dari kepala", () => {
  const plan = planHouseholdBackfill([
    res(1, { familyRole: KK_HEAD_ROLE, address: "Jl. Kepala" }),
    res(2, { familyRole: "Istri" }),
    res(3, { kk: KK2, familyRole: KK_HEAD_ROLE }),
  ]);
  assert.equal(plan.households.length, 2);
  const h1 = plan.households.find((h) => h.kk === KK1)!;
  assert.deepEqual(h1.memberIds, [1, 2]);
  assert.equal(h1.headId, 1);
  assert.equal(h1.address, "Jl. Kepala");
  assert.deepEqual(plan.anomalies, []);
});

test("backfill tidak bergantung pada urutan input dan idempotent", () => {
  const rows = [res(3, { kk: KK2, familyRole: KK_HEAD_ROLE }), res(2, { familyRole: "Istri" }), res(1, { familyRole: KK_HEAD_ROLE })];
  const a = planHouseholdBackfill(rows);
  const b = planHouseholdBackfill([...rows].reverse());
  assert.deepEqual(a, b);
});

test("backfill melaporkan KK tanpa kepala, dua kepala, dan kepala yang sudah meninggal", () => {
  const plan = planHouseholdBackfill([
    res(1, { kk: KK1 }), // tanpa kepala
    res(2, { kk: KK2, familyRole: KK_HEAD_ROLE }),
    res(3, { kk: KK2, familyRole: KK_HEAD_ROLE }), // dua kepala
    res(4, { kk: "3508010101010003", familyRole: KK_HEAD_ROLE, isAlive: false }),
    res(5, { kk: "3508010101010003", familyRole: "Anak" }), // kepala meninggal, anggota aktif
  ]);
  const codes = plan.anomalies.map((a) => `${a.code}:${a.kk}`).sort();
  assert.deepEqual(codes, [`HEAD_NOT_ACTIVE:3508010101010003`, `MULTIPLE_HEADS:${KK2}`, `NO_HEAD:${KK1}`]);
  assert.equal(plan.households.find((h) => h.kk === KK2)!.headId, null);
});

test("KK yang seluruh anggotanya sudah meninggal/pindah bukan anomali", () => {
  const plan = planHouseholdBackfill([res(1, { familyRole: KK_HEAD_ROLE, isAlive: false }), res(2, { moveDate: new Date("2026-01-01") })]);
  assert.deepEqual(plan.anomalies, []);
});

test("backfill memisahkan warga tanpa KK atau KK tidak valid dan menandai KK lintas RT", () => {
  const plan = planHouseholdBackfill([
    res(1, { kk: null }),
    res(2, { kk: "12345" }),
    res(3, { familyRole: KK_HEAD_ROLE, rt: "01" }),
    res(4, { rt: "02" }),
    res(5, { rt: "1" }), // "1" sama dengan "01"
  ]);
  assert.deepEqual(plan.unassignedIds, [1, 2]);
  const codes = plan.anomalies.map((a) => a.code).sort();
  assert.deepEqual(codes, ["INVALID_KK", "MISSING_KK", "SPLIT_ACROSS_RT"]);
});

test("sameRtRw menganggap 01, 1, dan 001 sama", () => {
  assert.ok(sameRtRw("01", "1"));
  assert.ok(sameRtRw("001", "1"));
  assert.ok(!sameRtRw("01", "2"));
  assert.ok(sameRtRw(" a ", "A"));
});

// ------------------------------------------------------------------ Wilayah
test("canonicalWilayahToken menyatukan 01/1/001 dan huruf besar-kecil", () => {
  assert.equal(canonicalWilayahToken("001"), "1");
  assert.equal(canonicalWilayahToken(" Mawar  "), "MAWAR");
  assert.equal(canonicalWilayahToken(""), null);
});

test("wilayah: dusun dan RW saling silang; RT di bawah RW; varian digabung", () => {
  const plan = planWilayahBackfill([
    { id: 1, hamlet: "Mawar", rw: "01", rt: "01" },
    { id: 2, hamlet: "mawar", rw: "1", rt: "1" },
    { id: 3, hamlet: "Melati", rw: "01", rt: "02" }, // RW 01 yang sama membentang ke dusun lain
    { id: 4, hamlet: null, rw: null, rt: null },
    { id: 5, hamlet: null, rw: "02", rt: "03" },
  ]);
  assert.deepEqual(plan.unassignedIds, [4]);
  const byKey = new Map(plan.units.map((u) => [u.key, u]));

  // RW 01 hanya SATU unit walau dipakai dua dusun.
  assert.equal(plan.units.filter((u) => u.type === "rw").length, 2);
  assert.equal(byKey.get("rw:1")!.parentKey, null);
  assert.equal(byKey.get("rt:1|1")!.parentKey, "rw:1");
  assert.equal(byKey.get("rt:1|1")!.residentCount, 2);
  assert.equal(byKey.get("rt:1|1")!.variants.length, 1);
  assert.equal(byKey.get("dusun:MAWAR")!.parentKey, null);
  assert.equal(byKey.get("dusun:MAWAR")!.residentCount, 2);

  assert.deepEqual(plan.placement.get(1), { dusunKey: "dusun:MAWAR", areaKey: "rt:1|1" });
  assert.deepEqual(plan.placement.get(2), { dusunKey: "dusun:MAWAR", areaKey: "rt:1|1" });
  assert.deepEqual(plan.placement.get(3), { dusunKey: "dusun:MELATI", areaKey: "rt:1|2" });
  assert.deepEqual(plan.placement.get(5), { dusunKey: null, areaKey: "rt:2|3" });
  assert.equal(plan.placement.has(4), false);
});

test("wilayah: warga hanya berdusun atau hanya ber-RW tetap ditempatkan", () => {
  const plan = planWilayahBackfill([
    { id: 1, hamlet: "Melati", rw: null, rt: null },
    { id: 2, hamlet: null, rw: "03", rt: null },
  ]);
  assert.deepEqual(plan.placement.get(1), { dusunKey: "dusun:MELATI", areaKey: null });
  assert.deepEqual(plan.placement.get(2), { dusunKey: null, areaKey: "rw:3" });
});

test("wilayah: RT bernomor desa-lebar tetap terpisah per RW", () => {
  const plan = planWilayahBackfill([
    { id: 1, hamlet: null, rw: "01", rt: "05" },
    { id: 2, hamlet: null, rw: "02", rt: "05" },
  ]);
  assert.equal(plan.units.filter((u) => u.type === "rt").length, 2);
});

// ------------------------------------------------------------------ Mutasi
const NOW = new Date("2026-10-31T12:00:00Z");
const alive: MutationResidentRef = { id: 1, isAlive: true, moveDate: null, birthDate: new Date("1980-05-05"), kk: KK1, familyRole: KK_HEAD_ROLE };

const death = (date: string): MutationInput => ({ type: "DEATH", effectiveDate: date, residentId: 1, details: {} });

test("kematian: valid, efeknya isAlive=false + deathDate + nonaktifkan akun + butuh kepala baru", () => {
  assert.deepEqual(validateMutation(death("2026-10-01"), alive, NOW), { ok: true });
  const e = planMutationEffect(death("2026-10-01"), alive);
  assert.equal(e.update?.isAlive, false);
  assert.equal(e.update?.deathDate?.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(e.suspendAccount, true);
  assert.equal(e.householdNeedsNewHead, true);
});

test("kematian ditolak: tanggal masa depan, sebelum lahir, sudah meninggal, sudah pindah, warga tak ada", () => {
  const err = (r: ReturnType<typeof validateMutation>) => (r.ok ? [] : r.errors);
  assert.match(err(validateMutation(death("2026-12-01"), alive, NOW))[0], /masa depan/);
  assert.match(err(validateMutation(death("1970-01-01"), alive, NOW))[0], /sebelum tanggal lahir/);
  assert.match(err(validateMutation(death("2026-10-01"), { ...alive, isAlive: false }, NOW))[0], /sudah tercatat meninggal/);
  assert.match(err(validateMutation(death("2026-10-01"), { ...alive, moveDate: new Date("2026-01-01") }, NOW))[0], /pindah/);
  assert.match(err(validateMutation(death("2026-10-01"), null, NOW))[0], /tidak ditemukan/);
  assert.match(err(validateMutation(death("2026-02-31"), alive, NOW))[0], /tidak valid/);
});

test("pindah keluar butuh tujuan; efek moveDate dan nonaktifkan akun", () => {
  const input: MutationInput = { type: "MOVE_OUT", effectiveDate: "2026-09-01", residentId: 1, details: {} };
  const bad = validateMutation(input, alive, NOW);
  assert.equal(bad.ok, false);
  const ok: MutationInput = { ...input, details: { destination: "Desa Lain, Kab. Jember" } };
  assert.deepEqual(validateMutation(ok, alive, NOW), { ok: true });
  const e = planMutationEffect(ok, alive);
  assert.equal(e.update?.moveDate?.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(e.suspendAccount, true);
});

test("kelahiran: boleh diajukan tanpa NIK, tidak boleh diterapkan tanpa NIK; wajib tautan KK/ibu", () => {
  const birth: MutationInput = {
    type: "BIRTH", effectiveDate: "2026-10-10", residentId: null,
    details: { newResident: { name: "Bayi A", gender: "Perempuan", birthplace: "Lumajang", kk: KK1, motherNik: "3508014505900001" } },
  };
  assert.deepEqual(validateMutation(birth, null, NOW, "submit"), { ok: true });
  const apply = validateMutation(birth, null, NOW, "apply");
  assert.equal(apply.ok, false);
  assert.ok(!apply.ok && apply.errors.some((m) => /NIK/.test(m)));

  const withNik: MutationInput = { ...birth, details: { newResident: { ...birth.details.newResident, nik: "3508015010260001" } } };
  assert.deepEqual(validateMutation(withNik, null, NOW, "apply"), { ok: true });
  const e = planMutationEffect(withNik, null);
  assert.equal(e.create?.familyRole, "Anak");
  assert.equal(e.create?.isAlive, true);
  assert.equal(e.create?.kk, KK1);
  assert.equal(e.create?.birthDate, "2026-10-10");

  const noLink: MutationInput = { ...birth, details: { newResident: { name: "Bayi A", gender: "Perempuan", birthplace: "Lumajang" } } };
  const r = validateMutation(noLink, null, NOW, "submit");
  assert.ok(!r.ok && r.errors.some((m) => /KK atau NIK ibu/.test(m)));
});

test("kelahiran: NIK harus cocok dengan tanggal lahir dan jenis kelamin", () => {
  const birth: MutationInput = {
    type: "BIRTH", effectiveDate: "2026-10-10", residentId: null,
    details: { newResident: { name: "Bayi", gender: "Laki-laki", birthplace: "X", kk: KK1, nik: "3508015010260001" } }, // NIK perempuan
  };
  const r = validateMutation(birth, null, NOW, "apply");
  assert.ok(!r.ok && r.errors.some((m) => /tidak cocok/.test(m)));
});

test("datang kembali: hanya untuk warga yang tercatat pindah; efek mengosongkan moveDate", () => {
  const moved = { ...alive, moveDate: new Date("2025-01-01") };
  const input: MutationInput = { type: "MOVE_IN", effectiveDate: "2026-10-01", residentId: 1, details: { origin: "Surabaya" } };
  assert.deepEqual(validateMutation(input, moved, NOW), { ok: true });
  assert.equal(validateMutation(input, alive, NOW).ok, false);
  const e = planMutationEffect(input, moved);
  assert.equal(e.update?.moveDate, null);
  assert.equal(e.suspendAccount, false);
});

test("perubahan KK: tolak KK sama/tidak valid; efek mengganti kk & peran; kepala pindah = butuh kepala baru", () => {
  const same: MutationInput = { type: "KK_CHANGE", effectiveDate: "2026-10-01", residentId: 1, details: { toKk: KK1, newFamilyRole: "Anak" } };
  assert.equal(validateMutation(same, alive, NOW).ok, false);
  const bad: MutationInput = { ...same, details: { toKk: "123", newFamilyRole: "Anak" } };
  assert.equal(validateMutation(bad, alive, NOW).ok, false);
  const ok: MutationInput = { ...same, details: { toKk: KK2, newFamilyRole: "Kepala Keluarga" } };
  assert.deepEqual(validateMutation(ok, alive, NOW), { ok: true });
  const e = planMutationEffect(ok, alive);
  assert.equal(e.update?.kk, KK2);
  assert.equal(e.update?.familyRole, "Kepala Keluarga");
  assert.equal(e.householdNeedsNewHead, true);
});

test("deteksi mutasi dari suntingan langsung: meninggal, pindah, datang kembali, ganti KK", () => {
  const base = { isAlive: true, deathDate: null, moveDate: null, kk: KK1, familyRole: "Anak" };
  const today = new Date("2026-10-31T00:00:00Z");
  assert.deepEqual(detectLegacyEditMutations(base, { ...base, isAlive: false, deathDate: new Date("2026-10-20") }, today).map((m) => [m.type, m.effectiveDate]), [["DEATH", "2026-10-20"]]);
  assert.deepEqual(detectLegacyEditMutations(base, { ...base, moveDate: new Date("2026-09-01") }, today).map((m) => m.type), ["MOVE_OUT"]);
  assert.deepEqual(detectLegacyEditMutations({ ...base, moveDate: new Date("2026-01-01") }, base, today).map((m) => m.type), ["MOVE_IN"]);
  assert.deepEqual(detectLegacyEditMutations(base, { ...base, kk: KK2 }, today).map((m) => m.type), ["KK_CHANGE"]);
  assert.deepEqual(detectLegacyEditMutations(base, { ...base }, today), []);
  // KK dari kosong menjadi terisi bukan mutasi (koreksi data).
  assert.deepEqual(detectLegacyEditMutations({ ...base, kk: null }, { ...base, kk: KK2 }, today), []);
});

// ------------------------------------------------------------------ Laporan
test("rekap mutasi per bulan dan per RT/RW, termasuk selisih penduduk", () => {
  const rows = [
    { type: "BIRTH" as const, effectiveDate: "2026-09-02", rw: "01", rt: "01" },
    { type: "BIRTH" as const, effectiveDate: "2026-09-20", rw: "01", rt: "02" },
    { type: "DEATH" as const, effectiveDate: "2026-09-25", rw: "01", rt: "01" },
    { type: "MOVE_OUT" as const, effectiveDate: "2026-10-03", rw: null, rt: null },
    { type: "MOVE_IN" as const, effectiveDate: "2026-10-04", rw: "02", rt: "01" },
    { type: "KK_CHANGE" as const, effectiveDate: "2026-10-05", rw: "02", rt: "01" },
    { type: "BIRTH" as const, effectiveDate: "2025-01-01", rw: "01", rt: "01" }, // di luar rentang
  ];
  const byMonth = summarizeByMonth(rows, "2026-09-01", "2026-10-31");
  assert.deepEqual([...byMonth.keys()], ["2026-09", "2026-10"]);
  assert.equal(byMonth.get("2026-09")!.BIRTH, 2);
  assert.equal(netPopulationChange(byMonth.get("2026-09")!), 1);
  assert.equal(netPopulationChange(byMonth.get("2026-10")!), 0); // +1 datang −1 pindah; KK tak dihitung
  const byRt = summarizeByRtRw(rows, "2026-09-01", "2026-10-31");
  assert.ok(byRt.has("-"));
  assert.equal(byRt.get("RW 01 / RT 01")!.DEATH, 1);
});

// ------------------------------------------------------------------ Dry-run
import { readFileSync } from "node:fs";
import { buildDryRunReport, maskKk } from "../lib/kependudukan/dryrun";

test("maskKk hanya menyisakan 4 digit terakhir", () => {
  assert.equal(maskKk(KK1), "************0001");
  assert.equal(maskKk(null), null);
});

test("dry-run: ringkasan benar untuk desa dengan data bersih", () => {
  const r = buildDryRunReport([
    res(1, { familyRole: KK_HEAD_ROLE }),
    res(2, { familyRole: "Istri" }),
    res(3, { kk: KK2, familyRole: KK_HEAD_ROLE, rt: "02" }),
  ]);
  assert.equal(r.verdict, "SIAP");
  assert.equal(r.households.total, 2);
  assert.equal(r.households.cleanPercent, 100);
  assert.equal(r.totals.withoutValidKk, 0);
  assert.deepEqual(r.anomalies, []);
  assert.equal(r.wilayah.rt, 2);
  assert.equal(r.wilayah.dusun, 1);
});

test("dry-run: data berantakan = PERLU_PERBAIKAN, anomali dihitung benar dan berurut", () => {
  const r = buildDryRunReport([
    res(1, { kk: null }),
    res(2, { kk: "123" }),
    res(3, { kk: KK1 }), // tanpa kepala
    res(4, { kk: KK2, familyRole: KK_HEAD_ROLE }),
    res(5, { kk: KK2, familyRole: KK_HEAD_ROLE }), // dua kepala
  ]);
  assert.equal(r.verdict, "PERLU_PERBAIKAN");
  assert.equal(r.totals.withoutValidKk, 2);
  const byCode = Object.fromEntries(r.anomalies.map((a) => [a.code, a.count]));
  assert.deepEqual(byCode, { NO_HEAD: 1, MULTIPLE_HEADS: 1, INVALID_KK: 1, MISSING_KK: 1 });
  assert.equal(r.households.withAnomaly, 2);
  assert.equal(r.households.cleanPercent, 0);
});

test("dry-run: ambang 95% — satu KK bermasalah dari seratus masih SIAP", () => {
  const rows: ResidentLite[] = [];
  for (let i = 0; i < 100; i++) {
    const kk = String(3508010101010000 + i);
    rows.push(res(i + 1, { kk, familyRole: i === 0 ? "Anak" : KK_HEAD_ROLE })); // KK pertama tanpa kepala
  }
  const r = buildDryRunReport(rows);
  assert.equal(r.households.total, 100);
  assert.equal(r.households.withAnomaly, 1);
  assert.equal(r.households.cleanPercent, 99);
  assert.equal(r.verdict, "SIAP");
});

test("dry-run: desa tanpa warga berstatus KOSONG (bukan SIAP) dan tidak error", () => {
  const r = buildDryRunReport([]);
  assert.equal(r.verdict, "KOSONG");
  assert.equal(r.households.cleanPercent, 100);
});

test("dry-run: varian wilayah yang digabung dilaporkan", () => {
  const r = buildDryRunReport([
    res(1, { familyRole: KK_HEAD_ROLE, rt: "01", rw: "01" }),
    res(2, { kk: KK2, familyRole: KK_HEAD_ROLE, rt: "1", rw: "1" }),
  ]);
  assert.ok(r.wilayah.mergedVariants.length >= 1);
});

test("dry-run: laporan tidak memuat nama, alamat, NIK, atau KK utuh", () => {
  const r = buildDryRunReport([
    res(1, { kk: null, address: "Jl. Rahasia No. 7" }),
    res(2, { kk: KK1, familyRole: "Anak", address: "Jl. Rahasia No. 8" }),
    res(3, { kk: KK1, familyRole: "Anak", rt: "02" }),
  ]);
  const json = JSON.stringify(r);
  assert.ok(!json.includes("Rahasia"));
  assert.ok(!json.includes(KK1), "KK utuh tidak boleh muncul");
  assert.ok(json.includes("0001"));
});

test("skrip dan modul dry-run BACA-SAJA: tidak ada perintah tulis ke DB", () => {
  const forbidden = /\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(|\$executeRaw|\$queryRawUnsafe|\$transaction/;
  for (const f of ["scripts/kependudukan-dryrun.ts", "lib/kependudukan/dryrun.ts", "lib/kependudukan/household.ts", "lib/kependudukan/wilayah.ts"]) {
    const src = readFileSync(f, "utf8");
    assert.ok(!forbidden.test(src), `${f} memuat perintah tulis`);
  }
});

test("dry-run: KK tak sah dirinci pendek/panjang dan dugaan terpotong Excel", () => {
  const r = buildDryRunReport([
    res(1, { kk: "350801010101000" }), // 15 digit berakhiran 0 → diduga terpotong
    res(2, { kk: "350801010101001" }), // 15 digit biasa
    res(3, { kk: "3508" }),
    res(4, { kk: "35080101010100011" }), // 17 digit
    res(5, { kk: KK1 }),
  ]);
  assert.deepEqual(r.invalidKk, { tooShort: 3, tooLong: 1, suspectedExcelTruncation: 1 });
});
