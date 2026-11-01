import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { DOMAIN_DEFS, kindLabel } from "../lib/incident/catalog";
import { canTransition, incidentFindings, isEditable, maskKk, maskName, normalizeItemKey, transitionAction, transitionGate, TRANSITIONS, type GateFacts } from "../lib/incident/calc";
import { parseEventCreate, parseEventListQuery, parseEventPatch, parseLogistic, parseResponse, parseTransition, parseInstant } from "../lib/incident/schema";
import { ACTIVITIES, ACTIVITY_CODES } from "../lib/bencana/catalog";
import { alertTemplate, areaVariants, bencanaFindings, dedupeTargets, normArea, readinessItems, readinessScore, type ReadinessFacts } from "../lib/bencana/calc";
import { ALERT_LEVELS } from "../lib/bencana/catalog";
import { alertContentProblem, foldForScan } from "../lib/bencana/calc";
import { parseAlert, parseAssessment, parseHazard, parsePlan, parseReadinessSet, parseResource, parseVolunteer } from "../lib/bencana/schema";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";
import { getModuleByPathSegment } from "../lib/modules/registry";

const NOW = new Date("2026-11-01T05:00:00Z");
const G = (o: Partial<GateFacts> = {}): GateFacts => ({ from: "OPEN", to: "RESPONDING", severity: "MEDIUM", responseCount: 1, supraReported: false, note: null, resolutionNote: null, ...o });

describe("kejadian: siklus status bergerbang", () => {
  it("hanya perpindahan yang terdaftar yang sah; CLOSED/CANCELLED tidak bisa lompat", () => {
    assert.equal(canTransition("OPEN", "RESPONDING"), true);
    assert.equal(canTransition("OPEN", "CLOSED"), false, "tidak boleh melompati penanganan");
    assert.equal(canTransition("OPEN", "RESOLVED"), false);
    assert.equal(canTransition("RESPONDING", "CLOSED"), false);
    assert.equal(canTransition("CANCELLED", "OPEN"), false);
    assert.equal(canTransition("CANCELLED", "RESPONDING"), false);
    assert.equal(canTransition("CLOSED", "RESPONDING"), true, "dibuka kembali");
    assert.deepEqual(TRANSITIONS.CANCELLED, []);
  });

  it("selesai ditangani butuh minimal satu tindakan dan ringkasan penyelesaian", () => {
    assert.match(transitionGate(G({ from: "RESPONDING", to: "RESOLVED", responseCount: 0, note: "Sudah beres semua" }))!, /minimal satu tindakan/);
    assert.match(transitionGate(G({ from: "RESPONDING", to: "RESOLVED" }))!, /ringkasan penyelesaian/);
    assert.equal(transitionGate(G({ from: "RESPONDING", to: "RESOLVED", note: "Air surut, warga pulang" })), null);
    assert.equal(transitionGate(G({ from: "RESPONDING", to: "RESOLVED", resolutionNote: "Sudah tersimpan" })), null, "ringkasan lama cukup");
  });

  it("batal dan buka kembali wajib beralasan; menutup kejadian berat tanpa lapor supra-desa wajib alasan", () => {
    assert.match(transitionGate(G({ to: "CANCELLED" }))!, /alasan pembatalan/);
    assert.equal(transitionGate(G({ to: "CANCELLED", note: "Salah catat" })), null);
    assert.match(transitionGate(G({ from: "CLOSED", to: "RESPONDING" }))!, /alasan membuka kembali/);
    assert.match(transitionGate(G({ from: "RESOLVED", to: "RESPONDING", note: "ok" }))!, /alasan/, "catatan terlalu pendek");
    assert.match(transitionGate(G({ from: "RESOLVED", to: "CLOSED", severity: "CRITICAL" }))!, /supra-desa/);
    assert.equal(transitionGate(G({ from: "RESOLVED", to: "CLOSED", severity: "CRITICAL", supraReported: true })), null);
    assert.equal(transitionGate(G({ from: "RESOLVED", to: "CLOSED", severity: "HIGH", note: "Tidak perlu lapor, skala kecil" })), null);
    assert.equal(transitionGate(G({ from: "RESOLVED", to: "CLOSED", severity: "LOW" })), null, "ringan tidak digerbang");
  });

  it("menutup dan membuka kembali kejadian ditutup butuh approve; selebihnya update", () => {
    assert.equal(transitionAction("RESOLVED", "CLOSED"), "approve");
    assert.equal(transitionAction("CLOSED", "RESPONDING"), "approve");
    assert.equal(transitionAction("OPEN", "RESPONDING"), "update");
    assert.equal(transitionAction("OPEN", "CANCELLED"), "update");
    assert.equal(isEditable("CLOSED"), false);
    assert.equal(isEditable("CANCELLED"), false);
    assert.equal(isEditable("RESOLVED"), true);
  });

  it("temuan: belum ada tindakan 6 jam, berat belum lapor 24 jam, catatan lingkup pengecualian Dana Desa [V]", () => {
    const base = { domain: "BENCANA" as const, kind: "BANJIR", severity: "HIGH" as const, status: "OPEN" as const, supraReportedAt: null, responseCount: 0, now: NOW };
    const f = incidentFindings({ ...base, occurredAt: new Date("2026-10-30T00:00:00Z") });
    const codes = f.map((x) => x.code);
    assert.ok(codes.includes("NO_RESPONSE") && codes.includes("NOT_REPORTED") && codes.includes("DD_EXCEPTION_SCOPE"));
    assert.equal(incidentFindings({ ...base, occurredAt: new Date("2026-11-01T04:00:00Z") }).some((x) => x.level === "WARN"), false, "baru 1 jam");
    assert.ok(incidentFindings({ ...base, occurredAt: new Date("2025-06-01T00:00:00Z") }).some((x) => x.code === "DD_EXCEPTION_2025"));
    assert.equal(incidentFindings({ ...base, kind: "KEBAKARAN_PERMUKIMAN", occurredAt: new Date("2026-11-01T04:30:00Z") }).length, 0, "kategori kebakaran tidak dipastikan");
    assert.equal(incidentFindings({ ...base, status: "CLOSED", occurredAt: new Date("2026-10-01T00:00:00Z") }).length, 0);
  });
});

