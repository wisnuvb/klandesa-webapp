import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ITEMS, isCustomKey, normKey, resolveItems, ruleFromRow, validMonthDay, type EntryRow, type VillageScope } from "../lib/kepatuhan/catalog.ts";
import { addMonths, addWorkdays, computeDue, mergeEvidence, reminderKey, reminderStage, statusOf, tally, wibToday, NO_EVIDENCE, type Evidence } from "../lib/kepatuhan/calc.ts";
import { EMPTY_FACTS, autoEvidence, evaluateVillage, type YearFacts } from "../lib/kepatuhan/evaluate.ts";
import { parseCatalogEntry, parseRecord } from "../lib/kepatuhan/schema.ts";
import { writableScope } from "../lib/kepatuhan/regional.ts";

const V: VillageScope = { regencyKey: "karanganyar", provinceKey: "jawa tengah", regencyCode: "", hasBumdes: false };
const row = (o: Partial<EntryRow>): EntryRow => ({ scope: "REGENCY", regencyKey: "karanganyar", provinceKey: "", itemKey: "LPJ_APBDES", fromYear: 2026, disabled: false, title: null, recipient: null, ruleKind: "FIXED", yearOffset: 1, month: 3, day: 15, event: null, amount: null, unit: null, verification: "K", basis: "Perbup 1/2026", note: null, ...o });
const dueOf2 = (v: VillageScope, ...entries: EntryRow[]) => computeDue(find(resolveItems({ year: 2026, village: v, entries }), "LPJ_APBDES")!.rule, 2026, {}).due;
const find = (items: ReturnType<typeof resolveItems>, k: string) => items.find((i) => i.key === k);
const dueOf = (key: string, year: number, entries: EntryRow[] = [], events = {}) => {
  const it = find(resolveItems({ year, village: V, entries }), key);
  assert.ok(it, `butir ${key} tidak ada`);
  return computeDue(it.rule, year, events).due;
};

describe("katalog: tenggat sesuai teks peraturan [V]", () => {
  it("APB Desa ditetapkan paling lambat 31 Des tahun sebelumnya (Permendagri 20/2018 Pasal 38(2))", () => {
    assert.equal(dueOf("APBDES_PERDES", 2027), "2026-12-31");
  });
  it("LPJ, LPPD, LKPPD, dan informasi 3 bulan setelah tahun anggaran = 31 Maret (Pasal 70(2); Permendagri 46/2016 Pasal 3, 8, 10)", () => {
    for (const k of ["LPJ_APBDES", "LPPD_TAHUN", "LKPPD", "INFO_MASYARAKAT"]) assert.equal(dueOf(k, 2026), "2027-03-31", k);
  });
  it("laporan semester I: minggu kedua Juli tahun berjalan (Pasal 68(3)), dipakai 14 Juli", () => {
    assert.equal(dueOf("LAPORAN_SEMESTER1", 2026), "2026-07-14");
  });
  it("Perdes RKP Desa akhir September dan daftar usulan 31 Des tahun berjalan (Permendagri 114/2014 Pasal 29(4), 51(2))", () => {
    assert.equal(dueOf("RKPDES_PERDES", 2027), "2026-09-30");
    assert.equal(dueOf("RKPDES_USULAN", 2027), "2026-12-31");
  });
  it("syarat tahap I Dana Desa 2026: 15 Juni 2026 (PMK 7/2026 Pasal 24(4)a)", () => {
    assert.equal(dueOf("DD_TAHAP1", 2026), "2026-06-15");
  });
  it("laporan fokus Dana Desa: 1 bulan setelah Perdes RKP Desa; belum bisa dihitung tanpa tanggal Perdes (Permendesa 16/2025 Pasal 12(5))", () => {
    const it = find(resolveItems({ year: 2026, village: V, entries: [] }), "DD_FOKUS")!;
    assert.deepEqual(computeDue(it.rule, 2026, {}), { due: null, reason: "NEEDS_EVENT" });
    assert.equal(computeDue(it.rule, 2026, { RKPDES_ENACTED: "2025-09-30" }).due, "2025-10-30");
    assert.equal(computeDue(it.rule, 2026, { RKPDES_ENACTED: "2025-12-31" }).due, "2026-01-31");
    assert.equal(computeDue(it.rule, 2026, { RKPDES_ENACTED: "2026-01-31" }).due, "2026-02-28", "hari dipangkas ke akhir bulan");
  });
  it("penyampaian Perdes APB Desa ke bupati: 7 hari kerja setelah ditetapkan (Pasal 38(4)), akhir pekan dilewati", () => {
    const it = find(resolveItems({ year: 2027, village: V, entries: [] }), "APBDES_KE_BUPATI")!;
    assert.equal(computeDue(it.rule, 2027, { APBDES_ENACTED: "2026-12-18" }).due, "2026-12-29"); // Jumat + 7 hari kerja = Selasa
    assert.equal(computeDue(it.rule, 2027, { APBDES_ENACTED: "2026-12-16" }).due, "2026-12-25");
  });
  it("laporan BUM Desa: PP 11/2021 Pasal 58 tidak menetapkan tanggal, jadi tidak ada tenggat", () => {
    const items = resolveItems({ year: 2026, village: { ...V, hasBumdes: true }, entries: [] });
    for (const k of ["BUMDES_SEMESTER_1", "BUMDES_SEMESTER_2", "BUMDES_TAHUNAN"]) assert.deepEqual(computeDue(find(items, k)!.rule, 2026, {}), { due: null, reason: "NO_RULE" });
  });
  it("desa tanpa BUM Desa tidak diberi butir BUM Desa", () => {
    assert.equal(find(resolveItems({ year: 2026, village: V, entries: [] }), "BUMDES_TAHUNAN"), undefined);
  });
  it("disiplin sumber: butir berlabel V wajib menyebut pasal; butir R tidak dihitung sebagai kewajiban", () => {
    for (const d of DEFAULT_ITEMS) for (const v of d.versions) {
      if (v.verification === "V") assert.match(v.basis, /Pasal/, d.key);
      assert.ok(v.basis.length > 10, d.key);
    }
    const items = resolveItems({ year: 2026, village: V, entries: [] });
    for (const i of items) assert.equal(i.binding, i.verification !== "R", i.key);
    assert.equal(find(items, "KIP_BERKALA_1")!.binding, false);
    assert.equal(find(items, "INFO_SEMESTER1")!.binding, false);
  });
  it("kunci butir unik", () => {
    const keys = DEFAULT_ITEMS.map((d) => d.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const k of keys) assert.ok(k.length <= 40);
  });
});

