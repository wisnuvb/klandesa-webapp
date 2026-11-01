import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { facilityStatus, kdmpFindings, shareBps, daysBetween, type KdmpFacts } from "../lib/kdmp/calc";
import { parseDisbursement, parseFacilityCreate, parseFacilityPatch, parseInstallment, parseProgress } from "../lib/kdmp/schema";
import { RULES } from "../lib/dana-desa/rules";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

const F = (o: Partial<KdmpFacts> = {}): KdmpFacts => ({
  ruleShareBps: 5803,
  kdmpPaguCents: 500_000_000_00n,
  regularPaguCents: 361_000_000_00n,
  receivedCents: 200_000_000_00n,
  paidCents: 50_000_000_00n,
  budgetedCents: 500_000_000_00n,
  facilities: [{ id: 1, name: "Gerai Desa", contractCents: 100_000_000_00n, paidCents: 50_000_000_00n, progressPct: 50, progressOn: "2026-10-20", operatingOn: null }],
  unassignedPaidCents: 0n,
  today: "2026-11-01",
  ...o,
});
const codes = (f: KdmpFacts) => kdmpFindings(f).map((x) => x.code);

describe("KDMP: aturan dan perhitungan", () => {
  it("acuan pagu KDMP 58,03% memakai aturan tahun 2026", () => {
    assert.equal(RULES[2026]!.kdmpShareBps, 5803);
    assert.equal(shareBps(5803n, 10000n), 5803);
    assert.equal(shareBps(1n, 0n), 0);
  });

  it("status gerai diturunkan dari progres dan tanggal beroperasi", () => {
    assert.equal(facilityStatus(0, null), "RENCANA");
    assert.equal(facilityStatus(1, null), "PEMBANGUNAN");
    assert.equal(facilityStatus(99, null), "PEMBANGUNAN");
    assert.equal(facilityStatus(100, null), "SELESAI");
    assert.equal(facilityStatus(100, "2026-10-01"), "BEROPERASI");
  });

  it("keadaan wajar tidak menghasilkan peringatan atau galat", () => {
    const levels = kdmpFindings(F()).filter((x) => x.level !== "INFO");
    assert.deepEqual(levels, []);
  });

  it("pagu belum diisi hanya memberi informasi; persentase menyimpang diberi info bukan galat", () => {
    assert.ok(codes(F({ kdmpPaguCents: null })).includes("PAGU_MISSING"));
    // 500 : 361 = 58,07% (dalam toleransi 0,5 poin), 300 : 500 = 37,5% (menyimpang)
    assert.ok(!codes(F()).includes("SHARE_DIFF"));
    const f = kdmpFindings(F({ kdmpPaguCents: 300_000_000_00n, regularPaguCents: 500_000_000_00n }));
    const d = f.find((x) => x.code === "SHARE_DIFF")!;
    assert.equal(d.level, "INFO");
    assert.match(d.message, /37,5%/);
  });

  it("penyaluran melebihi pagu adalah galat", () => {
    const f = kdmpFindings(F({ receivedCents: 500_000_000_01n, paidCents: 0n, facilities: [] }));
    assert.equal(f.find((x) => x.code === "OVER_PAGU")?.level, "ERROR");
    assert.ok(!codes(F({ receivedCents: 500_000_000_00n, paidCents: 0n })).includes("OVER_PAGU"), "tepat sama dengan pagu masih sah");
  });

  it("dana diterima tetapi belum dianggarkan di APB Desa: peringatan, dengan pesan berbeda bila APB Desa belum ada", () => {
    const a = kdmpFindings(F({ budgetedCents: 100_000_000_00n })).find((x) => x.code === "NOT_BUDGETED")!;
    assert.equal(a.level, "WARN");
    assert.match(a.message, /baru Rp100\.000\.000 yang dianggarkan/);
    const b = kdmpFindings(F({ budgetedCents: null })).find((x) => x.code === "NOT_BUDGETED")!;
    assert.match(b.message, /belum ada APB Desa/);
    assert.ok(!codes(F({ budgetedCents: 200_000_000_00n })).includes("NOT_BUDGETED"), "anggaran sama dengan penerimaan sudah cukup");
  });

  it("angsuran melebihi anggaran KDMP di APB Desa diperingatkan", () => {
    assert.ok(codes(F({ budgetedCents: 40_000_000_00n })).includes("PAID_OVER_BUDGET"));
    assert.ok(!codes(F({ budgetedCents: 50_000_000_00n })).includes("PAID_OVER_BUDGET"));
  });

  it("angsuran yang mendahului progres fisik lebih dari 20 poin diperingatkan; tepat 20 poin tidak", () => {
    const fac = (paid: bigint, pct: number) => [{ id: 1, name: "Gudang", contractCents: 100_000_000_00n, paidCents: paid, progressPct: pct, progressOn: "2026-10-30", operatingOn: null }];
    assert.ok(codes(F({ facilities: fac(71_000_000_00n, 50), paidCents: 71_000_000_00n })).includes("PAY_AHEAD"));
    assert.ok(!codes(F({ facilities: fac(70_000_000_00n, 50), paidCents: 70_000_000_00n })).includes("PAY_AHEAD"));
  });

  it("gerai tanpa nilai pekerjaan, progres basi, angsuran tanpa kaitan, dan belum ada gerai diberi informasi", () => {
    const base = { id: 2, name: "Kelengkapan", contractCents: null, paidCents: 10n, progressPct: 30, progressOn: "2026-08-01", operatingOn: null };
    const c = codes(F({ facilities: [base], unassignedPaidCents: 5n }));
    assert.ok(c.includes("NO_CONTRACT") && c.includes("STALE") && c.includes("UNASSIGNED"));
    assert.ok(codes(F({ facilities: [] })).includes("NO_FACILITY"));
    assert.equal(daysBetween("2026-08-01", "2026-11-01"), 92);
    assert.ok(!codes(F({ facilities: [{ ...base, operatingOn: "2026-09-01", progressPct: 100 }] })).includes("STALE"), "yang sudah beroperasi tidak perlu progres");
  });

  it("saldo dana yang belum diangsurkan dilaporkan", () => {
    assert.ok(codes(F()).includes("BALANCE"));
    assert.ok(!codes(F({ receivedCents: 50_000_000_00n })).includes("BALANCE"));
  });
});

