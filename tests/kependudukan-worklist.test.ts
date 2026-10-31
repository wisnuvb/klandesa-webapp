import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorklist, suggestHead, type WorklistResident } from "../lib/kependudukan/worklist";
import { KK_HEAD_ROLE } from "../lib/kependudukan/household";

const NOW = new Date("2026-10-31T00:00:00Z");
const KK_A = "3508010101010001";
const KK_B = "3508010101010002";
const r = (id: number, over: Partial<WorklistResident> = {}): WorklistResident => ({
  id, nik: `35080100000${String(id).padStart(5, "0")}`, name: `Warga ${id}`, fatherName: null, motherName: null, kk: KK_A, familyRole: "Anak", gender: "Laki-laki", isAlive: true, moveDate: null,
  rt: "01", rw: "01", hamlet: "Mawar", address: `Jl. Mawar Indah No ${id}`, birthDate: new Date("2000-01-01"), fatherNik: null, motherNik: null, ...over,
});

const find = (w: ReturnType<typeof buildWorklist>, id: string) => w.items.find((i) => i.id === id);

test("KK diketik kurang satu angka → disarankan ke satu-satunya KK yang cocok (TINGGI)", () => {
  const w = buildWorklist([
    r(1, { familyRole: KK_HEAD_ROLE }),
    r(2, { kk: "350801010101000" }), // KK_A tanpa digit terakhir
  ], NOW);
  const item = find(w, "INVALID_KK:2")!;
  assert.equal(item.suggestions[0].type, "SET_KK");
  assert.equal((item.suggestions[0] as { kk: string }).kk, KK_A);
  assert.equal(item.suggestions[0].confidence, "TINGGI");
});

test("KK kurang satu angka tetapi cocok ke dua KK → hanya RENDAH, tidak ada yang TINGGI", () => {
  const w = buildWorklist([
    r(1, { kk: "3508010101010001", familyRole: KK_HEAD_ROLE }),
    r(2, { kk: "3508010101010011", familyRole: KK_HEAD_ROLE }),
    r(3, { kk: "350801010101001" }), // bisa dari ...0001 atau ...0011
  ], NOW);
  const item = find(w, "INVALID_KK:3")!;
  assert.ok(item.suggestions.length >= 1);
  assert.ok(item.suggestions.every((s) => s.confidence === "RENDAH"));
});

test("anak tanpa KK: ayah dan ibu di KK yang sama → TINGGI; hanya satu orang tua → SEDANG", () => {
  const w = buildWorklist([
    r(1, { familyRole: KK_HEAD_ROLE, nik: "3508010000000001" }),
    r(2, { familyRole: "Istri", gender: "Perempuan", nik: "3508010000000002" }),
    r(3, { kk: null, fatherNik: "3508010000000001", motherNik: "3508010000000002", address: "-" }),
    r(4, { kk: null, fatherNik: "3508010000000001", address: "-" }),
  ], NOW);
  assert.equal(find(w, "MISSING_KK:3")!.suggestions[0].confidence, "TINGGI");
  assert.equal(find(w, "MISSING_KK:4")!.suggestions[0].confidence, "SEDANG");
});

test("saran dari alamat hanya bila alamat+RT/RW mengarah ke tepat satu KK", () => {
  const rows = [
    r(1, { familyRole: KK_HEAD_ROLE, address: "Jl. Raya Karanganom No 12" }),
    r(2, { kk: KK_B, familyRole: KK_HEAD_ROLE, address: "Jl. Raya Karanganom No 12" }), // alamat kembar → ambigu
    r(3, { kk: null, address: "Jl. Raya Karanganom No 12" }),
  ];
  assert.deepEqual(find(buildWorklist(rows, NOW), "MISSING_KK:3")!.suggestions, []);

  const unique = buildWorklist([rows[0], r(3, { kk: null, address: "Jl. Raya Karanganom No 12" })], NOW);
  const s = find(unique, "MISSING_KK:3")!.suggestions[0];
  assert.equal(s.confidence, "SEDANG");
  assert.equal((s as { kk: string }).kk, KK_A);
});

test("alamat terlalu pendek tidak dipakai sebagai bukti", () => {
  const w = buildWorklist([r(1, { familyRole: KK_HEAD_ROLE, address: "Mawar" }), r(2, { kk: null, address: "Mawar" })], NOW);
  assert.deepEqual(find(w, "MISSING_KK:2")!.suggestions, []);
});

