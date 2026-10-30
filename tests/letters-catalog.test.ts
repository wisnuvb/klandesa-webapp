import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCatalogV2 } from "../lib/letters/catalog/index.ts";
import { buildCatalogInserts, catalogRowsForSeed, getAllCatalogDefinitions } from "../lib/mail/catalogTemplates.ts";
import { flattenBlocks, validateDocument } from "../lib/letters/document/validate.ts";
import type { Block, LetterDocument } from "../lib/letters/document/schema.ts";
import { deriveFormSpec, lintDocument } from "../lib/letters/document/form-spec.ts";
import { TEMPLATE_LIMITS, validateTemplateInput } from "../lib/mail/template-guard.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LetterPaper } from "../components/letters/LetterPaper.tsx";
import { sampleLetterValues } from "../lib/letters/values.ts";

/** Kunci katalog lama — tidak boleh berubah agar fork desa (`inheritsCatalogKey`) tetap tersambung. */
const OLD_KEYS = [
  "cat_sk_domisili", "cat_sk_sktm", "cat_sk_penghasilan", "cat_sk_usaha", "cat_sk_berkelakuan_baik",
  "cat_sk_ahli_waris", "cat_sk_kehilangan", "cat_sk_pertanahan_ringkas",
  "cat_pg_kk", "cat_pg_ktp", "cat_pg_nikah", "cat_pg_skck", "cat_pg_izin_keramaian", "cat_prn_belum_menikah",
  "cat_kep_sk_pindah", "cat_kep_sk_datang", "cat_kep_sk_lahir", "cat_kep_sk_mati", "cat_kep_skpwni",
];

/** Perluasan katalog (pola surat desa yang lazim); kunci ini juga tidak boleh berubah setelah dirilis. */
const NEW_KEYS = [
  "cat_sk_beda_identitas", "cat_sk_belum_bekerja", "cat_sk_status_perkawinan", "cat_sk_jual_beli",
  "cat_sk_ternak", "cat_sk_domisili_sementara", "cat_sk_jalan", "cat_sk_rekomendasi",
  "cat_prn_kuasa", "cat_prn_umum",
  "cat_adm_undangan", "cat_adm_tugas", "cat_adm_edaran", "cat_adm_pemberitahuan",
  "cat_adm_sk_kades", "cat_adm_berita_acara", "cat_adm_daftar_hadir", "cat_adm_nota_dinas",
];
const TOTAL = OLD_KEYS.length + NEW_KEYS.length;
const CATEGORIES = ["Keterangan", "Pengantar", "Kependudukan", "Administrasi Desa"];

const entries = getCatalogV2();

