import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DOMAIN_DEFS, DOMAIN_RESOURCE } from "../lib/incident/catalog";
import { transitionAction } from "../lib/incident/calc";
import { AGE, END_REASONS, MEMBER_ROLES, SQUAD_KINDS, SENSITIVE_TERMS } from "../lib/keamanan/catalog";
import {
  addDays,
  ageOn,
  dateRange,
  daysBetween,
  generateRotation,
  groupFindings,
  maskName,
  mediationGate,
  memberFindings,
  normArea,
  partyDisplayName,
  planSwap,
  sensitiveViolenceTerm,
  timeJakarta,
  todayJakarta,
  type RotationPerson,
  type ShiftFact,
} from "../lib/keamanan/calc";
import {
  parseContact,
  parseFollowup,
  parseGenerate,
  parseGroup,
  parseMark,
  parseMediation,
  parseMediationComplete,
  parseMember,
  parseMemberEnd,
  parseParty,
  parseReportLink,
  parseRisk,
  parseRondaLog,
  parseShift,
  parseSwapCreate,
  parseSwapDecision,
} from "../lib/keamanan/schema";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";
import { getModuleByPathSegment } from "../lib/modules/registry";

type Role = "admin" | "village_head" | "secretary" | "staff";
const ROLES: Role[] = ["admin", "village_head", "secretary", "staff"];