describe("katalog: versi per tahun dan penimpaan", () => {
  it("aturan Dana Desa 2026 tidak ada untuk 2025 dan dipakai SEMENTARA untuk 2027", () => {
    assert.equal(find(resolveItems({ year: 2025, village: V, entries: [] }), "DD_TAHAP1"), undefined);
    const a = find(resolveItems({ year: 2026, village: V, entries: [] }), "DD_TAHAP1")!;
    const b = find(resolveItems({ year: 2027, village: V, entries: [] }), "DD_TAHAP1")!;
    assert.equal(a.provisional, false);
    assert.equal(b.provisional, true);
    assert.equal(b.versionFrom, 2026);
    // aturan undang-undang tidak pernah "sementara"
    assert.equal(find(resolveItems({ year: 2030, village: V, entries: [] }), "LPJ_APBDES")!.provisional, false);
  });
  it("penimpaan kabupaten memakai fromYear terbesar yang tidak melewati tahun; sebelum itu kembali ke bawaan", () => {
    const e = [row({ fromYear: 2026, day: 15 }), row({ fromYear: 2028, day: 10 })];
    assert.equal(dueOf("LPJ_APBDES", 2025, e), "2026-03-31");
    assert.equal(dueOf("LPJ_APBDES", 2026, e), "2027-03-15");
    assert.equal(dueOf("LPJ_APBDES", 2027, e), "2028-03-15");
    assert.equal(dueOf("LPJ_APBDES", 2028, e), "2029-03-10");
    const r = find(resolveItems({ year: 2026, village: V, entries: e }), "LPJ_APBDES")!;
    assert.equal(r.source, "KABUPATEN");
    assert.equal(r.verification, "K");
    assert.equal(r.binding, true);
  });
  it("kabupaten mengalahkan global, global mengalahkan bawaan", () => {
    const g = row({ scope: "GLOBAL", regencyKey: "", day: 20, verification: "V", basis: "Pasal 99" });
    assert.equal(dueOf("LPJ_APBDES", 2026, [g]), "2027-03-20");
    assert.equal(find(resolveItems({ year: 2026, village: V, entries: [g] }), "LPJ_APBDES")!.source, "GLOBAL");
    assert.equal(dueOf("LPJ_APBDES", 2026, [g, row({ day: 5 })]), "2027-03-05");
  });
  it("penimpaan kabupaten lain TIDAK berlaku untuk desa ini (tanpa kebocoran lintas kabupaten)", () => {
    const other = row({ regencyKey: "sragen", day: 1 });
    assert.equal(dueOf("LPJ_APBDES", 2026, [other]), "2027-03-31");
    // provinsi berbeda dengan nama kabupaten sama juga tidak
    const otherProv = row({ provinceKey: "jawa timur", day: 2 });
    assert.equal(dueOf("LPJ_APBDES", 2026, [otherProv]), "2027-03-31");
    assert.equal(dueOf("LPJ_APBDES", 2026, [row({ provinceKey: "jawa tengah", day: 3 })]), "2027-03-03");
  });
  it("baris yang menyebut provinsi menang atas baris tanpa provinsi pada fromYear sama", () => {
    assert.equal(dueOf("LPJ_APBDES", 2026, [row({ provinceKey: "", day: 3 }), row({ provinceKey: "jawa tengah", day: 4 })]), "2027-03-04");
  });
  it("butir yang dimatikan kabupaten TIDAK hilang diam-diam: tetap tampil bertanda, berikut dasarnya, dan tidak mengikat", () => {
    const off = row({ disabled: true, ruleKind: null, yearOffset: null, month: null, day: null, basis: "Perbup 9/2026 Pasal 2" });
    const it = find(resolveItems({ year: 2026, village: V, entries: [off] }), "LPJ_APBDES")!;
    assert.deepEqual([it.disabled, it.binding, it.override?.source, it.override?.basis, it.override?.fromYear], [true, false, "KABUPATEN", "Perbup 9/2026 Pasal 2", 2026]);
    const rows = evaluateVillage({ year: 2026, today: "2027-06-01", scope: V, entries: [off], facts: EMPTY_FACTS });
    const r = rows.find((x) => x.key === "LPJ_APBDES")!;
    assert.equal(r.disabled, true);
    assert.equal(r.status, "BELUM", "tidak pernah terlambat");
    assert.equal(tally(rows).total, tally(evaluateVillage({ year: 2026, today: "2027-06-01", scope: V, entries: [], facts: EMPTY_FACTS })).total - 1, "tidak dihitung sebagai kewajiban");
    assert.equal(find(resolveItems({ year: 2026, village: V, entries: [row({ ruleKind: "FIXED" })] }), "LPJ_APBDES")!.override?.basis, "Perbup 1/2026");
    assert.equal(find(resolveItems({ year: 2026, village: V, entries: [] }), "LPJ_APBDES")!.override, null);
    assert.ok(find(resolveItems({ year: 2025, village: V, entries: [off] }), "LPJ_APBDES")!.disabled === false);
    const bad = row({ month: 2, day: 31 });
    assert.equal(find(resolveItems({ year: 2026, village: V, entries: [bad] }), "LPJ_APBDES")!.source, "BAWAAN");
  });
  it("butir tambahan kabupaten (KAB-) muncul hanya untuk kabupaten itu dan wajib berjudul", () => {
    const c = row({ itemKey: "KAB-DPMD", title: "Laporan ke DPMD", ruleKind: "FIXED", yearOffset: 0, month: 10, day: 5 });
    const mine = resolveItems({ year: 2026, village: V, entries: [c] });
    const it = find(mine, "KAB-DPMD")!;
    assert.equal(it.custom, true);
    assert.equal(it.group, "KABUPATEN");
    assert.equal(computeDue(it.rule, 2026, {}).due, "2026-10-05");
    assert.equal(find(resolveItems({ year: 2026, village: { ...V, regencyKey: "sragen" }, entries: [c] }), "KAB-DPMD"), undefined);
    assert.equal(find(resolveItems({ year: 2026, village: V, entries: [{ ...c, title: null }] }), "KAB-DPMD"), undefined);
    assert.equal(find(resolveItems({ year: 2026, village: V, entries: [{ ...c, scope: "GLOBAL", regencyKey: "" }] }), "KAB-DPMD"), undefined, "butir KAB- hanya dari lapis kabupaten");
  });
  it("penimpaan berkunci kode wilayah hanya berlaku bagi desa dengan kode itu; mengganti teks kabupaten tidak memindahkan desa", () => {
    const byCode = row({ regencyKey: "kode:3313", day: 7 });
    const sameCode: VillageScope = { ...V, regencyCode: "3313", regencyKey: "teks-apa-saja" };
    assert.equal(dueOf2(sameCode, byCode), "2027-03-07");
    assert.equal(dueOf2({ ...V, regencyCode: "3314" }, byCode), "2027-03-31", "kode lain");
    assert.equal(dueOf2({ ...V, regencyCode: "" }, byCode), "2027-03-31", "desa tanpa kode tidak ikut");
    assert.equal(dueOf2({ ...V, regencyCode: undefined, regencyKey: "kode:3313" }, byCode), "2027-03-31", "teks yang meniru kunci kode tidak berpengaruh");
    // baris berkunci teks tetap tidak berlaku bila desa mengubah teksnya ke kabupaten lain
    assert.equal(dueOf2({ ...V, regencyKey: "sragen" }, row({ day: 7 })), "2027-03-31");
  });
  it("helper wilayah dan kalender", () => {
    assert.equal(normKey("  Kab.   Karanganyar "), "kab. karanganyar");
    assert.equal(validMonthDay(2, 29, 2024), true);
    assert.equal(validMonthDay(2, 30), false);
    assert.equal(validMonthDay(13, 1), false);
    assert.equal(isCustomKey("KAB-X1"), true);
    assert.equal(isCustomKey("kab-x"), false);
    assert.equal(isCustomKey("KAB-"), false);
    assert.equal(ruleFromRow({ ruleKind: "FIXED", yearOffset: 2, month: 1, day: 1, event: null, amount: null, unit: null }), null);
    assert.equal(ruleFromRow({ ruleKind: "AFTER_EVENT", yearOffset: null, month: null, day: null, event: "X", amount: 1, unit: "MONTH" }), null);
  });
});

