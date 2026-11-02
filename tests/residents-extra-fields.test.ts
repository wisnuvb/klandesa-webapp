import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ETHNICITIES, isKnownEthnicity, normalizeEthnicity } from "../lib/residents/ethnicity.ts";
import { parseExtraFields, resolveKtpStatus, resolveResidencyStatus } from "../lib/residents/extra-fields.ts";
import { normalizeRow, toDbRecord } from "../lib/residents-import/normalize.ts";
import { headerScore } from "../lib/residents-import/mapper.ts";
import { RESIDENT_AUDIT_MASKED } from "../lib/audit/diff.ts";

const NOW = new Date("2026-11-02T00:00:00Z");

describe("suku (ethnicity)", () => {
  it("menyamakan huruf besar-kecil dan membuang awalan 'suku'", () => {
    assert.equal(normalizeEthnicity("JAWA"), "Jawa");
    assert.equal(normalizeEthnicity("  suku   madura "), "Madura");
    assert.equal(normalizeEthnicity("Minang"), "Minangkabau");
    assert.equal(normalizeEthnicity("China"), "Tionghoa");
  });
  it("mempertahankan suku di luar daftar dengan huruf awal kapital", () => {
    assert.equal(normalizeEthnicity("batak toba"), "Batak Toba");
    assert.equal(normalizeEthnicity("DAYAK NGAJU"), "Dayak Ngaju");
    assert.equal(isKnownEthnicity("Batak Toba"), false);
  });
  it("penanda kosong dan bukan teks → null", () => {
    for (const v of ["", " ", "-", "tidak ada", "Tidak Diketahui", "n/a", null, undefined, 12]) assert.equal(normalizeEthnicity(v), null);
  });
  it("idempoten dan daftar baku konsisten", () => {
    for (const e of ETHNICITIES) assert.equal(normalizeEthnicity(e), e);
    assert.equal(normalizeEthnicity(normalizeEthnicity("jowo")), "Jawa");
    assert.equal(new Set(ETHNICITIES).size, ETHNICITIES.length);
  });
});

describe("parseExtraFields", () => {
  it("body tanpa field baru → tidak menyentuh apa pun", () => {
    assert.deepEqual(parseExtraFields({ name: "A" }), { ok: true, data: {} });
    assert.deepEqual(parseExtraFields(null), { ok: true, data: {} });
  });
  it("menerima nilai sah dan merapikannya", () => {
    const r = parseExtraFields({
      ethnicity: "suku jawa", residencyStatus: "TIDAK_TETAP", ktpStatus: "SUDAH_REKAM",
      arrivalDate: "2026-10-05", marriageDate: "2010-06-01T00:00:00.000Z",
      originAddress: "  Jl. Mawar   1 ", birthCertNo: "3508-LT-123", passportNo: "A1234567",
    }, NOW);
    assert.ok(r.ok);
    assert.equal(r.data.ethnicity, "Jawa");
    assert.equal(r.data.residencyStatus, "TIDAK_TETAP");
    assert.equal(r.data.arrivalDate?.toISOString(), "2026-10-05T00:00:00.000Z");
    assert.equal(r.data.marriageDate?.toISOString(), "2010-06-01T00:00:00.000Z");
    assert.equal(r.data.originAddress, "Jl. Mawar 1");
  });
  it("string kosong dan null mengosongkan kolom; undefined tidak disentuh", () => {
    const r = parseExtraFields({ ethnicity: "", kitasNo: null, passportNo: undefined });
    assert.ok(r.ok);
    assert.equal(r.data.ethnicity, null);
    assert.equal(r.data.kitasNo, null);
    assert.equal("passportNo" in r.data, false);
  });
  it("menolak nilai tak sah dengan pesan yang jelas", () => {
    const bad = (b: Record<string, unknown>) => {
      const r = parseExtraFields(b, NOW);
      assert.equal(r.ok, false);
      return r.ok ? "" : r.error;
    };
    assert.match(bad({ residencyStatus: "SEMENTARA" }), /Status penduduk/);
    assert.match(bad({ ktpStatus: "ya" }), /KTP-el/);
    assert.match(bad({ arrivalDate: "2026-02-30" }), /Tanggal datang/);
    assert.match(bad({ marriageDate: "kemarin" }), /Tanggal perkawinan/);
    assert.match(bad({ arrivalDate: "2027-01-01" }), /masa depan/);
    assert.match(bad({ passportNo: "x".repeat(31) }), /maksimal 30/);
    assert.match(bad({ originAddress: 5 }), /Alamat asal/);
    assert.match(bad({ ethnicity: 5 }), /Suku/);
  });
});

