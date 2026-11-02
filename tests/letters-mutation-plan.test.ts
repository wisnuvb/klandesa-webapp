import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  describeMutationOutcome,
  mutationKindOfTemplate,
  newResidentFromPerson,
  planLetterMutations,
  type PlanInput,
} from "../lib/letters/mutation-plan.ts";
import { validateMutation } from "../lib/kependudukan/mutation.ts";
import { emptyLetterValues, type LetterValues } from "../lib/letters/values.ts";

const NOW = new Date("2026-11-02T03:00:00Z");

const values = (o: { pemohon?: Record<string, string>; fields?: Record<string, string>; pengikut?: Array<Record<string, string>> }): LetterValues => {
  const v = emptyLetterValues();
  v.people.pemohon = o.pemohon ?? { nama: "Budi" };
  v.fields = o.fields ?? {};
  v.groups.pengikut = o.pengikut ?? [];
  return v;
};
const input = (pemohonId?: number, followers: Array<number | undefined> = []): PlanInput => ({
  people: pemohonId == null ? { pemohon: {} } : { pemohon: { residentId: pemohonId } },
  groups: { pengikut: followers.map((residentId) => ({ residentId })) },
});

describe("surat → mutasi: penanda jenis dari catalogKey", () => {
  it("memetakan kunci katalog, termasuk template desa yang mewarisinya; selain itu null", () => {
    assert.equal(mutationKindOfTemplate({ catalogKey: "cat_kep_sk_pindah" }), "MOVE_OUT");
    assert.equal(mutationKindOfTemplate({ catalogKey: "cat_kep_skpwni" }), "MOVE_IN");
    assert.equal(mutationKindOfTemplate({ catalogKey: "cat_kep_sk_datang" }), "MOVE_IN");
    assert.equal(mutationKindOfTemplate({ catalogKey: null, inheritsCatalogKey: "cat_kep_sk_pindah" }), "MOVE_OUT");
    assert.equal(mutationKindOfTemplate({ catalogKey: "cat_kep_sk_lahir" }), null);
    assert.equal(mutationKindOfTemplate({ catalogKey: null, inheritsCatalogKey: null }), null);
    // kunci prototipe tidak boleh lolos
    assert.equal(mutationKindOfTemplate({ catalogKey: "constructor" }), null);
  });
});