describe("KDMP: validasi masukan", () => {
  it("penyaluran: jumlah positif, tanggal wajib, teks dibatasi", () => {
    assert.equal(parseDisbursement({ year: 2026, receivedOn: "2026-10-01", amount: "1500000" }).ok, true);
    for (const amount of ["0", "-1", "abc", "", "100000000000000"]) assert.equal(parseDisbursement({ year: 2026, receivedOn: "2026-10-01", amount }).ok, false, amount);
    assert.equal(parseDisbursement({ year: 2026, receivedOn: "bukan", amount: "1" }).ok, false);
    assert.equal(parseDisbursement({ year: 1999, receivedOn: "2026-10-01", amount: "1" }).ok, false);
    assert.equal(parseDisbursement({ year: 2026, receivedOn: "2026-10-01", amount: "1", reference: "x".repeat(151) }).ok, false);
    assert.equal(parseDisbursement(null).ok, false);
  });

  it("angsuran: penerima wajib, faktur gerai harus bilangan positif", () => {
    assert.equal(parseInstallment({ year: 2026, paidOn: "2026-10-01", amount: "100", payee: "PT X" }).ok, true);
    assert.equal(parseInstallment({ year: 2026, paidOn: "2026-10-01", amount: "100", payee: " " }).ok, false);
    assert.equal(parseInstallment({ year: 2026, paidOn: "2026-10-01", amount: "100", payee: "A", facilityId: "x" }).ok, false);
    const r = parseInstallment({ year: 2026, paidOn: "2026-10-01", amount: "100", payee: "A", facilityId: 7 });
    assert.ok(r.ok && r.value.facilityId === 7);
  });

  it("gerai: jenis dikenal, nilai opsional tetapi positif; perubahan hanya kolom yang dikirim", () => {
    assert.equal(parseFacilityCreate({ year: 2026, kind: "GERAI", name: "Gerai" }).ok, true);
    assert.equal(parseFacilityCreate({ year: 2026, kind: "RUMAH", name: "x" }).ok, false);
    assert.equal(parseFacilityCreate({ year: 2026, kind: "GERAI", name: "x", contract: "0" }).ok, false);
    const p = parseFacilityPatch({ name: "Baru" });
    assert.ok(p.ok && Object.keys(p.value).join() === "name");
    assert.equal(parseFacilityPatch({ name: "" }).ok, false);
    const c = parseFacilityPatch({ contract: "" });
    assert.ok(c.ok && c.value.contractCents === null);
  });

  it("koersi ketat: bentuk bilangan aneh ditolak (tinjauan keamanan #6)", () => {
    for (const year of ["1e3", "0x7E8", [2026], true, "2026.5", null]) assert.equal(parseDisbursement({ year, receivedOn: "2026-10-01", amount: "1" }).ok, false, String(year));
    assert.equal(parseDisbursement({ year: "2026", receivedOn: "2026-10-01", amount: "1" }).ok, true);
    for (const facilityId of ["1e3", "0x10", true, [3], -1, 0]) assert.equal(parseInstallment({ year: 2026, paidOn: "2026-10-01", amount: "1", payee: "A", facilityId }).ok, false, String(facilityId));
  });

  it("tanggal wajar: tahun < 2000 dan tanggal jauh dari tahun anggaran ditolak (tinjauan keamanan #4)", () => {
    for (const d of ["0001-01-01", "1990-05-05", "2030-01-01", "2024-12-31"]) assert.equal(parseDisbursement({ year: 2026, receivedOn: d, amount: "1" }).ok, false, d);
    for (const d of ["2025-12-31", "2026-06-01", "2027-01-01"]) assert.equal(parseDisbursement({ year: 2026, receivedOn: d, amount: "1" }).ok, true, d);
    assert.equal(parseInstallment({ year: 2026, paidOn: "1900-01-01", amount: "1", payee: "A" }).ok, false);
    assert.equal(parseProgress({ recordedOn: "0001-01-01", progressPct: 5 }).ok, false);
    assert.equal(parseFacilityPatch({ operatingOn: "1999-12-31" }).ok, false);
  });

  it("progres: bilangan bulat 0-100", () => {
    for (const v of [0, 50, 100, "75"]) assert.equal(parseProgress({ recordedOn: "2026-10-01", progressPct: v }).ok, true, String(v));
    for (const v of [-1, 101, 50.5, "abc", "1000", null, undefined]) assert.equal(parseProgress({ recordedOn: "2026-10-01", progressPct: v }).ok, false, String(v));
    assert.equal(parseProgress({ recordedOn: "x", progressPct: 5 }).ok, false);
  });
});

