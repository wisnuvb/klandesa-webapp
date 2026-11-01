import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LKPPD_SECTIONS, LPPD_JABATAN_SECTIONS, LPPD_TAHUN_SECTIONS, deadlineOf } from "../lib/laporan-desa/catalog";
import { buildDocument, missingRequired, type AutoData } from "../lib/laporan-desa/document";

const DATA: AutoData = {
  village: { name: "Contoh", address: "Jl. Desa 1" },
  year: 2026,
  headName: "Budi",
  plan: null,
  perdes: { number: "3/2026", date: "2025-12-20", label: "APB Desa" },
  realization: null,
  activities: [{ bidang: "Pelaksanaan Pembangunan Desa", items: [{ code: "2.3.01", name: "Pemeliharaan Jalan Desa", budget: "1000000.00", realized: "400000.00" }] }],
  population: { kind: "penduduk", title: "Rekapitulasi Jumlah Penduduk", subtitle: [], columns: [{ label: "Uraian" }, { label: "Jumlah", num: true }], rows: [{ cells: ["Jumlah penduduk", "10"] }], notes: [], signers: [] },
};

describe("susunan laporan menurut Permendagri 46/2016", () => {
  it("LPPD akhir tahun memuat bagian Pasal 3: pendahuluan 3, program 4, APB Desa, G (4 bidang x 3), penutup", () => {
    const ids = LPPD_TAHUN_SECTIONS.map((s) => s.id);
    for (const id of ["tujuan", "visi_misi", "strategi", "program_pemerintahan", "program_pembangunan", "program_kemasyarakatan", "program_pemberdayaan", "perdes_lpj", "kesimpulan", "terima_kasih", "saran"]) assert.ok(ids.includes(id), id);
    assert.equal(ids.filter((i) => /^(berhasil|masalah|upaya)_/.test(i)).length, 12);
    assert.equal(new Set(ids).size, ids.length, "id unik");
  });
  it("LKPPD dan LPPD akhir masa jabatan punya bagian wajibnya", () => {
    assert.deepEqual(LKPPD_SECTIONS.filter((s) => s.required).map((s) => s.id), ["langkah_kebijakan"]);
    assert.deepEqual(LPPD_JABATAN_SECTIONS.filter((s) => s.required).map((s) => s.id), ["laporan_masa_jabatan", "rencana_lima_bulan"]);
  });
  it("tenggat: 3 bulan setelah tahun anggaran (31 Maret) dan 5 bulan sebelum akhir masa jabatan", () => {
    assert.equal(deadlineOf("LPPD_TAHUN", 2026, null), "2027-03-31");
    assert.equal(deadlineOf("LKPPD", 2026, null), "2027-03-31");
    assert.equal(deadlineOf("LPPD_JABATAN", 2026, "2027-08-31"), "2027-03-31");
    assert.equal(deadlineOf("LPPD_JABATAN", 2026, "2027-07-31"), "2027-02-28", "hari dipangkas ke akhir bulan");
    assert.equal(deadlineOf("LPPD_JABATAN", 2026, null), null);
    assert.equal(deadlineOf("LPPD_JABATAN", 2026, "bukan tanggal"), null);
  });
});

describe("dokumen cetak", () => {
  it("bagian wajib yang kosong terdeteksi; spasi saja dianggap kosong", () => {
    assert.equal(missingRequired("LKPPD", {}).length, 1);
    assert.equal(missingRequired("LKPPD", { langkah_kebijakan: "   " }).length, 1);
    assert.equal(missingRequired("LKPPD", { langkah_kebijakan: "Kami menerbitkan Perkades." }).length, 0);
    assert.ok(missingRequired("LPPD_TAHUN", { tujuan: "x" }).length > 10);
  });
  it("memuat narasi, kegiatan dari data anggaran, Perdes APB Desa, dan lampiran penduduk", () => {
    const doc = buildDocument("LPPD_TAHUN", { tujuan: "Memenuhi kewajiban pelaporan." }, DATA);
    const text = doc.blocks.map((b) => ("text" in b ? b.text : b.table.title)).join("\n");
    assert.match(text, /LPPD AKHIR TAHUN ANGGARAN/);
    assert.match(text, /Memenuhi kewajiban pelaporan\./);
    assert.match(text, /\(belum diisi\)/);
    assert.match(text, /2\.3\.01 Pemeliharaan Jalan Desa: anggaran Rp1\.000\.000, realisasi Rp400\.000/);
    assert.match(text, /APB Desa, Nomor 3\/2026, tanggal 2025-12-20/);
    assert.match(text, /Rekapitulasi Jumlah Penduduk/);
    assert.equal(doc.signer.name, "Budi");
  });
  it("LKPPD tidak memuat lampiran penduduk; akhir masa jabatan tanpa lampiran APB Desa", () => {
    const lk = buildDocument("LKPPD", {}, DATA).blocks.map((b) => ("text" in b ? b.text : b.table.title)).join("\n");
    assert.doesNotMatch(lk, /Rekapitulasi Jumlah Penduduk/);
    const jb = buildDocument("LPPD_JABATAN", {}, DATA).blocks.map((b) => ("text" in b ? b.text : b.table.title)).join("\n");
    assert.doesNotMatch(jb, /Rincian pelaksanaan APB Desa/);
  });
});