describe("kejadian: penyamaran dan kunci anti-ganda", () => {
  it("KK hanya 4 digit terakhir; nama tersisa huruf pertama", () => {
    assert.equal(maskKk("3374011234567890"), "••••••••••••7890");
    assert.equal(maskKk(null), "-");
    assert.equal(maskName("Sutarno Hadi"), "S****** H***");
    assert.equal(maskName("A"), "A");
    assert.ok(!maskName("Sutarno").includes("utarno"));
  });
  it("kunci item: huruf kecil, spasi dirapikan", () => {
    assert.equal(normalizeItemKey("  Beras   5 KG "), "beras 5 kg");
  });
});

describe("kejadian: validasi masukan", () => {
  const ok = { kind: "BANJIR", title: "Banjir RW 02", occurredAt: "2026-11-01T08:00:00+07:00" };
  it("jenis harus ada di katalog domain; jenis keamanan ditolak pada domain bencana dan sebaliknya", () => {
    assert.equal(parseEventCreate("BENCANA", ok, NOW).ok, true);
    assert.equal(parseEventCreate("BENCANA", { ...ok, kind: "PENCURIAN" }, NOW).ok, false);
    assert.equal(parseEventCreate("KEAMANAN", { ...ok, kind: "PENCURIAN" }, NOW).ok, true);
    assert.equal(parseEventCreate("KEAMANAN", ok, NOW).ok, false);
    assert.equal(kindLabel("BENCANA", "BANJIR"), "Banjir");
    assert.equal("KDRT" in DOMAIN_DEFS.KEAMANAN.kinds, false, "kekerasan perempuan/anak tidak dimodelkan");
  });
  it("waktu: wajib ISO dengan zona, tidak di masa depan, tahun wajar", () => {
    for (const t of ["2026-11-01", "2026-11-01T08:00", "01/11/2026", "2026-13-01T00:00:00Z", "1999-01-01T00:00:00Z", 12345, null]) assert.equal(parseEventCreate("BENCANA", { ...ok, occurredAt: t }, NOW).ok, false, String(t));
    assert.equal(parseEventCreate("BENCANA", { ...ok, occurredAt: "2026-11-02T08:00:00Z" }, NOW).ok, false, "masa depan");
    assert.ok(parseInstant("2026-11-01T08:00:00.123Z"));
    assert.equal(parseInstant("2026-02-31T08:00:00Z"), null);
  });
  it("dampak: bilangan bulat tak negatif; notasi ilmiah/heksa/array ditolak; kerugian rupiah", () => {
    for (const v of ["1e3", "0x10", -1, 1.5, [3], true, 2_000_000]) assert.equal(parseEventCreate("BENCANA", { ...ok, deathCount: v }, NOW).ok, false, String(v));
    const r = parseEventCreate("BENCANA", { ...ok, deathCount: "2", missingCount: 0, displacedCount: 120, loss: "1500000" }, NOW);
    assert.ok(r.ok && r.value.deathCount === 2 && r.value.missingCount === 0 && r.value.displacedCount === 120 && r.value.lossCents === 150_000_000n && r.value.injuredCount === null);
    assert.equal(parseEventCreate("BENCANA", { ...ok, loss: "-5" }, NOW).ok, false);
  });
  it("koordinat harus berpasangan dan dalam rentang", () => {
    assert.equal(parseEventCreate("BENCANA", { ...ok, lat: -7.6, lng: 110.9 }, NOW).ok, true);
    assert.equal(parseEventCreate("BENCANA", { ...ok, lat: -7.6 }, NOW).ok, false);
    assert.equal(parseEventCreate("BENCANA", { ...ok, lat: 91, lng: 110 }, NOW).ok, false);
    assert.equal(parseEventCreate("BENCANA", { ...ok, lat: "1e1", lng: 110 }, NOW).ok, false);
  });
  it("pelaporan supra-desa: instansi/nomor tanpa waktu ditolak; waktu tidak di masa depan", () => {
    assert.equal(parseEventCreate("BENCANA", { ...ok, supraReportedTo: "BPBD Kabupaten" }, NOW).ok, false);
    assert.equal(parseEventCreate("BENCANA", { ...ok, supraReportedAt: "2026-11-01T09:00:00+07:00", supraReportedTo: "BPBD", supraReference: "L-1" }, NOW).ok, true);
    assert.equal(parseEventCreate("BENCANA", { ...ok, supraReportedAt: "2026-12-01T09:00:00Z" }, NOW).ok, false);
  });
  it("teks jahat: batas panjang, bukan string; RT/RW hanya karakter aman", () => {
    assert.equal(parseEventCreate("BENCANA", { ...ok, title: "x".repeat(201) }, NOW).ok, false);
    assert.equal(parseEventCreate("BENCANA", { ...ok, title: ["a"] }, NOW).ok, false);
    assert.equal(parseEventCreate("BENCANA", { ...ok, rt: "<script>" }, NOW).ok, false);
    assert.equal(parseEventCreate("BENCANA", null, NOW).ok, false);
    assert.equal(parseEventCreate("BENCANA", { ...ok, severity: "DAHSYAT" }, NOW).ok, false);
  });
  it("ubah sebagian: hanya kunci yang dikirim; null mengosongkan; kunci asing diabaikan", () => {
    const p = parseEventPatch("BENCANA", { title: "Baru", deathCount: "", status: "CLOSED", domain: "KEAMANAN", villageId: 9 }, NOW);
    assert.ok(p.ok);
    if (p.ok) {
      assert.deepEqual(Object.keys(p.value).sort(), ["deathCount", "title"]);
      assert.equal(p.value.deathCount, null);
    }
    assert.equal(parseEventPatch("BENCANA", { title: "" }, NOW).ok, false);
  });
  it("status tujuan harus dikenal", () => {
    assert.equal(parseTransition({ to: "CLOSED" }).ok, true);
    assert.equal(parseTransition({ to: "SELESAI" }).ok, false);
    assert.equal(parseTransition({ to: "CLOSED", note: "x".repeat(501) }).ok, false);
  });
  it("tindakan: jenis mengikuti domain", () => {
    const r = { loggedAt: "2026-11-01T09:00:00+07:00", kind: "EVAKUASI", description: "Evakuasi warga RT 03" };
    assert.equal(parseResponse("BENCANA", r, NOW).ok, true);
    assert.equal(parseResponse("KEAMANAN", r, NOW).ok, false);
    assert.equal(parseResponse("BENCANA", { ...r, description: "a" }, NOW).ok, false);
  });
  it("distribusi: KK atau penerima non-KK; jumlah positif; sumber dana tertutup; tanggal wajar", () => {
    const base = { item: "Beras", quantity: 10, unit: "kg", fundingSource: "DD_OPERASIONAL", distributedOn: "2026-11-01" };
    assert.equal(parseLogistic({ ...base, householdId: 5 }).ok, true);
    assert.equal(parseLogistic({ ...base, recipientName: "Posko Balai Desa" }).ok, true);
    assert.equal(parseLogistic(base).ok, false, "tanpa penerima");
    for (const q of [0, -1, "1e2", 1.5, 2_000_000, null]) assert.equal(parseLogistic({ ...base, householdId: 5, quantity: q }).ok, false, String(q));
    assert.equal(parseLogistic({ ...base, householdId: 5, fundingSource: "ADA" }).ok, false);
    assert.equal(parseLogistic({ ...base, householdId: "abc" }).ok, false);
    assert.equal(parseLogistic({ ...base, householdId: 5, distributedOn: "0001-01-01" }).ok, false);
    const r = parseLogistic({ ...base, householdId: 5, item: "  Beras  PREMIUM ", value: "150000" });
    assert.ok(r.ok && r.value.itemKey === "beras premium" && r.value.valueCents === 15_000_000n);
  });
});

