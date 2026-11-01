import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { agreementFindings, missingContents, selfShareCents, totalCents, transitionBlockers, workdaysBetween, type AgreementFacts } from "../lib/kerja-sama/calc";
import { parseAgreementCreate, parseAgreementPatch, parseBudget, parseEnd, parseParty, parsePartyPatch, parseSign } from "../lib/kerja-sama/schema";
import { isEndReason, isField, isInitiative, isKind, isPartyKind, isStatus } from "../lib/kerja-sama/catalog";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

const HELD = { status: "HELD", heldOn: "2026-03-01" };
const F = (o: Partial<AgreementFacts> = {}): AgreementFacts => ({
  kind: "ANTAR_DESA",
  initiative: null,
  status: "PERSIAPAN",
  scope: "Pengelolaan wisata bersama",
  procedures: "Dikelola BKAD",
  rights: "Hak dan kewajiban",
  funding: "APB Desa masing-masing",
  amendment: "Atas kesepakatan",
  dispute: "Musyawarah",
  termStartOn: "2026-06-01",
  termEndOn: "2027-05-31",
  prepMusdes: HELD,
  inPlanConfirmed: true,
  offerSentOn: null,
  offerMusdes: null,
  offerDecision: null,
  offerReplyOn: null,
  consultRequired: false,
  consultedOn: null,
  agreedOn: null,
  signedOn: null,
  signedNumber: null,
  witnessName: null,
  reportedOn: null,
  reportedToCamatOn: null,
  endReason: null,
  parties: [{ kind: "SELF", name: "Desa A", representativeName: "Kades A" }],
  budget: [],
  ...o,
});
const two = [
  { kind: "SELF", name: "Desa A", representativeName: "Kades A" },
  { kind: "DESA", name: "Desa B", representativeName: "Kades B" },
];

