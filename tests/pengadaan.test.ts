import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { availableFor, committedValue, nameKey, effectivePrice, lowestPassed, negotiationRequired, packageFindings, sppFindings, suggestMethod, tpkProblems, transitionBlockers, type OfferFact, type PackageFacts, type TeamFact } from "../lib/pengadaan/calc";
import { parseMember, parseOffer, parsePackageCreate, parsePackagePatch, parseSetting } from "../lib/pengadaan/schema";
import { EXAMPLE_LIMITS, isElement, isMethod, isMode, isRole, isStatus } from "../lib/pengadaan/catalog";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

const C = (n: number) => BigInt(n) * 100n;
const team = (n: number, over: Partial<TeamFact>[] = []): TeamFact[] =>
  Array.from({ length: n }, (_, i) => ({ role: i === 0 ? "KETUA" : i === 1 ? "SEKRETARIS" : "ANGGOTA", element: (["PERANGKAT", "LEMBAGA", "MASYARAKAT"] as const)[i % 3], ...(over[i] ?? {}) }));
const offer = (id: number, price: number, o: Partial<OfferFact> = {}): OfferFact => ({ id, priceCents: C(price), negotiatedCents: null, passed: true, isWinner: false, ...o });

const F = (o: Partial<PackageFacts> = {}): PackageFacts => ({
  mode: "PENYEDIA",
  method: "PERMINTAAN_PENAWARAN",
  status: "PEMILIHAN",
  hpsCents: C(50_000_000),
  executorName: "Budi",
  executorTitle: "Kasi Pelayanan",
  tpkDecreeNumber: "SK/1",
  tpkDecreeDate: "2026-01-02",
  planAnnouncedOn: "2026-01-03",
  resultAnnouncedOn: null,
  handoverToHeadOn: null,
  singleProviderReason: null,
  negotiationNumber: null,
  negotiationDate: null,
  contractNumber: "SPK/1",
  contractDate: "2026-02-01",
  contractCents: C(48_000_000),
  bastNumber: null,
  bastDate: null,
  bastHandedBy: null,
  bastReceivedBy: null,
  team: team(3),
  teamNames: ["Sari", "Dewi", "Agus"],
  winnerName: "CV Maju",
  offers: [offer(1, 48_000_000, { isWinner: true }), offer(2, 49_000_000)],
  availableCents: C(100_000_000),
  hasBudgetDoc: true,
  ...o,
});

describe("pengadaan: TPK (Peraturan LKPP 12/2019 Pasal 11)", () => {
  it("minimal 3 orang dan gasal; satu ketua dan satu sekretaris", () => {
    assert.deepEqual(tpkProblems(team(3)).blockers, []);
    assert.deepEqual(tpkProblems(team(5)).blockers, []);
    assert.match(tpkProblems(team(2)).blockers[0], /minimal 3/);
    assert.match(tpkProblems(team(4)).blockers[0], /gasal/);
    assert.ok(tpkProblems(team(3, [{ role: "ANGGOTA" }])).blockers.some((b) => /ketua/.test(b)));
    assert.ok(tpkProblems(team(3, [{}, { role: "KETUA" }])).blockers.some((b) => /satu ketua/.test(b)));
    assert.ok(tpkProblems(team(3, [{}, {}, { role: "SEKRETARIS" }])).blockers.some((b) => /satu sekretaris/.test(b)));
  });
  it("unsur yang kurang hanya peringatan", () => {
    const t = team(3, [{ element: "PERANGKAT" }, { element: "PERANGKAT" }, { element: "PERANGKAT" }]);
    const r = tpkProblems(t);
    assert.deepEqual(r.blockers, []);
    assert.equal(r.warnings.length, 1);
  });
});

describe("pengadaan: pemenang dan negosiasi (Lampiran I)", () => {
  it("pemenang = lulus dengan harga akhir terendah; negosiasi mengubah harga akhir", () => {
    const o = [offer(1, 100), offer(2, 90), offer(3, 80, { passed: false })];
    assert.deepEqual(lowestPassed(o).map((x) => x.id), [2]);
    const n = [offer(1, 100, { negotiatedCents: C(85) }), offer(2, 90)];
    assert.deepEqual(lowestPassed(n).map((x) => x.id), [1]);
    assert.equal(effectivePrice(n[0]), C(85));
    assert.deepEqual(lowestPassed([offer(1, 10, { passed: false })]), []);
  });
  it("negosiasi wajib bila hanya satu lulus atau harga terendah kembar", () => {
    assert.equal(negotiationRequired([offer(1, 100)]), true);
    assert.equal(negotiationRequired([offer(1, 100), offer(2, 100)]), true);
    assert.equal(negotiationRequired([offer(1, 100), offer(2, 110)]), false);
    assert.equal(negotiationRequired([offer(1, 100, { passed: false }), offer(2, 110, { passed: false })]), false);
    assert.equal(negotiationRequired([offer(1, 100), offer(2, 100, { passed: false })]), true, "hanya satu lulus");
  });
});

