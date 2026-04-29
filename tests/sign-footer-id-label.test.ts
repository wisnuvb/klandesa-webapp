import { test } from "node:test";
import assert from "node:assert/strict";
import { inferFooterSignerIdLabelKind } from "@/app/(app)/layanan-surat/_utils/signFooterPlaceholders";

test("manual → NIK label", () => {
  assert.equal(
    inferFooterSignerIdLabelKind("{KEPALA_DESA_NIP}", 0, {
      SIGNER_SOURCE: "manual",
    }),
    "nik",
  );
});

test("official → NIP label walau placeholder {NIK}", () => {
  assert.equal(
    inferFooterSignerIdLabelKind("{NIK}", 0, {
      SIGNER_SOURCE: "official",
    }),
    "nip",
  );
});

test("preset + variabel NIK di template → NIK", () => {
  assert.equal(
    inferFooterSignerIdLabelKind("{NIK}", 0, {
      SIGNER_ROLE: "kepala_desa",
      SIGNER_SOURCE: "preset",
    }),
    "nik",
  );
});

test("preset + KEPALA_DESA_NIP → NIP", () => {
  assert.equal(
    inferFooterSignerIdLabelKind("{KEPALA_DESA_NIP}", 0, {
      SIGNER_ROLE: "kepala_desa",
      SIGNER_SOURCE: "preset",
    }),
    "nip",
  );
});

test("slot 1 memakai SIGNER_SLOT_1_SOURCE", () => {
  assert.equal(
    inferFooterSignerIdLabelKind("{SEKRETARIS_NIP}", 1, {
      SIGNER_SLOT_1_SOURCE: "manual",
    }),
    "nik",
  );
});