describe("kerja sama: pagar tahap (Permendagri 96/2017)", () => {
  it("persiapan -> penawaran: Musdes terlaksana, tercantum di RPJM/RKP, delapan muatan untuk antar-Desa", () => {
    assert.deepEqual(transitionBlockers("PENAWARAN", F()), []);
    assert.ok(transitionBlockers("PENAWARAN", F({ prepMusdes: null })).some((b) => /Musyawarah Desa/.test(b)));
    assert.ok(transitionBlockers("PENAWARAN", F({ prepMusdes: { status: "PLANNED", heldOn: null } })).some((b) => /Musyawarah Desa/.test(b)), "dijadwalkan saja belum cukup");
    assert.ok(transitionBlockers("PENAWARAN", F({ inPlanConfirmed: false })).some((b) => /RPJM Desa dan RKP Desa/.test(b)));
    assert.ok(transitionBlockers("PENAWARAN", F({ rights: null, dispute: null })).some((b) => /delapan butir/.test(b) && /Hak dan kewajiban/.test(b)));
  });
  it("prakarsa pihak ketiga tidak melewati persiapan oleh Desa; cukup ruang lingkup", () => {
    const f = F({ kind: "PIHAK_KETIGA", initiative: "PIHAK_KETIGA", prepMusdes: null, inPlanConfirmed: false, rights: null, dispute: null });
    assert.deepEqual(transitionBlockers("PENAWARAN", f), []);
    assert.ok(transitionBlockers("PENAWARAN", { ...f, scope: null }).length);
    const byDesa = F({ kind: "PIHAK_KETIGA", initiative: "DESA", prepMusdes: null });
    assert.ok(transitionBlockers("PENAWARAN", byDesa).length, "prakarsa Desa tetap wajib Musdes");
  });
  it("penawaran -> penyusunan: musyawarah penawaran terlaksana, menyepakati, jawaban tertulis, para pihak", () => {
    const base = F({ status: "PENAWARAN", parties: two, offerMusdes: HELD, offerDecision: "SEPAKAT", offerReplyOn: "2026-03-10" });
    assert.deepEqual(transitionBlockers("PENYUSUNAN", base), []);
    assert.ok(transitionBlockers("PENYUSUNAN", { ...base, offerDecision: "TIDAK" }).some((b) => /menyepakati/.test(b)));
    assert.ok(transitionBlockers("PENYUSUNAN", { ...base, offerMusdes: null }).some((b) => /Musyawarah Desa/.test(b)));
    assert.ok(transitionBlockers("PENYUSUNAN", { ...base, offerReplyOn: null }).some((b) => /jawaban tertulis/.test(b)));
    assert.ok(transitionBlockers("PENYUSUNAN", { ...base, parties: [two[0]] }).some((b) => /para pihak/i.test(b)));
    assert.deepEqual(transitionBlockers("PENYUSUNAN", { ...base, kind: "PIHAK_KETIGA", initiative: "PIHAK_KETIGA", offerReplyOn: null }), [], "jawaban tertulis hanya antar-Desa");
  });
  it("penandatanganan: muatan lengkap, penandatangan, tanggal sepakat, konsultasi bila membebani APB Desa", () => {
    const ok = F({ status: "PENYUSUNAN", parties: two, agreedOn: "2026-04-01", signedOn: "2026-04-03", signedNumber: "PB/1" });
    assert.deepEqual(transitionBlockers("DITANDATANGANI", ok), []);
    assert.ok(transitionBlockers("DITANDATANGANI", { ...ok, agreedOn: null }).some((b) => /kesepakatan/.test(b)));
    assert.ok(transitionBlockers("DITANDATANGANI", { ...ok, parties: [two[0], { ...two[1], representativeName: null }] }).some((b) => /penandatangan/.test(b)));
    assert.ok(transitionBlockers("DITANDATANGANI", { ...ok, funding: null }).some((b) => /Muatan minimal/.test(b)));
    assert.ok(transitionBlockers("DITANDATANGANI", { ...ok, termEndOn: "2026-01-01" }).some((b) => /sebelum tanggal mulai/.test(b)));
    assert.ok(transitionBlockers("DITANDATANGANI", { ...ok, signedOn: "2026-03-30" }).some((b) => /sebelum tanggal kesepakatan/.test(b)));
    assert.ok(transitionBlockers("DITANDATANGANI", { ...ok, signedNumber: null }).some((b) => /nomor/i.test(b)));
    // pembebanan APB Desa => konsultasi wajib
    const burden = { ...ok, budget: [{ amountCents: 5_000_000_00n, bearerKind: "SELF" }] };
    assert.ok(transitionBlockers("DITANDATANGANI", burden).some((b) => /dikonsultasikan/.test(b)));
    assert.deepEqual(transitionBlockers("DITANDATANGANI", { ...burden, consultedOn: "2026-03-20" }), []);
    assert.ok(transitionBlockers("DITANDATANGANI", { ...ok, consultRequired: true }).some((b) => /dikonsultasikan/.test(b)));
    const notMine = { ...ok, budget: [{ amountCents: 5_000_000_00n, bearerKind: "DESA" }] };
    assert.deepEqual(transitionBlockers("DITANDATANGANI", notMine), [], "beban pihak lain tidak mewajibkan konsultasi");
  });
  it("urutan tidak dapat dilompati; BATAL hanya sebelum ditandatangani; berakhir butuh sebab", () => {
    assert.match(transitionBlockers("PENYUSUNAN", F())[0], /tidak dapat langsung/);
    assert.match(transitionBlockers("PELAKSANAAN", F({ status: "PENYUSUNAN" }))[0], /tidak dapat langsung/);
    assert.match(transitionBlockers("BATAL", F({ status: "DITANDATANGANI" }))[0], /tidak dapat langsung/);
    assert.deepEqual(transitionBlockers("BATAL", F({ status: "PENAWARAN" })), []);
    assert.deepEqual(transitionBlockers("PELAKSANAAN", F({ status: "DITANDATANGANI" })), []);
    assert.ok(transitionBlockers("SELESAI", F({ status: "PELAKSANAAN" })).some((b) => /sebab berakhir/.test(b)));
    assert.deepEqual(transitionBlockers("SELESAI", F({ status: "PELAKSANAAN", endReason: "MASA_BERAKHIR" })), []);
    assert.match(transitionBlockers("PELAKSANAAN", F({ status: "SELESAI" }))[0], /sudah berakhir/);
    assert.match(transitionBlockers("PENAWARAN", F({ status: "BATAL" }))[0], /sudah berakhir/);
  });
});

