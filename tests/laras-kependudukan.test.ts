import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../lib/prisma.ts";
import {
  householdStatsForAi,
  mutationWindow,
  populationMutationsForAi,
  summarizeHouseholds,
  summarizeMutations,
  type HouseholdRow,
} from "../lib/ai/laras-kependudukan.ts";
import { LARAS_TOOLS, executeLarasTool, larasToolLabel } from "../lib/ai/laras-tools.ts";

const NOW = new Date("2026-10-31T03:00:00Z");
const KK = (n: number) => `32010100000${String(n).padStart(5, "0")}`;
let nextId = 1;
const person = (over: Partial<HouseholdRow> = {}): HouseholdRow => ({
  id: nextId++, kk: KK(1), familyRole: "Anak", isAlive: true, moveDate: null, rt: "1", rw: "1", hamlet: "Dusun A",
  address: "", birthDate: new Date("2000-01-01"), gender: "Laki-laki", ...over,
});
beforeEach(() => {
  nextId = 1;
});

describe("statistik KK", () => {
  const rows = (): HouseholdRow[] => [
    // KK 1: 4 anggota, kepala laki-laki, sehat
    person({ kk: KK(1), familyRole: "Kepala Keluarga", birthDate: new Date("1980-01-01") }),
    person({ kk: KK(1), familyRole: "Istri", gender: "Perempuan" }),
    person({ kk: KK(1) }),
    person({ kk: KK(1) }),
    // KK 2: perempuan lansia sendiri, kepala perempuan
    person({ kk: KK(2), familyRole: "Kepala Keluarga", gender: "Perempuan", birthDate: new Date("1950-05-05"), rt: "2" }),
    // KK 3: tanpa kepala
    person({ kk: KK(3), familyRole: "Anak", rt: "2" }),
    // KK 4: kepala ganda
    person({ kk: KK(4), familyRole: "Kepala Keluarga" }),
    person({ kk: KK(4), familyRole: "Kepala Keluarga" }),
    // KK 5: kepala sudah meninggal, anggota lain aktif
    person({ kk: KK(5), familyRole: "Kepala Keluarga", isAlive: false }),
    person({ kk: KK(5), familyRole: "Istri", gender: "Perempuan" }),
    // KK 6: anggota tersebar lintas RT
    person({ kk: KK(6), familyRole: "Kepala Keluarga", rt: "1" }),
    person({ kk: KK(6), familyRole: "Anak", rt: "3" }),
    // tanpa KK / KK rusak / hubungan tak baku / sudah pindah
    person({ kk: null }),
    person({ kk: "12345" }),
    person({ kk: KK(7), familyRole: "KKKK" }),
    person({ kk: KK(1), moveDate: new Date("2026-01-01") }),
  ];

  it("menghitung KK aktif, ukuran, dan masalah data; yang sudah pindah tidak dihitung", () => {
    const out = summarizeHouseholds(rows(), undefined, false, NOW);
    assert.equal(out.jumlah_penduduk_aktif, 14); // 16 baris − 1 meninggal − 1 pindah
    assert.equal(out.jumlah_kk_aktif, 7);
    const q = out.kualitas_data_kk;
    assert.equal(q.warga_aktif_tanpa_nomor_kk, 1);
    assert.equal(q.warga_aktif_nomor_kk_tidak_sah, 1);
    assert.equal(q.kk_tanpa_kepala_keluarga, 2); // KK 3 dan KK 7 (peran tak baku, tak ada kepala)
    assert.equal(q.kk_kepala_keluarga_ganda, 1);
    assert.equal(q.kk_kepala_sudah_tidak_aktif, 1);
    assert.equal(q.kk_anggota_tersebar_lintas_rt, 1);
    assert.equal(q.warga_hubungan_keluarga_tidak_baku, 1);
    assert.ok(q.persen_kk_tanpa_masalah! < 100 && q.persen_kk_tanpa_masalah! >= 0);
  });

  it("hitungan kecil disamarkan (<5) tetapi total desa tidak", () => {
    const out = summarizeHouseholds(rows(), undefined, false, NOW);
    assert.equal(out.kk_dikepalai_perempuan, "<5");
    assert.equal(out.kk_dengan_lansia_tinggal_sendiri, "<5");
    assert.equal(out.ukuran_kk.find((u) => u.anggota === "1")!.jumlah_kk, "<5");
    assert.equal(typeof out.jumlah_kk_aktif, "number");
  });

  it("enam lansia tinggal sendiri terhitung apa adanya (di atas ambang)", () => {
    const many = Array.from({ length: 6 }, (_, i) => person({ kk: KK(100 + i), familyRole: "Kepala Keluarga", birthDate: new Date("1945-01-01") }));
    assert.equal(summarizeHouseholds(many, undefined, false, NOW).kk_dengan_lansia_tinggal_sendiri, 6);
  });

  it("pengelompokan per RW/RT/dusun menyatukan '01' dan '1' dan tidak membuka nomor KK", () => {
    const r = [person({ kk: KK(1), familyRole: "Kepala Keluarga", rt: "01", rw: "1" }), person({ kk: KK(2), familyRole: "Kepala Keluarga", rt: "1", rw: "01" })];
    const byRt = summarizeHouseholds(r, "rt", false, NOW).per_kelompok!;
    assert.deepEqual(byRt, [{ kelompok: "RW 1 / RT 1", jumlah_kk: 2, jumlah_jiwa: 2 }]);
    assert.equal(summarizeHouseholds(r, "hamlet", false, NOW).per_kelompok![0]!.kelompok, "Dusun A");
  });

  it("keluaran tidak pernah memuat nomor KK, pesan anomali, atau urutan digit panjang", () => {
    const text = JSON.stringify(summarizeHouseholds(rows(), "rt", true, NOW));
    assert.ok(!/\d{8,}/.test(text), "ada urutan digit panjang");
    assert.ok(!/3201010000/.test(text));
    assert.ok(!/belum punya|tersebar di lebih|punya \d+ Kepala/i.test(text), "pesan anomali ikut keluar");
  });

  it("desa kosong: tidak ada pembagian nol", () => {
    const out = summarizeHouseholds([], undefined, false, NOW);
    assert.equal(out.jumlah_kk_aktif, 0);
    assert.equal(out.rata_rata_anggota_per_kk, null);
    assert.equal(out.kualitas_data_kk.persen_kk_tanpa_masalah, null);
  });
});

