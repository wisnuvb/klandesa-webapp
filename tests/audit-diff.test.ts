import { test } from "node:test";
import assert from "node:assert/strict";
import { diffRecord, RESIDENT_AUDIT_MASKED, RESIDENT_AUDIT_IGNORED } from "../lib/audit/diff";

test("diffRecord hanya memuat kolom yang berubah", () => {
  const d = diffRecord({ name: "A", rt: "01" }, { name: "A", rt: "02" });
  assert.deepEqual(d, { rt: { from: "01", to: "02" } });
});

test("diffRecord menyembunyikan nilai kolom sensitif", () => {
  const d = diffRecord(
    { nik: "3508000000000001", name: "A" },
    { nik: "3508000000000002", name: "B" },
    { maskedFields: RESIDENT_AUDIT_MASKED },
  );
  assert.deepEqual(d.nik, { changed: true });
  assert.deepEqual(d.name, { from: "A", to: "B" });
  assert.ok(!JSON.stringify(d).includes("3508"));
});

test("diffRecord menganggap Date dengan waktu sama sebagai tak berubah dan memformat ISO", () => {
  const a = new Date("2000-01-01T00:00:00Z");
  assert.deepEqual(diffRecord({ birthDate: a }, { birthDate: new Date(a) }), {});
  const d = diffRecord({ birthDate: a }, { birthDate: new Date("2001-01-01T00:00:00Z") });
  assert.deepEqual(d, { birthDate: { from: "2000-01-01T00:00:00.000Z", to: "2001-01-01T00:00:00.000Z" } });
});

test("diffRecord mengabaikan kolom yang diabaikan dan kunci yang tak ada di data lama", () => {
  const d = diffRecord(
    { name: "A", updatedAt: new Date(0) },
    { name: "A", updatedAt: new Date(1), extra: 1 },
    { ignoreFields: RESIDENT_AUDIT_IGNORED },
  );
  assert.deepEqual(d, {});
});

test("diffRecord membedakan null dan nilai kosong", () => {
  assert.deepEqual(diffRecord({ phone: null }, { phone: "0812" }, { maskedFields: RESIDENT_AUDIT_MASKED }), { phone: { changed: true } });
  assert.deepEqual(diffRecord({ religion: null }, { religion: null }), {});
});

import { pickSummary, isSensitiveKey } from "../lib/audit/diff";

test("diffRecord menyamarkan kolom sensitif berdasarkan pola nama tanpa daftar eksplisit", () => {
  const d = diffRecord({ bankAccountNumber: "1", contactPhone: "2", title: "a" }, { bankAccountNumber: "9", contactPhone: "8", title: "b" });
  assert.deepEqual(d.bankAccountNumber, { changed: true });
  assert.deepEqual(d.contactPhone, { changed: true });
  assert.deepEqual(d.title, { from: "a", to: "b" });
});

test("pickSummary hanya mengambil kolom yang diminta dan membuang yang sensitif", () => {
  const s = pickSummary({ name: "Kas", amount: BigInt(5), email: "x@y", at: new Date("2026-01-01T00:00:00Z") }, ["name", "amount", "email", "at", "missing"]);
  assert.deepEqual(s, { name: "Kas", amount: "5", at: "2026-01-01T00:00:00.000Z" });
});

test("isSensitiveKey tidak salah menandai kolom biasa", () => {
  for (const k of ["category", "status", "budgetAmount", "title", "description", "year", "isActive"]) assert.equal(isSensitiveKey(k), false, k);
  for (const k of ["nik", "kk", "fatherNik", "phone", "email", "photoUrl", "password"]) assert.equal(isSensitiveKey(k), true, k);
});