describe("kerja sama: perhitungan dan temuan", () => {
  it("total RAB dan beban Desa ini", () => {
    const f = F({ budget: [{ amountCents: 100n, bearerKind: "SELF" }, { amountCents: 250n, bearerKind: "DESA" }, { amountCents: 50n, bearerKind: null }] });
    assert.equal(totalCents(f), 400n);
    assert.equal(selfShareCents(f), 100n);
  });
  it("hari kerja melewati akhir pekan", () => {
    assert.equal(workdaysBetween("2026-04-03", "2026-04-10"), 5); // Jumat -> Jumat
    assert.equal(workdaysBetween("2026-04-03", "2026-04-06"), 1); // Jumat -> Senin
    assert.equal(workdaysBetween("2026-04-01", "2026-04-01"), 0);
  });
  it("muatan yang belum terisi disebut satu per satu", () => {
    assert.deepEqual(missingContents(F()), []);
    assert.deepEqual(missingContents(F({ scope: null, termEndOn: null })), ["Ruang lingkup kerja sama", "Jangka waktu"]);
  });
  it("temuan: terlambat tanda tangan, masa berlaku lewat, belum dilaporkan, belum tercantum RPJM/RKP", () => {
    const codes = (f: AgreementFacts, today = "2026-05-01") => agreementFindings(f, today).map((x) => x.code);
    assert.ok(codes(F({ status: "DITANDATANGANI", agreedOn: "2026-04-01", signedOn: "2026-04-15" })).includes("SIGN_LATE"), "10 hari kerja > 7");
    assert.ok(!codes(F({ status: "DITANDATANGANI", agreedOn: "2026-04-01", signedOn: "2026-04-08" })).includes("SIGN_LATE"));
    assert.ok(codes(F({ status: "PELAKSANAAN", termEndOn: "2026-04-30" })).includes("TERM_OVER"));
    assert.ok(!codes(F({ status: "PELAKSANAAN", termEndOn: "2026-06-30" })).includes("TERM_OVER"));
    assert.ok(codes(F({ status: "PELAKSANAAN" })).includes("NOT_REPORTED"));
    assert.ok(codes(F({ status: "PENAWARAN", inPlanConfirmed: false })).includes("NOT_IN_PLAN"));
    assert.ok(codes(F({ status: "PENYUSUNAN", budget: [{ amountCents: 100n, bearerKind: null }] })).includes("RAB_NO_BEARER"));
    assert.ok(codes(F({ status: "PENYUSUNAN", budget: [{ amountCents: 100n, bearerKind: "SELF" }] })).includes("BEBAN_APBDES"));
    assert.deepEqual(agreementFindings(F({ status: "BATAL" }), "2026-05-01"), []);
  });
});