test("KK tanpa kepala: Suami dipilih lebih dulu, lalu laki-laki dewasa tertua, lalu dewasa tertua", () => {
  const withSuami = buildWorklist([
    r(1, { familyRole: "Istri", gender: "Perempuan", birthDate: new Date("1970-01-01") }),
    r(2, { familyRole: "Suami", birthDate: new Date("1975-01-01") }),
    r(3, { familyRole: "Anak", birthDate: new Date("2000-01-01") }),
  ], NOW);
  const s1 = find(withSuami, `NO_HEAD:${KK_A}`)!.suggestions[0];
  assert.deepEqual([s1.type, (s1 as { residentId: number }).residentId, s1.confidence], ["SET_HEAD", 2, "TINGGI"]);

  const male = buildWorklist([
    r(1, { familyRole: "Istri", gender: "Perempuan", birthDate: new Date("1960-01-01") }),
    r(2, { familyRole: "Anak", birthDate: new Date("1990-01-01") }),
    r(3, { familyRole: "Anak", birthDate: new Date("1995-01-01") }),
  ], NOW);
  const s2 = find(male, `NO_HEAD:${KK_A}`)!.suggestions[0];
  assert.deepEqual([(s2 as { residentId: number }).residentId, s2.confidence], [2, "SEDANG"]);

  const women = buildWorklist([
    r(1, { familyRole: "Istri", gender: "Perempuan", birthDate: new Date("1960-01-01") }),
    r(2, { familyRole: "Anak", gender: "Perempuan", birthDate: new Date("1985-01-01") }),
  ], NOW);
  const s3 = find(women, `NO_HEAD:${KK_A}`)!.suggestions[0];
  assert.deepEqual([(s3 as { residentId: number }).residentId, s3.confidence], [1, "RENDAH"]);
});

test("KK berisi hanya anak-anak: tetap menyarankan yang tertua dengan keyakinan RENDAH", () => {
  const w = buildWorklist([r(1, { birthDate: new Date("2015-01-01") }), r(2, { birthDate: new Date("2012-01-01") })], NOW);
  const s = find(w, `NO_HEAD:${KK_A}`)!.suggestions[0];
  assert.equal((s as { residentId: number }).residentId, 2);
  assert.equal(s.confidence, "RENDAH");
});

test("kepala meninggal: saran kepala baru tidak boleh kepala lama dan hanya anggota aktif", () => {
  const w = buildWorklist([
    r(1, { familyRole: KK_HEAD_ROLE, isAlive: false, birthDate: new Date("1950-01-01") }),
    r(2, { familyRole: "Istri", gender: "Perempuan", birthDate: new Date("1955-01-01") }),
    r(3, { familyRole: "Anak", moveDate: new Date("2025-01-01"), birthDate: new Date("1980-01-01") }), // sudah pindah
    r(4, { familyRole: "Anak", birthDate: new Date("1990-01-01") }),
  ], NOW);
  const item = find(w, `HEAD_NOT_ACTIVE:${KK_A}`)!;
  const id = (item.suggestions[0] as { residentId: number }).residentId;
  assert.ok(id === 2 || id === 4);
  assert.notEqual(id, 1);
  assert.notEqual(id, 3);
});

test("dua kepala: disarankan mempertahankan yang tertua, keyakinan RENDAH", () => {
  const w = buildWorklist([
    r(1, { familyRole: KK_HEAD_ROLE, birthDate: new Date("1980-01-01") }),
    r(2, { familyRole: KK_HEAD_ROLE, birthDate: new Date("1970-01-01") }),
  ], NOW);
  const s = find(w, `MULTIPLE_HEADS:${KK_A}`)!.suggestions[0];
  assert.deepEqual([s.type, (s as { residentId: number }).residentId, s.confidence], ["KEEP_HEAD", 2, "RENDAH"]);
});

test("urutan kerja: KK tak sah dulu, lalu tanpa kepala; saran yakin lebih dulu dalam kelompok yang sama", () => {
  const w = buildWorklist([
    r(1, { kk: KK_B }), // KK_B tanpa kepala
    r(2, { kk: null, address: "-" }), // tanpa saran
    r(3, { kk: null, address: "-", fatherNik: "3508010000000009" }),
    r(9, { nik: "3508010000000009", familyRole: KK_HEAD_ROLE, kk: "3508010101010009" }),
  ], NOW);
  assert.deepEqual(w.items.map((i) => i.kind), ["MISSING_KK", "MISSING_KK", "NO_HEAD"]);
  assert.equal(w.items[0].residentIds[0], 3, "yang punya saran SEDANG didahulukan");
});

test("hitungan per jenis cocok dengan jumlah item, dan KK sehat tidak muncul", () => {
  const w = buildWorklist([
    r(1, { familyRole: KK_HEAD_ROLE }), r(2, { familyRole: "Istri", gender: "Perempuan" }),
    r(3, { kk: null }),
  ], NOW);
  assert.equal(w.items.length, 1);
  assert.equal(w.counts.MISSING_KK, 1);
  assert.equal(Object.values(w.counts).reduce((a, b) => a + b, 0), w.items.length);
});