describe("katalog v2: kelengkapan", () => {
  it(`${TOTAL} template dengan catalogKey unik; kunci katalog lama tetap ada dengan urutan sama`, () => {
    assert.equal(entries.length, TOTAL);
    assert.equal(new Set(entries.map((e) => e.catalogKey)).size, TOTAL);
    assert.deepEqual(entries.map((e) => e.catalogKey).filter((k) => OLD_KEYS.includes(k)), OLD_KEYS);
    assert.deepEqual(entries.map((e) => e.catalogKey).filter((k) => NEW_KEYS.includes(k)).sort(), [...NEW_KEYS].sort());
  });
  it("nama unik, deskripsi terisi, kategori sah", () => {
    assert.equal(new Set(entries.map((e) => e.name)).size, TOTAL);
    for (const e of entries) {
      assert.ok(e.description.length > 10, e.catalogKey);
      assert.ok(CATEGORIES.includes(e.category), e.catalogKey);
    }
  });
  it("jumlah per kategori (16 / 8 / 5 / 8)", () => {
    const count = (c: string) => entries.filter((e) => e.category === c).length;
    assert.deepEqual(CATEGORIES.map(count), [16, 8, 5, 8]);
  });
  it("kategori Administrasi Desa hanya berisi surat internal; kategori lain surat warga", () => {
    for (const e of entries) {
      assert.equal(e.document.audience, e.category === "Administrasi Desa" ? "internal" : "warga", e.catalogKey);
    }
  });
  it("deskripsi tidak memakai istilah teknis (template/variabel/blok)", () => {
    for (const e of entries) assert.doesNotMatch(`${e.name} ${e.description}`, /template|variabel|blok/i, e.catalogKey);
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

    if (e.category === "Administrasi Desa") {
      it("surat dinas: tanpa pemohon, kertas F4, ada kode klasifikasi atau penomoran khusus", () => {
        assert.equal(doc.audience, "internal");
        assert.ok(!doc.people.some((p) => p.id === "pemohon"), "tanpa pemohon");
        assert.equal(doc.page.size, "F4");
        if (doc.numbering.mode === "auto" && doc.numbering.counterKey === "umum") assert.ok(doc.numbering.klasifikasi, "klasifikasi terisi");
      });
    } else {
      it("surat warga: peran pemohon wajib, kop desa, kertas F4, penomoran otomatis bersama", () => {
        assert.equal(doc.audience, "warga");
        assert.ok(doc.people.some((p) => p.id === "pemohon" && p.required));
        assert.equal(doc.letterhead, "desa");
        assert.equal(doc.page.size, "F4");
        assert.equal(doc.numbering.mode, "auto");
        assert.equal(doc.numbering.counterKey, "umum");
        assert.ok(doc.numbering.klasifikasi, "klasifikasi terisi");
      });
    }

    it("cek surat: ada isi dan tanda tangan, tidak ada isian/peran/grup yang terbuang", () => {
      const codes = lintDocument(doc).map((w) => `${w.code}: ${w.message}`);
      assert.deepEqual(codes, []);
    });

    it("form turun otomatis: pemohon minimal memakai isian nama; isian tambahan semuanya dipakai", () => {
      const spec = deriveFormSpec(doc);
      if (doc.audience === "warga") {
        const pemohon = spec.people.find((p) => p.id === "pemohon");
        assert.ok(pemohon, "ada peran pemohon");
        assert.ok(pemohon!.fields.includes("nama"), "pemohon memakai isian nama");
      } else {
        assert.equal(spec.people.length, 0);
      }
      assert.deepEqual(spec.fields.map((x) => x.id).sort(), doc.fields.map((x) => x.id).sort());
    });

    it("dapat dirender (pratinjau & cetak) dengan data contoh tanpa error", () => {
      const values = sampleLetterValues(doc);
      for (const mode of ["preview", "print"] as const) {
        const out = renderToStaticMarkup(createElement(LetterPaper, { doc, values, mode }));
        assert.ok(out.length > 300, mode);
        assert.doesNotMatch(out, /undefined|\[object Object\]/, mode);
      }
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
  it("jual beli: dua pihak, saksi, penjual bermaterai, mengetahui Kades", () => {
    const d = byKey("cat_sk_jual_beli");
    assert.deepEqual(d.people.map((p) => p.id), ["pemohon", "pembeli"]);
    assert.ok(d.groups.some((g) => g.id === "saksi" && g.min >= 2));
    const sig = first(d, "signature")!;
    assert.ok(sig.slots.some((s) => s.who.kind === "peran" && s.who.role === "pemohon" && s.materai));
    assert.ok(sig.slots.some((s) => s.who.kind === "pejabat" && s.who.official === "kades"));
    assert.match(JSON.stringify(d.body), /terbilang_rupiah/);
  });
  it("surat kuasa: pemberi bermaterai, penerima kuasa, mengetahui Kades", () => {
    const d = byKey("cat_prn_kuasa");
    assert.deepEqual(d.people.map((p) => p.id), ["pemohon", "penerima"]);
    const sig = first(d, "signature")!;
    assert.deepEqual(sig.slots.map((s) => (s.who.kind === "peran" ? s.who.role : s.who.kind)), ["pemohon", "penerima", "pejabat"]);
    assert.ok(sig.slots[0].materai);
  });
  it("domisili sementara: data pendatang boleh diisi manual", () => {
    assert.equal(byKey("cat_sk_domisili_sementara").people.find((p) => p.id === "pemohon")?.allowManual, true);
  });
  it("undangan: kepala surat dengan perihal dari isian, rincian acara, tembusan", () => {
    const d = byKey("cat_adm_undangan");
    assert.equal(d.kind, "surat_biasa");
    assert.ok(first(d, "memo"));
    assert.ok(first(d, "cc"));
    assert.match(JSON.stringify(d.body), /"format":"hari"/);
  });
  it("surat tugas: daftar petugas berulang (1–10) dan jenis perintah", () => {
    const d = byKey("cat_adm_tugas");
    assert.equal(d.kind, "perintah");
    assert.ok(d.groups.some((g) => g.id === "petugas" && g.min === 1 && g.max === 10));
    assert.ok(d.body.some((b) => b.type === "repeatTable" && b.group === "petugas"));
  });
  it("SK Kepala Desa: kop garuda, penomoran 'NOMOR … TAHUN …', menimbang/mengingat/menetapkan/diktum, Ditetapkan di", () => {
    const d = byKey("cat_adm_sk_kades");
    assert.equal(d.kind, "keputusan");
    assert.equal(d.letterhead, "garuda");
    assert.equal(d.numbering.pattern, "{URUT} TAHUN {TAHUN}");
    assert.equal(d.numbering.counterKey, "keputusan");
    const kinds = d.body.filter((b) => b.type === "dictum").map((b) => (b as Extract<Block, { type: "dictum" }>).kind);
    assert.deepEqual(kinds, ["menimbang", "mengingat", "menetapkan", "diktum"]);
    assert.match(JSON.stringify(first(d, "signature")!.dateline), /Ditetapkan di/);
  });
  it("daftar hadir: tanpa penomoran, tabel kosong 15 baris untuk diisi di kertas", () => {
    const d = byKey("cat_adm_daftar_hadir");
    assert.equal(d.kind, "daftar");
    assert.equal(d.numbering.mode, "none");
    const tabel = first(d, "table")!;
    assert.equal(tabel.rows.length, 15);
    assert.equal(tabel.columns.length, 4);
  });
  it("nota dinas: pengirim dari jabatan Sekretaris Desa, tanpa 'di tempat'", () => {
    const d = byKey("cat_adm_nota_dinas");
    const memo = first(d, "memo")!;
    assert.deepEqual(memo.rows.map((r) => r.label), ["Nomor", "Dari", "Lampiran", "Perihal"]);
    assert.doesNotMatch(JSON.stringify(memo.addressee), /di tempat/);
  });
});

describe("catalogTemplates: baris seed", () => {
  it(`catalogRowsForSeed memuat ${TOTAL} baris berstruktur v2`, () => {
    const rows = catalogRowsForSeed();
    assert.equal(rows.length, TOTAL);
    assert.equal(getAllCatalogDefinitions().length, TOTAL);
    for (const r of rows) {
      assert.equal((r.templateStructure as { schemaVersion: number }).schemaVersion, 2, r.catalogKey);
    }
  });
  it("dokumen tidak valid menggagalkan pembuatan baris dengan pesan jelas", () => {
    const bad = { ...entries[0], document: { ...entries[0].document, body: [{ id: "x", type: "image", src: "javascript:alert(1)" }] } } as never;
    assert.throws(() => buildCatalogInserts(bad), /tidak valid/);
  });
});

describe("ensureCatalog — katalog muncul tanpa skrip sinkron", () => {
  type Call = { where: { catalogKey: string }; create: Record<string, unknown>; update: Record<string, unknown> };
  const fakeDb = (presentKeys: string[]) => {
    const upserts: Call[] = [];
    const db = {
      mailTemplate: {
        findMany: async () => presentKeys.map((catalogKey) => ({ catalogKey })),
        upsert: async (args: Call) => {
          upserts.push(args);
          return {};
        },
      },
    };
    return { db: db as unknown as import("@prisma/client").PrismaClient, upserts };
  };

  it("database kosong: semua entri dibuat sebagai katalog global aktif berformat v2", async () => {
    const { seedMissingCatalog } = await import("../lib/mail/ensureCatalog.ts");
    const { db, upserts } = fakeDb([]);
    assert.equal(await seedMissingCatalog(db), TOTAL);
    assert.equal(upserts.length, TOTAL);
    for (const u of upserts) {
      assert.equal(u.create.villageId, null);
      assert.equal(u.create.isGlobal, true);
      assert.equal(u.create.isActive, true);
      assert.equal((u.create.templateStructure as { schemaVersion: number }).schemaVersion, 2);
    }
  });

  it("hanya yang belum v2 yang ditulis (baris v2 tidak disentuh)", async () => {
    const { seedMissingCatalog } = await import("../lib/mail/ensureCatalog.ts");
    const all = getCatalogV2().map((e) => e.catalogKey);
    const stale = ["cat_sk_domisili", "cat_pg_kk"];
    const { db, upserts } = fakeDb(all.filter((k) => !stale.includes(k)));
    assert.equal(await seedMissingCatalog(db), 2);
    assert.deepEqual(upserts.map((u) => u.where.catalogKey).sort(), [...stale].sort());
    // Baris lama dinaikkan di tempat (update), bukan diduplikasi.
    assert.equal(upserts[0].update.isActive, true);
  });

  it("sudah lengkap: tidak menulis apa pun", async () => {
    const { seedMissingCatalog } = await import("../lib/mail/ensureCatalog.ts");
    const { db, upserts } = fakeDb(getCatalogV2().map((e) => e.catalogKey));
    assert.equal(await seedMissingCatalog(db), 0);
    assert.equal(upserts.length, 0);
  });

  it("ensureCatalogSeeded: sekali per proses saat sukses, diulang saat gagal, dan tidak pernah melempar", async () => {
    const { ensureCatalogSeeded, resetCatalogSeedState } = await import("../lib/mail/ensureCatalog.ts");
    resetCatalogSeedState();
    let reads = 0;
    const ok = { mailTemplate: { findMany: async () => (reads++, getCatalogV2().map((e) => ({ catalogKey: e.catalogKey }))), upsert: async () => ({}) } };
    const okDb = ok as unknown as import("@prisma/client").PrismaClient;
    await ensureCatalogSeeded(okDb);
    await ensureCatalogSeeded(okDb);
    assert.equal(reads, 1);

    resetCatalogSeedState();
    let fails = 0;
    const bad = { mailTemplate: { findMany: async () => { fails++; throw new Error("db mati"); }, upsert: async () => ({}) } };
    const badDb = bad as unknown as import("@prisma/client").PrismaClient;
    const orig = console.error;
    console.error = () => {};
    try {
      await ensureCatalogSeeded(badDb); // tidak melempar
      await ensureCatalogSeeded(badDb); // diulang karena sebelumnya gagal
    } finally {
      console.error = orig;
      resetCatalogSeedState();
    }
    assert.equal(fails, 2);
  });
});
