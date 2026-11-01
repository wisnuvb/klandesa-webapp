/** Tanah kas desa dan pemanfaatan aset: hitungan murni, validasi, dan pemetaan izin. Tanpa DB. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addMonthsUtc, activationBlockers, buildChargePlan, landFindings, maxEnd, overlapProblem, totalCents, wholePeriods, type FindingInput } from "../lib/aset-desa/land-calc";
import { parseAgreementInput, parseAmendInput, parseArea, parseDocInput, parseParcelInput, parseReceiveInput } from "../lib/aset-desa/land-schema";
import { AGREEMENT_KINDS, LEASABLE_CATEGORIES, LEASE_ACCOUNTS, LAND_CATEGORIES, defaultAccountFor, isLeaseAccount } from "../lib/aset-desa/land-catalog";
import { CATEGORIES } from "../lib/aset-desa/catalog";
import { accountKind, isLeafAccountCode } from "../lib/apbdes/catalog";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

const GOOD = { kind: "SEWA", lesseeName: "Pak Slamet", lesseeKind: "PERORANGAN", startOn: "2026-01-01", endOn: "2026-12-31", periodUnit: "TAHUN", amount: "6000000", tenantDuties: "Pajak dan perawatan ditanggung penyewa" };

describe("Tanah kas dan sewa: katalog", () => {
  it("batas jangka waktu mengikuti Permendagri 1/2016 (sewa 3, KSP 15, BGS/BSG 20 tahun)", () => {
    assert.equal(AGREEMENT_KINDS.SEWA.maxYears, 3);
    assert.equal(AGREEMENT_KINDS.KERJASAMA.maxYears, 15);
    assert.equal(AGREEMENT_KINDS.BGS_BSG.maxYears, 20);
    assert.equal(AGREEMENT_KINDS.SEWA.needsRegencyPermit, false);
    assert.equal(AGREEMENT_KINDS.KERJASAMA.needsRegencyPermit, true);
    assert.equal(AGREEMENT_KINDS.BGS_BSG.needsRegencyPermit, true);
  });
  it("semua rekening sewa adalah rekening pendapatan sah di katalog APB Desa", () => {
    for (const c of LEASE_ACCOUNTS) {
      assert.ok(isLeafAccountCode(c), c);
      assert.equal(accountKind(c), "PENDAPATAN");
    }
    assert.equal(defaultAccountFor("TANAH_KAS_DESA"), "4.1.2.01");
    assert.equal(defaultAccountFor("PASAR_DESA"), "4.1.2.03");
    assert.ok(isLeaseAccount(defaultAccountFor("GEDUNG_BANGUNAN")));
    assert.equal(isLeaseAccount("5.2.1.01"), false);
    assert.equal(isLeaseAccount("4.2.1.01"), false);
  });
  it("golongan yang dapat disewakan ada di katalog aset; tanah ulayat tidak", () => {
    for (const c of [...LEASABLE_CATEGORIES, ...LAND_CATEGORIES]) assert.ok(c in CATEGORIES, c);
    assert.ok(!(LEASABLE_CATEGORIES as readonly string[]).includes("TANAH_ULAYAT"));
    assert.ok(!(LEASABLE_CATEGORIES as readonly string[]).includes("KENDARAAN"));
  });
});

describe("Tanah kas dan sewa: tanggal dan jadwal tagihan", () => {
  it("menambah bulan dengan memotong hari ke akhir bulan, selalu dihitung dari awal", () => {
    assert.equal(iso(addMonthsUtc(d("2026-01-31"), 1)), "2026-02-28");
    assert.equal(iso(addMonthsUtc(d("2026-01-31"), 2)), "2026-03-31");
    assert.equal(iso(addMonthsUtc(d("2028-01-31"), 1)), "2028-02-29");
    assert.equal(iso(addMonthsUtc(d("2026-11-15"), 3)), "2027-02-15");
  });
  it("jumlah periode utuh: akhir inklusif atau tanggal ulang tahun diterima, selain itu ditolak", () => {
    assert.equal(wholePeriods(d("2026-01-01"), d("2026-12-31"), "BULAN"), 12);
    assert.equal(wholePeriods(d("2026-01-01"), d("2027-01-01"), "BULAN"), 12);
    assert.equal(wholePeriods(d("2026-01-01"), d("2026-12-31"), "TAHUN"), 1);
    assert.equal(wholePeriods(d("2026-01-01"), d("2028-12-31"), "TAHUN"), 3);
    assert.equal(wholePeriods(d("2026-01-01"), d("2027-06-30"), "TAHUN"), null);
    assert.equal(wholePeriods(d("2026-01-01"), d("2026-02-14"), "BULAN"), null);
    assert.equal(wholePeriods(d("2026-01-01"), d("2026-02-14"), "SEKALI"), 1);
  });
  it("jadwal bulanan 31 Januari tidak bergeser dan jumlahnya cocok", () => {
    const plan = buildChargePlan(d("2026-01-31"), d("2026-04-30"), "BULAN", 100_000_00n)!;
    assert.deepEqual(plan.map((p) => iso(p.dueOn)), ["2026-01-31", "2026-02-28", "2026-03-31"]);
    assert.equal(totalCents(plan), 300_000_00n);
  });
  it("sekali bayar = satu tagihan jatuh tempo di tanggal mulai", () => {
    const plan = buildChargePlan(d("2026-03-01"), d("2027-02-28"), "SEKALI", 9_000_000_00n)!;
    assert.equal(plan.length, 1);
    assert.equal(iso(plan[0]!.dueOn), "2026-03-01");
    assert.equal(plan[0]!.amountCents, 9_000_000_00n);
  });
  it("batas akhir paling jauh = ulang tahun ke-N", () => {
    assert.equal(iso(maxEnd(d("2026-01-01"), "SEWA")), "2029-01-01");
    assert.equal(iso(maxEnd(d("2026-01-01"), "KERJASAMA")), "2041-01-01");
  });
});

describe("Tanah kas dan sewa: tumpang tindih", () => {
  const span = (id: number, s: string, e: string, area: number | null) => ({ id, startOn: d(s), endOn: d(e), areaSqm: area });
  it("tanpa perjanjian lain atau beda waktu = aman", () => {
    assert.equal(overlapProblem(span(1, "2026-01-01", "2026-12-31", null), [], 1000), null);
    assert.equal(overlapProblem(span(1, "2027-01-01", "2027-12-31", null), [span(2, "2026-01-01", "2026-12-31", null)], 1000), null);
  });
  it("seluruh objek vs seluruh objek pada waktu bersamaan ditolak; berimpit satu hari juga ditolak", () => {
    assert.ok(overlapProblem(span(1, "2026-06-01", "2027-05-31", null), [span(2, "2026-01-01", "2026-12-31", null)], 1000));
    assert.ok(overlapProblem(span(1, "2026-12-31", "2027-12-30", null), [span(2, "2026-01-01", "2026-12-31", null)], 1000));
  });
  it("sewa sebagian: boleh selama jumlah luas pada waktu bersamaan tidak melebihi luas objek", () => {
    assert.equal(overlapProblem(span(1, "2026-01-01", "2026-12-31", 400), [span(2, "2026-01-01", "2026-12-31", 600)], 1000), null);
    assert.ok(overlapProblem(span(1, "2026-01-01", "2026-12-31", 401), [span(2, "2026-01-01", "2026-12-31", 600)], 1000));
  });
  it("luas objek belum tercatat: tumpang tindih tidak dapat dihitung, ditolak", () => {
    assert.ok(overlapProblem(span(1, "2026-01-01", "2026-12-31", 100), [span(2, "2026-01-01", "2026-12-31", 100)], null));
  });
});

describe("Tanah kas dan sewa: syarat berlaku", () => {
  const base = { kind: "SEWA" as const, agreementNo: "01/SWA/2026", signedOn: d("2026-01-02"), perdesNo: "3/2025", perdesDate: d("2025-12-20"), regencyPermitNo: null, regencyPermitDate: null, forceMajeureIncluded: true, tenantDuties: "x", appraisalRef: null };
  it("sewa lengkap tanpa izin Bupati lolos", () => assert.deepEqual(activationBlockers(base), []));
  it("tanpa Perdes, force majeure, atau nomor perjanjian ditolak dengan pesan pasal", () => {
    const m = activationBlockers({ ...base, perdesNo: null, perdesDate: null, forceMajeureIncluded: false, agreementNo: null });
    assert.equal(m.length, 3);
    assert.ok(m.some((x) => x.includes("Pasal 11 ayat 3")));
  });
  it("kerja sama pemanfaatan dan BGS/BSG wajib izin Bupati (Pasal 17)", () => {
    for (const kind of ["KERJASAMA", "BGS_BSG"] as const) {
      assert.ok(activationBlockers({ ...base, kind }).some((x) => x.includes("Pasal 17")));
      assert.deepEqual(activationBlockers({ ...base, kind, regencyPermitNo: "B/1", regencyPermitDate: d("2026-01-01") }), []);
    }
  });
});

describe("Tanah kas dan sewa: peringatan", () => {
  const A = (o: Record<string, unknown> = {}) => ({ id: 1, kind: "SEWA" as const, status: "AKTIF", endOn: "2027-12-31", itemId: 5, itemName: "Tanah Bengkok Blok A", category: "TANAH_KAS_DESA", strategic: true, lesseeName: "Pak Slamet", regencyPermitNo: null, appraisalRef: "Penilaian KJPP 1", perdesNo: "3/2025", ...o });
  const C = (o: Record<string, unknown> = {}) => ({ id: 10, agreementId: 1, seq: 1, dueOn: "2026-11-01", status: "BELUM", amountCents: 6_000_000_00n, entryMissing: false, entryAmountMismatch: false, ...o });
  const run = (o: Partial<FindingInput>) => landFindings({ today: "2026-11-01", agreements: [A()], charges: [], parcels: [], landItemsWithoutParcel: [], ...o });
  const codes = (o: Partial<FindingInput>) => run(o).map((f) => f.code);
  it("tagihan terlambat, segera jatuh tempo, dan masih jauh", () => {
    assert.ok(codes({ charges: [C({ dueOn: "2026-10-20" })] }).includes("TERLAMBAT"));
    assert.ok(codes({ charges: [C({ dueOn: "2026-11-20" })] }).includes("SEGERA_JATUH_TEMPO"));
    assert.ok(!codes({ charges: [C({ dueOn: "2027-03-01" })] }).some((c) => c === "TERLAMBAT" || c === "SEGERA_JATUH_TEMPO"));
    const late = run({ charges: [C({ dueOn: "2026-10-20" })] }).find((f) => f.code === "TERLAMBAT")!;
    assert.equal(late.severity, "bahaya");
    assert.ok(late.message.includes("terlambat 12 hari"));
  });
  it("perjanjian berakhir / segera berakhir; BATAL dan DRAF diabaikan; SELESAI hanya memperingatkan tunggakan", () => {
    assert.ok(codes({ agreements: [A({ endOn: "2026-10-31" })] }).includes("PERJANJIAN_BERAKHIR"));
    assert.ok(codes({ agreements: [A({ endOn: "2027-01-15" })] }).includes("PERJANJIAN_SEGERA_BERAKHIR"));
    assert.deepEqual(codes({ agreements: [A({ status: "BATAL", endOn: "2020-01-01" })], charges: [C({ dueOn: "2020-01-01" })] }), []);
    assert.deepEqual(codes({ agreements: [A({ status: "DRAF", endOn: "2020-01-01" })], charges: [C({ dueOn: "2020-01-01" })] }), []);
    // SELESAI: tunggakan tetap diperingatkan, tetapi tanpa peringatan "perjanjian berakhir".
    assert.ok(codes({ agreements: [A({ status: "SELESAI", endOn: "2020-01-01" })], charges: [C({ dueOn: "2026-10-20" })] }).includes("TERLAMBAT"));
    assert.ok(!codes({ agreements: [A({ status: "SELESAI", endOn: "2020-01-01" })], charges: [C({ dueOn: "2026-10-20" })] }).includes("PERJANJIAN_BERAKHIR"));
  });
  it("aset strategis tanpa izin hanya info (sewa); penilaian belum dicatat; tidak ada izin palsu", () => {
    assert.ok(codes({}).includes("STRATEGIS_TANPA_IZIN"));
    assert.ok(!codes({ agreements: [A({ regencyPermitNo: "B/9" })] }).includes("STRATEGIS_TANPA_IZIN"));
    assert.ok(codes({ agreements: [A({ appraisalRef: null })] }).includes("TANPA_PENILAIAN"));
    assert.ok(!codes({ agreements: [A({ kind: "KERJASAMA" })] }).includes("STRATEGIS_TANPA_IZIN"));
  });
  it("penerimaan yang hilang dari Buku Kas Umum = bahaya; jumlah beda = peringatan", () => {
    assert.equal(run({ charges: [C({ status: "DITERIMA", entryMissing: true })] })[0]!.code, "BKU_HILANG");
    assert.equal(run({ charges: [C({ status: "DITERIMA", entryAmountMismatch: true })] })[0]!.code, "BKU_BEDA");
    assert.ok(!codes({ charges: [C({ status: "DITERIMA" })] }).some((c) => c.startsWith("BKU")));
  });
  it("tanah tanpa sertipikat dan tanah belum dilengkapi menjadi info; peringatan berat di depan", () => {
    const f = run({ parcels: [{ itemId: 5, itemName: "T", rightKind: "LETTER_C", areaSqm: 10 }, { itemId: 6, itemName: "U", rightKind: "BELUM_ADA", areaSqm: 10 }, { itemId: 7, itemName: "V", rightKind: "SHM", areaSqm: 10 }], landItemsWithoutParcel: [{ itemId: 8, name: "W" }], charges: [C({ dueOn: "2026-10-01" })] });
    assert.equal(f[0]!.severity, "bahaya");
    const c = f.map((x) => x.code);
    assert.ok(c.includes("BUKTI_HAK_BELUM_SERTIPIKAT") && c.includes("TANPA_BUKTI_HAK") && c.includes("TANAH_BELUM_LENGKAP"));
    assert.equal(c.filter((x) => x === "TANPA_BUKTI_HAK" || x === "BUKTI_HAK_BELUM_SERTIPIKAT").length, 2);
  });
});

describe("Tanah kas dan sewa: validasi isian", () => {
  it("luas: angka positif, maksimal 2 desimal, bukan teks aneh", () => {
    assert.equal(parseArea("1250,5"), "1250.50");
    assert.equal(parseArea(300), "300.00");
    for (const bad of ["0", -1, "abc", "1e3", "12.345", NaN, Infinity, null, undefined, [], {}, "999999999999"]) assert.equal(parseArea(bad as never), null, String(bad));
  });
  it("tanah: sertipikat wajib bernomor; tanggal masa depan ditolak; bukan objek ditolak", () => {
    const base = { areaSqm: "500", rightKind: "SHM" };
    const r = parseParcelInput(base);
    assert.ok(!r.ok && r.fieldErrors.rightNumber);
    assert.ok(parseParcelInput({ ...base, rightNumber: "123" }).ok);
    assert.ok(parseParcelInput({ areaSqm: "500", rightKind: "LETTER_C" }).ok);
    const f = parseParcelInput({ ...base, rightNumber: "1", rightIssuedOn: "2099-01-01" }, new Date("2026-11-01"));
    assert.ok(!f.ok && f.fieldErrors.rightIssuedOn);
    assert.ok(!parseParcelInput("x").ok);
    assert.ok(!parseParcelInput({ areaSqm: "500", rightKind: "HAK_MILIK_PALSU" }).ok);
    assert.ok(!parseParcelInput({ areaSqm: "500", rightKind: "BELUM_ADA", usage: "ASAL" }).ok);
    assert.ok(!parseParcelInput({ areaSqm: "500", rightKind: "BELUM_ADA", address: "x".repeat(256) }).ok);
  });
  it("perjanjian sah diterima dan angka uang dipertahankan sebagai sen", () => {
    const r = parseAgreementInput(GOOD);
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.value.amountCents, 600_000_000n);
  });
  it("jangka waktu melebihi batas jenis ditolak dengan dasar pasal", () => {
    const over = parseAgreementInput({ ...GOOD, endOn: "2029-01-02", periodUnit: "SEKALI" });
    assert.ok(!over.ok && over.fieldErrors.endOn?.includes("paling lama 3 tahun"));
    assert.ok(parseAgreementInput({ ...GOOD, endOn: "2029-01-01", periodUnit: "SEKALI" }).ok);
    assert.ok(parseAgreementInput({ ...GOOD, kind: "KERJASAMA", endOn: "2040-12-31", periodUnit: "TAHUN" }).ok);
    assert.ok(!parseAgreementInput({ ...GOOD, kind: "KERJASAMA", endOn: "2042-12-31", periodUnit: "TAHUN" }).ok);
    assert.ok(parseAgreementInput({ ...GOOD, kind: "BGS_BSG", endOn: "2045-12-31", periodUnit: "TAHUN" }).ok);
    assert.ok(!parseAgreementInput({ ...GOOD, kind: "BGS_BSG", endOn: "2046-12-31", periodUnit: "TAHUN" }).ok);
  });
  it("periode harus utuh; jadwal terpanjang (20 tahun bulanan = 240) tepat di batas dan diterima", () => {
    assert.ok(!parseAgreementInput({ ...GOOD, endOn: "2027-06-30" }).ok);
    assert.ok(parseAgreementInput({ ...GOOD, kind: "BGS_BSG", endOn: "2045-12-31", periodUnit: "BULAN" }).ok);
  });
  it("isian jahat: tanggal terbalik/aneh, uang nol/negatif/teks, enum asing, rekening bukan pendapatan aset", () => {
    for (const patch of [
      { endOn: "2025-12-31" },
      { startOn: "0001-01-01" },
      { startOn: "bukan-tanggal" },
      { amount: 0 },
      { amount: -5 },
      { amount: "1e9" },
      { amount: "abc" },
      { amount: ["1"] },
      { amount: "9".repeat(20) },
      { kind: "HIBAH" },
      { periodUnit: "MINGGU" },
      { lesseeKind: "ROBOT" },
      { lesseeName: "" },
      { lesseeName: "x".repeat(151) },
      { accountCode: "5.2.1.01" },
      { accountCode: "4.2.1.01" },
      { leasedAreaSqm: "-3" },
      { forceMajeureIncluded: "ya" },
      { perdesNo: "1/2025" },
    ]) {
      assert.ok(!parseAgreementInput({ ...GOOD, ...patch }).ok, JSON.stringify(patch));
    }
    assert.ok(!parseAgreementInput(null).ok);
    assert.ok(!parseAgreementInput([]).ok);
  });
  it("perubahan terbatas menolak bidang pokok", () => {
    assert.ok(parseAmendInput({ lesseeContact: "0812" }).ok);
    assert.ok(!parseAmendInput({ amount: 1 }).ok);
    assert.ok(!parseAmendInput({ endOn: "2030-01-01" }).ok);
    assert.ok(!parseAmendInput({ regencyPermitNo: "B/1" }).ok);
  });
  it("penerimaan: tanggal wajar dan bukan masa depan, saluran sah", () => {
    const now = new Date("2026-11-01T03:00:00Z");
    assert.ok(parseReceiveInput({ receivedOn: "2026-10-30", channel: "BANK" }, now).ok);
    assert.ok(!parseReceiveInput({ receivedOn: "2026-12-30", channel: "BANK" }, now).ok);
    assert.ok(!parseReceiveInput({ receivedOn: "2026-10-30", channel: "CEK" }, now).ok);
    assert.ok(!parseReceiveInput({ receivedOn: "1999-10-30", channel: "BANK" }, now).ok);
    assert.ok(!parseReceiveInput({ receivedOn: "2026-10-30", channel: "BANK", voucherNo: "x".repeat(61) }, now).ok);
  });
  it("lampiran: id arsip harus bilangan bulat positif", () => {
    assert.ok(parseDocInput({ kind: "PERDES", archiveId: "123" }).ok);
    assert.ok(parseDocInput({ kind: "PERDES", archiveId: 7 }).ok);
    for (const archiveId of ["0", "-1", "1.5", "abc", "1e3", null, [], "9".repeat(20)]) assert.ok(!parseDocInput({ kind: "PERDES", archiveId }).ok, String(archiveId));
    assert.ok(!parseDocInput({ kind: "KUITANSI", archiveId: "1" }).ok);
  });
});

describe("Tanah kas dan sewa: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    return { r, ok: roleCan(r.resource, r.action, role) };
  };
  it("rute aset memakai aset_desa; staf hanya membaca", () => {
    assert.equal(gate("/api/aset-desa/pemanfaatan", "GET", "staff").r.resource, "aset_desa");
    assert.ok(gate("/api/aset-desa/pemanfaatan", "GET", "staff").ok);
    assert.ok(!gate("/api/aset-desa/pemanfaatan", "POST", "staff").ok);
    assert.ok(!gate("/api/aset-desa/tanah/3", "PUT", "staff").ok);
    assert.ok(gate("/api/aset-desa/tanah/3", "PUT", "secretary").ok);
    assert.ok(!gate("/api/aset-desa/pemanfaatan/4/aksi", "POST", "village_head").ok);
  });
  it("mencatat/membatalkan penerimaan memakai izin APB Desa (menulis Buku Kas Umum)", () => {
    const t = gate("/api/aset-desa/pemanfaatan/tagihan/12/terima", "POST", "staff");
    assert.equal(t.r.resource, "apbdes");
    assert.ok(t.ok, "Kaur Keuangan boleh mencatat penerimaan");
    assert.ok(!gate("/api/aset-desa/pemanfaatan/tagihan/12/terima", "POST", "village_head").ok);
    assert.equal(gate("/api/aset-desa/pemanfaatan/tagihan/12/batal-terima", "POST", "admin").r.action, "delete");
    assert.ok(!gate("/api/aset-desa/pemanfaatan/tagihan/12/batal-terima", "POST", "village_head").ok);
  });
});
