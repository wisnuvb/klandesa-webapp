import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSubmitBody, describeMutation, emptyForm, needsNikOnApprove, usesExistingResident, type MutasiItemView, type ResidentPick } from "../lib/kependudukan/mutasi-labels";

const budi: ResidentPick = { id: 5, name: "Budi", nikLast4: "1234", kkLast4: "0001", rt: "01", rw: "01", status: "aktif" };

test("kematian: butuh tanggal dan warga; isian opsional hanya dikirim bila terisi", () => {
  const bad = buildSubmitBody(emptyForm("DEATH"));
  assert.ok(!bad.ok && bad.errors.length === 2);
  const ok = buildSubmitBody({ ...emptyForm("DEATH"), effectiveDate: "2026-10-01", resident: budi, cause: " sakit " });
  assert.ok(ok.ok);
  assert.deepEqual(ok.ok && ok.body, { type: "DEATH", effectiveDate: "2026-10-01", residentId: 5, details: { cause: "sakit" } });
});

test("pindah keluar wajib tujuan", () => {
  const f = { ...emptyForm("MOVE_OUT"), effectiveDate: "2026-10-01", resident: budi };
  const bad = buildSubmitBody(f);
  assert.ok(!bad.ok && bad.errors.includes("Isi tujuan pindah."));
  assert.ok(buildSubmitBody({ ...f, destination: "Surabaya" }).ok);
});

test("ganti KK: 16 angka (spasi/strip dibuang) dan hubungan baru wajib", () => {
  const f = { ...emptyForm("KK_CHANGE"), effectiveDate: "2026-10-01", resident: budi, toKk: "3508 0000 0000 0002", newFamilyRole: "Istri" };
  const r = buildSubmitBody(f);
  assert.ok(r.ok && (r.body.details as { toKk: string }).toKk === "3508000000000002");
  const bad = buildSubmitBody({ ...f, toKk: "123", newFamilyRole: "" });
  assert.ok(!bad.ok && bad.errors.length === 2);
});

test("kelahiran: NIK boleh kosong; harus ada KK atau NIK ibu; tanggal lahir = tanggal kejadian", () => {
  const base = { ...emptyForm("BIRTH"), effectiveDate: "2026-10-01", name: "Bayi", gender: "Perempuan" as const, birthplace: "Lumajang" };
  const noLink = buildSubmitBody(base);
  assert.ok(!noLink.ok && noLink.errors.some((e) => /KK, atau NIK ibu/.test(e)));
  const ok = buildSubmitBody({ ...base, motherNik: "3508000000000009" });
  assert.ok(ok.ok);
  const nr = (ok.ok ? ok.body.details : {}) as { newResident: Record<string, string> };
  assert.equal(nr.newResident.birthDate, "2026-10-01");
  assert.equal(nr.newResident.nik, undefined, "NIK kosong tidak dikirim");
  assert.equal((ok.ok ? ok.body.residentId : 1), null);
  const shortNik = buildSubmitBody({ ...base, kk: "3508000000000001", nik: "123" });
  assert.ok(!shortNik.ok && shortNik.errors.some((e) => /NIK harus 16/.test(e)));
});

test("datang: warga lama kembali memilih warga; warga baru butuh NIK 16 angka, KK, asal", () => {
  assert.equal(usesExistingResident({ type: "MOVE_IN", returning: true }), true);
  assert.equal(usesExistingResident({ type: "MOVE_IN", returning: false }), false);
  const back = buildSubmitBody({ ...emptyForm("MOVE_IN"), effectiveDate: "2026-10-01", resident: budi, origin: "Surabaya" });
  assert.ok(back.ok && back.body.residentId === 5);
  const fresh = { ...emptyForm("MOVE_IN"), returning: false, effectiveDate: "2026-10-01", origin: "Malang", name: "Ani", gender: "Perempuan" as const, birthplace: "Malang", birthDate: "1995-05-05" };
  const bad = buildSubmitBody(fresh);
  assert.ok(!bad.ok && bad.errors.some((e) => /NIK/.test(e)) && bad.errors.some((e) => /KK/.test(e)));
  assert.ok(buildSubmitBody({ ...fresh, nik: "3508004505950001", kk: "3508000000000001" }).ok);
});

test("ringkasan kalimat dan kebutuhan NIK saat menyetujui", () => {
  const m = (o: Partial<MutasiItemView>): MutasiItemView => ({ id: "1", type: "MOVE_OUT", status: "PENDING", source: "web", effectiveDate: "2026-10-01", residentId: 1, residentName: "Budi", residentNikLast4: "1234", rt: null, rw: null, householdKk: null, details: null, requestedBy: null, decidedBy: null, decidedAt: null, rejectionReason: null, createdAt: "", ...o });
  assert.equal(describeMutation(m({ details: { destination: "Surabaya" } })), "Budi pindah ke Surabaya");
  assert.equal(describeMutation(m({ type: "BIRTH", residentId: null, residentName: null, details: { newResident: { name: "Bayi" } } })), "Bayi Bayi lahir");
  assert.equal(needsNikOnApprove({ type: "BIRTH", residentId: null }), true);
  assert.equal(needsNikOnApprove({ type: "MOVE_IN", residentId: 3 }), false);
  assert.equal(needsNikOnApprove({ type: "DEATH", residentId: 3 }), false);
});