test("suggestHead mengembalikan null bila semua anggota sudah meninggal/pindah", () => {
  const rows = [r(1, { isAlive: false }), r(2, { moveDate: new Date("2025-01-01") })];
  assert.equal(suggestHead(rows, new Map(rows.map((x) => [x.id, x.gender])), NOW), null);
});

test("keluaran tidak memuat NIK warga", () => {
  const w = buildWorklist([
    r(1, { familyRole: KK_HEAD_ROLE, nik: "3508019999999991" }),
    r(2, { kk: null, motherNik: "3508019999999991", nik: "3508019999999992" }),
  ], NOW);
  const json = JSON.stringify(w);
  assert.ok(!json.includes("3508019999999991"));
  assert.ok(!json.includes("3508019999999992"));
});

test("deterministik: urutan input tidak memengaruhi hasil", () => {
  const rows = [
    r(1, { familyRole: KK_HEAD_ROLE }), r(2, { kk: KK_B }), r(3, { kk: KK_B, familyRole: KK_HEAD_ROLE }),
    r(4, { kk: KK_B, familyRole: KK_HEAD_ROLE }), r(5, { kk: null }), r(6, { kk: "123" }),
  ];
  assert.deepEqual(buildWorklist(rows, NOW), buildWorklist([...rows].reverse(), NOW));
});

// ---------------------------------------------------------------- Bukti lewat nama orang tua (data nyata: NIK ayah/ibu kosong, nama terisi)
const dad = (id: number, kk: string, over: Partial<WorklistResident> = {}) => r(id, { name: "Slamet Riyadi", gender: "Laki-laki", kk, familyRole: KK_HEAD_ROLE, birthDate: new Date("1970-01-01"), ...over });

test("anak tanpa KK: nama ayah dan ibu cocok dengan anggota satu KK → TINGGI", () => {
  const w = buildWorklist([
    dad(1, KK_A),
    r(2, { kk: KK_A, name: "Sri Wahyuni", gender: "Perempuan", familyRole: "Istri", birthDate: new Date("1975-01-01") }),
    r(3, { kk: null, name: "Budi", fatherName: "Slamet Riyadi", motherName: "Sri Wahyuni", address: "-", birthDate: new Date("2005-01-01") }),
  ], NOW);
  const s = find(w, "MISSING_KK:3")!.suggestions[0] as { kk: string; confidence: string };
  assert.deepEqual([s.kk, s.confidence], [KK_A, "TINGGI"]);
});

test("nama ayah sama dengan dua warga: disaring jenis kelamin, selisih umur, lalu RT/RW", () => {
  const w = buildWorklist([
    dad(1, KK_A, { rt: "01", rw: "01" }),
    dad(2, KK_B, { rt: "05", rw: "02" }), // namanya sama, RT berbeda
    r(3, { kk: null, name: "Budi", fatherName: "Slamet Riyadi", address: "-", rt: "05", rw: "02", birthDate: new Date("2005-01-01") }),
  ], NOW);
  const s = find(w, "MISSING_KK:3")!.suggestions[0] as { kk: string; confidence: string; reason: string };
  assert.deepEqual([s.kk, s.confidence], [KK_B, "SEDANG"]);
  assert.match(s.reason, /satu RT\/RW/);

  // tanpa pembeda RT/RW → hanya RENDAH, tidak menebak
  const amb = buildWorklist([
    dad(1, KK_A, { rt: "01", rw: "01" }), dad(2, KK_B, { rt: "01", rw: "01" }),
    r(3, { kk: null, fatherName: "Slamet Riyadi", address: "-", rt: "01", rw: "01", birthDate: new Date("2005-01-01") }),
  ], NOW);
  assert.ok(find(amb, "MISSING_KK:3")!.suggestions.every((x) => x.confidence === "RENDAH"));
});

test("orang tua yang secara umur mustahil (lebih muda dari anak) tidak dicocokkan", () => {
  const w = buildWorklist([
    dad(1, KK_A, { birthDate: new Date("2010-01-01") }),
    r(3, { kk: null, fatherName: "Slamet Riyadi", address: "-", birthDate: new Date("2012-01-01") }),
  ], NOW);
  assert.deepEqual(find(w, "MISSING_KK:3")!.suggestions, []);
});

test("kepala ber-KK rusak: anak-anak yang menyebut namanya menunjuk KK-nya (2 anak = TINGGI, 1 anak = SEDANG)", () => {
  const rows = (kids: number) => [
    dad(1, "123", { name: "Slamet Riyadi" }),
    ...Array.from({ length: kids }, (_, i) => r(10 + i, { kk: KK_B, fatherName: "Slamet Riyadi", name: `Anak ${i}`, birthDate: new Date("2005-01-01") })),
  ];
  const two = find(buildWorklist(rows(2), NOW), "INVALID_KK:1")!.suggestions[0] as { kk: string; confidence: string };
  assert.deepEqual([two.kk, two.confidence], [KK_B, "TINGGI"]);
  const one = find(buildWorklist(rows(1), NOW), "INVALID_KK:1")!.suggestions[0] as { kk: string; confidence: string };
  assert.deepEqual([one.kk, one.confidence], [KK_B, "SEDANG"]);
});

