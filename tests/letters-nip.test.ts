/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatNip, normalizeNip, validateNip } from "../lib/letters/nip.ts";
import { validateDocument } from "../lib/letters/document/validate.ts";
import { deriveFormSpec } from "../lib/letters/document/form-spec.ts";
import { parseLetterInput } from "../lib/letters/server/input.ts";
import { initialState, missingForCompletion } from "../app/(app)/layanan-surat/buat/_utils/composer.ts";
import { draftFromContext, validateDraft } from "../lib/letters/letterhead-draft.ts";
import { f, para, t } from "./letters-fixtures.ts";

const NOW = new Date(Date.UTC(2026, 10, 5));

describe("validasi NIP", () => {
  it("kosong sah (NIP opsional)", () => {
    assert.equal(validateNip(""), null);
    assert.equal(validateNip("   "), null);
  });

  it("NIP 18 angka sah, dengan atau tanpa pemisah; NIP PPPK ikut sah", () => {
    for (const nip of ["197001012000031001", "19700101 200003 1 001", "19700101.200003.1.001", "19700101-200003-1-001", " 197001012000031001 ", "198505262021212025", "199001012019032001"]) {
      assert.equal(validateNip(nip, NOW), null, nip);
    }
  });

  it("menolak huruf dan menyebutkan jumlah angka yang salah", () => {
    assert.match(validateNip("19700101200003100A", NOW)!, /hanya boleh berisi angka/);
    assert.match(validateNip("901923182933223", NOW)!, /harus 18 angka; yang Anda isi 15 angka/);
    assert.match(validateNip("1970010120000310011", NOW)!, /yang Anda isi 19 angka/);
  });

  it("menolak tanggal lahir yang tidak ada atau tidak masuk akal", () => {
    for (const nip of ["197013012000031001", "197002302000031001", "202501012000031001", "192001012000031001"]) {
      assert.match(validateNip(nip, NOW)!, /tanggal lahir/, nip);
    }
  });

  it("menolak tahun pengangkatan yang mustahil dan digit jenis kelamin selain 1/2", () => {
    assert.match(validateNip("197001011980031001", NOW)!, /tahun pengangkatan/); // diangkat sebelum usia 15 tahun
    assert.match(validateNip("197001012099031001", NOW)!, /tahun pengangkatan/); // jauh di masa depan
    assert.match(validateNip("197001012000033001", NOW)!, /angka ke-15/);
    assert.match(validateNip("197001012000030001", NOW)!, /angka ke-15/);
  });

  it("normalisasi dan format cetak baku", () => {
    assert.equal(normalizeNip("19700101 200003 1 001"), "197001012000031001");
    assert.equal(formatNip("197001012000031001"), "19700101 200003 1 001");
    assert.equal(formatNip("19700101 200003 1 001"), "19700101 200003 1 001");
    assert.equal(formatNip("12345"), "12345"); // bukan 18 angka: apa adanya
  });
});

describe("NIP di alur surat", () => {
  const r = validateDocument({
    schemaVersion: 2, kind: "keterangan", audience: "internal",
    body: [
      para("p1", t("Isi "), f("surat.tanggal", "tanggal")),
      { id: "ttd", type: "signature", slots: [{ id: "camat", who: { kind: "pejabat", official: "camat" } }] },
    ],
  });
  assert.ok(r.ok);
  const doc = r.doc;
  const spec = deriveFormSpec(doc);
  const parse = (nip: string, mode: "draft" | "completed") => parseLetterInput({ officials: { camat: { nip } } }, doc, spec, mode);

  it("surat diterbitkan: NIP tidak sah ditolak dengan pesan yang menyebut pejabatnya", () => {
    const p = parse("901923182933223", "completed");
    assert.equal(p.ok, false);
    assert.match((p as any).error, /NIP Camat: NIP harus 18 angka/);
  });

  it("surat diterbitkan: NIP sah disimpan tanpa pemisah", () => {
    const p = parse("19700101 200003 1 001", "completed");
    assert.ok(p.ok);
    assert.equal((p as any).value.officials.camat.nip, "197001012000031001");
  });

  it("draf boleh menyimpan NIP yang belum rampung (apa adanya)", () => {
    const p = parse("19700101", "draft");
    assert.ok(p.ok);
    assert.equal((p as any).value.officials.camat.nip, "19700101");
  });

  it("form: penerbitan diblokir dan kolom NIP ditunjuk", () => {
    const s = initialState(spec);
    s.officials.camat.nip = "123";
    const miss = missingForCompletion(spec, s, "auto");
    const item = miss.find((m) => m.inputId === "official-camat-nip");
    assert.ok(item);
    assert.match(item.message, /^NIP Camat: /);
    s.officials.camat.nip = "197001012000031001";
    assert.equal(missingForCompletion(spec, s, "auto").some((m) => m.inputId === "official-camat-nip"), false);
  });

  it("draf kop: NIP Kades dan Camat divalidasi sebelum disimpan", () => {
    const ctx: any = {
      desa: { alamat: "Jl", kode_pos: "", telepon: "", email: "" },
      pejabat: { kades: { nama: "K", nip: "", jabatan: "Kepala Desa" }, sekdes: { nama: "", nip: "", jabatan: "Sekretaris Desa" }, camat: { nama: "C", nip: "", jabatan: "Camat" } },
      logoUrl: null,
    };
    const d = draftFromContext(ctx);
    assert.deepEqual(validateDraft(d), {});
    const e = validateDraft({ ...d, kadesNip: "123", camatNip: "197001012000031001" });
    assert.deepEqual(Object.keys(e), ["kadesNip"]);
    assert.deepEqual(Object.keys(validateDraft({ ...d, camatNip: "abc" })), ["camatNip"]);
  });
});