describe("mutasi penduduk", () => {
  it("jendela N bulan dimulai awal bulan", () => {
    assert.equal(mutationWindow(3, NOW).fromStr, "2026-08-01");
    assert.equal(mutationWindow(1, NOW).fromStr, "2026-10-01");
    assert.equal(mutationWindow(12, NOW).fromStr, "2025-11-01");
  });

  const { fromStr, toStr } = mutationWindow(3, NOW);
  const m = (type: string, d: string, rt = "1", rw = "1") => ({ type: type as never, effectiveDate: d, rt, rw });

  it("buku mutasi: per bulan terisi nol, perubahan KK tidak memengaruhi jumlah penduduk, antrean dihitung", () => {
    const rows = [m("BIRTH", "2026-10-02"), m("DEATH", "2026-10-03"), m("MOVE_IN", "2026-10-04"), m("KK_CHANGE", "2026-08-10"), m("MOVE_OUT", "2026-10-05")];
    const pending = [{ type: "BIRTH", createdAt: new Date("2026-10-21") }, { type: "DEATH", createdAt: new Date("2026-10-30") }];
    const out = summarizeMutations(rows, fromStr, toStr, "buku_mutasi", pending, NOW);
    assert.deepEqual(out.per_bulan.map((x) => x.bulan), ["2026-08", "2026-09", "2026-10"]);
    assert.equal(out.per_bulan[1]!.lahir, 0);
    assert.equal(out.total_periode.perubahan_bersih, 0); // +1 lahir +1 datang −1 meninggal −1 pindah
    assert.equal(out.total_periode.pindah_datang, 1);
    assert.equal((out.total_periode as { perubahan_kk?: number }).perubahan_kk, 1);
    const q = (out as { menunggu_keputusan: { jumlah: number; tertua_hari: number | null } }).menunggu_keputusan;
    assert.equal(q.jumlah, 2);
    assert.equal(q.tertua_hari, 10);
  });

  it("total desa tidak disamarkan, rincian per wilayah disamarkan", () => {
    const out = summarizeMutations([m("DEATH", "2026-10-03", "2", "1"), m("DEATH", "2026-10-04", "2", "1")], fromStr, toStr, "buku_mutasi", [], NOW);
    assert.equal(out.total_periode.meninggal, 2);
    assert.equal(out.per_wilayah[0]!.meninggal, "<5");
  });

  it("tanpa buku mutasi: berlabel perkiraan dan angka pindah datang TIDAK dikarang", () => {
    const out = summarizeMutations([m("BIRTH", "2026-10-02"), m("MOVE_IN", "2026-10-02")], fromStr, toStr, "perkiraan_data_warga", undefined, NOW);
    assert.equal(out.sumber, "perkiraan_data_warga");
    assert.equal(out.total_periode.pindah_datang, null);
    assert.ok(out.per_bulan.every((b) => b.pindah_datang === null));
    assert.ok(out.per_wilayah.every((w) => w.pindah_datang === null));
    assert.match(out.catatan, /PERKIRAAN/);
    assert.ok(!("menunggu_keputusan" in out));
  });
});

