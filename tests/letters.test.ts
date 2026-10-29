import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyFormat, formatTanggalId, formatHariId, parseDigits, terbilang, TERBILANG_MAX } from "../lib/letters/format.ts";
import { fillPlaceholders } from "../lib/letters/fill.ts";
import { contentAreaMm, PAPER_SIZES } from "../lib/letters/paper.ts";
import { counterScopeKey, formatLetterNumber, validateNumberPattern } from "../lib/letters/numbering.ts";
import { RESIDENT_SELECT, parseRef, residentToPerson, type ResidentLike } from "../lib/letters/registry.ts";
import { validateDocument } from "../lib/letters/document/validate.ts";
import { deriveFormSpec, lintDocument } from "../lib/letters/document/form-spec.ts";
import { validateTemplateInput } from "../lib/mail/template-guard.ts";
import { replaceVariables } from "../utils/templateVariables.ts";
import { FIXTURES, f, para, t } from "./letters-fixtures.ts";

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe("format: terbilang & tanggal", () => {
  it("bilangan Indonesia yang benar", () => {
    const cases: Array<[number, string]> = [
      [0, "nol"], [1, "satu"], [11, "sebelas"], [12, "dua belas"], [21, "dua puluh satu"],
      [100, "seratus"], [101, "seratus satu"], [111, "seratus sebelas"], [200, "dua ratus"],
      [1000, "seribu"], [1001, "seribu satu"], [2011, "dua ribu sebelas"], [100_000, "seratus ribu"],
      [1_500_000, "satu juta lima ratus ribu"], [2_500_000, "dua juta lima ratus ribu"],
      [1_000_000_000, "satu miliar"], [-5, "minus lima"],
    ];
    for (const [n, want] of cases) assert.equal(terbilang(n), want, String(n));
  });
  it("menolak di luar jangkauan, bukan membulatkan diam-diam", () => {
    assert.equal(terbilang(TERBILANG_MAX + 1), null);
    assert.equal(terbilang(NaN), null);
  });
  it("parseDigits memahami format rupiah umum", () => {
    assert.equal(parseDigits("Rp 1.500.000,-"), 1_500_000);
    assert.equal(parseDigits("1500000"), 1_500_000);
    assert.equal(parseDigits("abc"), null);
  });
  it("tanggal Indonesia tidak bergeser zona waktu", () => {
    assert.equal(formatTanggalId("2026-10-29"), "29 Oktober 2026");
    assert.equal(formatTanggalId("2026-10-29T23:30:00.000Z"), "29 Oktober 2026");
    assert.equal(formatHariId("2026-10-29"), "Kamis");
    assert.equal(formatTanggalId("bukan tanggal"), null);
    assert.equal(formatTanggalId("2026-13-40"), null);
  });
  it("applyFormat", () => {
    assert.equal(applyFormat("budi santoso", "title"), "Budi Santoso");
    assert.equal(applyFormat("budi", "upper"), "BUDI");
    assert.equal(applyFormat("2500000", "rupiah"), "Rp 2.500.000");
    assert.equal(applyFormat("2500000", "terbilang_rupiah"), "dua juta lima ratus ribu rupiah");
    assert.equal(applyFormat("2026-10-29", "tanggal"), "29 Oktober 2026");
    assert.equal(applyFormat("", "upper"), "");
    assert.equal(applyFormat("bukan angka", "terbilang"), "bukan angka");
  });
});

describe("fillPlaceholders", () => {
  it("satu lintasan: nilai tidak diproses ulang (tanpa injeksi bertingkat)", () => {
    assert.equal(fillPlaceholders("Halo {NAMA}", { NAMA: "{NIK}", NIK: "123" }), "Halo {NIK}");
  });
  it("mendukung {a}, {{a}}, {{ a }}, dan format", () => {
    const v = { "pemohon.nama": "budi", gaji: "1500000" };
    assert.equal(fillPlaceholders("{pemohon.nama|upper} {{pemohon.nama}} {{ pemohon.nama }}", v), "BUDI budi budi");
    assert.equal(fillPlaceholders("{gaji|terbilang}", v), "satu juta lima ratus ribu");
  });
  it("placeholder tak dikenal dibiarkan atau dikosongkan sesuai opsi", () => {
    assert.equal(fillPlaceholders("a {X} b", {}), "a {X} b");
    assert.equal(fillPlaceholders("a {X} b", {}, { onMissing: "empty" }), "a  b");
  });
  it("tidak membaca properti prototipe", () => {
    assert.equal(fillPlaceholders("{constructor} {toString}", {}), "{constructor} {toString}");
  });
});