describe("kerja sama: validasi masukan", () => {
  it("pembuatan: jenis, prakarsa, bidang, tahun", () => {
    assert.ok(parseAgreementCreate({ year: 2026, kind: "ANTAR_DESA", title: "Wisata", field: "PEMBANGUNAN" }).ok);
    assert.ok(parseAgreementCreate({ year: 2026, kind: "PIHAK_KETIGA", initiative: "DESA", title: "CSR", field: "PEMBERDAYAAN" }).ok);
    assert.ok(!parseAgreementCreate({ year: 2026, kind: "PIHAK_KETIGA", title: "CSR", field: "PEMBERDAYAAN" }).ok, "prakarsa wajib");
    assert.ok(!parseAgreementCreate({ year: 2026, kind: "ANTAR_DESA", initiative: "DESA", title: "x", field: "PEMBANGUNAN" }).ok, "prakarsa hanya pihak ketiga");
    for (const bad of [{ kind: "LAIN" }, { field: "LAIN" }, { title: " " }, { title: "x".repeat(201) }, { year: "2026'" }, { year: 1800 }]) assert.equal(parseAgreementCreate({ year: 2026, kind: "ANTAR_DESA", title: "T", field: "PEMBANGUNAN", ...bad }).ok, false, JSON.stringify(bad));
    assert.equal(parseAgreementCreate(null).ok, false);
    assert.equal(parseAgreementCreate([1]).ok, false);
  });
  it("patch sebagian: teks panjang, tanggal, boolean ketat, id Musdes", () => {
    const r = parseAgreementPatch({ scope: "isi", termStartOn: "2026-06-01", termEndOn: "2027-06-01", inPlanConfirmed: true, prepMusdesId: "7", offerDecision: "SEPAKAT" });
    assert.ok(r.ok && r.value.prepMusdesId === 7 && r.value.inPlanConfirmed === true);
    assert.ok(!parseAgreementPatch({ inPlanConfirmed: "true" }).ok, "boolean harus boolean");
    assert.ok(!parseAgreementPatch({ prepMusdesId: "abc" }).ok);
    assert.ok(!parseAgreementPatch({ prepMusdesId: -3 }).ok);
    assert.ok(!parseAgreementPatch({ offerDecision: "MUNGKIN" }).ok);
    assert.ok(!parseAgreementPatch({ scope: "x".repeat(2001) }).ok);
    assert.ok(!parseAgreementPatch({ scope: 5 }).ok);
    assert.ok(!parseAgreementPatch({ termStartOn: "2026-06-01", termEndOn: "2026-01-01" }).ok);
    assert.ok(!parseAgreementPatch({ agreedOn: "31-12-2026" }).ok);
    const cleared = parseAgreementPatch({ scope: "", prepMusdesId: "", agreedOn: "" });
    assert.ok(cleared.ok && cleared.value.scope === null && cleared.value.prepMusdesId === null && cleared.value.agreedOn === null);
    assert.deepEqual(parseAgreementPatch({ signedOn: "2026-01-01", status: "SELESAI" }), { ok: true, value: {} }, "kolom penting tidak dapat diubah lewat patch");
  });
  it("penandatanganan, berakhir, pihak, RAB", () => {
    assert.ok(parseSign({ signedOn: "2026-04-03", signedNumber: "PB/1" }).ok);
    assert.ok(!parseSign({ signedOn: "2026-04-03" }).ok && !parseSign({ signedNumber: "x" }).ok);
    assert.ok(parseEnd({ endReason: "MASA_BERAKHIR", endedOn: "2027-06-01" }).ok);
    assert.ok(!parseEnd({ endReason: "BOSAN", endedOn: "2027-06-01" }).ok && !parseEnd({ endReason: "MASA_BERAKHIR" }).ok);
    assert.ok(parseParty({ kind: "DESA", name: "Desa B" }).ok);
    assert.ok(!parseParty({ kind: "SELF", name: "Desa A" }).ok, "pihak Desa ini dibuat otomatis");
    assert.ok(!parseParty({ kind: "DESA", name: "" }).ok);
    assert.ok(parsePartyPatch({ representativeName: "X" }).ok);
    assert.ok(parseBudget({ description: "Spanduk", amount: "1500000", bearerId: "3" }).ok);
    assert.ok(!parseBudget({ description: "Spanduk", amount: "0" }).ok);
    assert.ok(!parseBudget({ description: "Spanduk", amount: "1e6" }).ok);
    assert.ok(!parseBudget({ description: "Spanduk" }).ok);
    assert.ok(!parseBudget({ description: "Spanduk", amount: "5", bearerId: "x" }).ok);
  });
});

