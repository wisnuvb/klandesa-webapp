import { test } from "node:test";
import assert from "node:assert/strict";
import { buildKualitasResponse, KUALITAS_MAX_LIMIT, type KualitasRow } from "../lib/kependudukan/worklist-view";

const KK_A = "3508010101010001";
let n = 0;
const row = (over: Partial<KualitasRow> = {}): KualitasRow => {
  n += 1;
  return {
    id: n, nik: `35080199990${String(n).padStart(5, "0")}`, name: `Warga ${n}`, gender: "Laki-laki", kk: KK_A, familyRole: "Anak", isAlive: true, moveDate: null,
    rt: "01", rw: "01", hamlet: "Mawar", address: `Jl. Mawar Indah ${n}`, birthDate: new Date("1990-01-01"), fatherNik: null, fatherName: null, motherNik: null, motherName: null, ...over,
  };
};
const NOW = new Date("2026-10-31T00:00:00Z");

test("respons: jumlah per jenis, total, halaman; item berisi orang dengan status dan KK lama", () => {
  const rows = [row({ familyRole: "Kepala Keluarga" }), row({ kk: null }), row({ kk: "123", moveDate: new Date("2025-01-01") })];
  const r = buildKualitasResponse(rows, { now: NOW });
  assert.equal(r.total, 2);
  assert.equal(r.counts.MISSING_KK, 1);
  assert.equal(r.counts.INVALID_KK, 1);
  const invalid = r.items.find((i) => i.kind === "INVALID_KK")!;
  assert.equal(invalid.residents[0].kk, "123");
  assert.equal(invalid.residents[0].status, "pindah");
});

test("halaman dan batas: limit dipaksa 1..100, halaman < 1 menjadi 1", () => {
  const rows = Array.from({ length: 30 }, () => row({ kk: null, address: "-" }));
  assert.equal(buildKualitasResponse(rows, { limit: 10, page: 1, now: NOW }).items.length, 10);
  assert.equal(buildKualitasResponse(rows, { limit: 10, page: 3, now: NOW }).items.length, 10);
  assert.equal(buildKualitasResponse(rows, { limit: 10, page: 4, now: NOW }).items.length, 0);
  assert.equal(buildKualitasResponse(rows, { limit: 9999, now: NOW }).limit, KUALITAS_MAX_LIMIT);
  assert.equal(buildKualitasResponse(rows, { limit: 0, now: NOW }).limit, 1);
  assert.equal(buildKualitasResponse(rows, { page: -5, now: NOW }).page, 1);
});

test("filter jenis hanya mengubah daftar, bukan hitungan per jenis (untuk kartu filter)", () => {
  const rows = [row({ kk: null }), row({ kk: "123" }), row({ familyRole: "KKKK" })];
  const all = buildKualitasResponse(rows, { now: NOW });
  const only = buildKualitasResponse(rows, { kind: "MISSING_KK", now: NOW });
  assert.equal(only.items.every((i) => i.kind === "MISSING_KK"), true);
  assert.deepEqual(only.counts, all.counts);
  assert.ok(only.total < all.total);
});

test("filter 'yakin': hanya saran TINGGI yang bisa diterapkan, tanpa KEEP_HEAD", () => {
  const head = row({ familyRole: "Kepala Keluarga", nik: "3508019999000001" });
  const wife = row({ familyRole: "Istri", gender: "Perempuan", nik: "3508019999000002" });
  const kid = row({ kk: null, address: "-", fatherNik: "3508019999000001", motherNik: "3508019999000002" }); // TINGGI
  const dupHeadA = row({ kk: "3508010101010009", familyRole: "Kepala Keluarga" });
  const dupHeadB = row({ kk: "3508010101010009", familyRole: "Kepala Keluarga" }); // KEEP_HEAD (RENDAH)
  const r = buildKualitasResponse([head, wife, kid, dupHeadA, dupHeadB], { onlyConfident: true, now: NOW });
  assert.equal(r.total, 1);
  assert.equal(r.items[0].suggestions[0].confidence, "TINGGI");
  assert.equal(r.items[0].suggestions[0].type, "SET_KK");
});

test("saran KK memuat pratinjau KK tujuan: 4 digit akhir, kepala, jumlah dan nama anggota", () => {
  const head = row({ familyRole: "Kepala Keluarga", name: "Slamet" });
  const wife = row({ familyRole: "Istri", gender: "Perempuan", name: "Sri" });
  const kid = row({ kk: null, address: "-", fatherNik: head.nik, motherNik: wife.nik });
  const s = buildKualitasResponse([head, wife, kid], { now: NOW }).items[0].suggestions[0];
  assert.equal(s.targetKk?.last4, "0001");
  assert.equal(s.targetKk?.headName, "Slamet");
  assert.equal(s.targetKk?.memberCount, 2);
  assert.deepEqual(s.targetKk?.memberNames, ["Slamet", "Sri"]);
});

test("item berbasis KK memuat seluruh anggota untuk konteks", () => {
  const rows = [row({ familyRole: "Istri", gender: "Perempuan" }), row({ familyRole: "Anak" })]; // tanpa kepala
  const item = buildKualitasResponse(rows, { now: NOW }).items.find((i) => i.kind === "NO_HEAD")!;
  assert.equal(item.members?.length, 2);
});

test("keluaran tidak pernah memuat NIK siapa pun", () => {
  const rows = [
    row({ familyRole: "Kepala Keluarga" }), row({ familyRole: "Istri", gender: "Perempuan" }),
    row({ kk: null, fatherNik: "3508019999000099" }), row({ kk: "35080101010100" }),
  ];
  const json = JSON.stringify(buildKualitasResponse(rows, { limit: 100, now: NOW }));
  for (const r of rows) assert.ok(!json.includes(r.nik), `NIK ${r.nik} bocor`);
  assert.ok(!json.includes("3508019999000099"));
  assert.ok(!json.includes('"nik"'));
});

test("tanggal lahir kosong tidak membuat respons gagal", () => {
  const r = buildKualitasResponse([row({ kk: null, birthDate: null as unknown as Date })], { now: NOW });
  assert.equal(r.items[0].residents[0].birthDate, "1900-01-01");
});