describe("kesiapsiagaan: validasi", () => {
  it("ancaman: jenis dan nama wajib, tingkat risiko bawaan SEDANG; ubah sebagian", () => {
    const c = parseHazard({ hazardType: "BANJIR", name: "Bantaran Kali Gede" });
    assert.ok(c.ok && c.value.riskLevel === "MEDIUM");
    assert.equal(parseHazard({ hazardType: "BANJIR", name: "ab" }).ok, false);
    assert.equal(parseHazard({ hazardType: "METEOR", name: "Bantaran" }).ok, false);
    assert.equal(parseHazard({ hazardType: "BANJIR", name: "Bantaran", riskLevel: "SANGAT" }).ok, false);
    const p = parseHazard({ riskLevel: "HIGH" }, "patch");
    assert.ok(p.ok && Object.keys(p.value).join() === "riskLevel");
    assert.equal(parseHazard({ name: "" }, "patch").ok, false);
  });
  it("sumber daya: kapasitas bilangan bulat; kondisi tertutup", () => {
    assert.equal(parseResource({ kind: "SHELTER", name: "Balai Desa", capacity: "150" }).ok, true);
    assert.equal(parseResource({ kind: "SHELTER", name: "Balai Desa", capacity: "1e2" }).ok, false);
    assert.equal(parseResource({ kind: "SHELTER", name: "Balai Desa", condition: "BURUK" }).ok, false);
    assert.equal(parseResource({ kind: "TENDA", name: "Balai Desa" }).ok, false);
  });
  it("relawan: warga wajib saat dibuat; tidak dapat diganti saat ubah", () => {
    assert.equal(parseVolunteer({ residentId: 12 }).ok, true);
    assert.equal(parseVolunteer({}).ok, false);
    assert.equal(parseVolunteer({ residentId: "x" }).ok, false);
    const p = parseVolunteer({ residentId: 99, status: "INACTIVE" }, "patch");
    assert.ok(p.ok && !("residentId" in p.value));
  });
  it("rencana: tahun wajar; rujukan lampiran berupa bilangan positif", () => {
    assert.equal(parsePlan({ kind: "RPB", title: "RPB Desa 2026", year: 2026 }).ok, true);
    assert.equal(parsePlan({ kind: "RPB", title: "RPB Desa", year: 1500 }).ok, false);
    assert.equal(parsePlan({ kind: "RPB", title: "RPB Desa", legalDocumentId: "x" }).ok, false);
    const r = parsePlan({ kind: "RPB", title: "RPB Desa", archiveId: "12345678901" });
    assert.ok(r.ok && r.value.archiveId === 12345678901n);
    assert.equal(parsePlan({ kind: "RPB", title: "RPB Desa", archiveId: "0" }).ok, false);
  });
  it("penilaian: tingkat wajib untuk PENILAIAN, terlarang untuk EVALUASI; tanggal tidak di masa depan", () => {
    assert.equal(parseAssessment({ kind: "PENILAIAN", doneOn: "2026-05-01", level: "PRATAMA" }).ok, true);
    assert.equal(parseAssessment({ kind: "PENILAIAN", doneOn: "2026-05-01" }).ok, false);
    assert.equal(parseAssessment({ kind: "PENILAIAN", doneOn: "2026-05-01", level: "EMAS" }).ok, false);
    assert.equal(parseAssessment({ kind: "EVALUASI", doneOn: "2026-05-01" }).ok, true);
    assert.equal(parseAssessment({ kind: "EVALUASI", doneOn: "2026-05-01", level: "MADYA" }).ok, false);
    assert.equal(parseAssessment({ kind: "EVALUASI", doneOn: "2999-01-01" }).ok, false);
  });
  it("butir kesiapan: hanya kode katalog", () => {
    assert.equal(parseReadinessSet({ code: "P8_F", status: "SELESAI" }).ok, true);
    assert.equal(parseReadinessSet({ code: "P8_Z", status: "SELESAI" }).ok, false);
    assert.equal(parseReadinessSet({ code: "P8_F", status: "LULUS" }).ok, false);
    assert.equal(parseReadinessSet({ code: "custom:1", status: "SELESAI" }).ok, false);
  });
});