describe("kerja sama: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    return roleCan(r.resource, r.action, role);
  };
  it("membaca untuk semua; operator mengisi; penandatanganan hanya approve (Kepala Desa/admin)", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/kerja-sama", "GET", role), true);
    assert.equal(gate("/api/kerja-sama", "POST", "staff"), true);
    assert.equal(gate("/api/kerja-sama", "POST", "village_head"), false);
    assert.equal(gate("/api/kerja-sama/4/pihak", "POST", "staff"), true);
    assert.equal(gate("/api/kerja-sama/4/status", "POST", "staff"), true);
    assert.equal(gate("/api/kerja-sama/4/penandatanganan", "POST", "village_head"), true);
    assert.equal(gate("/api/kerja-sama/4/penandatanganan", "POST", "admin"), true);
    assert.equal(gate("/api/kerja-sama/4/penandatanganan", "POST", "staff"), false, "operator tidak dapat mencatat penandatanganan");
    assert.equal(gate("/api/kerja-sama/4/penandatanganan", "POST", "secretary"), false, "sekretaris tidak punya approve (hanya Kepala Desa/admin)");
  });
});

describe("kerja sama: penjaga enum dan panjang", () => {
  it("kunci prototipe bukan nilai sah (kind:\"constructor\" tidak boleh lolos)", () => {
    for (const k of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"]) for (const f of [isKind, isInitiative, isField, isStatus, isPartyKind, isEndReason]) assert.equal(f(k), false, `${f.name}(${k})`);
    assert.ok(!parseAgreementCreate({ year: 2026, kind: "constructor", title: "x", field: "PEMBANGUNAN" }).ok);
    assert.ok(!parseAgreementCreate({ year: 2026, kind: "ANTAR_DESA", title: "x", field: "__proto__" }).ok);
    assert.ok(!parseAgreementCreate({ year: 2026, kind: "PIHAK_KETIGA", initiative: "toString", title: "x", field: "PEMBANGUNAN" }).ok);
    assert.ok(!parseAgreementPatch({ field: "constructor" }).ok);
    assert.ok(!parseEnd({ endReason: "constructor", endedOn: "2027-01-01" }).ok);
    assert.ok(!parseParty({ kind: "constructor", name: "x" }).ok);
  });
  it("nilai terlalu panjang ditolak per kolom", () => {
    const long = "x".repeat(5000);
    for (const k of ["scope", "procedures", "rights", "funding", "amendment", "dispute", "witnessName"]) {
      const r = parseAgreementPatch({ [k]: long });
      assert.ok(!r.ok && r.fieldErrors[k], k);
    }
    assert.ok(!parseSign({ signedOn: "2026-04-03", signedNumber: long }).ok);
    assert.ok(!parseParty({ kind: "DESA", name: long }).ok && !parseParty({ kind: "DESA", name: "A", representativeName: long }).ok);
    assert.ok(!parseBudget({ description: long, amount: "1" }).ok);
  });
  it("penandatanganan: gerbang kedua di berkas rute dan di servis (id ter-encode tidak melewati approve)", () => {
    const f = readFileSync(join(process.cwd(), "app/api/kerja-sama/[id]/penandatanganan/route.ts"), "utf8");
    assert.match(f, /permissions\(ctx, "perencanaan"\)\.approve/);
    assert.ok(f.indexOf('.approve') < f.indexOf("sign(prisma"), "dicek sebelum servis dipanggil");
    assert.ok(resolveApiPermission("/api/kerja-sama/%31%32/penandatanganan", "POST"), "id ter-encode tetap terpetakan");
  });
});
