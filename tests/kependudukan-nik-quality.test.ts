import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNikReport, checkNik, type NikRow } from "../lib/kependudukan/nik-quality.ts";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
// 3509 (Jember) 12 (kec) | 150390 → 15 Mar 1990 laki-laki | 0001
const MALE = "3509121503900001";
const FEMALE = "3509125503900002"; // hari 55 = 15 + 40

test("NIK yang sesuai tidak menghasilkan temuan", () => {
  assert.deepEqual(checkNik({ nik: MALE, birthDate: d("1990-03-15"), gender: "Laki-laki" }), []);
  assert.deepEqual(checkNik({ nik: FEMALE, birthDate: d("1990-03-15"), gender: "Perempuan" }), []);
});

test("bentuk: bukan 16 angka berhenti di temuan format saja", () => {
  for (const nik of ["", "123", "350912150390000", "35091215039000011", "35091215039000AB", " "]) {
    assert.deepEqual(checkNik({ nik, birthDate: d("1990-03-15"), gender: "Laki-laki" }), ["NIK_FORMAT"], nik);
  }
});

test("kode provinsi tak dikenal ditandai; kode baru Papua dikenali", () => {
  assert.ok(checkNik({ nik: "9909121503900001", birthDate: d("1990-03-15"), gender: "L" }).includes("NIK_PROVINCE"));
  assert.ok(!checkNik({ nik: "9509121503900001", birthDate: d("1990-03-15"), gender: "L" }).includes("NIK_PROVINCE"));
  assert.ok(checkNik({ nik: "0009121503900001", birthDate: d("1990-03-15"), gender: "L" }).includes("NIK_PROVINCE"));
});

test("tanggal tak mungkin: bulan 13, hari 32, 30 Februari; 29 Februari tahun kabisat sah", () => {
  const t = (day: string, mon: string, yr: string) => checkNik({ nik: `350912${day}${mon}${yr}0001`, birthDate: d("1990-03-15"), gender: "L" });
  assert.ok(t("15", "13", "90").includes("NIK_DATE"));
  assert.ok(t("32", "03", "90").includes("NIK_DATE"));
  assert.ok(t("30", "02", "91").includes("NIK_DATE"));
  assert.ok(t("00", "03", "90").includes("NIK_DATE"));
  assert.ok(t("40", "03", "90").includes("NIK_DATE"), "40 = hari 0 perempuan");
  assert.ok(t("72", "03", "90").includes("NIK_DATE"), "72 = hari 32 perempuan");
  const leap = checkNik({ nik: "3509122902960001", birthDate: d("1996-02-29"), gender: "L" });
  assert.deepEqual(leap, []);
});

test("tanggal lahir dan jenis kelamin dibandingkan dengan NIK", () => {
  assert.deepEqual(checkNik({ nik: MALE, birthDate: d("1990-03-16"), gender: "Laki-laki" }), ["NIK_BIRTHDATE"]);
  assert.deepEqual(checkNik({ nik: MALE, birthDate: d("1990-04-15"), gender: "Laki-laki" }), ["NIK_BIRTHDATE"]);
  assert.deepEqual(checkNik({ nik: MALE, birthDate: d("1991-03-15"), gender: "Laki-laki" }), ["NIK_BIRTHDATE"]);
  assert.deepEqual(checkNik({ nik: MALE, birthDate: d("1990-03-15"), gender: "Perempuan" }), ["NIK_GENDER"]);
  assert.deepEqual(checkNik({ nik: FEMALE, birthDate: d("1990-03-15"), gender: "Laki-laki" }), ["NIK_GENDER"]);
  assert.deepEqual(checkNik({ nik: MALE, birthDate: d("1990-03-16"), gender: "Perempuan" }).sort(), ["NIK_BIRTHDATE", "NIK_GENDER"]);
});

test("abad tidak dipermasalahkan: 2 digit tahun cocok untuk 1950 maupun 2050", () => {
  assert.deepEqual(checkNik({ nik: "3509121503050001", birthDate: d("2005-03-15"), gender: "L" }), []);
  assert.deepEqual(checkNik({ nik: "3509121503050001", birthDate: d("1905-03-15"), gender: "L" }), []);
});

const row = (id: number, o: Partial<NikRow>): NikRow => ({ id, nik: MALE, name: `Warga ${id}`, birthDate: d("1990-03-15"), gender: "Laki-laki", rt: "01", rw: "01", isAlive: true, moveDate: null, ...o });

test("laporan: hanya warga aktif; hitungan dan 4 digit terakhir; tanpa NIK utuh", () => {
  const r = buildNikReport([
    row(1, {}),
    row(2, { nik: "12" }),
    row(3, { nik: "9909121503900003" }),
    row(4, { isAlive: false, nik: "bad" }),
    row(5, { moveDate: d("2024-01-01"), nik: "bad" }),
  ]);
  assert.equal(r.total, 3);
  assert.equal(r.counts.NIK_FORMAT, 1);
  assert.equal(r.counts.NIK_PROVINCE, 1);
  assert.equal(r.findings.find((f) => f.kind === "NIK_PROVINCE")?.nikLast4, "0003");
  assert.ok(!JSON.stringify(r).includes("9909121503900003"));
});

test("warga ganda: nama+tanggal lahir+jenis kelamin sama dengan NIK berbeda; NIK sama bukan ganda", () => {
  const A = row(1, { name: "Siti  Aminah", nik: FEMALE, gender: "Perempuan" });
  const B = row(2, { name: "siti aminah", nik: "3509125503900009", gender: "Perempuan" });
  const same = row(3, { name: "Budi", nik: MALE });
  const same2 = row(4, { name: "Budi", nik: MALE });
  const other = row(5, { name: "Siti Aminah", nik: "3509125503900010", gender: "Perempuan", birthDate: d("1991-03-15") });
  const r = buildNikReport([A, B, same, same2, other]);
  const dup = r.findings.filter((f) => f.kind === "NIK_DUPLICATE_PERSON");
  assert.deepEqual(dup.map((f) => f.residentId).sort(), [1, 2]);
  assert.deepEqual(dup.find((f) => f.residentId === 1)?.relatedIds, [2]);
});