describe("tanggal dan status", () => {
  it("addMonths dan addWorkdays", () => {
    assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
    assert.equal(addMonths("2026-11-30", 3), "2027-02-28");
    assert.equal(addWorkdays("2026-10-30", 1), "2026-11-02"); // Jumat -> Senin
    assert.equal(addWorkdays("2026-10-30", 0), "2026-10-30");
  });
  it("wibToday memakai UTC+7", () => {
    assert.equal(wibToday(new Date("2026-11-01T18:00:00Z")), "2026-11-02");
    assert.equal(wibToday(new Date("2026-11-01T16:59:00Z")), "2026-11-01");
  });
  const ev = (state: Evidence["state"], sentOn: string | null = null, source: Evidence["source"] = "CATATAN"): Evidence => ({ state, sentOn, source });
  it("menggabungkan bukti: terkirim dari sistem menang, lalu catatan terkirim, lalu draf", () => {
    assert.equal(mergeEvidence(ev("TERKIRIM", "2026-01-02", "SISTEM"), ev("TERKIRIM", "2026-01-09")).sentOn, "2026-01-02");
    assert.equal(mergeEvidence(ev("DRAF", null, "SISTEM"), ev("TERKIRIM", "2026-01-09")).state, "TERKIRIM");
    assert.equal(mergeEvidence(ev("DRAF", null, "SISTEM"), null).state, "DRAF");
    assert.equal(mergeEvidence(null, null), NO_EVIDENCE);
  });
  it("status: terlambat hanya bila belum terkirim, lewat tenggat, dan wajib; terkirim lewat tenggat ditandai", () => {
    const base = { today: "2026-04-01", binding: true };
    assert.equal(statusOf({ ...base, due: "2026-03-31", evidence: NO_EVIDENCE }).status, "TERLAMBAT");
    assert.equal(statusOf({ ...base, due: "2026-04-01", evidence: NO_EVIDENCE }).status, "BELUM", "tenggat hari ini belum terlambat");
    assert.equal(statusOf({ ...base, due: "2026-03-31", evidence: ev("DRAF") }).status, "TERLAMBAT");
    const sent = statusOf({ ...base, due: "2026-03-31", evidence: ev("TERKIRIM", "2026-04-03") });
    assert.equal(sent.status, "TERKIRIM");
    assert.equal(sent.late, true);
    assert.equal(statusOf({ ...base, due: "2026-03-31", evidence: ev("TERKIRIM", "2026-03-31") }).late, false);
    assert.equal(statusOf({ ...base, binding: false, due: "2026-03-01", evidence: NO_EVIDENCE }).status, "BELUM", "butir R tak pernah terlambat");
    assert.equal(statusOf({ ...base, due: null, evidence: NO_EVIDENCE }).status, "BELUM");
    assert.equal(statusOf({ ...base, due: "2026-04-15", evidence: NO_EVIDENCE }).soon, true);
    assert.equal(statusOf({ ...base, due: "2026-04-16", evidence: NO_EVIDENCE }).soon, false);
  });
  it("tahap pengingat: batas 30/7/1 hari dan jendela terlambat 14 hari", () => {
    const m: [number | null, string | null][] = [[null, null], [45, null], [31, null], [30, "d30"], [8, "d30"], [7, "d7"], [2, "d7"], [1, "d1"], [0, "d1"], [-1, "late"], [-14, "late"], [-15, null]];
    for (const [d, want] of m) assert.equal(reminderStage(d), want, String(d));
    assert.equal(reminderKey("LPJ_APBDES", 2026, "d7"), "kal:LPJ_APBDES:2026:d7");
    assert.ok(reminderKey("KAB-" + "X".repeat(30), 2026, "late").length < 120);
  });
  it("tally hanya menghitung kewajiban", () => {
    const t = tally([
      { status: "TERKIRIM", binding: true, soon: false, late: true },
      { status: "TERLAMBAT", binding: true, soon: false, late: false },
      { status: "BELUM", binding: true, soon: true, late: false },
      { status: "DRAF", binding: true, soon: false, late: false },
      { status: "BELUM", binding: false, soon: true, late: false },
    ]);
    assert.deepEqual(t, { total: 4, terkirim: 1, terlambat: 1, segera: 1, draf: 1, belum: 1, terkirimTerlambat: 1 });
  });
});