describe("peringatan dini: sasaran dan isi", () => {
  const base = { level: "SIAGA", title: "Siaga banjir", message: "Warga RW 02 diminta bersiap mengungsi ke balai desa.", targetKind: "AREA", targets: [{ rw: "02" }], expectAccounts: 4 };
  it("RT/RW dinormalisasi: 1, 01, 001 satu wilayah", () => {
    assert.equal(normArea("01"), "1");
    assert.equal(normArea(" 001 "), "1");
    assert.equal(normArea("A"), "a");
    assert.deepEqual(areaVariants("2").sort(), ["002", "02", "2"]);
    assert.deepEqual(dedupeTargets([{ rw: "02", rt: "1" }, { rw: "2", rt: null }, { rw: "02", rt: "01" }]), [{ rw: "2", rt: null }], "RW penuh mencakup RT-nya");
    assert.equal(dedupeTargets([{ rw: "1", rt: "3" }, { rw: "01", rt: "03" }]).length, 1);
  });
  it("validasi sasaran: AREA butuh daftar; ALL tak boleh membawa daftar; batas 30; karakter aman", () => {
    assert.equal(parseAlert(base).ok, true);
    assert.equal(parseAlert({ ...base, targets: [] }).ok, false);
    assert.equal(parseAlert({ ...base, targetKind: "ALL", targets: undefined }).ok, true);
    assert.equal(parseAlert({ ...base, targetKind: "ALL" }).ok, false);
    assert.equal(parseAlert({ ...base, targets: Array.from({ length: 31 }, (_, i) => ({ rw: String(i + 1) })) }).ok, false);
    assert.equal(parseAlert({ ...base, targets: [{ rw: "<b>" }] }).ok, false);
    assert.equal(parseAlert({ ...base, targets: ["02"] }).ok, false);
    assert.equal(parseAlert({ ...base, targetKind: "SEMUA" }).ok, false);
  });
  it("isi: judul 3-120, pesan 10-500; tingkat dan ancaman tertutup; preview harus boolean", () => {
    assert.equal(parseAlert({ ...base, message: "pendek" }).ok, false);
    assert.equal(parseAlert({ ...base, message: "x".repeat(501) }).ok, false);
    assert.equal(parseAlert({ ...base, title: "x".repeat(121) }).ok, false);
    assert.equal(parseAlert({ ...base, level: "MERAH" }).ok, false);
    assert.equal(parseAlert({ ...base, hazardType: "UFO" }).ok, false);
    assert.equal(parseAlert({ ...base, preview: "ya" }).ok, false);
    const r = parseAlert({ ...base, message: "Baris satu   rapat.\n\n\n\nBaris dua tetap ada.", preview: true });
    assert.ok(r.ok && r.value.preview && r.value.message === "Baris satu rapat.\n\nBaris dua tetap ada.");
  });
  it("templat siaran memuat tingkat dan wilayah, dan tidak mengaku peringatan resmi", () => {
    const t = alertTemplate("AWAS", "BANJIR", "RW 02");
    assert.match(t.title, /Awas/);
    assert.match(t.message, /banjir/);
    assert.match(t.message, /RW 02/);
    assert.ok(t.title.length <= 120 && t.message.length <= 500);
    assert.match(alertTemplate("INFORMASI", null, null).message, /BMKG\/BPBD/);
  });
});