describe("surat pindah keluar → MOVE_OUT", () => {
  const fields = { tanggal_pindah: "2026-10-30", alamat_tujuan: "Jl. Baru 1, Malang", alasan_pindah: "Pekerjaan" };

  it("pemohon dari Data Warga → satu pengajuan dengan tujuan, alasan, tanggal", () => {
    const plan = planLetterMutations({ kind: "MOVE_OUT", input: input(7), values: values({ fields }), now: NOW });
    assert.deepEqual(plan.skipped, []);
    assert.deepEqual(plan.proposals, [
      { name: "Budi", input: { type: "MOVE_OUT", effectiveDate: "2026-10-30", residentId: 7, details: { destination: "Jl. Baru 1, Malang", reason: "Pekerjaan" } } },
    ]);
  });

  it("pengikut dari Data Warga ikut diajukan, yang sama dengan pemohon tidak ganda, yang manual dijelaskan", () => {
    const plan = planLetterMutations({
      kind: "MOVE_OUT",
      input: input(7, [8, 7, undefined]),
      values: values({ fields, pengikut: [{ nama: "Siti" }, { nama: "Budi" }, { nama: "Anak Manual" }] }),
      now: NOW,
    });
    assert.deepEqual(plan.proposals.map((p) => p.input.residentId), [7, 8]);
    assert.equal(plan.skipped.length, 1);
    assert.match(plan.skipped[0], /1 anggota keluarga/);
  });

  it("pemohon manual → tidak ada pengajuan, alasan jelas", () => {
    const plan = planLetterMutations({ kind: "MOVE_OUT", input: input(undefined), values: values({ fields }), now: NOW });
    assert.equal(plan.proposals.length, 0);
    assert.match(plan.skipped[0], /bukan dari Data Warga|tidak dipilih dari Data Warga/);
  });

  it("tanggal di masa depan dilewati (aturan Buku Mutasi: kejadian tidak boleh di masa depan); hari ini boleh", () => {
    const future = planLetterMutations({ kind: "MOVE_OUT", input: input(7), values: values({ fields: { ...fields, tanggal_pindah: "2026-11-03" } }), now: NOW });
    assert.equal(future.proposals.length, 0);
    assert.match(future.skipped[0], /masa depan/);
    const today = planLetterMutations({ kind: "MOVE_OUT", input: input(7), values: values({ fields: { ...fields, tanggal_pindah: "2026-11-02" } }), now: NOW });
    assert.equal(today.proposals.length, 1);
  });

  it("tanggal atau tujuan kosong dilewati", () => {
    assert.equal(planLetterMutations({ kind: "MOVE_OUT", input: input(7), values: values({ fields: { ...fields, tanggal_pindah: "" } }), now: NOW }).proposals.length, 0);
    assert.equal(planLetterMutations({ kind: "MOVE_OUT", input: input(7), values: values({ fields: { ...fields, alamat_tujuan: " " } }), now: NOW }).proposals.length, 0);
  });

  it("hasil rencana lolos validateMutation tahap pengajuan untuk warga yang masih aktif", () => {
    const plan = planLetterMutations({ kind: "MOVE_OUT", input: input(7), values: values({ fields }), now: NOW });
    const ref = { id: 7, isAlive: true, moveDate: null, birthDate: new Date("1990-01-01"), kk: "3508000000000101", familyRole: "Anak" };
    assert.deepEqual(validateMutation(plan.proposals[0].input, ref, NOW, "submit"), { ok: true });
  });
});