describe("KDMP: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    return roleCan(r.resource, r.action, role);
  };
  const paths = ["/api/kdmp/penyaluran", "/api/kdmp/angsuran", "/api/kdmp/fasilitas", "/api/kdmp/fasilitas/3/progres"];

  it("semua peran dapat membaca ringkasan; Kepala Desa tidak dapat mencatat atau mengubah", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/kdmp", "GET", role), true, role);
    for (const p of paths) {
      assert.equal(gate(p, "POST", "village_head"), false, p);
      assert.equal(gate(p, "POST", "staff"), true, p);
    }
    assert.equal(gate("/api/kdmp/fasilitas/3", "PATCH", "village_head"), false);
  });

  it("penghapusan catatan uang dibuka bagi yang berhak hapus, lalu dibatasi lagi di dalam rute (admin saja)", () => {
    for (const p of ["/api/kdmp/penyaluran/4", "/api/kdmp/angsuran/4"]) {
      assert.equal(gate(p, "DELETE", "village_head"), false, p);
      assert.equal(gate(p, "DELETE", "admin"), true, p);
    }
    // Kunci "hanya admin": rute memeriksa delete DAN approve; bila matriks bergeser, tes ini gagal (tinjauan keamanan #2).
    const both = (["admin", "village_head", "secretary", "staff"] as const).filter((r) => roleCan("apbdes", "delete", r) && roleCan("apbdes", "approve", r));
    assert.deepEqual(both, ["admin"]);
  });
});