describe("turunan status otomatis dari data modul lain", () => {
  const facts = (o: Partial<YearFacts>): YearFacts => ({ ...EMPTY_FACTS, ...o });
  it("APB Desa: ditetapkan = selesai bertanggal; draf = draf; tidak ada = belum", () => {
    assert.equal(autoEvidence("APBDES", facts({ apbdes: { exists: true, enactedOn: "2026-12-20" } }))?.state, "TERKIRIM");
    assert.equal(autoEvidence("APBDES", facts({ apbdes: { exists: true, enactedOn: null } }))?.state, "DRAF");
    assert.equal(autoEvidence("APBDES", EMPTY_FACTS), null);
  });
  it("LPPD: tersimpan = draf, diserahkan = terkirim dengan tanggal", () => {
    assert.equal(autoEvidence("LPPD_TAHUN", facts({ lppd: { status: "DRAFT", submittedOn: null } }))?.state, "DRAF");
    const e = autoEvidence("LKPPD", facts({ lkppd: { status: "DISERAHKAN", submittedOn: "2027-03-30" } }));
    assert.deepEqual([e?.state, e?.sentOn], ["TERKIRIM", "2027-03-30"]);
  });
  it("evaluasi satu desa: LPJ belum dikirim lewat tenggat = terlambat; APB Desa dari sistem; catatan petugas menutup butir manual", () => {
    const f = facts({
      apbdes: { exists: true, enactedOn: "2026-12-10" },
      records: { LPJ_APBDES: { status: "TERKIRIM", sentOn: "2027-04-05", referenceNo: "140/9", note: null, archiveId: null } },
    });
    const rows = evaluateVillage({ year: 2026, today: "2027-04-10", scope: V, entries: [], facts: f });
    const get = (k: string) => rows.find((r) => r.key === k)!;
    assert.equal(get("LPJ_APBDES").status, "TERKIRIM");
    assert.equal(get("LPJ_APBDES").late, true);
    assert.equal(get("LPJ_APBDES").evidenceSource, "CATATAN");
    assert.equal(get("LPPD_TAHUN").status, "TERLAMBAT");
    assert.equal(get("LKPPD").status, "TERLAMBAT");
    assert.equal(get("APBDES_PERDES").status, "TERKIRIM"); // 2026-12-10 <= 31 Des 2025? bukan: TA 2026 jatuh tempo 2025-12-31
    assert.equal(get("APBDES_PERDES").late, true);
    assert.equal(get("INFO_SEMESTER1").status, "BELUM", "butir R tidak pernah terlambat");
  });
  it("urutan: kelompok lalu tenggat; butir tanpa tanggal di akhir kelompoknya", () => {
    const rows = evaluateVillage({ year: 2026, today: "2026-11-01", scope: { ...V, hasBumdes: true }, entries: [], facts: EMPTY_FACTS });
    const groups = rows.map((r) => r.group);
    assert.deepEqual([...new Set(groups)], ["PERENCANAAN", "APBDES", "PERTANGGUNGJAWABAN", "DANA_DESA", "INFORMASI", "BUMDES"]);
    const dd = rows.filter((r) => r.group === "DANA_DESA").map((r) => r.due);
    assert.deepEqual(dd, [...dd].sort((a, b) => (a ?? "9999").localeCompare(b ?? "9999")));
  });
});