describe("kesiapan Destana: skor dari butir [V] saja", () => {
  const F = (o: Partial<ReadinessFacts> = {}): ReadinessFacts => ({ statuses: {}, hazards: 0, activeVolunteers: 0, resources: 0, plansByKind: {}, adoptedByKind: {}, assessments: 0, ...o });
  it("17 aktivitas Pasal 8 ayat 1 huruf a sampai q, kode unik", () => {
    assert.equal(ACTIVITIES.length, 17);
    assert.equal(ACTIVITY_CODES.size, 17);
    assert.deepEqual(ACTIVITIES.map((a) => a.code.slice(3)).join(""), "ABCDEFGHIJKLMNOPQ");
    for (const a of ACTIVITIES) assert.match(a.ref, /^Pasal 8\(1\) huruf [a-q]$/);
  });
  it("skor = butir selesai / 17; sedang tidak dihitung selesai; tanpa isian = 0", () => {
    assert.deepEqual(readinessScore(readinessItems(F())), { total: 17, done: 0, inProgress: 0, pct: 0 });
    const s = readinessScore(readinessItems(F({ statuses: { P8_A: "SELESAI", P8_B: "SELESAI", P8_C: "SEDANG", P8_D: "BELUM" } })));
    assert.deepEqual(s, { total: 17, done: 2, inProgress: 1, pct: 12 });
    const all = Object.fromEntries(ACTIVITIES.map((a) => [a.code, "SELESAI" as const]));
    assert.equal(readinessScore(readinessItems(F({ statuses: all }))).pct, 100);
  });
  it("petunjuk 'terdeteksi' hanya menandai, tidak mengubah status", () => {
    const it2 = readinessItems(F({ hazards: 3, activeVolunteers: 2, adoptedByKind: { RPB: 1 } }));
    const by = Object.fromEntries(it2.map((i) => [i.code, i]));
    assert.match(by.P8_F!.detected!, /3 ancaman/);
    assert.match(by.P8_I!.detected!, /2 relawan/);
    assert.match(by.P8_M!.detected!, /ditetapkan/);
    assert.equal(by.P8_F!.status, "BELUM");
    assert.equal(by.P8_A!.detected, null);
  });
  it("temuan: penilaian > 3 tahun, evaluasi > 1 tahun (rujuk pasal); ancaman tinggi tanpa shelter", () => {
    const common = { today: "2026-11-01", hazards: [{ riskLevel: "HIGH", lat: null }], resources: [], activeVolunteers: 0, hasShelterOrGather: false, adoptedPlans: 0 };
    const f = bencanaFindings({ ...common, assessments: [{ kind: "PENILAIAN", doneOn: "2022-01-01", level: "PRATAMA" }, { kind: "EVALUASI", doneOn: "2025-01-01", level: null }] });
    const by = Object.fromEntries(f.map((x) => [x.code, x]));
    assert.match(by.ASSESSMENT_STALE!.ref!, /Pasal 14 ayat 5/);
    assert.match(by.EVALUATION_STALE!.ref!, /Pasal 19 ayat 2/);
    assert.ok(by.NO_SHELTER && by.NO_VOLUNTEER && by.NO_PLAN);
    const fresh = bencanaFindings({ ...common, assessments: [{ kind: "PENILAIAN", doneOn: "2025-06-01", level: "MADYA" }, { kind: "EVALUASI", doneOn: "2026-06-01", level: null }], hasShelterOrGather: true, activeVolunteers: 4, adoptedPlans: 1 });
    assert.deepEqual(fresh, []);
    assert.ok(bencanaFindings({ ...common, assessments: [] }).some((x) => x.code === "NO_ASSESSMENT"));
  });
});