describe("replaceVariables (jalur lama) memakai pengisi satu lintasan", () => {
  it("{{KEY}} tidak lagi menyisakan kurung, nilai tidak diproses ulang, alias lama tetap diperluas", () => {
    const d = { NAMA: "Budi", KABUPATEN: "Pasuruan" };
    assert.equal(replaceVariables("{NAMA} / {{NAMA}} / {{ NAMA }} / {TAK_ADA}", d), "Budi / Budi / Budi / {TAK_ADA}");
    assert.equal(replaceVariables("{kabupaten}", d), "Pasuruan");
    assert.equal(replaceVariables("{KEPALA_DESA_NIP}", d), "");
    assert.equal(replaceVariables("{NAMA}", { NAMA: "{KABUPATEN}", KABUPATEN: "X" }), "{KABUPATEN}");
  });
});

describe("kertas", () => {
  it("F4 adalah bawaan standar tata naskah (215 × 330)", () => {
    assert.deepEqual([PAPER_SIZES.F4.widthMm, PAPER_SIZES.F4.heightMm], [215, 330]);
    const a = contentAreaMm("F4", "portrait", { top: 20, right: 20, bottom: 20, left: 25 });
    assert.deepEqual(a, { widthMm: 170, heightMm: 290 });
  });
});

describe("penomoran", () => {
  const date = new Date(2026, 9, 29);
  it("pola Perbup: urut/klasifikasi/kode desa/bulan Romawi/tahun", () => {
    assert.equal(
      formatLetterNumber("{URUT}/{KLASIFIKASI}/{KODE_DESA}/{BULAN_ROMAWI}/{TAHUN}", { urut: 12, padding: 3, date, klasifikasi: "475", kodeDesa: "424.304.2.02" }),
      "012/475/424.304.2.02/X/2026",
    );
  });
  it("keputusan: NOMOR … TAHUN …", () => {
    assert.equal(formatLetterNumber("{URUT} TAHUN {TAHUN}", { urut: 7, date }), "7 TAHUN 2026");
  });
  it("segmen kosong tidak meninggalkan //", () => {
    assert.equal(formatLetterNumber("{URUT}/{KLASIFIKASI}/{TAHUN}", { urut: 1, padding: 3, date }), "001/2026");
  });
  it("padding per token {URUT:4}", () => {
    assert.equal(formatLetterNumber("{URUT:4}/{BULAN}", { urut: 5, date }), "0005/10");
  });
  it("validasi pola", () => {
    assert.equal(validateNumberPattern("{URUT}/{TAHUN}"), null);
    assert.notEqual(validateNumberPattern("{TAHUN}"), null);
    assert.equal(validateNumberPattern("{TAHUN}", "manual"), null);
    assert.notEqual(validateNumberPattern("{URUT}/{NGAWUR}"), null);
    assert.notEqual(validateNumberPattern("{URUT}<script>"), null);
    assert.notEqual(validateNumberPattern("{URUT:3}{BULAN:2}"), null);
    assert.notEqual(validateNumberPattern("{URUT}/{"), null);
  });
  it("kunci penghitung memutus per periode & berbagi buku agenda", () => {
    const d1 = new Date(2026, 0, 5), d2 = new Date(2027, 0, 5);
    assert.notEqual(counterScopeKey({ counterKey: "umum", reset: "yearly" }, d1), counterScopeKey({ counterKey: "umum", reset: "yearly" }, d2));
    assert.equal(counterScopeKey({ counterKey: "umum", reset: "never" }, d1), counterScopeKey({ counterKey: "umum", reset: "never" }, d2));
    assert.equal(counterScopeKey({ counterKey: "umum", reset: "monthly" }, d1), "umum:2026-01");
  });
});

