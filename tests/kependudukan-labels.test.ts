import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KIND_META, KIND_ORDER, CONFIDENCE_META, isApplicable, isBulkSafe, suggestionPatch, suggestionTitle, targetSummary, bulkResultMessage, roleLabel,
  type PersonView, type SuggestionView, type WorkItemView,
} from "../lib/kependudukan/labels";

const person: PersonView = { id: 7, name: "Budi", gender: "Laki-laki", familyRole: "KKKK", kk: "350801010101000", birthDate: "1980-01-01", rt: "01", rw: "01", status: "aktif" };
const setKk: SuggestionView = { type: "SET_KK", kk: "3508010101010001", residentId: 7, reason: "x", confidence: "TINGGI", person, targetKk: { last4: "0001", memberCount: 4, headName: "Slamet", memberNames: ["Slamet"] } };
const item = (s: SuggestionView[]): WorkItemView => ({ id: "i", kind: "INVALID_KK", kk: null, residents: [person], suggestions: s });

test("setiap jenis temuan punya judul dan bantuan; urutan mencakup semuanya tanpa duplikat", () => {
  for (const k of KIND_ORDER) {
    assert.ok(KIND_META[k].title.length > 5 && KIND_META[k].help.length > 20, k);
  }
  assert.equal(new Set(KIND_ORDER).size, KIND_ORDER.length);
  assert.deepEqual([...KIND_ORDER].sort(), Object.keys(KIND_META).sort());
});

test("tingkat keyakinan memakai kata awam yang berbeda satu sama lain", () => {
  const labels = Object.values(CONFIDENCE_META).map((c) => c.label);
  assert.equal(new Set(labels).size, 3);
});

test("patch dan kebalikannya: KK dikembalikan ke nilai lama, kosong menjadi string kosong", () => {
  assert.deepEqual(suggestionPatch(setKk), { apply: { kk: "3508010101010001" }, undo: { kk: "350801010101000" } });
  const noKk = { ...setKk, person: { ...person, kk: null } };
  assert.deepEqual(suggestionPatch(noKk)!.undo, { kk: "" });
});

test("patch peran: kepala dan peran baku, undo mengembalikan peran lama termasuk yang kosong", () => {
  const head: SuggestionView = { type: "SET_HEAD", residentId: 7, reason: "x", confidence: "SEDANG", person: { ...person, familyRole: "Anak" } };
  assert.deepEqual(suggestionPatch(head), { apply: { familyRole: "Kepala Keluarga" }, undo: { familyRole: "Anak" } });
  const role: SuggestionView = { type: "SET_ROLE", role: "Kepala Keluarga", residentId: 7, reason: "x", confidence: "SEDANG", person };
  assert.deepEqual(suggestionPatch(role)!.undo, { familyRole: "KKKK" });
});

test("KEEP_HEAD hanya penjelasan: tidak bisa diterapkan dan tidak masuk massal", () => {
  const keep: SuggestionView = { type: "KEEP_HEAD", residentId: 7, reason: "x", confidence: "TINGGI", person };
  assert.equal(isApplicable(keep), false);
  assert.equal(suggestionPatch(keep), null);
  assert.equal(isBulkSafe(item([keep])), false);
});

test("massal hanya untuk saran terbaik yang yakin dan bisa diterapkan", () => {
  assert.equal(isBulkSafe(item([setKk])), true);
  assert.equal(isBulkSafe(item([{ ...setKk, confidence: "SEDANG" }])), false);
  assert.equal(isBulkSafe(item([{ ...setKk, confidence: "RENDAH" }])), false);
  assert.equal(isBulkSafe(item([])), false);
  // saran kedua yang yakin tidak membuat item layak massal bila saran terbaiknya tidak yakin
  assert.equal(isBulkSafe(item([{ ...setKk, confidence: "SEDANG" }, setKk])), false);
});

test("judul saran dalam bahasa awam dan menyebut orang/KK yang dimaksud", () => {
  assert.equal(suggestionTitle(setKk), "Masukkan ke KK berakhiran 0001");
  assert.equal(suggestionTitle({ type: "SET_HEAD", residentId: 7, reason: "", confidence: "SEDANG", person }), "Jadikan Budi Kepala Keluarga");
  assert.equal(suggestionTitle({ type: "SET_ROLE", role: "Istri", residentId: 7, reason: "", confidence: "SEDANG", person }), 'Ubah hubungan keluarga menjadi "Istri"');
});

test("ringkasan KK tujuan", () => {
  assert.equal(targetSummary(setKk.targetKk), "Kepala: Slamet · 4 anggota");
  assert.equal(targetSummary({ last4: "1", memberCount: 1, headName: null, memberNames: [] }), "Belum ada kepala · 1 anggota");
  assert.equal(targetSummary(undefined), null);
});

test("pesan hasil massal untuk sukses, sebagian, dan gagal total", () => {
  assert.equal(bulkResultMessage(5, 0), "5 perbaikan diterapkan.");
  assert.match(bulkResultMessage(3, 2), /3 perbaikan diterapkan, 2 gagal/);
  assert.match(bulkResultMessage(0, 4), /Tidak ada perbaikan yang berhasil/);
});

test("roleLabel menampilkan penanda untuk isian kosong", () => {
  assert.equal(roleLabel(""), "(kosong)");
  assert.equal(roleLabel("  "), "(kosong)");
  assert.equal(roleLabel("Anak"), "Anak");
});