describe("resolver teks bebas", () => {
  it("status kependudukan", () => {
    assert.equal(resolveResidencyStatus("Tetap"), "TETAP");
    assert.equal(resolveResidencyStatus("Penduduk Tetap"), "TETAP");
    assert.equal(resolveResidencyStatus("tidak tetap"), "TIDAK_TETAP");
    assert.equal(resolveResidencyStatus("Pendatang / kos"), "TIDAK_TETAP");
    assert.equal(resolveResidencyStatus("TIDAK_TETAP"), "TIDAK_TETAP");
    assert.equal(resolveResidencyStatus("entah"), null);
  });
  it("status KTP-el", () => {
    assert.equal(resolveKtpStatus("Belum Rekam"), "BELUM_REKAM");
    assert.equal(resolveKtpStatus("belum merekam"), "BELUM_REKAM");
    assert.equal(resolveKtpStatus("Sudah Rekam"), "SUDAH_REKAM");
    assert.equal(resolveKtpStatus("Suket"), "SUDAH_REKAM");
    assert.equal(resolveKtpStatus("belum dicetak"), "SUDAH_REKAM");
    assert.equal(resolveKtpStatus("Sudah dicetak"), "SUDAH_CETAK");
    assert.equal(resolveKtpStatus("SUDAH_CETAK"), "SUDAH_CETAK");
    assert.equal(resolveKtpStatus("Belum wajib"), "BELUM_WAJIB");
    assert.equal(resolveKtpStatus("ya"), null);
  });
});

describe("impor Excel", () => {
  const base = {
    name: "BUDI", id_number: "3508070101900001", gender: "Laki-laki", date_of_birth: "1990-01-01",
    birthplace: "LUMAJANG", address: "Jl. A", religion_id: "Islam", marital_status: "Menikah",
    status_family_id: "Kepala Keluarga",
  };
  it("header Excel lazim terpeta ke field baru", () => {
    const map: Array<[string, string]> = [
      ["Suku", "ethnicity"], ["Suku Bangsa", "ethnicity"], ["Status Kependudukan", "residency_status"],
      ["Tgl Datang", "arrival_date"], ["Alamat Asal", "origin_address"], ["No Akta Kelahiran", "birth_cert_no"],
      ["Status KTP-el", "ktp_status"], ["Tgl Kawin", "marriage_date"], ["No. Akta Nikah", "marriage_cert_no"],
      ["No Paspor", "passport_no"], ["No. KITAS", "kitas_no"],
    ];
    for (const [h, f] of map) assert.ok(headerScore(h, f as never) >= 0.9, `${h} → ${f}`);
  });
  it("header lama tidak diambil alih field baru", () => {
    assert.ok(headerScore("Alamat", "origin_address" as never) < 0.7);
    assert.ok(headerScore("Tanggal Pindah", "move_date") > headerScore("Tanggal Pindah", "arrival_date"));
    assert.ok(headerScore("Tanggal Pindah Masuk", "arrival_date") > headerScore("Tanggal Pindah Masuk", "move_date"));
    assert.ok(headerScore("Nomor KTP", "ktp_status" as never) < 0.7);
  });
  it("menormalkan lalu menjadi kolom DB; idempoten", () => {
    const first = normalizeRow({
      ...base, ethnicity: "suku JAWA", residency_status: "Pendatang", arrival_date: "2026-10-05",
      ktp_status: "sudah rekam", passport_no: "A123", marriage_date: "2012-05-06", origin_address: "Surabaya",
    }, { now: NOW });
    assert.equal(first.issues.filter((i) => i.level === "error").length, 0);
    const second = normalizeRow(first.values, { now: NOW });
    assert.deepEqual(second.values, first.values);
    const rec = toDbRecord(first.values);
    assert.equal(rec.ethnicity, "Jawa");
    assert.equal(rec.residencyStatus, "TIDAK_TETAP");
    assert.equal(rec.ktpStatus, "SUDAH_REKAM");
    assert.equal(rec.arrivalDate?.toISOString(), "2026-10-05T00:00:00.000Z");
    assert.equal(rec.marriageDate?.toISOString(), "2012-05-06T00:00:00.000Z");
    assert.equal(rec.passportNo, "A123");
    assert.equal(rec.originAddress, "Surabaya");
  });
  it("nilai tak dikenali dikosongkan dengan peringatan, bukan galat", () => {
    const r = normalizeRow({ ...base, residency_status: "entah", ktp_status: "ya" }, { now: NOW });
    assert.equal(r.issues.filter((i) => i.level === "error").length, 0);
    assert.equal(r.issues.filter((i) => i.level === "warning" && /dikenali/.test(i.message)).length, 2);
    const rec = toDbRecord(r.values);
    assert.equal(rec.residencyStatus, null);
    assert.equal(rec.ktpStatus, null);
  });
  it("tanpa kolom baru → semuanya null (perilaku lama tak berubah)", () => {
    const rec = toDbRecord(normalizeRow(base, { now: NOW }).values);
    for (const k of ["ethnicity", "residencyStatus", "arrivalDate", "originAddress", "birthCertNo", "ktpStatus", "marriageDate", "marriageCertNo", "passportNo", "kitasNo"] as const) {
      assert.equal(rec[k], null, k);
    }
  });
});

describe("privasi", () => {
  it("nomor dokumen identitas baru tidak masuk log audit", () => {
    for (const k of ["birthCertNo", "marriageCertNo", "passportNo", "kitasNo", "originAddress"]) assert.ok(RESIDENT_AUDIT_MASKED.has(k), k);
  });
});