describe("registry", () => {
  it("parseRef mengenali ruang nama dan menolak yang bukan", () => {
    assert.deepEqual(parseRef("pemohon.nama"), { kind: "person", role: "pemohon", field: "nama" });
    assert.deepEqual(parseRef("desa.kecamatan"), { kind: "desa", field: "kecamatan" });
    assert.deepEqual(parseRef("pejabat.kades.nip"), { kind: "pejabat", official: "kades", field: "nip" });
    assert.deepEqual(parseRef("surat.nomor"), { kind: "surat", field: "nomor" });
    assert.deepEqual(parseRef("isian.luas_tanah"), { kind: "isian", id: "luas_tanah" });
    for (const bad of ["nama", "desa.rahasia", "pejabat.presiden.nama", "pemohon.password", "grup.x", "A.b", "pemohon.nama.x", "", "pemohon.__proto__"]) {
      assert.equal(parseRef(bad), null, bad);
    }
  });
  const warga: ResidentLike = {
    nik: "3201012801850001", kk: "3201010101010001", name: "Ahmad Suryadi", birthplace: "Pasuruan",
    birthDate: new Date(1985, 0, 28), gender: "Laki-laki", religion: "Islam", maritalStatus: "Kawin",
    familyRole: "Kepala Keluarga", address: "Jl. Merdeka No. 45", rt: "002", rw: "005", hamlet: "Krajan",
    occupation: "Wiraswasta", education: "SMA", nationality: "Indonesia", fatherName: "Slamet", motherName: null,
    income: 2_500_000, deathDate: null, phone: null,
  };
  it("residentToPerson: field turunan (ttl, umur, alamat lengkap) benar", () => {
    const p = residentToPerson(warga, new Date(2026, 9, 29));
    assert.equal(p.ttl, "Pasuruan, 28 Januari 1985");
    assert.equal(p.umur, "41");
    assert.equal(p.alamat_lengkap, "Jl. Merdeka No. 45, RT 002/RW 005, Dusun Krajan");
    assert.equal(p.penghasilan, "2500000");
    assert.equal(p.nama_ibu, "");
    assert.equal(p.tanggal_meninggal, "");
  });
  it("umur belum ulang tahun dihitung kurang satu", () => {
    assert.equal(residentToPerson(warga, new Date(2026, 0, 27)).umur, "40");
  });
  it("allowlist kolom warga tidak memuat data kesehatan/disabilitas/foto", () => {
    const keys = Object.keys(RESIDENT_SELECT);
    for (const secret of ["isDisability", "isPregnant", "isBpjsKis", "desil", "photo", "cover", "bloodType", "tempIdNumber", "id", "villageId"]) {
      assert.ok(!keys.includes(secret), secret);
    }
  });
});

describe("dokumen v2: pola lapangan dapat disusun tanpa kode khusus", () => {
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    it(`fixture ${name} valid`, () => {
      const r = validateDocument(fixture);
      assert.equal(r.ok, true, r.ok ? "" : JSON.stringify(r.issues));
    });
  }

  it("default terisi: kertas F4, font Times, penomoran otomatis", () => {
    const r = validateDocument(FIXTURES.keteranganDomisili);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.doc.page.size, "F4");
      assert.equal(r.doc.page.font, "times");
      assert.equal(r.doc.numbering.mode, "auto");
      assert.equal(r.doc.letterhead, "desa");
    }
  });

  it("ahli waris: form turun otomatis (almarhum, grup ahli waris & saksi)", () => {
    const r = validateDocument(FIXTURES.ahliWaris);
    assert.ok(r.ok);
    if (!r.ok) return;
    const spec = deriveFormSpec(r.doc);
    const almarhum = spec.people.find((p) => p.id === "almarhum")!;
    assert.deepEqual([...almarhum.fields].sort(), ["nama", "tanggal_meninggal"]);
    assert.deepEqual(spec.groups.map((g) => g.id), ["ahli_waris", "saksi"]);
    assert.deepEqual(spec.fields.map((x) => x.id), ["keperluan"]);
    assert.ok(spec.auto.pejabat.includes("pejabat.kades.nama") && spec.auto.pejabat.includes("pejabat.camat.nama"));
  });

  it("surat internal tidak butuh pemohon; surat warga wajib", () => {
    assert.equal(validateDocument(FIXTURES.undangan).ok, true);
    const noPemohon = clone(FIXTURES.keteranganDomisili);
    noPemohon.people = [];
    const r = validateDocument(noPemohon);
    assert.equal(r.ok, false);
  });

  it("isian tambahan yang tak dipakai tidak ditanyakan di form", () => {
    const d = clone(FIXTURES.keteranganDomisili);
    d.fields!.push({ id: "tak_dipakai", label: "Tak dipakai", type: "text" } as never);
    const r = validateDocument(d);
    assert.ok(r.ok);
    if (r.ok) {
      assert.deepEqual(deriveFormSpec(r.doc).fields.map((x) => x.id), ["keperluan"]);
      assert.ok(lintDocument(r.doc).some((w) => w.code === "UNUSED_FIELD"));
    }
  });

  it("cek surat memberi saran, bukan menolak", () => {
    const d = clone(FIXTURES.keteranganDomisili);
    d.body = [para("p", t("Halo"))];
    const r = validateDocument(d);
    assert.ok(r.ok);
    if (r.ok) {
      const codes = lintDocument(r.doc).map((w) => w.code);
      assert.ok(codes.includes("NO_SIGNATURE"));
      assert.ok(codes.includes("NUMBER_NOT_SHOWN"));
    }
  });
});

