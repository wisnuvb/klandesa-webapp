import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CRITERIA, parseCriteria } from "../lib/blt/catalog";
import { parseBeneficiary, parsePayment, parseProgramCreate, parseProgramPatch, parseReplace } from "../lib/blt/schema";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

describe("BLT Desa: istilah dan validasi isian", () => {
  it("lima kriteria cadangan sesuai Lampiran II.A.1.c", () => {
    assert.equal(Object.keys(CRITERIA).length, 5);
    assert.match(CRITERIA[3], /Program Keluarga Harapan/);
    assert.deepEqual(parseCriteria("3, 1,1,9,x"), [1, 3]);
    assert.deepEqual(parseCriteria(null), []);
  });

  it("program: nilai rupiah positif, 1–12 bulan, judul wajib", () => {
    const ok = parseProgramCreate({ year: 2026, title: "BLT Desa 2026", monthly: "300000", totalMonths: 12 });
    assert.ok(ok.ok && ok.value.monthlyCents === 30_000_000n);
    assert.equal(parseProgramCreate({ year: 2026, title: "x", monthly: "0", totalMonths: 12 }).ok, false);
    assert.equal(parseProgramCreate({ year: 2026, title: "x", monthly: "-5", totalMonths: 12 }).ok, false);
    assert.equal(parseProgramCreate({ year: 2026, title: "x", monthly: "300000", totalMonths: 13 }).ok, false);
    assert.equal(parseProgramCreate({ year: 1990, title: "x", monthly: "300000", totalMonths: 3 }).ok, false);
    assert.equal(parseProgramCreate({ year: 2026, title: "  ", monthly: "300000", totalMonths: 3 }).ok, false);
  });

  it("perubahan sebagian: hanya kolom yang dikirim; tanggal dan id musyawarah divalidasi", () => {
    const p = parseProgramPatch({ decreeNumber: " 12/Kpts/2026 ", decreeDate: "2026-03-10", musdesMeetingId: "7" });
    assert.ok(p.ok && p.value.decreeNumber === "12/Kpts/2026" && p.value.musdesMeetingId === 7 && !("title" in p.value));
    assert.equal(parseProgramPatch({ decreeDate: "2026-02-30" }).ok, false);
    assert.equal(parseProgramPatch({ musdesMeetingId: "abc" }).ok, false);
    assert.ok(parseProgramPatch({ musdesMeetingId: "" }).ok);
  });

  it("penerima: kriteria Desa wajib bila sumbernya Desa; kriteria di luar 1–5 dibuang", () => {
    assert.equal(parseBeneficiary({ residentId: 3, source: "DESA", criteria: [], category: "Miskin ekstrem" }).ok, false);
    const d = parseBeneficiary({ residentId: 3, source: "DESA", criteria: [5, 1, 9, 1], category: "Miskin ekstrem" });
    assert.ok(d.ok && d.value.criteria.join() === "1,5");
    const g = parseBeneficiary({ residentId: 3, source: "PEMERINTAH", criteria: [1], category: "Miskin ekstrem" });
    assert.ok(g.ok && g.value.criteria.length === 0, "kriteria cadangan diabaikan untuk data Pemerintah");
    assert.equal(parseBeneficiary({ residentId: 0, source: "PEMERINTAH", category: "x" }).ok, false);
    assert.equal(parseBeneficiary({ residentId: 3, source: "LAIN", category: "x" }).ok, false);
  });

  it("penggantian: alasan dan musyawarah wajib; pengganti divalidasi bila ada", () => {
    assert.equal(parseReplace({ meetingId: 4, reason: "abc" }).ok, false);
    assert.equal(parseReplace({ reason: "Meninggal dunia" }).ok, false);
    const none = parseReplace({ meetingId: 4, reason: "Meninggal dunia" });
    assert.ok(none.ok && none.value.replacement === null);
    const bad = parseReplace({ meetingId: 4, reason: "Meninggal dunia", replacement: { residentId: 9, source: "DESA", category: "x" } });
    assert.equal(bad.ok, false);
  });

  it("pembayaran: bulan akhir default = bulan mulai; urutan dan tanggal divalidasi", () => {
    const one = parsePayment({ beneficiaryId: 1, monthFrom: 2, method: "TUNAI", paidOn: "2026-04-01" });
    assert.ok(one.ok && one.value.monthTo === 2);
    assert.equal(parsePayment({ beneficiaryId: 1, monthFrom: 4, monthTo: 2, method: "TUNAI", paidOn: "2026-04-01" }).ok, false);
    assert.equal(parsePayment({ beneficiaryId: 1, monthFrom: 1, method: "CEK", paidOn: "2026-04-01" }).ok, false);
    assert.equal(parsePayment({ beneficiaryId: 1, monthFrom: 1, method: "TUNAI", paidOn: "kemarin" }).ok, false);
    assert.equal(parsePayment({ beneficiaryId: 1, monthFrom: 13, method: "TUNAI", paidOn: "2026-04-01" }).ok, false);
  });
});

describe("BLT Desa: izin rute", () => {
  const can = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method)!;
    return r.resource === "blt" && roleCan(r.resource, r.action, role);
  };
  it("penetapan hanya Kepala Desa dan admin; cetak (memuat NIK) hanya yang boleh ekspor", () => {
    assert.deepEqual([can("/api/blt/3/status", "POST", "admin"), can("/api/blt/3/status", "POST", "village_head"), can("/api/blt/3/status", "POST", "secretary"), can("/api/blt/3/status", "POST", "staff")], [true, true, false, false]);
    assert.deepEqual([can("/api/blt/3/cetak", "GET", "admin"), can("/api/blt/3/cetak", "GET", "village_head"), can("/api/blt/3/cetak", "GET", "secretary"), can("/api/blt/3/cetak", "GET", "staff")], [true, true, true, false]);
  });
  it("mengganti atau mengakhiri penerima setelah SK setara menghapus: bukan untuk operator", () => {
    const p = "/api/blt/3/penerima/9/ganti";
    assert.deepEqual([can(p, "POST", "admin"), can(p, "POST", "secretary"), can(p, "POST", "staff"), can(p, "POST", "village_head")], [true, true, false, false]);
  });
  it("pendataan dan pembayaran oleh operator; penghapusan tidak; Kepala Desa hanya membaca di luar penetapan", () => {
    assert.equal(can("/api/blt/3/pembayaran", "POST", "staff"), true);
    assert.equal(can("/api/blt/3/pembayaran/9", "DELETE", "staff"), false);
    assert.equal(can("/api/blt/3/pembayaran/9", "DELETE", "secretary"), true);
    assert.equal(can("/api/blt/3/penerima", "POST", "village_head"), false);
    assert.equal(can("/api/blt/3", "GET", "village_head"), true);
  });
});