describe("pengadaan: pagar status", () => {
  const prep = (o: Partial<PackageFacts> = {}) => F({ status: "PERSIAPAN", offers: [], contractNumber: null, contractDate: null, contractCents: null, ...o });
  it("persiapan -> pemilihan: perlu metode dan (selain pembelian langsung) TPK sah", () => {
    assert.deepEqual(transitionBlockers("PEMILIHAN", prep({ team: team(3) })), []);
    assert.ok(transitionBlockers("PEMILIHAN", prep({ team: team(2) })).some((b) => /minimal 3/.test(b)));
    assert.deepEqual(transitionBlockers("PEMILIHAN", prep({ method: "PEMBELIAN_LANGSUNG", team: [] })), [], "pembelian langsung tak butuh TPK");
    assert.ok(transitionBlockers("PEMILIHAN", prep({ method: null })).some((b) => /metode/.test(b)));
  });
  it("swakelola tidak lewat pemilihan; langsung ke pelaksanaan dengan TPK sah", () => {
    const sw = prep({ mode: "SWAKELOLA", method: null, team: team(3) });
    assert.match(transitionBlockers("PEMILIHAN", sw)[0], /tidak dapat langsung/);
    assert.deepEqual(transitionBlockers("PELAKSANAAN", sw), []);
    assert.ok(transitionBlockers("PELAKSANAAN", { ...sw, team: team(4) }).some((b) => /gasal/.test(b)));
  });
  it("pemilihan -> pelaksanaan: penawaran, pemenang terendah, BA negosiasi, SPK, dan anggaran", () => {
    assert.deepEqual(transitionBlockers("PELAKSANAAN", F()), []);
    assert.ok(transitionBlockers("PELAKSANAAN", F({ offers: [offer(1, 48_000_000, { isWinner: true })] })).some((b) => /minimal ke 2/.test(b)), "permintaan penawaran butuh 2");
    assert.ok(!transitionBlockers("PELAKSANAAN", F({ offers: [offer(1, 48_000_000, { isWinner: true })], singleProviderReason: "Hanya satu toko", negotiationNumber: "BA/1", negotiationDate: "2026-01-30" })).some((b) => /minimal ke 2/.test(b)), "alasan satu penyedia menggantikan");
    assert.ok(transitionBlockers("PELAKSANAAN", F({ offers: [offer(1, 48_000_000, { isWinner: true }), offer(2, 47_000_000)] })).some((b) => /terendah/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ offers: [offer(1, 48_000_000), offer(2, 49_000_000)] })).some((b) => /Tetapkan penyedia terpilih/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ offers: [offer(1, 48_000_000, { isWinner: true, passed: false }), offer(2, 49_000_000)] })).some((b) => /lulus/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ offers: [offer(1, 48_000_000, { isWinner: true }), offer(2, 48_000_000)] })).some((b) => /Negosiasi|negosiasi/.test(b)), "harga terendah kembar -> BA negosiasi");
    assert.ok(transitionBlockers("PELAKSANAAN", F({ contractNumber: null })).some((b) => /SPK/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ contractCents: null })).some((b) => /nilai kontrak/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ executorName: null })).some((b) => /Kasi\/Kaur/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ team: team(2) })).some((b) => /minimal 3/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ negotiationDate: "2026-03-01", negotiationNumber: "x" })).some((b) => /sebelum berita acara negosiasi/.test(b)));
  });
  it("pembelian langsung: tanpa TPK, tanpa BA negosiasi, cukup satu penawaran", () => {
    const f = F({ method: "PEMBELIAN_LANGSUNG", team: [], offers: [offer(1, 9_000_000, { isWinner: true })], contractCents: C(9_000_000), hpsCents: C(9_500_000) });
    assert.deepEqual(transitionBlockers("PELAKSANAAN", f), []);
  });
  it("anggaran: nilai melebihi sisa atau kegiatan tanpa anggaran memblokir, tanpa APB Desa ditetapkan hanya peringatan", () => {
    assert.ok(transitionBlockers("PELAKSANAAN", F({ availableCents: C(10_000_000) })).some((b) => /melebihi sisa anggaran/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", F({ availableCents: 0n })).some((b) => /belum tersedia/.test(b)));
    assert.deepEqual(transitionBlockers("PELAKSANAAN", F({ availableCents: null, hasBudgetDoc: false })), []);
    assert.ok(packageFindings(F({ availableCents: null, hasBudgetDoc: false }), { directLimitCents: null, offerLimitCents: null }).some((f) => f.code === "NO_BUDGET_DOC"));
    const sw = F({ mode: "SWAKELOLA", method: null, status: "PERSIAPAN", offers: [], team: team(3), hpsCents: C(60_000_000), availableCents: C(50_000_000) });
    assert.ok(transitionBlockers("PELAKSANAAN", sw).some((b) => /melebihi sisa anggaran/.test(b)), "RAB di atas pagu tidak dapat dilanjutkan");
  });
  it("pelaksanaan -> selesai butuh BAST lengkap; tanggal BAST tidak sebelum SPK", () => {
    const run = F({ status: "PELAKSANAAN" });
    assert.ok(transitionBlockers("SELESAI", run).length >= 3);
    const ok = F({ status: "PELAKSANAAN", bastNumber: "B/1", bastDate: "2026-03-01", bastHandedBy: "CV Maju", bastReceivedBy: "Budi" });
    assert.deepEqual(transitionBlockers("SELESAI", ok), []);
    assert.ok(transitionBlockers("SELESAI", { ...ok, bastDate: "2026-01-01" }).some((b) => /sebelum tanggal SPK/.test(b)));
  });
  it("urutan tidak dapat dilompati dan paket final tidak dapat diubah", () => {
    assert.match(transitionBlockers("SELESAI", F({ status: "PEMILIHAN" }))[0], /tidak dapat langsung/);
    assert.match(transitionBlockers("PELAKSANAAN", F({ status: "PERSIAPAN" }))[0], /tidak dapat langsung/);
    assert.match(transitionBlockers("PEMILIHAN", F({ status: "SELESAI" }))[0], /sudah selesai atau dibatalkan/);
    assert.match(transitionBlockers("PEMILIHAN", F({ status: "BATAL" }))[0], /sudah selesai atau dibatalkan/);
    assert.deepEqual(transitionBlockers("BATAL", F({ status: "PELAKSANAAN" })), []);
    assert.deepEqual(transitionBlockers("PERSIAPAN", F({ status: "PEMILIHAN", offers: [offer(1, 1)], contractNumber: null })), []);
    assert.ok(transitionBlockers("PERSIAPAN", F({ status: "PEMILIHAN" })).length, "SPK/pemenang sudah ada");
  });
});