test("KK kurang satu angka yang kembar: bukti anak menentukan pilihan dan menaikkan ke TINGGI", () => {
  // 3508010101010001 dan 3508010101010011 sama-sama menghasilkan 350801010101001 bila satu '0'/'1' dibuang.
  const w = buildWorklist([
    r(1, { kk: "3508010101010001", familyRole: "Istri", gender: "Perempuan", name: "Sri" }),
    r(2, { kk: "3508010101010011", familyRole: "Istri", gender: "Perempuan", name: "Rini" }),
    dad(3, "350801010101001", { name: "Slamet Riyadi" }),
    r(4, { kk: "3508010101010011", fatherName: "Slamet Riyadi", birthDate: new Date("2005-01-01"), name: "Anak" }),
  ], NOW);
  const top = find(w, "INVALID_KK:3")!.suggestions[0] as { kk: string; confidence: string };
  assert.deepEqual([top.kk, top.confidence], ["3508010101010011", "TINGGI"]);
});

test('hubungan keluarga "KKKK" disarankan menjadi Kepala Keluarga; kosong tanpa saran; baku tidak muncul', () => {
  const w = buildWorklist([
    r(1, { familyRole: "KKKK", kk: KK_A }),
    r(2, { familyRole: "", kk: KK_A }),
    r(3, { familyRole: KK_HEAD_ROLE, kk: KK_B }),
    r(4, { familyRole: "Saudara", kk: KK_B }),
  ], NOW);
  const roles = w.items.filter((i) => i.kind === "UNKNOWN_ROLE");
  assert.equal(roles.length, 2);
  const kkkk = roles.find((i) => i.residentIds[0] === 1)!.suggestions[0] as { role: string; confidence: string };
  assert.deepEqual([kkkk.role, kkkk.confidence], ["Kepala Keluarga", "SEDANG"]);
  assert.deepEqual(roles.find((i) => i.residentIds[0] === 2)!.suggestions, []);
  assert.equal(w.counts.UNKNOWN_ROLE, 2);
});

test("nama dengan gelar/almarhum di depan tetap cocok", () => {
  const w = buildWorklist([
    dad(1, KK_A, { name: "H. Slamet Riyadi" }),
    r(3, { kk: null, fatherName: "Slamet Riyadi", address: "-", birthDate: new Date("2005-01-01") }),
  ], NOW);
  assert.equal((find(w, "MISSING_KK:3")!.suggestions[0] as { kk: string }).kk, KK_A);
});

test("keluaran tidak memuat NIK maupun nama orang tua", () => {
  const w = buildWorklist([dad(1, KK_A), r(3, { kk: null, fatherName: "Slamet Riyadi", address: "-", birthDate: new Date("2005-01-01") })], NOW);
  const json = JSON.stringify(w);
  assert.ok(!json.includes("Slamet"));
});

test("pagar konflik: kepala yang disarankan masuk KK yang sudah punya kepala → RENDAH, bukan TINGGI", () => {
  const w = buildWorklist([
    dad(1, KK_A, { name: "Pak Lain" }), // KK_A sudah punya kepala
    dad(2, "123", { name: "Slamet Riyadi" }), // kepala ber-KK rusak
    r(3, { kk: KK_A, fatherName: "Slamet Riyadi", birthDate: new Date("2005-01-01") }),
    r(4, { kk: KK_A, fatherName: "Slamet Riyadi", birthDate: new Date("2007-01-01") }),
  ], NOW);
  const s = find(w, "INVALID_KK:2")!.suggestions[0] as { confidence: string; reason: string };
  assert.equal(s.confidence, "RENDAH");
  assert.match(s.reason, /sudah punya Kepala Keluarga/);
});

test("pagar konflik: RT/RW berbeda menurunkan TINGGI menjadi SEDANG", () => {
  const w = buildWorklist([
    dad(1, KK_A, { name: "Ayah", rt: "01", rw: "01" }),
    r(2, { kk: KK_A, name: "Ibu", gender: "Perempuan", familyRole: "Istri", rt: "01", rw: "01", birthDate: new Date("1975-01-01") }),
    r(3, { kk: null, fatherName: "Ayah", motherName: "Ibu", address: "-", rt: "09", rw: "03", birthDate: new Date("2005-01-01") }),
  ], NOW);
  const s = find(w, "MISSING_KK:3")!.suggestions[0] as { confidence: string; reason: string };
  assert.equal(s.confidence, "SEDANG");
  assert.match(s.reason, /RT\/RW/);
});