describe("izin rute bencana", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    assert.equal(r.resource, "bencana");
    return roleCan(r.resource, r.action, role);
  };
  it("semua peran membaca; Kepala Desa tidak mencatat/mengubah; staf mencatat tetapi tidak menghapus", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) {
      assert.equal(gate("/api/bencana", "GET", role), true, role);
      assert.equal(gate("/api/bencana/kejadian", "GET", role), true, role);
    }
    assert.equal(gate("/api/bencana/kejadian", "POST", "village_head"), false);
    assert.equal(gate("/api/bencana/kejadian", "POST", "staff"), true);
    assert.equal(gate("/api/bencana/kejadian/3/respons", "POST", "staff"), true);
    assert.equal(gate("/api/bencana/kejadian/3", "DELETE", "staff"), false);
    assert.equal(gate("/api/bencana/kejadian/3/logistik/9", "DELETE", "staff"), false);
    assert.equal(gate("/api/bencana/kejadian/3/logistik/9", "DELETE", "secretary"), true);
  });
  it("pindah status: gerbang rute 'read' untuk semua peran; siapa boleh apa ditegakkan servis (staf tak boleh menutup, Kepala Desa menutup)", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/bencana/kejadian/3/status", "POST", role), true, role);
    assert.equal(roleCan("bencana", "approve", "staff"), false, "staf tidak boleh menutup/membuka kembali");
    assert.equal(roleCan("bencana", "approve", "village_head"), true, "Kepala Desa boleh menutup");
    assert.equal(roleCan("bencana", "update", "village_head"), false, "Kepala Desa tidak menangani; servis menolak status selain tutup/buka kembali");
    assert.equal(transitionAction("RESOLVED", "CLOSED"), "approve");
    assert.equal(transitionAction("OPEN", "RESPONDING"), "update");
  });
  it("siaran peringatan dini = approve: staf tidak, Kepala Desa/sekretaris/admin ya", () => {
    assert.equal(gate("/api/bencana/peringatan/kirim", "POST", "staff"), false);
    for (const role of ["admin", "village_head", "secretary"] as const) assert.equal(gate("/api/bencana/peringatan/kirim", "POST", role), true, role);
    assert.equal(gate("/api/bencana/peringatan", "GET", "staff"), true, "log boleh dibaca");
  });
  it("baca rinci (export) dimiliki Kepala Desa/sekretaris/admin, bukan staf", () => {
    assert.deepEqual((["admin", "village_head", "secretary", "staff"] as const).filter((r) => roleCan("bencana", "export", r)), ["admin", "village_head", "secretary"]);
  });
  it("modul terdaftar di registry dengan resource bencana", () => {
    const m = getModuleByPathSegment("bencana");
    assert.ok(m);
    assert.equal(m.permission, "bencana");
  });
});

describe("penjaga: data korban/KK tidak bocor ke API publik atau mobile", () => {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });
  it("tidak ada berkas di app/api/mobile, app/api/public, app/api/v1, lib/mcp, lib/laras yang memakai lib/incident atau lib/bencana atau tabelnya", () => {
    const dirs = ["app/api/mobile", "app/api/public", "app/api/v1", "lib/mcp", "lib/laras", "lib/ai", "lib/webhooks"];
    const offenders: string[] = [];
    for (const d of dirs) {
      let files: string[] = [];
      try {
        files = walk(join(process.cwd(), d));
      } catch {
        continue;
      }
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        if (/lib\/(incident|bencana)\b|incidentEvent|incidentLogistic|incidentResponse|drmVolunteer|drmAlert|incident_events|incident_logistics/.test(src)) offenders.push(f);
      }
    }
    assert.deepEqual(offenders, []);
  });
  it("setiap rute /api/bencana memanggil guard di tiap handler dan membungkus attempt()", () => {
    const files = walk(join(process.cwd(), "app/api/bencana")).filter((f) => f.endsWith("route.ts"));
    assert.ok(files.length >= 15);
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const handlers = [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].length;
      const guards = [...src.matchAll(/await requireVillageApiContext\(/g)].length;
      const attempts = [...src.matchAll(/return attempt\(/g)].length;
      assert.equal(guards, handlers, f);
      assert.equal(attempts, handlers, f);
      assert.ok(!/villageId:\s*(body|req\.|await req)/.test(src), `${f}: villageId tidak boleh dari masukan`);
    }
  });
});