describe("dokumen v2: penolakan", () => {
  const expectBad = (mutate: (d: any) => void, expected: RegExp) => {
    const d = clone(FIXTURES.ahliWaris) as any;
    mutate(d);
    const r = validateDocument(d);
    assert.equal(r.ok, false, "seharusnya ditolak");
    if (!r.ok) assert.match(r.issues.map((i) => i.message).join("\n"), expected);
  };

  it("rujukan isian ngawur / peran belum dibuat / isian belum dibuat", () => {
    expectBad((d) => d.body.push(para("x", f("pemohon.password"))), /Isian tidak dikenal/);
    expectBad((d) => d.body.push(para("x", f("wali.nama"))), /Peran "wali" belum dibuat/);
    expectBad((d) => d.body.push(para("x", f("isian.hantu"))), /Isian tambahan "hantu" belum dibuat/);
  });
  it("tabel/tanda tangan menunjuk grup atau kolom yang tidak ada", () => {
    expectBad((d) => { d.body[2].group = "nope"; }, /Daftar "nope" belum dibuat/);
    expectBad((d) => { d.body[2].columns[0].field = "nope"; }, /Kolom "nope"/);
    expectBad((d) => { d.body[4].slots[0].who = { kind: "grup", group: "nope" }; }, /Daftar "nope" belum dibuat/);
  });
  it("ID ganda, peran bernama ruang nama sistem", () => {
    expectBad((d) => { d.body[1].id = d.body[0].id; }, /ID ganda/);
    expectBad((d) => d.people.push({ id: "desa", label: "X" }), /dipakai sistem/);
  });
  it("gambar hanya path relatif / https", () => {
    for (const src of ["javascript:alert(1)", "data:image/png;base64,AAA", "//evil.example/x.png", "http://insecure.example/x.png"]) {
      expectBad((d) => d.body.push({ id: "img", type: "image", src }), /Alamat gambar tidak diizinkan/);
    }
    const ok = clone(FIXTURES.ahliWaris) as any;
    ok.body.push({ id: "img", type: "image", src: "/uploads/logo.png" });
    ok.body.push({ id: "img2", type: "image", src: "https://cdn.example.com/a.png" });
    assert.equal(validateDocument(ok).ok, true);
  });
  it("jenis blok tak dikenal & HTML mentah tidak punya tempat", () => {
    expectBad((d) => d.body.push({ id: "raw", type: "html", html: "<script>alert(1)</script>" }), /./);
    expectBad((d) => d.body.push({ id: "raw", type: "paragraph", content: [{ type: "html", html: "<b>" }] }), /./);
  });
  it("batas ukuran: terlalu banyak blok / teks terlalu panjang", () => {
    expectBad((d) => { d.body = Array.from({ length: 401 }, (_, i) => para(`b${i}`, t("x"))); }, /./);
    expectBad((d) => d.body.push(para("big", t("x".repeat(5001)))), /./);
  });
  it("kolom: jumlah rasio harus sama dengan jumlah kolom", () => {
    expectBad((d) => d.body.push({ id: "c", type: "columns", ratios: [1, 1, 1], children: [[], []] }), /Jumlah kolom/);
  });
  it("pola nomor salah & pilihan tanpa opsi", () => {
    expectBad((d) => { d.numbering = { pattern: "{TAHUN}" }; }, /\{URUT\}/);
    expectBad((d) => d.fields.push({ id: "pilih", label: "Pilih", type: "choice" }), /minimal 2 opsi/);
  });
  it("versi skema lain ditolak", () => {
    expectBad((d) => { d.schemaVersion = 1; }, /./);
  });
});

