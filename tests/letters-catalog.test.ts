import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCatalogV2 } from "../lib/letters/catalog/index.ts";
import { buildCatalogInserts, catalogRowsForSeed, getAllCatalogDefinitions } from "../lib/mail/catalogTemplates.ts";
import { flattenBlocks, validateDocument } from "../lib/letters/document/validate.ts";
import type { Block, LetterDocument } from "../lib/letters/document/schema.ts";
import { deriveFormSpec, lintDocument } from "../lib/letters/document/form-spec.ts";
import { TEMPLATE_LIMITS, validateTemplateInput } from "../lib/mail/template-guard.ts";

/** Kunci katalog lama — tidak boleh berubah agar fork desa (`inheritsCatalogKey`) tetap tersambung. */
const OLD_KEYS = [
  "cat_sk_domisili", "cat_sk_sktm", "cat_sk_penghasilan", "cat_sk_usaha", "cat_sk_berkelakuan_baik",
  "cat_sk_ahli_waris", "cat_sk_kehilangan", "cat_sk_pertanahan_ringkas",
  "cat_pg_kk", "cat_pg_ktp", "cat_pg_nikah", "cat_pg_skck", "cat_pg_izin_keramaian", "cat_prn_belum_menikah",
  "cat_kep_sk_pindah", "cat_kep_sk_datang", "cat_kep_sk_lahir", "cat_kep_sk_mati", "cat_kep_skpwni",
];

const entries = getCatalogV2();

describe("katalog v2: kelengkapan", () => {
  it("19 template dengan catalogKey unik dan sama dengan katalog lama (urutan sama)", () => {
    assert.equal(entries.length, 19);
    assert.deepEqual(entries.map((e) => e.catalogKey), OLD_KEYS);
    assert.equal(new Set(entries.map((e) => e.catalogKey)).size, 19);
  });
  it("nama unik, deskripsi terisi, kategori sah", () => {
    assert.equal(new Set(entries.map((e) => e.name)).size, 19);
    for (const e of entries) {
      assert.ok(e.description.length > 10, e.catalogKey);
      assert.ok(["Keterangan", "Pengantar", "Kependudukan"].includes(e.category), e.catalogKey);
    }
  });
  it("jumlah per kategori sama dengan katalog lama (8 / 6 / 5)", () => {
    const count = (c: string) => entries.filter((e) => e.category === c).length;
    assert.deepEqual([count("Keterangan"), count("Pengantar"), count("Kependudukan")], [8, 6, 5]);
  });
});

for (const e of entries) {
  describe(`katalog v2: ${e.catalogKey}`, () => {
    const result = validateDocument(e.document);

    it("lolos validateDocument", () => {
      assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.issues));
    });
    if (!result.ok) return;
    const doc = result.doc;

    it("surat warga: peran pemohon wajib, kop desa, kertas F4, penomoran otomatis bersama", () => {
      assert.equal(doc.audience, "warga");
      assert.ok(doc.people.some((p) => p.id === "pemohon" && p.required));
      assert.equal(doc.letterhead, "desa");
      assert.equal(doc.page.size, "F4");
      assert.equal(doc.numbering.mode, "auto");
      assert.equal(doc.numbering.counterKey, "umum");
      assert.ok(doc.numbering.klasifikasi, "klasifikasi terisi");
    });

    it("cek surat: ada isi dan tanda tangan, tidak ada isian/peran/grup yang terbuang", () => {
      const codes = lintDocument(doc).map((w) => `${w.code}: ${w.message}`);
      assert.deepEqual(codes, []);
    });

    it("form turun otomatis: pemohon minimal memakai isian nama; isian tambahan semuanya dipakai", () => {
      const spec = deriveFormSpec(doc);
      const pemohon = spec.people.find((p) => p.id === "pemohon");
      assert.ok(pemohon, "ada peran pemohon");
      assert.ok(pemohon!.fields.includes("nama"), "pemohon memakai isian nama");
      assert.deepEqual(spec.fields.map((x) => x.id).sort(), doc.fields.map((x) => x.id).sort());
    });

    it("ukuran dan lolos penjaga template", () => {
      const row = buildCatalogInserts(e);
      assert.ok(Buffer.byteLength(JSON.stringify(row.templateStructure), "utf8") < TEMPLATE_LIMITS.structureBytes);
      const g = validateTemplateInput({ name: e.name, category: e.category, templateStructure: row.templateStructure }, "create");
      assert.equal(g.ok, true, g.ok ? "" : g.error);
    });

    it("contentTemplate berupa ringkasan teks polos tanpa HTML", () => {
      const row = buildCatalogInserts(e);
      assert.ok(row.contentTemplate.length > 40);
      assert.doesNotMatch(row.contentTemplate, /<[a-z!/][^>]*>/i);
    });
  });
}