describe("isi siaran peringatan: tautan dan nomor panjang ditolak", () => {
  const base = { level: "SIAGA", title: "Siaga banjir", message: "Warga RW 02 diminta bersiap mengungsi ke balai desa.", targetKind: "ALL", expectAccounts: 3 };
  const BAD = [
    "Klik https://bantuan.co/abc", "kunjungi www.bantuan.id", "bantuan-desa.com", "bantuan desa . com", "bantuan dot com", "BANTUAN.COM", "Bantuan (DOT) Xyz",
    "bantuan titik id", "ｂａｎｔｕａｎ．ｃｏｍ", "bаntuаn.com" /* a Cyrillic */, "b a n t u a n . c o m", "ban\u200Btuan.com", "bantuan。com", "Cek bantuan.id sekarang",
    "ｈｔｔｐｓ：／／x", "hubungi wa.me/62812", "kirim ke @admin_desa", "info@desa.id", "tg:resolve", "//evil.test",
    "transfer ke 1234567890", "hubungi 0812 3456 7890", "rek 1234-5678-90", "0812-345-6789", "+62 812 3456 7890", "٠٨١٢٣٤٥٦٧٨٩٠", "１２３４５６７８９０",
  ];
  const GOOD = [
    "Warga RW 02 diminta bersiap mengungsi ke balai desa.", "Kumpul di titik kumpul pukul 08.00 WIB.", "Banjir sejak 01-11-2026, air setinggi 150 cm.",
    "Evakuasi 08.00-10.00 WIB di RT 03/RW 02. Info lebih lanjut ke perangkat desa.", "Siaga. Id kartu dibawa. 120 KK terdampak, 45 lansia.", "Tanggal 2026-11-01 jam 14:30 kumpul.",
    "Pantau informasi resmi BMKG/BPBD.", "Hubungi Kepala Dusun di RT 3, bawa dokumen penting.",
  ];
  it("variasi pengelakan (spasi, 'dot'/'titik', huruf besar, huruf mirip Cyrillic, karakter lebar penuh, tak terlihat, angka Arab/lebar penuh) ditolak", () => {
    for (const b of BAD) assert.ok(alertContentProblem(b), `harus ditolak: ${JSON.stringify(b)}`);
  });
  it("kalimat peringatan wajar, tanggal, dan jam tidak ditolak; semua templat bawaan lolos", () => {
    for (const g of GOOD) assert.equal(alertContentProblem(g), null, `harus lolos: ${JSON.stringify(g)}`);
    for (const l of Object.keys(ALERT_LEVELS) as (keyof typeof ALERT_LEVELS)[]) {
      for (const hz of [null, "BANJIR", "TANAH_LONGSOR", "GEMPA_BUMI", "ANGIN_KENCANG", "KEKERINGAN", "KEBAKARAN", "ERUPSI", "TSUNAMI_ABRASI", "LAINNYA"] as const) {
        for (const area of [null, "RW 02", "RT 01/RW 02", "desa"]) {
          const t = alertTemplate(l, hz, area);
          assert.equal(alertContentProblem(t.title), null, t.title);
          assert.equal(alertContentProblem(t.message), null, t.message);
        }
      }
    }
  });
  it("pelipat teks: NFKC, buang karakter tak terlihat, huruf kecil, lipat huruf mirip", () => {
    assert.equal(foldForScan("ＢＡＮ\u200BТUAN．ｃｏｍ"), "bantuan.com");
  });
  it("parseAlert menolak judul/pesan berbahaya, judul berawalan kurung (label palsu), dan mewajibkan expectAccounts kecuali pratinjau", () => {
    assert.equal(parseAlert(base).ok, true);
    assert.equal(parseAlert({ ...base, message: "Transfer ke rekening 1234567890 sekarang juga." }).ok, false);
    assert.equal(parseAlert({ ...base, title: "Daftar di bantuan.xyz" }).ok, false);
    assert.equal(parseAlert({ ...base, title: "[AWAS] Palsu" }).ok, false);
    assert.equal(parseAlert({ ...base, title: "(Resmi) Siaga" }).ok, false);
    const noExp = parseAlert({ ...base, expectAccounts: undefined });
    assert.ok(!noExp.ok && noExp.fieldErrors.expectAccounts);
    assert.equal(parseAlert({ ...base, expectAccounts: undefined, preview: true }).ok, true);
    for (const v of ["1e2", -1, 1.5, [2], "abc", 2_000_000]) assert.equal(parseAlert({ ...base, expectAccounts: v }).ok, false, String(v));
    const ok = parseAlert({ ...base, expectAccounts: "7" });
    assert.ok(ok.ok && ok.value.expectAccounts === 7);
  });
});