describe("surat pindah datang → MOVE_IN", () => {
  const fields = { tanggal_datang: "2026-10-28", daerah_asal: "Surabaya" };
  const NIK_L = "3578012801850001"; // lahir 28-01-1985, laki-laki
  const NIK_P = "3578016801850002"; // tanggal 68 → 28-01-1985, perempuan

  it("warga lama yang kembali (dipilih dari Data Warga) → MOVE_IN dengan residentId + asal", () => {
    const plan = planLetterMutations({ kind: "MOVE_IN", input: input(9), values: values({ fields }), now: NOW });
    assert.deepEqual(plan.proposals, [{ name: "Budi", input: { type: "MOVE_IN", effectiveDate: "2026-10-28", residentId: 9, details: { origin: "Surabaya" } } }]);
  });

  it("pendatang baru lengkap (NIK, KK, tempat lahir) → warga baru yang lolos validateMutation; tanggal lahir & jenis kelamin dari NIK", () => {
    const plan = planLetterMutations({
      kind: "MOVE_IN",
      input: input(undefined),
      values: values({ fields, pemohon: { nama: "Sari", nik: NIK_P, kk: "3508000000000999", ttl: "Surabaya, 28 Januari 1985", alamat: "Jl. Mawar 3", rt: "01", rw: "02" } }),
      now: NOW,
    });
    assert.deepEqual(plan.skipped, []);
    const p = plan.proposals[0].input;
    assert.equal(p.residentId, null);
    assert.equal(p.details.newResident?.gender, "Perempuan");
    assert.equal(p.details.newResident?.birthDate, "1985-01-28");
    assert.equal(p.details.newResident?.birthplace, "Surabaya");
    assert.deepEqual(validateMutation(p, null, NOW, "submit"), { ok: true });
  });

  it("jenis kelamin di surat diutamakan atas NIK; singkatan L/P dikenali", () => {
    assert.equal(newResidentFromPerson({ nik: NIK_L, jenis_kelamin: "P" }).gender, "Perempuan");
    assert.equal(newResidentFromPerson({ nik: NIK_P, jenis_kelamin: "Laki-laki" }).gender, "Laki-laki");
    assert.equal(newResidentFromPerson({ nik: NIK_P }).gender, "Perempuan");
  });

  it("pendatang baru tanpa KK/NIK → dilewati dengan daftar yang kurang (bentuk isian surat bawaan: tanpa KK)", () => {
    const stock = planLetterMutations({
      kind: "MOVE_IN",
      input: input(undefined),
      values: values({ fields, pemohon: { nama: "Sari", nik: NIK_P, ttl: "Surabaya, 28 Januari 1985", jenis_kelamin: "Perempuan" } }),
      now: NOW,
    });
    assert.equal(stock.proposals.length, 0);
    assert.match(stock.skipped[0], /nomor KK tujuan/);
    assert.match(stock.skipped[0], /Buku Mutasi/);
    const noNik = planLetterMutations({ kind: "MOVE_IN", input: input(undefined), values: values({ fields, pemohon: { nama: "Sari" } }), now: NOW });
    assert.match(noNik.skipped[0], /NIK 16 digit/);
  });

  it("tinggal sementara, tanggal kosong/masa depan, asal kosong → dilewati", () => {
    const base = values({ fields });
    assert.match(planLetterMutations({ kind: "MOVE_IN", input: input(9), values: values({ fields: { ...fields, status_tinggal: "Tinggal sementara" } }), now: NOW }).skipped[0], /sementara/);
    assert.equal(planLetterMutations({ kind: "MOVE_IN", input: input(9), values: values({ fields: { ...fields, tanggal_datang: "" } }), now: NOW }).proposals.length, 0);
    assert.match(planLetterMutations({ kind: "MOVE_IN", input: input(9), values: values({ fields: { ...fields, tanggal_datang: "2026-12-01" } }), now: NOW }).skipped[0], /masa depan/);
    assert.equal(planLetterMutations({ kind: "MOVE_IN", input: input(9), values: values({ fields: { tanggal_datang: "2026-10-28" } }), now: NOW }).proposals.length, 0);
    assert.equal(planLetterMutations({ kind: "MOVE_IN", input: input(9), values: values({ fields: { ...fields, status_tinggal: "Pindah menetap" } }), now: NOW }).proposals.length, 1);
    assert.ok(base);
  });

  it("alamat_asal (SK Datang) dipakai bila daerah_asal tidak ada; pengikut dijelaskan, tidak diajukan", () => {
    const plan = planLetterMutations({
      kind: "MOVE_IN",
      input: input(9, [undefined]),
      values: values({ fields: { tanggal_datang: "2026-10-28", alamat_asal: "Kediri" }, pengikut: [{ nama: "Anak" }] }),
      now: NOW,
    });
    assert.equal(plan.proposals[0].input.details.origin, "Kediri");
    assert.match(plan.skipped[0], /ikut datang/);
  });
});

describe("ringkasan untuk panel sukses", () => {
  it("ada pengajuan → nada sukses, menyebut nama dan bahwa data belum berubah", () => {
    const s = describeMutationOutcome({ kind: "MOVE_OUT", created: [{ id: "5", name: "Budi" }], skipped: [] });
    assert.equal(s.tone, "success");
    assert.match(s.title, /pindah keluar/);
    assert.match(s.lines[0], /Budi/);
    assert.match(s.lines[0], /belum berubah/);
    assert.equal(s.showLink, true);
  });
  it("tidak ada pengajuan → nada info dengan alasan; selalu ada tautan Buku Mutasi", () => {
    const s = describeMutationOutcome({ kind: "MOVE_IN", created: [], skipped: ["Alasan A"] });
    assert.equal(s.tone, "info");
    assert.deepEqual(s.lines, ["Alasan A"]);
    assert.equal(s.showLink, true);
    assert.ok(describeMutationOutcome({ kind: "MOVE_IN", created: [], skipped: [] }).lines.length > 0);
  });
});