describe("pengadaan: temuan, ambang metode, anggaran", () => {
  const none = { directLimitCents: null, offerLimitCents: null };
  it("tanpa ambang desa tidak ada saran metode; dengan ambang hanya saran dan peringatan", () => {
    assert.equal(suggestMethod(C(5), none), null);
    const lim = { directLimitCents: C(10_000_000), offerLimitCents: C(200_000_000) };
    assert.equal(suggestMethod(C(10_000_000), lim), "PEMBELIAN_LANGSUNG");
    assert.equal(suggestMethod(C(10_000_001), lim), "PERMINTAAN_PENAWARAN");
    assert.equal(suggestMethod(C(200_000_001), lim), "LELANG");
    assert.ok(packageFindings(F({ method: "PEMBELIAN_LANGSUNG", hpsCents: C(15_000_000) }), lim).some((f) => f.code === "OVER_DIRECT"));
    assert.ok(!packageFindings(F({ method: "PEMBELIAN_LANGSUNG", hpsCents: C(15_000_000) }), none).some((f) => f.code === "OVER_DIRECT"), "tanpa ambang, tidak ada peringatan");
    assert.ok(packageFindings(F({ hpsCents: C(250_000_000), contractCents: null }), lim).some((f) => f.code === "OVER_OFFER"));
  });
  it("contoh jenjang lampiran hanyalah konstanta contoh (10 juta dan 200 juta) yang tidak dipakai sebagai aturan", () => {
    assert.equal(EXAMPLE_LIMITS.directLimit, 10_000_000);
    assert.equal(EXAMPLE_LIMITS.offerLimit, 200_000_000);
    assert.ok(!packageFindings(F({ method: "PEMBELIAN_LANGSUNG", hpsCents: C(15_000_000) }), none).some((f) => f.level === "ERROR"));
  });
  it("temuan lain: Kaur Keuangan, kontrak di atas HPS, SK TPK, hasil belum diumumkan", () => {
    const codes = (f: PackageFacts) => packageFindings(f, none).map((x) => x.code);
    assert.ok(codes(F({ executorTitle: "Kaur Keuangan" })).includes("KAUR_KEUANGAN"));
    assert.ok(codes(F({ contractCents: C(60_000_000) })).includes("CONTRACT_OVER_HPS"));
    assert.ok(codes(F({ contractCents: C(47_000_000) })).includes("CONTRACT_NE_OFFER"));
    assert.ok(codes(F({ tpkDecreeNumber: null })).includes("TPK_NO_DECREE"));
    assert.ok(codes(F({ status: "SELESAI" })).includes("RESULT_NOT_ANNOUNCED"));
    assert.ok(codes(F({ status: "SELESAI", resultAnnouncedOn: "2026-04-01", handoverToHeadOn: "2026-04-02" })).every((c) => c !== "RESULT_NOT_ANNOUNCED" && c !== "NO_HANDOVER_TO_HEAD"));
    assert.ok(!codes(F({ status: "BATAL", executorTitle: "Kaur Keuangan" })).includes("KAUR_KEUANGAN"), "paket batal tidak diperingatkan");
  });
  it("sisa anggaran = pagu kegiatan - nilai paket lain yang sudah berjalan", () => {
    const pagu = new Map([["2.3.01", C(100)]]);
    const mk = (id: number, status: "PELAKSANAAN" | "PERSIAPAN" | "SELESAI" | "BATAL", cents: number, activityCode = "2.3.01") => ({ id, activityCode, status, mode: "PENYEDIA" as const, contractCents: null, hpsCents: C(cents) });
    assert.equal(availableFor(pagu, [mk(1, "PELAKSANAAN", 30), mk(2, "PERSIAPAN", 99), mk(3, "BATAL", 99), mk(4, "SELESAI", 20, "2.3.02")], { id: 9, activityCode: "2.3.01" }), C(70));
    assert.equal(availableFor(pagu, [mk(1, "PELAKSANAAN", 130)], { id: 9, activityCode: "2.3.01" }), 0n);
    assert.equal(availableFor(pagu, [mk(1, "PELAKSANAAN", 30)], { id: 1, activityCode: "2.3.01" }), C(100), "paket sendiri tidak dihitung ganda");
    assert.equal(availableFor(null, [], { id: 1, activityCode: "2.3.01" }), null);
    assert.equal(availableFor(pagu, [], { id: 1, activityCode: "9.9.99" }), 0n);
    assert.equal(committedValue({ mode: "PENYEDIA", contractCents: C(5), hpsCents: C(9) }), C(5));
    assert.equal(committedValue({ mode: "SWAKELOLA", contractCents: C(5), hpsCents: C(9) }), C(9));
  });
});