describe("validasi masukan", () => {
  const now = new Date("2026-11-01T03:00:00Z");
  it("catatan: terkirim wajib bertanggal sah, tidak di masa depan; tipe ketat", () => {
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "TERKIRIM" }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "TERKIRIM", sentOn: "2026-02-30" }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "TERKIRIM", sentOn: "2026-12-31" }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "SELESAI", sentOn: "2026-10-01" }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "x;DROP", status: "DRAF" }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "DRAF", referenceNo: 12 }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "DRAF", referenceNo: "x".repeat(151) }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "DRAF", archiveId: "12abc" }, now).ok, false);
    assert.equal(parseRecord({ itemKey: "LPJ_APBDES", status: "DRAF", archiveId: "0" }, now).ok, false);
    assert.equal(parseRecord("bukan objek", now).ok, false);
    const ok = parseRecord({ itemKey: "LPJ_APBDES", status: "TERKIRIM", sentOn: "2026-10-30", referenceNo: " 140/1 ", note: "", archiveId: "77" }, now);
    assert.ok(ok.ok);
    if (ok.ok) assert.deepEqual([ok.value.referenceNo, ok.value.note, ok.value.archiveId, ok.value.sentOn?.toISOString().slice(0, 10)], ["140/1", null, 77n, "2026-10-30"]);
    const draft = parseRecord({ itemKey: "LPJ_APBDES", status: "DRAF", sentOn: "2026-10-30" }, now);
    assert.ok(draft.ok && draft.value.sentOn === null, "draf tidak menyimpan tanggal kirim");
  });
  const base = { itemKey: "LPJ_APBDES", fromYear: 2026, ruleKind: "FIXED", yearOffset: 1, month: 3, day: 15, basis: "Perbup 1/2026 Pasal 4" };
  it("katalog: akun kabupaten tidak boleh memberi label V; admin boleh", () => {
    assert.equal(parseCatalogEntry({ ...base, verification: "V" }, { allowV: false, allowCustom: true }).ok, false);
    assert.equal(parseCatalogEntry({ ...base, verification: "V" }, { allowV: true, allowCustom: false }).ok, true);
    assert.equal(parseCatalogEntry({ ...base, verification: "K" }, { allowV: false, allowCustom: true }).ok, true);
  });
  it("katalog: tanggal tidak ada, tahun di luar rentang, dasar kosong, butir tak dikenal, tipe salah ditolak", () => {
    const o = { allowV: false, allowCustom: true };
    assert.equal(parseCatalogEntry({ ...base, month: 2, day: 31 }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, fromYear: 1999 }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, fromYear: "2026.5" }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, basis: "  " }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, itemKey: "ACAK" }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, yearOffset: 2 }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, disabled: "true" }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, ruleKind: "RANDOM" }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, ruleKind: "AFTER_EVENT", event: "X", amount: 1, unit: "MONTH" }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, ruleKind: "AFTER_EVENT", event: "RKPDES_ENACTED", amount: 400, unit: "MONTH" }, o).ok, false);
    assert.equal(parseCatalogEntry({ ...base, ruleKind: "AFTER_EVENT", event: "RKPDES_ENACTED", amount: 10, unit: "WORKDAY" }, o).ok, true);
    assert.equal(parseCatalogEntry({ ...base, itemKey: "KAB-X" }, o).ok, false, "butir baru wajib berjudul");
    assert.equal(parseCatalogEntry({ ...base, itemKey: "KAB-X", title: "Laporan X" }, o).ok, true);
    assert.equal(parseCatalogEntry({ ...base, itemKey: "KAB-X", title: "Laporan X" }, { allowV: true, allowCustom: false }).ok, false, "admin platform tidak membuat butir kabupaten");
    assert.equal(parseCatalogEntry({ ...base, title: "x".repeat(201), itemKey: "KAB-X" }, o).ok, false);
  });
  it("katalog: mematikan butir tidak butuh aturan tetapi WAJIB menyebut alasan dan rujukan", () => {
    const o = { allowV: false, allowCustom: true };
    const no = parseCatalogEntry({ itemKey: "LPPD_TAHUN", fromYear: 2027, disabled: true }, o);
    assert.ok(!no.ok && no.fieldErrors.basis);
    assert.equal(parseCatalogEntry({ itemKey: "LPPD_TAHUN", fromYear: 2027, disabled: true, basis: "   " }, o).ok, false);
    const r = parseCatalogEntry({ itemKey: "LPPD_TAHUN", fromYear: 2027, disabled: true, basis: "Perbup 3/2027 Pasal 1" }, o);
    assert.ok(r.ok && r.value.disabled && r.value.ruleKind === null && r.value.basis === "Perbup 3/2027 Pasal 1");
  });
  it("katalog: akun kabupaten tidak boleh menurunkan butir bawaan menjadi R (tak mengikat); butir tambahan sendiri boleh; admin boleh", () => {
    const b = { itemKey: "LPJ_APBDES", fromYear: 2026, ruleKind: "FIXED", yearOffset: 1, month: 3, day: 15, basis: "Perbup 1/2026", verification: "R" };
    const rr = parseCatalogEntry(b, { allowV: false, allowCustom: true });
    assert.ok(!rr.ok && rr.fieldErrors.verification);
    assert.equal(parseCatalogEntry({ ...b, itemKey: "KAB-X", title: "X" }, { allowV: false, allowCustom: true }).ok, true);
    assert.equal(parseCatalogEntry(b, { allowV: true, allowCustom: false }).ok, true);
  });
});