// ---- Pembatasan desa & bendera ----
type Call = { model: string; method: string; args: Record<string, unknown> };
let calls: Call[];
function spy(model: string, answers: Record<string, unknown> = {}) {
  const target: Record<string, unknown> = {};
  for (const method of ["findMany", "findFirst", "groupBy", "count"]) {
    target[method] = async (args: Record<string, unknown>) => {
      calls.push({ model, method, args });
      return method in answers ? answers[method] : [];
    };
  }
  (prisma as unknown as Record<string, unknown>)[model] = target;
}
const whereOf = (c: Call) => JSON.stringify(c.args.where ?? {});

describe("akses data kependudukan", () => {
  beforeEach(() => {
    calls = [];
  });

  it("statistik KK: hanya kolom non-identitas, dibatasi desa", async () => {
    spy("resident");
    await householdStatsForAi(42, {}, "rt");
    assert.equal(calls.length, 1);
    assert.match(whereOf(calls[0]!), /"villageId":42/);
    const sel = Object.keys(calls[0]!.args.select as object);
    for (const bad of ["name", "nik", "address", "phone", "email", "fatherName", "motherName"]) assert.ok(!sel.includes(bad), bad);
  });

  it("mutasi dengan bendera v2 MATI: tidak menyentuh tabel buku mutasi, hanya data warga milik desa", async () => {
    spy("resident");
    spy("residentMutation");
    const out = await populationMutationsForAi(42, {}, 6, NOW);
    assert.equal(out.sumber, "perkiraan_data_warga");
    assert.ok(calls.length > 0 && calls.every((c) => c.model === "resident"));
    for (const c of calls) assert.match(whereOf(c), /"villageId":42/);
  });

  it("mutasi dengan bendera v2 HIDUP: memakai buku mutasi, tidak meminta nama atau NIK", async () => {
    spy("resident");
    spy("residentMutation", { findMany: [] });
    const out = await populationMutationsForAi(42, { kependudukanV2: true }, 6, NOW);
    assert.equal(out.sumber, "buku_mutasi");
    assert.ok(calls.every((c) => c.model === "residentMutation"));
    for (const c of calls) {
      assert.match(whereOf(c), /"villageId":42/);
      const sel = Object.keys((c.args.select ?? {}) as object);
      for (const bad of ["residentName", "residentNikLast4", "householdKk", "details"]) assert.ok(!sel.includes(bad), bad);
    }
  });
});

describe("tool kependudukan terdaftar dengan benar", () => {
  it("baca-saja, berlabel, skema ketat", () => {
    for (const name of ["household_stats", "population_mutations"]) {
      const t = LARAS_TOOLS.find((x) => x.name === name)!;
      assert.ok(t, name);
      assert.equal(t.permission, "read");
      assert.equal(t.resource, "residents");
      assert.notEqual(larasToolLabel(name), "Mengambil data desa…");
      assert.equal((t.parameters as { additionalProperties?: boolean }).additionalProperties, false);
    }
  });
  it("argumen di luar batas ditolak; akun non-desa ditolak sebelum query", async () => {
    calls = [];
    spy("resident");
    const adm = { villageId: 1, userId: 5, role: "admin", village: {} as never, session: { user: { id: "5", role: "admin" } } as never, cache: new Map() };
    assert.equal((await executeLarasTool(adm, "population_mutations", '{"months":99}')).ok, false);
    assert.equal((await executeLarasTool(adm, "household_stats", '{"group_by":"nik"}')).ok, false);
    const regional = { ...adm, session: { user: { id: "rg:1", role: "admin" } } as never };
    for (const name of ["household_stats", "population_mutations"]) {
      const out = await executeLarasTool(regional, name, "{}");
      assert.equal(out.ok, false);
      assert.match(JSON.stringify(out.result), /izin/);
    }
    assert.equal(calls.length, 0);
  });
});