describe("template-guard menegakkan skema v2", () => {
  const base = { name: "SK", category: "Keterangan" };
  it("dokumen v2 sah diterima", () => {
    assert.equal(validateTemplateInput({ ...base, templateStructure: FIXTURES.keteranganDomisili }, "create").ok, true);
  });
  it("dokumen v2 rusak ditolak dengan pesan", () => {
    const bad = clone(FIXTURES.keteranganDomisili) as any;
    bad.body.push({ id: "img", type: "image", src: "javascript:alert(1)" });
    const r = validateTemplateInput({ ...base, templateStructure: bad }, "create");
    assert.equal(r.ok, false);
  });
  it("format lama (tanpa schemaVersion 2) tetap diterima selama masa transisi", () => {
    assert.equal(validateTemplateInput({ ...base, templateStructure: { blocks: [] } }, "create").ok, true);
  });
});

describe("values: penyelesai rujukan", async () => {
  const { resolveRef, displayValue, inlinesToText, evaluateCondition, sampleLetterValues, buildSuratValues, emptyLetterValues } = await import("../lib/letters/values.ts");
  const doc = (validateDocument(FIXTURES.penghasilan) as { ok: true; doc: any }).doc;

  it("resolveRef membaca orang, isian, desa, pejabat, surat; tak dikenal = kosong", () => {
    const v = emptyLetterValues();
    v.people.pemohon = { nama: "Budi", penghasilan: "1500000" };
    v.fields.lembaga = "Yayasan X";
    v.desa.nama = "Brambang";
    v.pejabat.kades.nama = "Sofwan";
    v.surat = buildSuratValues({ date: new Date(2026, 9, 29), nomor: "001/2026" });
    assert.equal(resolveRef("pemohon.nama", v), "Budi");
    assert.equal(resolveRef("isian.lembaga", v), "Yayasan X");
    assert.equal(resolveRef("desa.nama", v), "Brambang");
    assert.equal(resolveRef("pejabat.kades.nama", v), "Sofwan");
    assert.equal(resolveRef("pejabat.kades.jabatan", v), "Kepala Desa");
    assert.equal(resolveRef("surat.hari", v), "Kamis");
    assert.equal(resolveRef("surat.bulan_romawi", v), "X");
    assert.equal(resolveRef("pemohon.password", v), "");
    assert.equal(resolveRef("wali.nama", v), "");
  });
  it("tanggal otomatis diformat bila tanpa format eksplisit; format eksplisit menang", () => {
    const v = emptyLetterValues();
    v.surat = buildSuratValues({ date: new Date(2026, 9, 29) });
    assert.equal(displayValue("surat.tanggal", v, doc), "29 Oktober 2026");
    assert.equal(displayValue("surat.tahun", v, doc, "terbilang"), "dua ribu dua puluh enam");
    assert.equal(displayValue("isian.lembaga", v, doc, undefined, "-"), "-");
  });
  it("inlinesToText memakai format dan fallback", () => {
    const v = sampleLetterValues(doc);
    v.people.pemohon.penghasilan = "2500000";
    const text = inlinesToText([t("Gaji "), f("pemohon.penghasilan", "terbilang_rupiah")], v, doc);
    assert.equal(text, "Gaji dua juta lima ratus ribu rupiah");
  });
  it("evaluateCondition", () => {
    const v = emptyLetterValues();
    v.fields.x = "Ya";
    assert.equal(evaluateCondition({ ref: "isian.x", op: "eq", value: "Ya" }, v), true);
    assert.equal(evaluateCondition({ ref: "isian.x", op: "neq", value: "Ya" }, v), false);
    assert.equal(evaluateCondition({ ref: "isian.y", op: "empty" }, v), true);
    assert.equal(evaluateCondition({ ref: "isian.x", op: "filled" }, v), true);
  });
});