describe("katalog v2: pola khusus yang harus tercakup", () => {
  const byKey = (k: string): LetterDocument => {
    const r = validateDocument(entries.find((e) => e.catalogKey === k)!.document);
    assert.ok(r.ok);
    return (r as { ok: true; doc: LetterDocument }).doc;
  };
  const blocks = (d: LetterDocument) => flattenBlocks(d.body);
  const first = <T extends Block["type"]>(d: LetterDocument, type: T) =>
    d.body.find((b) => b.type === type) as Extract<Block, { type: T }> | undefined;

  it("ahli waris: grup ahli waris + saksi, tabel berulang, mengetahui Kades dan Camat", () => {
    const d = byKey("cat_sk_ahli_waris");
    assert.deepEqual(d.groups.map((g) => g.id), ["ahli_waris", "saksi"]);
    assert.ok(d.people.some((p) => p.id === "almarhum"));
    assert.ok(blocks(d).some((b) => b.type === "repeatTable" && b.group === "ahli_waris"));
    const sig = first(d, "signature")!;
    assert.deepEqual(
      sig.slots.map((s) => (s.who.kind === "pejabat" ? s.who.official : s.who.kind)),
      ["grup", "kades", "camat"],
    );
  });
  it("kematian: sebab bersifat sensitif", () => {
    const d = byKey("cat_kep_sk_mati");
    assert.equal(d.fields.find((f) => f.id === "sebab")?.sensitive, true);
  });
  it("kelahiran: orang tua berdampingan dalam kolom, bayi diisi manual", () => {
    const d = byKey("cat_kep_sk_lahir");
    assert.ok(d.body.some((b) => b.type === "columns"));
    assert.deepEqual(d.people.map((p) => p.id), ["pemohon", "bayi", "ayah", "ibu"]);
    assert.equal(d.people.find((p) => p.id === "bayi")?.allowManual, true);
  });
  it("pengantar nikah: bagian izin orang tua bersyarat, orang tua tidak wajib", () => {
    const d = byKey("cat_pg_nikah");
    assert.ok(d.body.some((b) => b.type === "conditional" && b.when.ref === "isian.di_bawah_21"));
    assert.equal(d.people.find((p) => p.id === "ortu")?.required, false);
    assert.equal(d.kind, "surat_biasa");
  });
  it("penghasilan: nominal ditulis dengan huruf (terbilang rupiah)", () => {
    assert.match(JSON.stringify(byKey("cat_sk_penghasilan").body), /terbilang_rupiah/);
  });
  it("pernyataan: pemohon menandatangani di atas materai", () => {
    const sig = first(byKey("cat_prn_belum_menikah"), "signature")!;
    assert.ok(sig.slots.some((s) => s.who.kind === "peran" && s.who.role === "pemohon" && s.materai === true));
  });
  it("pengantar: kepala surat biasa dengan nomor, lampiran, perihal", () => {
    for (const k of ["cat_pg_kk", "cat_pg_ktp", "cat_pg_skck", "cat_pg_izin_keramaian", "cat_pg_nikah"]) {
      const memo = first(byKey(k), "memo");
      assert.ok(memo, k);
      assert.deepEqual(memo.rows.map((r) => r.label), ["Nomor", "Lampiran", "Perihal"], k);
    }
  });
});

describe("catalogTemplates: baris seed", () => {
  it("catalogRowsForSeed memuat 19 baris berstruktur v2", () => {
    const rows = catalogRowsForSeed();
    assert.equal(rows.length, 19);
    assert.equal(getAllCatalogDefinitions().length, 19);
    for (const r of rows) {
      assert.equal((r.templateStructure as { schemaVersion: number }).schemaVersion, 2, r.catalogKey);
    }
  });
  it("dokumen tidak valid menggagalkan pembuatan baris dengan pesan jelas", () => {
    const bad = { ...entries[0], document: { ...entries[0].document, body: [{ id: "x", type: "image", src: "javascript:alert(1)" }] } } as never;
    assert.throws(() => buildCatalogInserts(bad), /tidak valid/);
  });
});