describe("batas penyuntingan oleh akun regional", () => {
  const villages = [{ regency: "Karanganyar", province: "Jawa Tengah" }, { regency: " karanganyar ", province: "Jawa  Tengah" }];
  it("hanya akun kabupaten berlingkup REGENCY; kunci dari teks desa, bukan dari isian", () => {
    const ok = writableScope({ role: "regional_kabupaten", scope: { level: "REGENCY", regency: "Kab. Karanganyar" }, villages });
    assert.deepEqual(ok, { ok: true, regencyKey: "karanganyar", provinceKey: "jawa tengah" });
    for (const [role, level] of [["regional_provinsi", "PROVINCE"], ["regional_kecamatan", "DISTRICT"], ["regional_kabupaten", "DISTRICT"], ["regional_kabupaten", "PROVINCE"], ["admin", "REGENCY"]]) {
      assert.equal(writableScope({ role: role!, scope: { level: level!, regency: "Karanganyar" }, villages }).ok, false, `${role}/${level}`);
    }
  });
  it("akun berkode kab/kota memakai kunci kode, bukan teks", () => {
    assert.deepEqual(writableScope({ role: "regional_kabupaten", scope: { level: "REGENCY", regency: "Karanganyar", kodeKabKota: " 3313 " }, villages }), { ok: true, regencyKey: "kode:3313", provinceKey: "" });
  });
  it("lingkup yang mencakup beberapa kabupaten dan tak cocok dengan teks akun ditolak; provinsi ganda dikosongkan", () => {
    const multi = [{ regency: "A", province: "P1" }, { regency: "B", province: "P1" }];
    assert.equal(writableScope({ role: "regional_kabupaten", scope: { level: "REGENCY", regency: "Z" }, villages: multi }).ok, false);
    assert.deepEqual(writableScope({ role: "regional_kabupaten", scope: { level: "REGENCY", regency: "a" }, villages: multi }), { ok: true, regencyKey: "a", provinceKey: "p1" });
    const twoProv = [{ regency: "A", province: "P1" }, { regency: "A", province: "P2" }];
    assert.deepEqual(writableScope({ role: "regional_kabupaten", scope: { level: "REGENCY", regency: "A" }, villages: twoProv }), { ok: true, regencyKey: "a", provinceKey: "" });
    assert.deepEqual(writableScope({ role: "regional_kabupaten", scope: { level: "REGENCY", regency: "A", province: "P9" }, villages: [] }), { ok: true, regencyKey: "a", provinceKey: "p9" });
  });
});