describe("pengadaan: temuan SPP (hanya informasi)", () => {
  const spp = (n: number, status: string, o: Partial<{ mode: string; hasReceipt: boolean; totalCents: bigint }> = {}) => ({ id: n, number: n, status, mode: "PENYEDIA", hasReceipt: true, totalCents: C(10), ...o });
  it("SPP disetujui/dibayar sebelum BAST dan tanpa bukti penerimaan diperingatkan", () => {
    const pk = [{ status: "PELAKSANAAN" as const, mode: "PENYEDIA" as const, title: "x" }];
    assert.ok(sppFindings(pk, [spp(1, "DIBAYAR")], C(100)).some((f) => f.code === "SPP_BEFORE_BAST"));
    assert.ok(!sppFindings(pk, [spp(1, "DIAJUKAN")], C(100)).some((f) => f.code === "SPP_BEFORE_BAST"));
    assert.ok(!sppFindings(pk, [spp(1, "DITOLAK")], C(100)).length);
    assert.ok(sppFindings(pk, [spp(1, "DIBAYAR", { hasReceipt: false })], C(100)).some((f) => f.code === "SPP_NO_RECEIPT"));
    assert.ok(!sppFindings([{ status: "SELESAI", mode: "PENYEDIA", title: "x" }], [spp(1, "DIBAYAR")], C(100)).some((f) => f.code === "SPP_BEFORE_BAST"));
    assert.ok(sppFindings(pk, [spp(1, "DIBAYAR", { totalCents: C(200) })], C(100)).some((f) => f.code === "SPP_OVER_PACKAGE"));
    assert.ok(sppFindings([{ status: "PELAKSANAAN", mode: "SWAKELOLA", title: "x" }], [spp(1, "DIBAYAR", { mode: "SWAKELOLA" })], C(100)).every((f) => f.code !== "SPP_BEFORE_BAST"), "swakelola memakai panjar, bukan BAST penyedia");
  });
});