describe("daftar putih enum: kunci prototipe tidak lolos", () => {
  const PROTO = ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf"];
  it("semua penjaga is* menolak kunci prototipe", async () => {
    const inc = await import("../lib/incident/catalog");
    const dm = await import("../lib/bencana/catalog");
    for (const k of PROTO) {
      for (const d of ["BENCANA", "KEAMANAN"] as const) {
        assert.equal(inc.isKind(d, k), false, `isKind ${k}`);
        assert.equal(inc.isResponseKind(d, k), false, `isResponseKind ${k}`);
      }
      for (const [name, fn] of Object.entries({ isSeverity: inc.isSeverity, isStatus: inc.isStatus, isFundingSource: inc.isFundingSource, isHazardType: dm.isHazardType, isRiskLevel: dm.isRiskLevel, isResourceKind: dm.isResourceKind, isCondition: dm.isCondition, isPlanKind: dm.isPlanKind, isPlanStatus: dm.isPlanStatus, isVolunteerStatus: dm.isVolunteerStatus, isAlertLevel: dm.isAlertLevel, isReadinessStatus: dm.isReadinessStatus, isAssessmentKind: dm.isAssessmentKind, isLevel: dm.isLevel })) {
        assert.equal((fn as (v: unknown) => boolean)(k), false, `${name}(${k})`);
      }
    }
    assert.equal(inc.kindLabel("BENCANA", "constructor"), "constructor");
  });
  it("semua parser menolak kunci prototipe pada kolom enum", () => {
    const ev = { title: "Banjir RW 02", occurredAt: "2026-11-01T01:00:00Z" };
    const logi = { item: "Beras", quantity: 1, unit: "kg", recipientName: "Posko", distributedOn: "2026-11-01" };
    for (const k of PROTO) {
      assert.equal(parseEventCreate("BENCANA", { ...ev, kind: k }, NOW).ok, false, `kind ${k}`);
      assert.equal(parseEventCreate("KEAMANAN", { ...ev, kind: k }, NOW).ok, false, `kind keamanan ${k}`);
      assert.equal(parseEventCreate("BENCANA", { ...ev, kind: "BANJIR", severity: k }, NOW).ok, false, `severity ${k}`);
      assert.equal(parseEventPatch("BENCANA", { kind: k }, NOW).ok, false);
      assert.equal(parseEventPatch("BENCANA", { severity: k }, NOW).ok, false);
      assert.equal(parseTransition({ to: k }).ok, false, `to ${k}`);
      assert.equal(parseResponse("BENCANA", { loggedAt: "2026-11-01T02:00:00Z", description: "abc def", kind: k }, NOW).ok, false, `respons ${k}`);
      assert.equal(parseLogistic({ ...logi, fundingSource: k }).ok, false, `fundingSource ${k}`);
      assert.equal(parseHazard({ name: "Bantaran", hazardType: k }).ok, false, `hazardType ${k}`);
      assert.equal(parseHazard({ name: "Bantaran", hazardType: "BANJIR", riskLevel: k }).ok, false, `riskLevel ${k}`);
      assert.equal(parseResource({ name: "Balai", kind: k }).ok, false, `resource kind ${k}`);
      assert.equal(parseResource({ name: "Balai", kind: "SHELTER", condition: k }).ok, false, `condition ${k}`);
      assert.equal(parsePlan({ title: "RPB Desa", kind: k }).ok, false, `plan kind ${k}`);
      assert.equal(parsePlan({ title: "RPB Desa", kind: "RPB", status: k }).ok, false, `plan status ${k}`);
      assert.equal(parseVolunteer({ residentId: 1, status: k }).ok, false, `volunteer status ${k}`);
      assert.equal(parseAlert({ level: k, title: "Siaga", message: "Pesan peringatan yang cukup panjang.", targetKind: "ALL", expectAccounts: 1 }).ok, false, `level ${k}`);
      assert.equal(parseAlert({ level: "SIAGA", hazardType: k, title: "Siaga", message: "Pesan peringatan yang cukup panjang.", targetKind: "ALL", expectAccounts: 1 }).ok, false, `alert hazard ${k}`);
      assert.equal(parseReadinessSet({ code: k, status: "SELESAI" }).ok, false, `code ${k}`);
      assert.equal(parseReadinessSet({ code: "P8_A", status: k }).ok, false, `readiness status ${k}`);
      assert.equal(parseAssessment({ kind: k, doneOn: "2026-05-01" }).ok, false, `assessment kind ${k}`);
      assert.equal(parseAssessment({ kind: "PENILAIAN", doneOn: "2026-05-01", level: k }).ok, false, `level ${k}`);
    }
    // daftar kejadian: ?kind=constructor / ?status=constructor diabaikan, bukan dianggap sah
    const q = parseEventListQuery("BENCANA", new URLSearchParams("kind=constructor&status=toString"));
    assert.equal(q.kind, null);
    assert.equal(q.status, null);
  });
});