describe("kalender dan usia", () => {
  it("rentang tanggal inklusif, melewati pergantian bulan/tahun, kosong bila terbalik", () => {
    assert.deepEqual(dateRange("2026-12-30", "2027-01-02"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    assert.deepEqual(dateRange("2026-11-01", "2026-11-01"), ["2026-11-01"]);
    assert.deepEqual(dateRange("2026-11-02", "2026-11-01"), []);
    assert.equal(addDays("2026-03-01", -1), "2026-02-28");
    assert.equal(daysBetween("2026-11-01", "2026-11-15"), 14);
  });
  it("hari ini menurut Asia/Jakarta, bukan UTC (dini hari WIB masih 'kemarin' di UTC)", () => {
    assert.equal(todayJakarta(new Date("2026-11-01T18:30:00Z")), "2026-11-02");
    assert.equal(todayJakarta(new Date("2026-11-01T16:59:00Z")), "2026-11-01");
  });
  it("usia penuh memperhitungkan ulang tahun yang belum tiba", () => {
    assert.equal(ageOn("1966-11-02", "2026-11-01"), 59);
    assert.equal(ageOn("1966-11-01", "2026-11-01"), 60);
    assert.equal(ageOn("2008-11-02", "2026-11-01"), 17);
    assert.equal(ageOn("2000-02-29", "2026-02-28"), 25);
  });
  it("RT/RW dinormalisasi: 1, 01, 001 sama", () => {
    assert.equal(normArea("001"), "1");
    assert.equal(normArea(" 01 "), "1");
    assert.equal(normArea("A"), "a");
  });
});

describe("katalog bersumber Permendagri 26/2020 dan Perpol 4/2020", () => {
  it("struktur (Pasal 13), regu (Pasal 19), sebab berhenti (Pasal 25) dan batas usia", () => {
    assert.deepEqual(Object.keys(MEMBER_ROLES), ["KEPALA_SATLINMAS", "KEPALA_PELAKSANA", "KOMANDAN_REGU", "ANGGOTA"]);
    assert.equal(Object.keys(SQUAD_KINDS).length, 5);
    assert.equal(Object.keys(END_REASONS).length, 8, "usia + 7 sebab Pasal 25 ayat 5 huruf a-g");
    assert.deepEqual({ ...AGE }, { min: 18, end: 60, extendedEnd: 65 });
  });
  it("kekerasan perempuan/anak tidak dimodelkan sebagai jenis kejadian", () => {
    const kinds = Object.keys(DOMAIN_DEFS.KEAMANAN.kinds).join(" ").toLowerCase();
    assert.doesNotMatch(kinds, /kdrt|kekerasan|seksual|cabul|perkosa|anak|perempuan/);
    assert.equal(DOMAIN_RESOURCE.KEAMANAN, "keamanan");
  });
});

describe("anggota Satlinmas: temuan usia dan SK", () => {
  type MF = Parameters<typeof memberFindings>[0];
  const base: MF = { status: "ACTIVE", birthDate: "1985-01-01", decreeNumber: "SK/1/2026", inauguratedOn: "2026-02-01", extensionDecree: null };
  const codes = (o: Partial<MF>, today = "2026-11-01") => memberFindings({ ...base, ...o }, today).map((f) => f.code);
  it("usia di bawah 18, di atas 60 tanpa perpanjangan, di atas 65", () => {
    assert.deepEqual(codes({}), []);
    assert.deepEqual(codes({ birthDate: "2010-01-01" }), ["UNDER_AGE"]);
    assert.deepEqual(codes({ birthDate: "1966-01-01" }), ["AGE_LIMIT"]);
    assert.deepEqual(codes({ birthDate: "1966-01-01", extensionDecree: "SK-P/9" }), [], "diperpanjang sampai 65");
    assert.deepEqual(codes({ birthDate: "1960-01-01", extensionDecree: "SK-P/9" }), ["OVER_EXTENDED_AGE"]);
  });
  it("tanpa SK dan belum dikukuhkan hanya catatan (INFO); anggota berakhir tidak dinilai", () => {
    assert.deepEqual(codes({ decreeNumber: null }), ["NO_DECREE"]);
    assert.deepEqual(codes({ inauguratedOn: null }), ["NOT_INAUGURATED"]);
    assert.deepEqual(codes({ status: "ENDED", birthDate: "1940-01-01" }), []);
    assert.equal(memberFindings({ ...base, decreeNumber: null }, "2026-11-01")[0]!.level, "INFO");
  });
});

describe("rotasi ronda yang adil", () => {
  const people = (n: number, extra: Partial<RotationPerson> = {}): RotationPerson[] => Array.from({ length: n }, (_, i) => ({ id: i + 1, ...extra }));
  const dates = (n: number, from = "2026-11-02") => dateRange(from, addDays(from, n - 1));

  /** PRNG berbiji agar tes properti dapat diulang */
  const rng = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

  it("tanpa riwayat dan semua tersedia: selisih giliran paling banyak 1, tanpa dobel semalam, jumlah per malam sesuai", () => {
    const r = rng(7);
    for (let t = 0; t < 300; t++) {
      const n = 2 + Math.floor(r() * 18);
      const per = 1 + Math.floor(r() * Math.min(5, n));
      const days = 1 + Math.floor(r() * 60);
      const res = generateRotation({ people: people(n), dates: dates(days), perShift: per });
      assert.ok(res.spread <= 1, `n=${n} per=${per} hari=${days} spread=${res.spread}`);
      for (const night of res.nights) {
        assert.equal(night.residentIds.length, per);
        assert.equal(new Set(night.residentIds).size, per, "tidak ada orang yang sama dua kali semalam");
        assert.equal(night.short, 0);
      }
      assert.equal(Object.values(res.counts).reduce((a, b) => a + b, 0), per * days);
    }
  });

  it("deterministik: masukan sama menghasilkan jadwal sama, urutan peserta di masukan tidak berpengaruh", () => {
    const a = generateRotation({ people: people(7), dates: dates(30), perShift: 2 });
    const b = generateRotation({ people: [...people(7)].reverse(), dates: dates(30), perShift: 2 });
    assert.deepEqual(a.nights, b.nights);
  });

  it("peserta cukup banyak (n kelipatan per malam): tidak ada malam berurutan", () => {
    for (const [n, per] of [[6, 2], [8, 2], [9, 3], [4, 1], [10, 5]] as const) {
      const res = generateRotation({ people: people(n), dates: dates(40), perShift: per });
      assert.equal(res.consecutive, 0, `n=${n} per=${per}`);
    }
  });

  it("peserta sedikit: malam berurutan tak terhindarkan, tetap adil dan dilaporkan", () => {
    const res = generateRotation({ people: people(3), dates: dates(9), perShift: 2 });
    assert.ok(res.consecutive > 0);
    assert.ok(res.spread <= 1);
  });

  it("riwayat dihitung: yang sudah sering jaga mendapat lebih sedikit, tidak pernah mendahului yang lebih sedikit", () => {
    const ppl = people(5).map((p) => ({ ...p, priorCount: p.id === 1 ? 10 : p.id === 2 ? 6 : 0 }));
    const res = generateRotation({ people: ppl, dates: dates(14), perShift: 2 });
    assert.equal(res.counts[1], 0, "yang sudah 10 giliran tidak dapat giliran baru sampai yang lain menyusul");
    assert.ok(res.counts[3]! >= 1 && res.counts[4]! >= 1 && res.counts[5]! >= 1);
    // invarian greedy: pada tiap malam, orang terpilih punya total (sebelum malam itu) <= total siapa pun yang tidak terpilih dan tersedia
    const tot = new Map(ppl.map((p) => [p.id, p.priorCount ?? 0]));
    for (const night of res.nights) {
      const chosen = new Set(night.residentIds);
      const maxChosen = Math.max(...night.residentIds.map((id) => tot.get(id)!));
      for (const [id, t] of tot) if (!chosen.has(id)) assert.ok(t >= maxChosen, `malam ${night.date}: ${id} (${t}) tidak dipilih padahal lebih sedikit dari ${maxChosen}`);
      for (const id of night.residentIds) tot.set(id, tot.get(id)! + 1);
    }
  });

  it("ketidaktersediaan dihormati dan kekurangan petugas dilaporkan", () => {
    const ppl = people(3).map((p) => (p.id === 1 ? { ...p, unavailable: ["2026-11-03"] } : p));
    const res = generateRotation({ people: ppl, dates: ["2026-11-02", "2026-11-03"], perShift: 3 });
    assert.deepEqual(res.nights[1]!.residentIds.includes(1), false);
    assert.equal(res.nights[1]!.short, 1);
    assert.match(res.warnings[0]!, /2026-11-03: hanya 2 dari 3/);
    const none = generateRotation({ people: [], dates: ["2026-11-02"], perShift: 2 });
    assert.equal(none.nights[0]!.short, 2);
  });

  it("tanggal ganda dibuang dan diurutkan; peserta ganda satu orang", () => {
    const res = generateRotation({ people: [{ id: 1 }, { id: 1 }, { id: 2 }], dates: ["2026-11-03", "2026-11-02", "2026-11-03"], perShift: 1 });
    assert.deepEqual(res.nights.map((n) => n.date), ["2026-11-02", "2026-11-03"]);
    assert.equal(Object.keys(res.totals).length, 2);
  });

  it("giliran terakhir sebelum periode menghindarkan malam berurutan di awal periode", () => {
    const ppl = people(4).map((p) => ({ ...p, priorCount: 3, priorLast: p.id <= 2 ? "2026-11-01" : "2026-10-20" }));
    const res = generateRotation({ people: ppl, dates: ["2026-11-02"], perShift: 2 });
    assert.deepEqual(res.nights[0]!.residentIds.sort(), [3, 4]);
    assert.equal(res.consecutive, 0);
  });
});

describe("tukar/ganti giliran", () => {
  const sh = (id: number, date: string, residentId: number, attendance = "PENDING"): ShiftFact => ({ id, groupId: 1, date, residentId, attendance });
  const base = (o: Partial<Parameters<typeof planSwap>[0]> = {}) => ({
    today: "2026-11-01",
    groupId: 1,
    requesterShift: sh(10, "2026-11-05", 1),
    counterpartResidentId: 2,
    counterpartShift: null as ShiftFact | null,
    counterpartAgreed: true,
    counterpartActive: true,
    assigned: { "2026-11-05": [1, 3], "2026-11-07": [2, 3] } as Record<string, number[]>,
    ...o,
  });
  it("ganti: pihak kedua mengambil giliran pemohon", () => {
    const p = planSwap(base());
    assert.deepEqual(p, { ok: true, moves: [{ shiftId: 10, fromResidentId: 1, toResidentId: 2 }] });
  });
  it("tukar: dua giliran saling bertukar orang", () => {
    const p = planSwap(base({ counterpartShift: sh(11, "2026-11-07", 2) }));
    assert.deepEqual(p, { ok: true, moves: [{ shiftId: 10, fromResidentId: 1, toResidentId: 2 }, { shiftId: 11, fromResidentId: 2, toResidentId: 1 }] });
  });
  it("ditolak: belum disetujui pihak kedua, bukan peserta aktif, orang sama, giliran lewat, kehadiran sudah dicatat", () => {
    assert.match((planSwap(base({ counterpartAgreed: false })) as { error: string }).error, /belum tercatat setuju/);
    assert.match((planSwap(base({ counterpartActive: false })) as { error: string }).error, /peserta aktif/);
    assert.match((planSwap(base({ counterpartResidentId: 1 })) as { error: string }).error, /orang yang sama/);
    assert.match((planSwap(base({ requesterShift: sh(10, "2026-10-31", 1) })) as { error: string }).error, /sudah lewat/);
    assert.match((planSwap(base({ requesterShift: sh(10, "2026-11-05", 1, "PRESENT") })) as { error: string }).error, /sudah dicatat/);
    assert.equal(planSwap(base({ requesterShift: sh(10, "2026-11-01", 1) })).ok, true, "malam ini masih boleh");
  });
  it("ditolak: ganti ke orang yang sudah bertugas malam itu; tukar yang membuat orang dobel", () => {
    assert.match((planSwap(base({ assigned: { "2026-11-05": [1, 2] } })) as { error: string }).error, /sudah bertugas/);
    const cp = sh(11, "2026-11-07", 2);
    assert.match((planSwap(base({ counterpartShift: cp, assigned: { "2026-11-05": [1, 2], "2026-11-07": [2] } })) as { error: string }).error, /Pihak kedua sudah bertugas pada malam giliran pemohon/);
    assert.match((planSwap(base({ counterpartShift: cp, assigned: { "2026-11-05": [1], "2026-11-07": [2, 1] } })) as { error: string }).error, /Pemohon sudah bertugas pada malam giliran pihak kedua/);
    assert.match((planSwap(base({ counterpartShift: sh(11, "2026-11-07", 3) })) as { error: string }).error, /bukan milik pihak kedua/);
    assert.match((planSwap(base({ counterpartShift: sh(11, "2026-11-05", 2) })) as { error: string }).error, /malam yang sama/);
    assert.match((planSwap(base({ counterpartShift: { ...sh(11, "2026-11-07", 2), groupId: 9 } })) as { error: string }).error, /bukan milik regu/);
    assert.match((planSwap(base({ counterpartShift: sh(11, "2026-10-20", 2) })) as { error: string }).error, /sudah lewat/);
  });
});

describe("temuan regu ronda", () => {
  const g = { name: "RT 02/RW 01", active: true, perShift: 2, activePeople: 8, underStaffedNights: 0, scheduledAhead: 7, absentLast30: 0 };
  it("peserta kurang, rotasi tipis, jadwal kosong, malam belum penuh, sering absen", () => {
    assert.deepEqual(groupFindings(g), []);
    assert.equal(groupFindings({ ...g, activePeople: 1 })[0]!.code, "TOO_FEW_PEOPLE");
    assert.equal(groupFindings({ ...g, activePeople: 3 })[0]!.code, "THIN_ROTATION");
    assert.equal(groupFindings({ ...g, scheduledAhead: 0 })[0]!.code, "NO_SCHEDULE");
    assert.equal(groupFindings({ ...g, underStaffedNights: 2 })[0]!.code, "UNDERSTAFFED");
    assert.equal(groupFindings({ ...g, absentLast30: 4 })[0]!.code, "ABSENCES");
    assert.deepEqual(groupFindings({ ...g, active: false, activePeople: 0 }), []);
  });
});

describe("berita acara mediasi: gerbang", () => {
  const P = (side: string, attended = true, agrees: boolean | null = null, isMinor = false) => ({ side, attended, agrees, isMinor });
  it("hasil 'telah dilaksanakan' butuh pihak pertama dan kedua yang hadir", () => {
    assert.match(mediationGate("SEPAKAT_SEBAGIAN", [])!, /Catat para pihak/);
    assert.match(mediationGate("TIDAK_SEPAKAT", [P("PIHAK_A"), P("PIHAK_B", false)])!, /pihak pertama dan satu pihak kedua/);
    assert.equal(mediationGate("TIDAK_SEPAKAT", [P("PIHAK_A"), P("PIHAK_B")]), null);
    assert.equal(mediationGate("DITUNDA", [P("PIHAK_A")]), null, "pihak kedua tidak hadir: ditunda");
    assert.equal(mediationGate("DIRUJUK", [P("PIHAK_A", false)]), null);
  });
  it("sepakat penuh butuh semua pihak yang hadir menyetujui", () => {
    assert.match(mediationGate("SEPAKAT", [P("PIHAK_A", true, true), P("PIHAK_B", true, null)])!, /menyetujui/);
    assert.match(mediationGate("SEPAKAT", [P("PIHAK_A", true, true), P("PIHAK_B", true, false)])!, /menyetujui/);
    assert.equal(mediationGate("SEPAKAT", [P("PIHAK_A", true, true), P("PIHAK_B", true, true), P("SAKSI", true, null)]), null);
    assert.equal(mediationGate("SEPAKAT_SEBAGIAN", [P("PIHAK_A", true, true), P("PIHAK_B", true, false)]), null);
  });
  it("pihak anak yang hadir butuh pendamping/wali yang hadir", () => {
    assert.match(mediationGate("TIDAK_SEPAKAT", [P("PIHAK_A", true, null, true), P("PIHAK_B")])!, /pendamping/);
    assert.match(mediationGate("TIDAK_SEPAKAT", [P("PIHAK_A", true, null, true), P("PIHAK_B"), P("PENDAMPING", false)])!, /pendamping/);
    assert.equal(mediationGate("TIDAK_SEPAKAT", [P("PIHAK_A", true, null, true), P("PIHAK_B"), P("PENDAMPING", true)]), null);
  });
  it("nama pihak tersamar tanpa izin rinci", () => {
    assert.equal(partyDisplayName("Sutarno Hadi", false), "S****** H***");
    assert.equal(partyDisplayName("Sutarno Hadi", true), "Sutarno Hadi");
    assert.ok(!maskName("Sutarno").includes("utarno"));
  });
});

describe("penjaga: bukan basis data kasus kekerasan perempuan/anak (pagar, bukan jaminan)", () => {
  it("terdeteksi pada frasa kekerasan terhadap perempuan/anak dan kekerasan seksual", () => {
    for (const t of [
      "Korban KDRT di RT 03",
      "kdrt",
      "K.D.R.T terjadi semalam",
      "dugaan kekerasan dalam rumah tangga",
      "Kekerasan terhadap anak di rumah warga",
      "laporan Kekerasan Seksual",
      "dugaan PENCABULAN anak",
      "pemerkosaan",
      "pelecehan seksual di jalan",
      "kasus asusila",
    ]) assert.ok(sensitiveViolenceTerm(t), t);
  });
  it("bentuk kata kerja, imbuhan, dan frasa lain (hasil tinjauan keamanan)", () => {
    for (const t of ["memperkosa", "diperkosa", "dicabuli", "pencabul", "rudapaksa", "dirudapaksa", "inses", "kekerasan terhadap istri", "penganiayaan terhadap anak", "melecehkan anak", "suami memukul istri sampai lebam", "istri dipukul suaminya", "kekerasan fisik terhadap ibu", "pemaksaan perkawinan", "kawin paksa", "perdagangan orang", "eksploitasi seksual"]) assert.ok(sensitiveViolenceTerm(t), t);
  });
  it("tukar giliran: bentuk \"bertukar\" tanpa giliran pihak kedua ditolak, penggantian biasa tetap diterima", () => {
    const base = { shiftId: 1, counterpartResidentId: 2, counterpartAgreed: true };
    const bad = parseSwapCreate({ ...base, swap: true, counterpartShiftId: null });
    assert.ok(!bad.ok && /giliran pihak kedua/i.test(bad.fieldErrors.counterpartShiftId!));
    assert.ok(parseSwapCreate({ ...base, swap: true, counterpartShiftId: 7 }).ok);
    const plain = parseSwapCreate({ ...base, swap: false });
    assert.ok(plain.ok && plain.value.counterpartShiftId === null && !("swap" in plain.value));
  });
  it("bentuk kata kerja persetubuhan, istilah Inggris, dan singkatan yang lolos pada uji browser", () => {
    for (const t of ["menyetubuhi anak", "digagahi tetangga", "meniduri anak di bawah umur", "memaksa berhubungan badan", "child abuse", "rape", "sexual assault", "kekerasan dlm rumah tangga", "dia menyetubuhi anak di bawah umur", "disetubuhi paksa", "menggagahi korban", "domestic violence"]) assert.ok(sensitiveViolenceTerm(t), t);
    for (const t of ["grape juice dijual di pos", "drape tirai pos ronda", "scrape cat pagar pos", "Kekerasan dalam RT 03 tidak ada", "sexton gereja hadir"]) assert.equal(sensitiveViolenceTerm(t), null, t);
  });
  it("pemisah tak terlihat, tanda gabung, huruf terpisah, homoglif, dan leetspeak tidak menembus", () => {
    const cases: Record<string, string> = {
      "pem\u200Berkosaan": "zero-width space",
      "per\u00ADkosaan": "soft hyphen",
      "pe\u0301merkosaan": "combining mark",
      "pem\u2060erkosaan": "word joiner",
      "in\u200Bses": "zero-width di kata pendek (hanya pelipatan yang menangkap)",
      "kd\u00ADrt": "soft hyphen di singkatan",
      "KD\u200DRT": "zero-width joiner di singkatan",
      "pen\u0307cabulan": "tanda gabung di tengah akar kata",
      "k-d-r-t": "huruf dipisah tanda hubung",
      "k d r t": "huruf dipisah spasi",
      "p e m e r k o s a a n": "huruf dipisah spasi",
      "p.e.m.e.r.k.o.s.a.a.n": "huruf dipisah titik",
      "per-kosa": "tanda hubung di tengah kata",
      "kekеrasan seksual": "Cyrillic е",
      "pеrkosa": "Cyrillic е",
      "кdrt": "Cyrillic к",
      "ｋｄｒｔ": "fullwidth",
      "s3ksual": "leetspeak",
      "k3kerasan s3ksual": "leetspeak",
      "p3rk0s4": "leetspeak",
      "KEKERASAN\u200B SEKSUAL": "huruf besar + zero-width",
    };
    for (const [t, why] of Object.entries(cases)) assert.ok(sensitiveViolenceTerm(t), `${why}: ${JSON.stringify(t)}`);
  });
  it("tidak menolak berlebihan pada kalimat wajar", () => {
    for (const t of [
      "Pencurian sepeda motor di RT 02",
      "Perkelahian antar pemuda",
      "Sengketa batas tanah",
      "Pak Kades dan Ketua RT hadir",
      "Mediasi utang piutang",
      "bapak drt menghadiri",
      "Pos ronda dikunci",
      "ronda malam aman",
      "mediasi sengketa batas tanah",
      "anak-anak saling pukul di lapangan",
      "warga memukul kentongan",
      "tata susila warga",
      "mesin sesuai standar",
      "pencabutan paku di pos",
      "ibu-ibu PKK hadir di pos ronda",
      "anak bermain di pos",
      "Perkelahian antar pemuda RT 03 pukul 23.00",
      "Pagar rumah rusak dirusak orang",
      null,
      "",
    ]) assert.equal(sensitiveViolenceTerm(t), null, String(t));
    assert.ok(SENSITIVE_TERMS.length >= 30);
  });
  it("skema menolak teks bebas naratif (termasuk catatan lembaga, tempat, nama wilayah rawan, tujuan rujukan) dengan pesan rujukan", () => {
    const f = parseFollowup({ description: "Dampingi korban KDRT ke puskesmas" });
    assert.ok(!f.ok && /UPTD PPA/.test(f.fieldErrors.description!));
    const l = parseRondaLog({ shiftDate: "2026-11-01", loggedAt: "2026-11-01T01:00:00Z", kind: "TEMUAN", description: "Terdengar pelecehan seksual di gang" });
    assert.ok(!l.ok && l.fieldErrors.description);
    const m = parseMediationComplete({ outcome: "SEPAKAT", agreement: "Pelaku kekerasan seksual berjanji tidak mengulangi" });
    assert.ok(!m.ok && m.fieldErrors.agreement);
    const r = parseMediationComplete({ outcome: "DIRUJUK", referredTo: "UPTD untuk kasus pencabulan anak" });
    assert.ok(!r.ok && r.fieldErrors.referredTo, "tujuan rujukan juga dijaga");
    assert.ok(!parseContact({ kind: "LAINNYA", name: "Kontak", phone: "123", note: "Rumah korban KDRT" }, "create").ok, "catatan kontak dijaga");
    assert.ok(!parseRisk({ name: "Rumah korban pemerkosaan", kind: "LAINNYA" }, "create").ok, "nama wilayah rawan dijaga");
    assert.ok(!parseMediation({ scheduledAt: "2026-11-05T09:00:00Z", place: "Rumah korban perkosaan", mediator: "Kaur" }, "create").ok, "tempat dijaga");
    assert.ok(!parseParty({ side: "SAKSI", name: "Budi", note: "melihat suami memukul istri" }).ok, "catatan pihak dijaga");
    assert.ok(parseFollowup({ description: "Pasang lampu jalan di tikungan" }).ok);
    // nama orang tidak dijaga kata (disamarkan lewat izin rinci)
    assert.ok(parseParty({ side: "SAKSI", name: "Budi Santoso" }).ok);
    assert.ok(parseMediation({ scheduledAt: "2026-11-05T09:00:00Z", place: "Balai Desa", mediator: "Kaur Pemerintahan" }, "create").ok);
  });
});

describe("batas rentang tanggal (DoS)", () => {
  it("dateRange tidak membangun larik untuk rentang ekstrem; waktu Jakarta", () => {
    const t0 = Date.now();
    assert.deepEqual(dateRange("0000-01-01", "9999-12-31"), []);
    assert.deepEqual(dateRange("2026-01-01", "2030-01-01"), [], "lebih dari batas pengaman");
    assert.equal(dateRange("2026-11-01", "2026-12-01").length, 31);
    assert.ok(Date.now() - t0 < 200, "ditolak cepat");
    assert.equal(timeJakarta(new Date("2026-11-01T15:30:00Z")), "22:30");
    assert.equal(timeJakarta(new Date("2026-11-01T17:05:00Z")), "00:05");
  });
  it("pembuat jadwal menolak rentang ekstrem dan tahun di luar 2000-2100 tanpa membangun larik", () => {
    const t0 = Date.now();
    for (const [from, to] of [["0000-01-01", "9999-12-31"], ["1999-12-31", "2000-01-02"], ["2026-11-01", "2101-01-01"], ["2026-11-01", "2027-06-01"]]) assert.ok(!parseGenerate({ from, to }).ok, `${from}..${to}`);
    assert.ok(Date.now() - t0 < 200);
  });
});

describe("validasi masukan", () => {
  it("anggota: warga wajib saat dibuat, tidak dapat diganti saat ubah; jabatan/regu tertutup; tanggal wajar", () => {
    assert.ok(!parseMember({ role: "ANGGOTA" }, "create").ok);
    const c = parseMember({ residentId: "12", decreeNumber: "SK/1", joinedOn: "2026-01-01" }, "create");
    assert.ok(c.ok && c.value.residentId === 12 && c.value.role === "ANGGOTA");
    const p = parseMember({ residentId: 99, note: "x" }, "patch");
    assert.ok(p.ok && !("residentId" in p.value));
    assert.ok(!parseMember({ residentId: 1, role: "KOMANDAN" }, "create").ok);
    assert.ok(!parseMember({ residentId: 1, squadKind: "PASUKAN" }, "create").ok);
    assert.ok(!parseMember({ residentId: 1, joinedOn: "2026-02-31" }, "create").ok);
    for (const v of ["1e3", "0x10", -1, 1.5, [3], true]) assert.ok(!parseMember({ residentId: v }, "create").ok, String(v));
    assert.ok(!parseMemberEnd({ endedOn: "2026-11-01" }).ok, "sebab wajib");
    assert.ok(parseMemberEnd({ endedOn: "2026-11-01", endReason: "PINDAH", endDecree: "SK/9" }).ok);
    assert.ok(!parseMemberEnd({ endedOn: "2026-11-01", endReason: "DIPECAT" }).ok);
  });
  it("regu: nama wajib, jam JJ:MM, petugas per malam 1-20, RT/RW karakter aman", () => {
    const ok = parseGroup({ name: "Ronda RT 02" }, "create");
    assert.ok(ok.ok && ok.value.perShift === 2 && ok.value.startTime === "22:00" && ok.value.endTime === "04:00" && ok.value.active === true);
    assert.ok(!parseGroup({ name: "ab" }, "create").ok);
    assert.ok(!parseGroup({ name: "Ronda", startTime: "25:00" }, "create").ok);
    assert.ok(!parseGroup({ name: "Ronda", endTime: "4:00" }, "create").ok);
    assert.ok(!parseGroup({ name: "Ronda", perShift: 0 }, "create").ok);
    assert.ok(!parseGroup({ name: "Ronda", perShift: 21 }, "create").ok);
    assert.ok(!parseGroup({ name: "Ronda", rt: "<b>" }, "create").ok);
    assert.ok(!parseGroup({ name: "Ronda", active: "ya" }, "create").ok);
    assert.deepEqual(Object.keys((parseGroup({ perShift: 3 }, "patch") as { ok: true; value: object }).value), ["perShift"]);
  });
  it("pembuat jadwal: rentang tanggal, batas 62 malam, daftar kecuali/tidak tersedia", () => {
    assert.ok(parseGenerate({ from: "2026-11-02", to: "2026-11-08" }).ok);
    assert.ok(!parseGenerate({ from: "2026-11-08", to: "2026-11-02" }).ok);
    assert.ok(!parseGenerate({ from: "2026-11-01", to: "2027-01-31" }).ok, "63 malam");
    assert.ok(parseGenerate({ from: "2026-11-01", to: "2027-01-01" }).ok, "62 malam");
    assert.ok(!parseGenerate({ from: "2026-02-31", to: "2026-03-05" }).ok);
    assert.ok(!parseGenerate({ from: "2026-11-02", to: "2026-11-08", excludeResidentIds: ["x"] }).ok);
    assert.ok(!parseGenerate({ from: "2026-11-02", to: "2026-11-08", unavailable: [{ residentId: 1, date: "bukan" }] }).ok);
    const p = parseGenerate({ from: "2026-11-02", to: "2026-11-08", excludeResidentIds: [3, 3, "4"], unavailable: [{ residentId: 1, date: "2026-11-03" }] });
    assert.ok(p.ok && p.value.excludeResidentIds.join() === "3,4" && p.value.unavailable.length === 1);
  });
  it("giliran, kehadiran, tukar", () => {
    assert.ok(parseShift({ shiftDate: "2026-11-05", residentId: 4 }).ok);
    assert.ok(!parseShift({ shiftDate: "2026-11-05" }).ok);
    assert.ok(parseMark({ attendance: "PRESENT" }).ok);
    assert.ok(!parseMark({ attendance: "HADIR" }).ok);
    assert.ok(!parseMark({}).ok);
    assert.ok(parseSwapCreate({ shiftId: 1, counterpartResidentId: 2, counterpartAgreed: true }).ok);
    assert.ok(!parseSwapCreate({ shiftId: 1, counterpartResidentId: 2, counterpartAgreed: "true" }).ok, "bukan boolean");
    const d = parseSwapDecision({ decision: "REJECT", note: "tdk" });
    assert.ok(!d.ok && d.fieldErrors.note);
    assert.ok(parseSwapDecision({ decision: "APPROVE" }).ok);
    assert.ok(!parseSwapDecision({ decision: "SETUJU" }).ok);
    assert.ok(parseSwapDecision({ decision: "CANCEL", note: "Dibatalkan pemohon" }).ok);
  });
  it("mediasi: waktu ISO + zona; hasil menuntut isi yang sesuai", () => {
    assert.ok(parseMediation({ scheduledAt: "2026-11-05T09:00:00+07:00", place: "Balai Desa", mediator: "Kaur Pemerintahan" }, "create").ok);
    assert.ok(!parseMediation({ scheduledAt: "2026-11-05", place: "Balai Desa", mediator: "Kaur" }, "create").ok);
    assert.ok(!parseMediation({ scheduledAt: "2026-11-05T09:00:00Z", place: "", mediator: "Kaur" }, "create").ok);
    assert.ok(!parseMediationComplete({ outcome: "SEPAKAT" }).ok, "kesepakatan wajib");
    assert.ok(!parseMediationComplete({ outcome: "SEPAKAT", agreement: "singkat" }).ok);
    assert.ok(parseMediationComplete({ outcome: "SEPAKAT", agreement: "Kedua pihak sepakat berdamai dan tidak mengulangi." }).ok);
    assert.ok(!parseMediationComplete({ outcome: "DIRUJUK" }).ok, "tujuan rujukan wajib");
    const ok = parseMediationComplete({ outcome: "TIDAK_SEPAKAT", referredTo: "diabaikan" });
    assert.ok(ok.ok && ok.value.referredTo === null);
    assert.ok(!parseMediationComplete({ outcome: "BERDAMAI" }).ok);
  });
  it("pihak mediasi: warga atau nama; peran tertutup; tanpa kolom identitas", () => {
    assert.ok(parseParty({ side: "PIHAK_A", residentId: 5 }).ok);
    assert.ok(parseParty({ side: "SAKSI", name: "Tetangga" }).ok);
    assert.ok(!parseParty({ side: "SAKSI" }).ok);
    assert.ok(!parseParty({ side: "KORBAN", name: "X" }).ok);
    const p = parseParty({ side: "PIHAK_A", name: "Budi", nik: "3374012345678901", phone: "0812", address: "Jl. A" });
    assert.ok(p.ok);
    if (p.ok) assert.deepEqual(Object.keys(p.value).sort(), ["agrees", "attended", "isMinor", "name", "note", "residentId", "side"]);
  });
  it("tautan pengaduan: id bilangan bulat positif sampai 18 digit, jadi BigInt", () => {
    const ok = parseReportLink({ citizenReportId: "123456789012345678" });
    assert.ok(ok.ok && ok.value.citizenReportId === 123456789012345678n);
    for (const v of ["0", "-1", "1e3", "abc", "1234567890123456789", 1.5, null, [1], "0x10", "12 "]) {
      const r = parseReportLink({ citizenReportId: v });
      if (v === "12 ") assert.ok(r.ok, "spasi dirapikan");
      else assert.ok(!r.ok, String(v));
    }
  });
  it("kerawanan dan kontak", () => {
    assert.ok(parseRisk({ name: "Tikungan Kali Gede", kind: "LAKA_LANTAS" }, "create").ok);
    assert.ok(!parseRisk({ name: "Tikungan", kind: "LAKA_LANTAS", lat: -7.6 }, "create").ok, "koordinat berpasangan");
    assert.ok(!parseRisk({ name: "Tikungan", kind: "RAWAN" }, "create").ok);
    assert.ok(!parseRisk({ name: "Tikungan", kind: "LAKA_LANTAS", level: "EXTREME" }, "create").ok);
    assert.ok(parseContact({ kind: "UPTD_PPA", name: "UPTD PPA Kabupaten", phone: "(0271) 123-456" }, "create").ok);
    assert.ok(!parseContact({ kind: "UPTD_PPA", name: "UPTD PPA", phone: "<script>" }, "create").ok);
    assert.ok(!parseContact({ kind: "SATPAM", name: "X", phone: "123" }, "create").ok);
  });
});

describe("izin rute keamanan", () => {
  const gate = (path: string, method: string, role: Role) => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    assert.equal(r.resource, "keamanan");
    return roleCan(r.resource, r.action, role);
  };
  it("semua peran membaca; Kepala Desa tidak mencatat/mengubah; staf mencatat tetapi tidak menghapus", () => {
    for (const role of ROLES) for (const p of ["/api/keamanan", "/api/keamanan/kejadian", "/api/keamanan/anggota", "/api/keamanan/regu"]) assert.equal(gate(p, "GET", role), true, `${role} ${p}`);
    assert.equal(gate("/api/keamanan/kejadian", "POST", "village_head"), false);
    assert.equal(gate("/api/keamanan/kejadian", "POST", "staff"), true);
    assert.equal(gate("/api/keamanan/kejadian/3", "DELETE", "staff"), false);
    assert.equal(gate("/api/keamanan/kejadian/3", "DELETE", "secretary"), true);
    assert.equal(gate("/api/keamanan/anggota/3", "DELETE", "staff"), false);
    assert.equal(gate("/api/keamanan/regu/3", "DELETE", "staff"), false);
  });
  it("aksi berstatus = update: staf boleh, Kepala Desa tidak", () => {
    for (const p of ["/api/keamanan/jadwal/7/kehadiran", "/api/keamanan/tukar/4", "/api/keamanan/mediasi/5/selesai", "/api/keamanan/mediasi/5/batal", "/api/keamanan/tindak-lanjut/8/selesai", "/api/keamanan/anggota/2/akhiri", "/api/keamanan/anggota/2/aktifkan"]) {
      assert.equal(gate(p, "POST", "staff"), true, p);
      assert.equal(gate(p, "POST", "village_head"), false, p);
      assert.equal(resolveApiPermission(p, "POST")!.action, "update", p);
    }
    assert.equal(roleCan("keamanan", "approve", "staff"), false);
    assert.equal(roleCan("keamanan", "approve", "village_head"), true);
  });
  it("pindah status kejadian: gerbang kasar read (semua peran) karena izin sebenarnya dicek di servis; Kepala Desa dapat menutup, staf tidak", () => {
    for (const role of ROLES) assert.equal(gate("/api/keamanan/kejadian/3/status", "POST", role), true, role);
    assert.equal(resolveApiPermission("/api/keamanan/kejadian/3/status", "POST")!.action, "read");
    // izin yang dipakai servis (transitionAction): menutup/membuka kembali = approve; selebihnya update
    assert.equal(transitionAction("RESOLVED", "CLOSED"), "approve");
    assert.equal(roleCan("keamanan", "approve", "village_head"), true);
    assert.equal(roleCan("keamanan", "approve", "staff"), false);
    assert.equal(roleCan("keamanan", "update", "village_head"), false);
  });
  it("handler aksi berstatus memeriksa peran DB sendiri (sabuk pengaman bila pola gerbang gagal cocok)", () => {
    for (const f of ["tukar/[wid]", "mediasi/[mid]/selesai", "mediasi/[mid]/batal", "anggota/[id]/akhiri", "anggota/[id]/aktifkan", "jadwal/[sid]/kehadiran", "tindak-lanjut/[fid]/selesai"]) {
      const src = readFileSync(join(process.cwd(), "app/api/keamanan", f, "route.ts"), "utf8");
      assert.match(src, /denyUnless\(ctx, "update"\)/, f);
    }
  });
  it("buat jadwal, ajukan tukar, catat ronda = create (staf ya)", () => {
    for (const p of ["/api/keamanan/regu/1/jadwal/buat", "/api/keamanan/tukar", "/api/keamanan/ronda/catatan", "/api/keamanan/kejadian/1/mediasi", "/api/keamanan/mediasi/1/pihak"]) assert.equal(gate(p, "POST", "staff"), true, p);
  });
  it("baca rinci (export) hanya Kepala Desa/sekretaris/admin", () => {
    assert.deepEqual(ROLES.filter((r) => roleCan("keamanan", "export", r)), ["admin", "village_head", "secretary"]);
  });
  it("bencana dan keamanan terpisah: resource berbeda, tidak ada pemetaan silang", () => {
    assert.equal(resolveApiPermission("/api/keamanan/kejadian", "GET")!.resource, "keamanan");
    assert.equal(resolveApiPermission("/api/bencana/kejadian", "GET")!.resource, "bencana");
  });
  it("modul terdaftar di registry dengan resource keamanan", () => {
    const m = getModuleByPathSegment("keamanan");
    assert.ok(m);
    assert.equal(m.permission, "keamanan");
  });
});

describe("penjaga: data pihak berperkara tidak bocor dan skema tidak punya kolom identitas", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
  it("tidak ada berkas di app/api/mobile, public, v1, lib/mcp, laras, ai, webhooks yang memakai lib/keamanan atau tabelnya", () => {
    const offenders: string[] = [];
    for (const d of ["app/api/mobile", "app/api/public", "app/api/v1", "lib/mcp", "lib/laras", "lib/ai", "lib/webhooks"]) {
      let files: string[] = [];
      try {
        files = walk(join(process.cwd(), d));
      } catch {
        continue;
      }
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        if (/lib\/keamanan\b|security[A-Z][A-Za-z]+\b|security_(members|equipment|ronda_|mediation|followups|report_links|risk_areas|contacts)|api\/keamanan/.test(src)) offenders.push(f);
      }
    }
    assert.deepEqual(offenders, []);
  });
  it("model security_* tidak punya kolom NIK/KK/alamat/telepon/tanggal lahir/identitas korban (kecuali telepon layanan di kontak)", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
    const blocks = [...schema.matchAll(/^model (Security\w+) \{([\s\S]*?)^\}/gm)];
    assert.ok(blocks.length >= 13, `ditemukan ${blocks.length} model`);
    const forbidden = /^\s*(nik|kk|kkNumber|address|alamat|phone|telp|telepon|birthDate|birthplace|gender|victim\w*|korban\w*|reporterNik|reporterName|email)\s/i;
    for (const [, name, body] of blocks) {
      for (const line of body!.split("\n")) {
        if (name === "SecurityContact" && /^\s*(phone|address)\s/.test(line)) continue; // kontak layanan, bukan orang
        assert.doesNotMatch(line, forbidden, `${name}: ${line.trim()}`);
      }
    }
  });
  it("setiap rute /api/keamanan memanggil guard di tiap handler dan membungkus attempt(), tanpa villageId dari masukan", () => {
    const files = walk(join(process.cwd(), "app/api/keamanan")).filter((f) => f.endsWith("route.ts"));
    assert.ok(files.length >= 40, `ditemukan ${files.length} rute`);
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const handlers = [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].length;
      assert.ok(handlers >= 1, f);
      assert.equal([...src.matchAll(/await requireVillageApiContext\(/g)].length, handlers, f);
      assert.equal([...src.matchAll(/return attempt\(/g)].length, handlers, f);
      assert.ok(!/villageId:\s*(body|req\.|await req)/.test(src), `${f}: villageId tidak boleh dari masukan`);
      assert.ok(!/from "@\/lib\/laras|from "@\/lib\/mcp/.test(src), f);
    }
  });
  it("servis memakai domain KEAMANAN tetap dan tidak menerima domain/villageId dari luar", () => {
    const src = readFileSync(join(process.cwd(), "lib/keamanan/kejadian.ts"), "utf8");
    assert.match(src, /const DOMAIN = "KEAMANAN" as const/);
    assert.doesNotMatch(src, /domain: (a|args|input)\./);
  });
  it("layar tidak memakai <select> mentah dan memberi ruang bawah (pb-24)", () => {
    const dir = join(process.cwd(), "app/(app)/keamanan/_components");
    const files = walk(dir);
    assert.ok(files.length >= 8);
    for (const f of files) assert.doesNotMatch(readFileSync(f, "utf8"), /<select\b/, f);
    assert.match(readFileSync(join(dir, "KeamananView.tsx"), "utf8"), /pb-24/);
  });
});