describe("pengadaan: validasi masukan", () => {
  const base = { year: 2026, activityCode: "2.3.01", title: "Pengadaan semen", mode: "PENYEDIA", method: "PEMBELIAN_LANGSUNG", hps: "5000000" };
  it("paket sah dan kode kegiatan/rekening harus valid", () => {
    const ok = parsePackageCreate(base);
    assert.ok(ok.ok);
    const r = parsePackageCreate({ ...base, activityCode: "9.9.99", accountCode: "5.2.1.01xx" });
    assert.ok(!r.ok && r.fieldErrors.activityCode && r.fieldErrors.accountCode);
    assert.ok(!parsePackageCreate({ ...base, accountCode: "4.1.1.01" }).ok, "rekening bukan belanja");
    assert.ok(parsePackageCreate({ ...base, accountCode: "5.2.1.01" }).ok, "rekening belanja objek yang valid diterima");
  });
  it("menolak masukan jahat", () => {
    for (const bad of [{ hps: "1e3" }, { hps: "0x10" }, { hps: [1] }, { hps: -5 }, { hps: "0" }, { hps: "999999999999999999" }, { title: "x".repeat(201) }, { title: "   " }, { mode: "LAIN" }, { method: "RAHASIA" }, { year: "2026; DROP" }, { year: 1999 }, { plannedStartOn: "2026-02-30" }, { activityCode: { $ne: 1 } }]) {
      const r = parsePackageCreate({ ...base, ...bad });
      assert.equal(r.ok, false, JSON.stringify(bad));
    }
    assert.equal(parsePackageCreate(null).ok, false);
    assert.equal(parsePackageCreate([]).ok, false);
    assert.equal(parsePackageCreate("x").ok, false);
    assert.ok(!parsePackageCreate({ ...base, mode: "SWAKELOLA", method: "LELANG" }).ok, "swakelola tanpa metode penyedia");
    assert.ok(!parsePackageCreate({ ...base, mode: "PENYEDIA", method: "" }).ok, "penyedia wajib punya metode");
    assert.ok(!parsePackageCreate({ ...base, plannedStartOn: "2026-05-01", plannedEndOn: "2026-04-01" }).ok);
  });
  it("patch sebagian: hanya kunci yang dikirim, uang ketat, progres bilangan bulat", () => {
    const r = parsePackagePatch({ title: "Baru", contract: "1500000", progressPct: "40", bastDate: "2026-03-01" });
    assert.ok(r.ok && r.value.title === "Baru" && r.value.contractCents === 150_000_000n && r.value.progressPct === 40 && r.value.bastDate?.toISOString().startsWith("2026-03-01"));
    assert.deepEqual(parsePackagePatch({ junk: 1 }), { ok: true, value: {} });
    assert.ok(!parsePackagePatch({ progressPct: 101 }).ok && !parsePackagePatch({ progressPct: "1.5" }).ok && !parsePackagePatch({ progressPct: "-1" }).ok);
    assert.ok(!parsePackagePatch({ contract: "abc" }).ok);
    const cleared = parsePackagePatch({ bastNote: "", contract: "" });
    assert.ok(cleared.ok && cleared.value.bastNote === null && cleared.value.contractCents === null);
    assert.ok(!parsePackagePatch({ mode: "SWAKELOLA", method: "LELANG" }).ok);
    assert.ok(!parsePackagePatch({ method: "LELANG" }).ok, "metode tanpa mode ditolak");
  });
  it("anggota, penawaran, dan ambang", () => {
    assert.ok(parseMember({ name: "Sari", role: "KETUA", element: "PERANGKAT" }).ok);
    assert.ok(!parseMember({ name: "", role: "KETUA", element: "PERANGKAT" }).ok);
    assert.ok(!parseMember({ name: "A", role: "BOS", element: "PERANGKAT" }).ok);
    assert.ok(!parseMember({ name: "A", role: "KETUA", element: "ASING" }).ok);
    assert.ok(parseOffer({ providerName: "CV A", offeredOn: "2026-02-01", price: "1000000" }).ok);
    assert.ok(!parseOffer({ providerName: "CV A", offeredOn: "2026-02-01", price: "0" }).ok);
    assert.ok(!parseOffer({ providerName: "CV A", offeredOn: "besok", price: "10" }).ok);
    assert.ok(!parseOffer({ providerName: "CV A", offeredOn: "2026-02-01", price: "100", negotiated: "200" }).ok, "negosiasi tidak boleh lebih mahal");
    assert.ok(!parseOffer({ providerName: "CV A", offeredOn: "2026-02-01", price: "100", passed: "ya" }).ok);
    assert.ok(parseSetting({ directLimit: "10000000", offerLimit: "200000000" }).ok);
    assert.ok(!parseSetting({ directLimit: "300", offerLimit: "200" }).ok);
    assert.ok(parseSetting({}).ok, "kosong = tanpa ambang");
  });
});

describe("pengadaan: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    return roleCan(r.resource, r.action, role);
  };
  it("semua peran membaca; Kepala Desa tidak menulis; operator menulis", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/pengadaan", "GET", role), true);
    for (const p of ["/api/pengadaan", "/api/pengadaan/3/anggota", "/api/pengadaan/3/penawaran"]) {
      assert.equal(gate(p, "POST", "village_head"), false, p);
      assert.equal(gate(p, "POST", "staff"), true, p);
    }
    assert.equal(gate("/api/pengadaan/3", "PATCH", "village_head"), false);
    assert.equal(gate("/api/pengadaan/pengaturan", "PUT", "village_head"), false);
    assert.equal(gate("/api/pengadaan/3", "DELETE", "secretary"), true);
  });
  it("menetapkan penyedia terpilih = approve (Kepala Desa/admin); pindah tahap lewat gerbang read lalu dicek di dalam rute", () => {
    assert.equal(gate("/api/pengadaan/penawaran/4/pemenang", "POST", "staff"), false);
    assert.equal(gate("/api/pengadaan/penawaran/4/pemenang", "POST", "secretary"), false);
    assert.equal(gate("/api/pengadaan/penawaran/4/pemenang", "POST", "village_head"), true);
    assert.equal(gate("/api/pengadaan/penawaran/4/pemenang", "POST", "admin"), true);
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/pengadaan/3/status", "POST", role), true, "gerbang kasar read; izin sebenarnya di rute");
  });
  it("id ter-encode jatuh ke awalan (create), jadi rute WAJIB mengecek izin sendiri: gerbang kedua ada di berkas rute", () => {
    const r = resolveApiPermission("/api/pengadaan/penawaran/%34/pemenang", "POST");
    assert.ok(r, "id ter-encode tetap terpetakan (create bila pola tidak cocok, atau approve bila resolver mendekode); rute tetap wajib mengecek sendiri");
    const read = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
    assert.match(read("app/api/pengadaan/penawaran/[id]/pemenang/route.ts"), /permissions\(ctx\)\.approve/);
    const st = read("app/api/pengadaan/[id]/status/route.ts");
    assert.match(st, /perm\.approve/);
    assert.match(st, /perm\.update/);
    assert.match(read("app/api/kerja-sama/[id]/penandatanganan/route.ts"), /permissions\(ctx, "perencanaan"\)\.approve/);
  });
});

describe("pengadaan: penjaga enum menolak kunci prototipe", () => {
  it("constructor, __proto__, toString, hasOwnProperty bukan nilai sah", () => {
    for (const k of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf"]) for (const f of [isMode, isMethod, isStatus, isRole, isElement]) assert.equal(f(k), false, `${f.name}(${k})`);
    assert.equal(isMode("SWAKELOLA"), true);
    assert.ok(!parsePackageCreate({ year: 2026, activityCode: "2.3.01", title: "x", mode: "constructor", hps: "1" }).ok);
    assert.ok(!parsePackageCreate({ year: 2026, activityCode: "2.3.01", title: "x", mode: "PENYEDIA", method: "__proto__", hps: "1" }).ok);
    assert.ok(!parseMember({ name: "A", role: "constructor", element: "PERANGKAT" }).ok);
    assert.ok(!parseMember({ name: "A", role: "KETUA", element: "toString" }).ok);
  });
  it("nilai terlalu panjang untuk kolom ditolak dengan galat per kolom (400), bukan lolos ke basis data", () => {
    const long = "x".repeat(5000);
    for (const k of ["title", "location", "executorName", "executorTitle"]) assert.equal(parsePackageCreate({ year: 2026, activityCode: "2.3.01", title: "x", mode: "SWAKELOLA", hps: "1", [k]: long }).ok, false, k);
    assert.equal(parsePackageCreate({ year: 2026, activityCode: "2.3.01", title: "x", mode: "SWAKELOLA", hps: "1", scope: long }).ok, false);
    for (const k of ["title", "scope", "location", "executorName", "executorTitle", "tpkDecreeNumber", "singleProviderReason", "negotiationNumber", "negotiationNote", "contractNumber", "bastNumber", "bastHandedBy", "bastReceivedBy", "bastNote"]) {
      const r = parsePackagePatch({ [k]: long });
      assert.ok(!r.ok && r.fieldErrors[k], k);
    }
    for (const k of ["name", "position"]) assert.ok(!parseMember({ name: "A", role: "KETUA", element: "PERANGKAT", [k]: long }).ok, k);
    for (const k of ["providerName", "providerAddress", "evaluationNote"]) assert.ok(!parseOffer({ providerName: "A", offeredOn: "2026-02-01", price: "1", [k]: long }).ok, k);
    assert.ok(!parseSetting({ basisNote: long }).ok);
  });
  it("pemisahan tugas: jabatan wajib, bukan Kaur Keuangan, pelaksana dan penyedia bukan anggota TPK", () => {
    assert.equal(nameKey("  Budi   Santoso "), "budi santoso");
    const f = (o: Partial<PackageFacts> = {}) => F({ ...o });
    assert.deepEqual(transitionBlockers("PELAKSANAAN", f()), []);
    assert.ok(transitionBlockers("PELAKSANAAN", f({ executorTitle: null })).some((b) => /jabatan/.test(b)), "mengosongkan jabatan tidak menghilangkan pagar");
    assert.ok(transitionBlockers("PELAKSANAAN", f({ executorTitle: "Kaur Keuangan" })).some((b) => /Kaur Keuangan/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", f({ executorName: "sari", teamNames: ["Sari", "Dewi", "Agus"] })).some((b) => /anggota TPK/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", f({ winnerName: "DEWI" })).some((b) => /Penyedia terpilih tidak boleh sama/.test(b)));
    assert.ok(transitionBlockers("PELAKSANAAN", f({ winnerName: "Budi" })).some((b) => /Penyedia terpilih tidak boleh sama/.test(b)), "penyedia = Kasi/Kaur pelaksana");
  });
  it("peringatan OVER_BUDGET tetap muncul pada tahap pelaksanaan dan selesai", () => {
    for (const status of ["PELAKSANAAN", "SELESAI"] as const) assert.ok(packageFindings(F({ status, availableCents: C(10_000_000) }), { directLimitCents: null, offerLimitCents: null }).some((x) => x.code === "OVER_BUDGET"), status);
  });
  it("penawaran bentrok kepentingan tidak ikut perhitungan harga terendah dan tidak memicu negosiasi", () => {
    const o = [offer(1, 40, { conflict: true }), offer(2, 50), offer(3, 55)];
    assert.deepEqual(lowestPassed(o).map((x) => x.id), [2], "penawaran 40 bentrok dikeluarkan");
    assert.equal(negotiationRequired([offer(1, 40, { conflict: true }), offer(2, 50)]), true, "tinggal satu yang layak");
    assert.equal(negotiationRequired([offer(1, 40, { conflict: true }), offer(2, 50), offer(3, 60)]), false);
    assert.deepEqual(lowestPassed([offer(1, 40, { conflict: true })]), []);
    const f = F({ offers: [offer(1, 40, { conflict: true, isWinner: true }), offer(2, 50)] });
    assert.ok(transitionBlockers("PELAKSANAAN", f).some((b) => /bentrok kepentingan/.test(b) && /pilih penyedia lain/.test(b)));
  });
});
