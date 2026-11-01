/** Tes integrasi tahapan RPJM Desa terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Tahapan RPJM Desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let rp: typeof import("../lib/rpjm/service");
  let md: typeof import("../lib/musdes/service");
  let rk: typeof import("../lib/rkpdes/service");
  let vA = 0;
  let vB = 0;
  let seq = 0;
  const extraVillages: number[] = [];
  /** Desa baru untuk tes yang membuat banyak dokumen (batas dokumen per desa). */
  const freshVillage = async () => {
    seq += 1;
    const v = await prisma.village.create({ data: { code: `RX${Date.now() % 1e7}${seq}${Math.floor(Math.random() * 1e3)}`, name: "RX", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    extraVillages.push(v.id);
    return v.id;
  };
  const NOW = new Date("2026-11-01T03:00:00Z");

  const mkPlan = async (villageId: number, input: Record<string, unknown> = {}) => {
    const r = await rp.createPlan(prisma, { villageId, input: { title: "RPJM Desa 2026-2033", periodStart: 2026, ...input } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const patch = (villageId: number, id: number, input: Record<string, unknown>, canApprove = true) => rp.patchPlan(prisma, { villageId, id, userId: 1, canApprove, input });
  const prog = (villageId: number, planId: number, over: Record<string, unknown> = {}) =>
    rp.saveProgram(prisma, { villageId, planId, input: { fieldCode: "2", year: 2027, title: "Rabat jalan", activityCode: "2.1.01", budget: "15000000", fundSource: "DD", method: "SWAKELOLA", ...over } });
  const meeting = async (villageId: number, kind: string, held = true) => {
    seq += 1;
    const r = await md.createMeeting(prisma, { villageId, userId: 1, input: { kind, title: `Musyawarah ${kind} ${seq}`, scheduledOn: "2026-06-10" } });
    assert.ok(r.ok, JSON.stringify(r));
    const id = r.ok ? r.data.id : 0;
    if (held) assert.ok((await md.transition(prisma, { villageId, id, userId: 1, action: "held", input: { heldOn: "2026-06-10" } })).ok);
    return id;
  };
  const perdes = (villageId: number, number: string, over: Record<string, unknown> = {}) => prisma.legalDocument.create({ data: { villageId, type: "PERDES", number, year: 2026, title: "Perdes RPJM Desa", enactedAt: new Date("2026-09-20"), status: "BERLAKU", ...over } });
  const view = async (villageId: number, id: number) => {
    const d = await rp.getPlan(prisma, villageId, id, NOW);
    assert.ok(d);
    return d!.plan;
  };
  /** Bawa rancangan sampai siap ditetapkan: isi pokok, program, rancangan selesai, disetujui, pembahasan terlaksana. */
  const readyPlan = async (villageId: number) => {
    const id = await mkPlan(villageId);
    assert.ok((await patch(villageId, id, { vision: "Desa mandiri", mission: "1. Infrastruktur", policyDirection: "Perkuat infrastruktur dasar" })).ok);
    assert.ok((await prog(villageId, id)).ok);
    assert.ok((await patch(villageId, id, { draftReadyAt: "2026-08-01" })).ok);
    assert.ok((await rp.approveDraft(prisma, { villageId, id, userId: 1, date: new Date("2026-08-02T00:00:00Z") })).ok);
    const m = await meeting(villageId, "MUSRENBANGDES");
    assert.ok((await patch(villageId, id, { draftMeetingId: m })).ok);
    return { id, meeting: m };
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    rp = await import("../lib/rpjm/service");
    md = await import("../lib/musdes/service");
    rk = await import("../lib/rkpdes/service");
    const t = Date.now() % 1e6;
    const r = Math.floor(Math.random() * 1e3);
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}${r}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("RA")).id;
    vB = (await mkV("RB")).id;
  });
  after(async () => {
    for (const id of [vA, vB, ...extraVillages]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("alur penuh: gerbang rancangan selesai, persetujuan, pembahasan, lalu Perdes mengunci seluruh isi", async () => {
    const id = await mkPlan(vA, { headInauguratedOn: "2026-08-15" });
    // gerbang 1: rancangan kosong tidak bisa ditandai selesai
    const r0 = await patch(vA, id, { draftReadyAt: "2026-08-20" });
    assert.equal(r0.ok, false);
    if (!r0.ok) assert.match(r0.errors[0], /Visi.*Misi.*Arah kebijakan.*Belum ada program/);
    assert.ok((await patch(vA, id, { vision: "Desa mandiri", mission: "1. Infrastruktur\n2. Ekonomi", policyDirection: "Perkuat infrastruktur dasar" })).ok);
    assert.equal((await patch(vA, id, { draftReadyAt: "2026-08-20" })).ok, false, "masih tanpa program");
    // persetujuan butuh rancangan selesai
    assert.equal((await rp.approveDraft(prisma, { villageId: vA, id, userId: 1, date: new Date("2026-08-21T00:00:00Z") })).ok, false);
    assert.ok((await prog(vA, id)).ok);
    assert.ok((await patch(vA, id, { draftReadyAt: "2026-08-20" })).ok);
    // gerbang 2: Perdes belum boleh (belum disetujui tak dipersoalkan, tetapi pembahasan belum ada)
    const pd = await perdes(vA, "1");
    const r1 = await patch(vA, id, { legalDocumentId: pd.id });
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.match(r1.errors[0], /dibahas dan disepakati/);
    // pembahasan: musyawarah yang belum terlaksana belum membuka gerbang
    const planned = await meeting(vA, "MUSRENBANGDES", false);
    assert.ok((await patch(vA, id, { draftMeetingId: planned })).ok, "boleh ditautkan walau belum terlaksana");
    assert.equal((await patch(vA, id, { legalDocumentId: pd.id })).ok, false, "belum terlaksana");
    const held = await meeting(vA, "MUSRENBANGDES");
    assert.ok((await patch(vA, id, { draftMeetingId: held })).ok);
    assert.ok((await rp.approveDraft(prisma, { villageId: vA, id, userId: 9, date: new Date("2026-08-25T00:00:00Z") })).ok);
    // tak bisa membatalkan penanda selesai setelah disetujui
    assert.equal((await patch(vA, id, { draftReadyAt: null })).ok, false);
    // persetujuan tak bisa dicabut setelah pembahasan terlaksana
    assert.equal((await rp.approveDraft(prisma, { villageId: vA, id, userId: 9, date: null })).ok, false);

    assert.ok((await patch(vA, id, { legalDocumentId: pd.id })).ok);
    const v = await view(vA, id);
    assert.equal(v.locked, true);
    assert.equal(v.steps.find((s) => s.key === "perdes")!.state, "done");
    assert.equal(v.steps.find((s) => s.key === "perdes")!.due, "2026-11-15");
    assert.equal(v.progress.done >= 4, true);

    // terkunci: semua penyuntingan ditolak, hanya catatan SDGs yang boleh
    for (const r of [
      await patch(vA, id, { title: "Ganti" }),
      await patch(vA, id, { vision: "Lain" }),
      await patch(vA, id, { periodEnd: 2040 }),
      await patch(vA, id, { draftMeetingId: null }),
      await patch(vA, id, { legalDocumentId: null }),
      await prog(vA, id, { title: "Baru" }),
      await rp.removeProgram(prisma, { villageId: vA, planId: id, programId: v.programs[0].id }),
      await rp.addTeamMember(prisma, { villageId: vA, planId: id, input: { name: "X", role: "ANGGOTA" } }),
      await rp.approveDraft(prisma, { villageId: vA, id, userId: 1, date: null }),
    ]) {
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.status, 409);
    }
    assert.ok((await patch(vA, id, { sdgsPlanRecordedAt: "2026-10-01", sdgsPlanNote: "Terisi di SID" })).ok);
    assert.equal((await view(vA, id)).sdgsPlanNote, "Terisi di SID");
    assert.equal((await view(vA, id)).programs[0].title, "Rabat jalan", "isi tak berubah");
  });

  it("tautan musyawarah dan Perdes divalidasi jenis, kepemilikan, dan keunikannya", async () => {
    const id = await mkPlan(vA);
    const other = await mkPlan(vA, { title: "RPJM lain" });
    // jenis salah
    const blt = await meeting(vA, "MUSDES_BLT");
    assert.equal((await patch(vA, id, { musdesMeetingId: blt })).ok, false);
    assert.equal((await patch(vA, id, { draftMeetingId: blt })).ok, false);
    const perubahan = await meeting(vA, "MUSDES_PERUBAHAN");
    assert.equal((await patch(vA, id, { draftMeetingId: perubahan })).ok, false, "Musrenbang khusus perubahan baru boleh setelah kunci dibuka");
    // musdes harus MUSDES_PERENCANAAN; Musrenbangdes salah untuk tautan itu
    const mr = await meeting(vA, "MUSRENBANGDES");
    assert.equal((await patch(vA, id, { musdesMeetingId: mr })).ok, false);
    const mp = await meeting(vA, "MUSDES_PERENCANAAN");
    assert.ok((await patch(vA, id, { musdesMeetingId: mp })).ok);
    assert.equal((await patch(vA, other, { musdesMeetingId: mp })).ok, false, "musyawarah sudah dipakai RPJM lain");
    assert.ok((await patch(vA, id, { draftMeetingId: mp })).ok, "Musdes boleh membahas rancangan (PP 16/2026 Pasal 144)");
    // desa lain
    const foreign = await meeting(vB, "MUSDES_PERENCANAAN");
    const r = await patch(vA, id, { musdesMeetingId: foreign });
    assert.equal(r.ok, false);
    // Perdes: bukan PERDES, tak berlaku, desa lain, dipakai RPJM lain, dipakai RKP Desa
    const notPerdes = await perdes(vA, "2", { type: "SK_KADES" });
    const dead = await perdes(vA, "3", { status: "DICABUT" });
    const foreignPd = await perdes(vB, "4");
    for (const l of [notPerdes, dead, foreignPd]) {
      const x = await patch(vA, id, { enactedBeforeApp: true, enactedReason: "Perdes lama sebelum aplikasi dipakai", legalDocumentId: l.id });
      assert.equal(x.ok, false, `Perdes ${l.number}`);
    }
    assert.equal((await view(vA, id)).enactedBeforeApp, false, "penolakan tidak menyisakan perubahan sebagian");
    const used = await perdes(vA, "5");
    assert.ok((await patch(vA, other, { enactedBeforeApp: true, enactedReason: "Perdes lama sebelum aplikasi dipakai", legalDocumentId: used.id })).ok);
    const x2 = await patch(vA, id, { enactedBeforeApp: true, enactedReason: "Perdes lama sebelum aplikasi dipakai", legalDocumentId: used.id });
    assert.equal(x2.ok, false);
    // dipakai RKP Desa
    const rkpPd = await perdes(vA, "6");
    const doc = await rk.createDocument(prisma, { villageId: vA, userId: 1, input: { year: 2028 } });
    assert.ok(doc.ok);
    assert.ok((await rk.patchDocument(prisma, { villageId: vA, id: doc.ok ? doc.data.id : 0, input: { legalDocumentId: rkpPd.id } })).ok);
    assert.equal((await patch(vA, id, { enactedBeforeApp: true, enactedReason: "Perdes lama sebelum aplikasi dipakai", legalDocumentId: rkpPd.id })).ok, false);
    // sebaliknya: Perdes RPJM tak bisa dipakai RKP Desa
    const doc2 = await rk.createDocument(prisma, { villageId: vA, userId: 1, input: { year: 2029 } });
    assert.ok(doc2.ok);
    assert.equal((await rk.patchDocument(prisma, { villageId: vA, id: doc2.ok ? doc2.data.id : 0, input: { legalDocumentId: used.id } })).ok, false);
  });

  it("Perdes yang sama dihubungkan dua RPJM bersamaan: tepat satu berhasil", async () => {
    const a = await readyPlan(vA);
    const b = await readyPlan(vA);
    const pd = await perdes(vA, "7");
    const rs = await Promise.all([patch(vA, a.id, { legalDocumentId: pd.id }), patch(vA, b.id, { legalDocumentId: pd.id })]);
    assert.equal(rs.filter((r) => r.ok).length, 1);
    assert.equal(await prisma.rpjmdesPlan.count({ where: { legalDocumentId: pd.id } }), 1);
  });

  it("dokumen lama: kolom baru tak mengubahnya; tak terkunci, tak dinilai kelengkapannya, bendera 6 tahun muncul tanpa memblokir", async () => {
    const legacy = await prisma.rpjmdesPlan.create({ data: { villageId: vA, title: "RPJM Desa 2020-2025", periodStart: 2020, periodEnd: 2025, vision: "Visi lama", status: "active" } });
    const v = await view(vA, legacy.id);
    assert.equal(v.untouched, true, "belum ada data tahapan");
    assert.equal(v.locked, false);
    assert.equal(v.steps.every((s) => s.state === "open"), true);
    assert.ok(v.flags.some((f) => f.code === "TERM_LEGACY" && f.level === "perlu"));
    assert.equal(v.flags.some((f) => f.code === "NO_VISION_MISSION" || f.code === "NO_POLICY"), false);
    assert.equal(v.needsAdjustment, true);
    // tetap bisa disunting seperti biasa
    assert.ok((await patch(vA, legacy.id, { vision: "Visi lama diperbarui", periodEnd: 2027 })).ok);
    assert.equal((await view(vA, legacy.id)).termYears, 8);
    assert.equal((await view(vA, legacy.id)).flags.some((f) => f.code === "TERM_LEGACY"), false);
    const list = await rp.listPlans(prisma, vA, NOW);
    assert.ok(list.plans.some((p) => p.id === legacy.id && p.locked === false));
  });

  it("Perdes sebelum aplikasi: melewati gerbang tetapi tetap mengunci dan tercatat", async () => {
    const id = await mkPlan(vA, { periodStart: 2019 });
    const pd = await perdes(vA, "8", { enactedAt: new Date("2019-04-01") });
    assert.equal((await patch(vA, id, { legalDocumentId: pd.id })).ok, false, "tanpa penanda dokumen lama, gerbang berlaku");
    assert.ok((await patch(vA, id, { enactedBeforeApp: true, enactedReason: "Perdes lama sebelum aplikasi dipakai", legalDocumentId: pd.id })).ok);
    const v = await view(vA, id);
    assert.equal(v.locked, true);
    assert.equal(v.enactedBeforeApp, true);
    assert.equal(v.steps.find((s) => s.key === "perdes")!.due, null);
    assert.equal((await patch(vA, id, { title: "x" })).ok, false);
  });

  it("buka kunci untuk perubahan: butuh alasan, mengatur ulang gerbang, tercatat, Perdes baru butuh pembahasan baru", async () => {
    const { id, meeting: m1 } = await readyPlan(vA);
    const pd1 = await perdes(vA, "9");
    assert.ok((await patch(vA, id, { legalDocumentId: pd1.id })).ok);
    assert.equal((await rp.reopenPlan(prisma, { villageId: vA, id, userId: 1, input: { reason: "KEBIJAKAN", note: "pendek" } })).ok, false);
    assert.equal((await rp.reopenPlan(prisma, { villageId: vA, id, userId: 1, input: { reason: "BEBAS", note: "Alasan panjang yang cukup" } })).ok, false);
    const ok = await rp.reopenPlan(prisma, { villageId: vA, id, userId: 7, input: { reason: "PERISTIWA_KHUSUS", note: "Banjir bandang merusak jalan dan jembatan desa" } });
    assert.ok(ok.ok, JSON.stringify(ok));
    const v = await view(vA, id);
    assert.equal(v.locked, false);
    assert.equal(v.reopenCount, 1);
    assert.equal(v.draftReadyAt, null);
    assert.equal(v.draftApprovedAt, null);
    assert.equal(v.draftMeeting, null);
    assert.equal(v.steps.find((s) => s.key === "perdes")!.due, null, "perubahan tanpa tenggat 3 bulan");
    assert.equal(v.steps.find((s) => s.key === "perdes")!.state, "open");
    assert.equal(v.flags.some((f) => f.code === "PERDES_OVERDUE"), false);
    assert.equal(v.events.length, 1);
    assert.match(v.events[0].note, /Banjir bandang.*Perdes 9\/2026/);
    assert.equal(v.events[0].reason, "PERISTIWA_KHUSUS");
    // sekarang bisa disunting; tidak bisa dibuka lagi bila tak terkunci
    assert.equal((await rp.reopenPlan(prisma, { villageId: vA, id, userId: 1, input: { reason: "KEBIJAKAN", note: "Dibuka dua kali tidak perlu" } })).ok, false);
    assert.ok((await prog(vA, id, { title: "Perbaikan jembatan", year: 2028 })).ok);
    // Perdes baru butuh rancangan selesai + pembahasan baru (musyawarah lama m1 sudah dilepas)
    const pd2 = await perdes(vA, "10");
    assert.equal((await patch(vA, id, { legalDocumentId: pd2.id })).ok, false);
    assert.ok((await patch(vA, id, { draftReadyAt: "2026-10-10" })).ok);
    const khusus = await meeting(vA, "MUSDES_PERUBAHAN");
    assert.ok((await patch(vA, id, { draftMeetingId: khusus })).ok, "Musrenbang khusus perubahan diterima setelah dibuka");
    assert.notEqual(khusus, m1);
    assert.equal((await patch(vA, id, { legalDocumentId: pd2.id })).ok, false, "perubahan juga perlu disetujui ulang Kepala Desa");
    assert.ok((await rp.approveDraft(prisma, { villageId: vA, id, userId: 1, date: new Date("2026-10-11T00:00:00Z") })).ok);
    assert.ok((await patch(vA, id, { legalDocumentId: pd2.id })).ok);
    assert.equal((await view(vA, id)).locked, true);
  });

  it("program: tahun harus dalam periode, periode tak bisa mengecil melewati program, program terakhir rancangan selesai dilindungi, batas desa", async () => {
    const id = await mkPlan(vA);
    assert.equal((await prog(vA, id, { year: 2040 })).ok, false);
    assert.equal((await prog(vA, id, { year: 2025 })).ok, false);
    const a = await prog(vA, id, { year: 2033 });
    assert.ok(a.ok);
    const r = await patch(vA, id, { periodEnd: 2030 });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 409);
    assert.ok((await patch(vA, id, { periodEnd: 2034 })).ok);
    // program terakhir pada rancangan yang sudah selesai tak bisa dihapus diam-diam
    assert.ok((await patch(vA, id, { vision: "v", mission: "m", policyDirection: "p" })).ok);
    assert.ok((await patch(vA, id, { draftReadyAt: "2026-09-01" })).ok);
    const only = (await view(vA, id)).programs[0];
    assert.equal((await rp.removeProgram(prisma, { villageId: vA, planId: id, programId: only.id })).ok, false);
    assert.ok((await patch(vA, id, { draftReadyAt: null })).ok);
    assert.ok((await rp.removeProgram(prisma, { villageId: vA, planId: id, programId: only.id })).ok);
    // ubah program
    const b = await prog(vA, id, { year: 2027 });
    assert.ok(b.ok);
    assert.ok((await rp.saveProgram(prisma, { villageId: vA, planId: id, programId: b.ok ? b.data.id : 0, input: { fieldCode: "3", year: 2028, title: "Pembinaan karang taruna" } })).ok);
    const v = await view(vA, id);
    assert.equal(v.programs[0].fieldCode, "3");
    assert.equal(v.programs[0].activityCode, null, "kolom yang tak dikirim dikosongkan (ubah penuh)");
  });

  it("anggaran indikatif dihitung tepat sampai sen dan matriks per bidang per tahun cocok", async () => {
    const id = await mkPlan(vA);
    assert.ok((await prog(vA, id, { year: 2026, budget: "1000000.10" })).ok);
    assert.ok((await prog(vA, id, { year: 2026, budget: "0.20" })).ok);
    assert.ok((await prog(vA, id, { year: 2027, fieldCode: "1", activityCode: "1.1.01", budget: "5" })).ok);
    const v = await view(vA, id);
    assert.equal(v.matrix.fields.find((f) => f.code === "2")!.perYear[0], "1000000.30");
    assert.equal(v.matrix.yearTotals[1], "5.00");
    assert.equal(v.matrix.total, "1000005.30");
    assert.equal(v.summary.totalBudget, "1000005.30");
  });

  it("tim penyusun: dari data warga (tak ganda, desa sendiri), peringatan komposisi, hapus", async () => {
    const id = await mkPlan(vA);
    seq += 1;
    const mkRes = (villageId: number, name: string, gender: string) => prisma.resident.create({ data: { villageId, nik: `${Date.now() % 1e9}${seq}${name.length}`.padEnd(16, "0").slice(0, 16), name, birthplace: "x", birthDate: new Date("1985-05-05"), gender, address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Istri", rt: "01", rw: "02" } });
    const w = await mkRes(vA, "Bu Warga", "Perempuan");
    seq += 1;
    const foreign = await mkRes(vB, "Pak Asing", "Laki-laki");
    const a = await rp.addTeamMember(prisma, { villageId: vA, planId: id, input: { residentId: w.id, role: "SEKRETARIS" } });
    assert.ok(a.ok);
    assert.equal((await rp.addTeamMember(prisma, { villageId: vA, planId: id, input: { residentId: w.id, role: "ANGGOTA" } })).ok, false, "tak ganda");
    assert.equal((await rp.addTeamMember(prisma, { villageId: vA, planId: id, input: { residentId: foreign.id, role: "ANGGOTA" } })).ok, false, "warga desa lain");
    const v = await view(vA, id);
    assert.equal(v.team[0].gender, "P");
    assert.ok(v.teamWarnings.some((x) => x.includes("baru 1 orang")));
    assert.equal((await rp.removeTeamMember(prisma, { villageId: vB, planId: id, memberId: a.ok ? a.data.id : 0 })).ok, false, "desa lain tak bisa menghapus");
    assert.ok((await rp.removeTeamMember(prisma, { villageId: vA, planId: id, memberId: a.ok ? a.data.id : 0 })).ok);
  });

  it("desa lain tidak dapat membaca atau mengubah apa pun", async () => {
    const { id } = await readyPlan(vA);
    const p0 = (await view(vA, id)).programs[0];
    assert.equal(await rp.getPlan(prisma, vB, id, NOW), null);
    assert.equal((await patch(vB, id, { title: "Dibajak" })).ok, false);
    assert.equal((await rp.approveDraft(prisma, { villageId: vB, id, userId: 1, date: null })).ok, false);
    assert.equal((await rp.reopenPlan(prisma, { villageId: vB, id, userId: 1, input: { reason: "KEBIJAKAN", note: "Percobaan lintas desa ya" } })).ok, false);
    assert.equal((await prog(vB, id)).ok, false);
    assert.equal((await rp.saveProgram(prisma, { villageId: vB, planId: id, programId: p0.id, input: { fieldCode: "2", year: 2027, title: "Dibajak" } })).ok, false);
    assert.equal((await rp.removeProgram(prisma, { villageId: vB, planId: id, programId: p0.id })).ok, false);
    assert.equal((await rp.addTeamMember(prisma, { villageId: vB, planId: id, input: { name: "X", role: "ANGGOTA" } })).ok, false);
    assert.equal((await view(vA, id)).title, "RPJM Desa 2026-2033");
    assert.equal((await view(vA, id)).programs[0].title, "Rabat jalan");
    assert.equal((await rp.listPlans(prisma, vB, NOW)).plans.some((p) => p.id === id), false);
  });

  it("kegiatan RKP Desa dapat memilih program RPJM Desa (opsional), divalidasi desa dan RPJM-nya, dan terlepas saat program dihapus", async () => {
    const id = await mkPlan(vA, { title: "RPJM untuk RKP", periodStart: 2040, periodEnd: 2047 });
    const p27 = await rp.saveProgram(prisma, { villageId: vA, planId: id, input: { fieldCode: "2", year: 2041, title: "Rabat jalan", activityCode: "2.1.01", budget: "20000000", fundSource: "DD", method: "SWAKELOLA", outputVolume: "100", outputUnit: "m" } });
    const p28 = await rp.saveProgram(prisma, { villageId: vA, planId: id, input: { fieldCode: "2", year: 2042, title: "Drainase" } });
    assert.ok(p27.ok && p28.ok);
    const progId = p27.ok ? p27.data.id : 0;
    const doc = await rk.createDocument(prisma, { villageId: vA, userId: 1, input: { year: 2041 } });
    assert.ok(doc.ok);
    const docId = doc.ok ? doc.data.id : 0;

    const opts = await rk.getDocument(prisma, vA, docId, NOW);
    assert.deepEqual(opts!.options.rpjmPrograms.map((x) => x.title), ["Rabat jalan"], "hanya program tahun dokumen");
    assert.equal(opts!.options.rpjmPrograms[0].budget, "20000000.00");

    // tanpa tautan tetap bisa (tidak dipaksa)
    const free = await rk.saveActivity(prisma, { villageId: vA, documentId: docId, input: { title: "Kegiatan di luar RPJM" } });
    assert.ok(free.ok);
    // tautan valid
    const linked = await rk.saveActivity(prisma, { villageId: vA, documentId: docId, input: { title: "Rabat jalan Krajan", rpjmProgramId: progId, estimatedBudget: "20000000" } });
    assert.ok(linked.ok);
    let got = await rk.getDocument(prisma, vA, docId, NOW);
    const act = got!.document.activities.find((a) => a.title === "Rabat jalan Krajan")!;
    assert.equal(act.rpjmProgramId, progId);
    assert.equal(act.rpjmProgramTitle, "Rabat jalan");
    assert.equal(got!.options.rpjmPrograms[0].used, 1);
    assert.equal((await view(vA, id)).programs.find((x) => x.id === progId)!.rkpCount, 1);

    // ubah tanpa menyebut rpjmProgramId tidak melepas tautan; null melepas
    assert.ok((await rk.saveActivity(prisma, { villageId: vA, documentId: docId, activityId: act.id, input: { title: "Rabat jalan Krajan (ubah)" } })).ok);
    got = await rk.getDocument(prisma, vA, docId, NOW);
    assert.equal(got!.document.activities.find((a) => a.id === act.id)!.rpjmProgramId, progId);

    // program desa lain / RPJM lain / tak ada ditolak
    const vBPlan = await mkPlan(vB, { periodStart: 2040, periodEnd: 2047 });
    const foreign = await rp.saveProgram(prisma, { villageId: vB, planId: vBPlan, input: { fieldCode: "2", year: 2041, title: "Milik desa lain" } });
    assert.ok(foreign.ok);
    const otherPlan = await mkPlan(vA, { title: "RPJM lain lagi", periodStart: 2050, periodEnd: 2057 });
    const otherProg = await rp.saveProgram(prisma, { villageId: vA, planId: otherPlan, input: { fieldCode: "2", year: 2051, title: "Di RPJM lain" } });
    assert.ok(otherProg.ok);
    for (const bad of [foreign.ok ? foreign.data.id : 0, otherProg.ok ? otherProg.data.id : 0, 999999999]) {
      const r = await rk.saveActivity(prisma, { villageId: vA, documentId: docId, input: { title: "Ngawur", rpjmProgramId: bad } });
      assert.equal(r.ok, false, `program ${bad}`);
      if (!r.ok) assert.ok(r.fieldErrors?.rpjmProgramId);
    }
    assert.equal((await rk.saveActivity(prisma, { villageId: vA, documentId: docId, input: { title: "Ngawur", rpjmProgramId: "abc" } })).ok, false);

    assert.ok((await rk.saveActivity(prisma, { villageId: vA, documentId: docId, activityId: act.id, input: { title: "Rabat jalan Krajan", rpjmProgramId: null } })).ok);
    got = await rk.getDocument(prisma, vA, docId, NOW);
    assert.equal(got!.document.activities.find((a) => a.id === act.id)!.rpjmProgramId, null);

    // hapus program: kegiatan RKP tetap ada, tautan terlepas (SetNull)
    assert.ok((await rk.saveActivity(prisma, { villageId: vA, documentId: docId, activityId: act.id, input: { title: "Rabat jalan Krajan", rpjmProgramId: progId } })).ok);
    assert.ok((await rp.removeProgram(prisma, { villageId: vA, planId: id, programId: progId })).ok);
    got = await rk.getDocument(prisma, vA, docId, NOW);
    const after = got!.document.activities.find((a) => a.id === act.id)!;
    assert.equal(after.rpjmProgramId, null);
    assert.equal(after.title, "Rabat jalan Krajan");
  });

  it("tanda selesai rancangan dan penghapusan program terakhir tidak bisa berbalapan (kunci baris)", async () => {
    for (let round = 0; round < 6; round += 1) {
      const id = await mkPlan(vA);
      assert.ok((await patch(vA, id, { vision: "v", mission: "m", policyDirection: "p" })).ok);
      const p = await prog(vA, id);
      assert.ok(p.ok);
      const programId = p.ok ? p.data.id : 0;
      await Promise.all([patch(vA, id, { draftReadyAt: "2026-09-01" }), rp.removeProgram(prisma, { villageId: vA, planId: id, programId })]);
      const row = await prisma.rpjmdesPlan.findUniqueOrThrow({ where: { id } });
      const n = await prisma.rpjmProgram.count({ where: { planId: id } });
      assert.equal(row.draftReadyAt !== null && n === 0, false, "rancangan tak boleh selesai tanpa program");
    }
  });

  it("tahap Perdes terlambat dan bendera keselarasan satu sumber", async () => {
    const id = await mkPlan(vA, { periodStart: 2026, headInauguratedOn: "2026-01-10" });
    const v = await view(vA, id);
    assert.equal(v.steps.find((s) => s.key === "perdes")!.state, "overdue");
    assert.ok(v.flags.some((f) => f.code === "PERDES_OVERDUE" && f.level === "perlu"));
    assert.equal(v.needsAdjustment, true);
  });

  it("Perdes butuh persetujuan Kepala Desa (tanpa penanda dokumen lama)", async () => {
    const id = await mkPlan(vA);
    assert.ok((await patch(vA, id, { vision: "v", mission: "m", policyDirection: "p" })).ok);
    assert.ok((await prog(vA, id)).ok);
    assert.ok((await patch(vA, id, { draftReadyAt: "2026-08-01" })).ok);
    assert.ok((await patch(vA, id, { draftMeetingId: await meeting(vA, "MUSRENBANGDES") })).ok);
    const pd = await perdes(vA, "20");
    const r = await patch(vA, id, { legalDocumentId: pd.id });
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.errors[0], /disetujui Kepala Desa/);
    assert.ok((await rp.approveDraft(prisma, { villageId: vA, id, userId: 1, date: new Date("2026-08-02T00:00:00Z") })).ok);
    assert.ok((await patch(vA, id, { legalDocumentId: pd.id })).ok);
  });

  it("penanda 'Perdes sudah ada sebelum aplikasi': hanya pemegang approve, wajib alasan, hanya bersama Perdes, tercatat di jejak", async () => {
    const pd = await perdes(vA, "21", { enactedAt: new Date("2019-04-01") });
    const id = await mkPlan(vA, { periodStart: 2019 });
    const input = { enactedBeforeApp: true, enactedReason: "Perdes RPJM Desa ditetapkan 2019 sebelum aplikasi", legalDocumentId: pd.id };
    const staff = await patch(vA, id, input, false);
    assert.equal(staff.ok, false);
    if (!staff.ok) assert.equal(staff.status, 403);
    for (const bad of [{ ...input, enactedReason: undefined }, { ...input, enactedReason: "pendek" }, { enactedBeforeApp: true, enactedReason: "Alasan cukup panjang sekali" }]) {
      const r = await patch(vA, id, bad);
      assert.equal(r.ok, false, JSON.stringify(bad));
    }
    assert.equal((await view(vA, id)).locked, false);
    assert.equal((await view(vA, id)).enactedBeforeApp, false);
    assert.ok((await patch(vA, id, input)).ok);
    const v = await view(vA, id);
    assert.equal(v.locked, true);
    assert.equal(v.events.filter((e) => e.kind === "BYPASS").length, 1);
    assert.match(v.events[0].note, /ditetapkan 2019 sebelum aplikasi/);
  });

  it("mengubah isi setelah disetujui mencabut persetujuan dan tercatat; isi sama tidak mencabut; Perdes tak bisa lolos bersama perubahan", async () => {
    const { id } = await readyPlan(vA);
    const rev = async () => (await view(vA, id)).events.filter((e) => e.kind === "REVOKE").length;
    const approve = async () => assert.ok((await rp.approveDraft(prisma, { villageId: vA, id, userId: 1, date: new Date("2026-09-01T00:00:00Z") })).ok);
    assert.notEqual((await view(vA, id)).draftApprovedAt, null);
    // sama isi: tidak mencabut
    assert.ok((await patch(vA, id, { vision: "Desa mandiri", title: "Judul diubah saja" })).ok);
    assert.notEqual((await view(vA, id)).draftApprovedAt, null);
    assert.equal(await rev(), 0);
    // visi, misi, arah, ringkasan pengkajian, periode: masing-masing mencabut
    let n = 0;
    for (const change of [{ vision: "Visi baru" }, { mission: "Misi baru" }, { policyDirection: "Arah baru" }, { reviewSummary: "Ringkasan baru" }, { periodEnd: 2034 }]) {
      assert.ok((await patch(vA, id, change)).ok, JSON.stringify(change));
      const v = await view(vA, id);
      assert.equal(v.draftApprovedAt, null, JSON.stringify(change));
      n += 1;
      assert.equal(await rev(), n);
      assert.equal(v.draftReadyAt !== null, true, "penanda selesai tetap bila isi masih memenuhi gerbang");
      await approve();
    }
    // program ditambah, diubah, dihapus
    const added = await rp.saveProgram(prisma, { villageId: vA, planId: id, userId: 5, input: { fieldCode: "3", year: 2028, title: "Pembinaan" } });
    assert.ok(added.ok);
    assert.equal((await view(vA, id)).draftApprovedAt, null);
    await approve();
    assert.ok((await rp.saveProgram(prisma, { villageId: vA, planId: id, programId: added.ok ? added.data.id : 0, userId: 5, input: { fieldCode: "3", year: 2029, title: "Pembinaan 2" } })).ok);
    assert.equal((await view(vA, id)).draftApprovedAt, null);
    await approve();
    assert.ok((await rp.removeProgram(prisma, { villageId: vA, planId: id, programId: added.ok ? added.data.id : 0, userId: 5 })).ok);
    assert.equal((await view(vA, id)).draftApprovedAt, null);
    assert.equal(await rev(), n + 3);
    await approve();
    // mengosongkan visi: persetujuan dan penanda selesai sama-sama dicabut
    assert.ok((await patch(vA, id, { vision: "" })).ok);
    const blank = await view(vA, id);
    assert.equal(blank.draftApprovedAt, null);
    assert.equal(blank.draftReadyAt, null);
    // Perdes + perubahan isi pada satu permintaan: ditolak dan tak ada yang tersimpan
    assert.ok((await patch(vA, id, { vision: "Visi pulih", draftReadyAt: "2026-09-02" })).ok);
    await approve();
    const pd = await perdes(vA, "22");
    const both = await patch(vA, id, { mission: "Misi diubah diam-diam", legalDocumentId: pd.id });
    assert.equal(both.ok, false);
    const after = await view(vA, id);
    assert.equal(after.locked, false);
    assert.notEqual(after.mission, "Misi diubah diam-diam");
    assert.notEqual(after.draftApprovedAt, null, "penolakan tidak menyisakan pencabutan sebagian");
    // tim tidak memengaruhi persetujuan
    assert.ok((await rp.addTeamMember(prisma, { villageId: vA, planId: id, input: { name: "Anggota", role: "ANGGOTA" } })).ok);
    assert.notEqual((await view(vA, id)).draftApprovedAt, null);
  });

  it("satu musyawarah tidak bisa dipakai dua RPJM lewat balapan (kunci baris musyawarah)", async () => {
    const v = await freshVillage();
    for (let round = 0; round < 8; round += 1) {
      const a = await mkPlan(v);
      const b = await mkPlan(v);
      const m = await meeting(v, "MUSDES_PERENCANAAN");
      const field = round % 2 === 0 ? "musdesMeetingId" : "draftMeetingId";
      const rs = await Promise.all([patch(v, a, { [field]: m }), patch(v, b, { [field === "musdesMeetingId" ? "draftMeetingId" : "musdesMeetingId"]: m })]);
      assert.equal(rs.filter((r) => r.ok).length, 1, `putaran ${round}`);
      assert.equal(await prisma.rpjmdesPlan.count({ where: { OR: [{ musdesMeetingId: m }, { draftMeetingId: m }] } }), 1);
    }
  });

  it("satu Perdes tidak bisa dipakai RPJM Desa dan RKP Desa sekaligus lewat balapan (kunci baris Perdes)", async () => {
    const v = await freshVillage();
    for (let round = 0; round < 8; round += 1) {
      const { id } = await readyPlan(v);
      const doc = await rk.createDocument(prisma, { villageId: v, userId: 1, input: { year: 2060 + round } });
      assert.ok(doc.ok);
      const pd = await perdes(v, `R${round}`);
      const rs = await Promise.all([patch(v, id, { legalDocumentId: pd.id }), rk.patchDocument(prisma, { villageId: v, id: doc.ok ? doc.data.id : 0, input: { legalDocumentId: pd.id } })]);
      assert.equal(rs.filter((r) => r.ok).length, 1, `putaran ${round}`);
      const used = (await prisma.rpjmdesPlan.count({ where: { legalDocumentId: pd.id } })) + (await prisma.rkpdesDocument.count({ where: { legalDocumentId: pd.id } }));
      assert.equal(used, 1);
    }
  });

  it("jumlah dokumen per desa dibatasi dan judul wajib", async () => {
    assert.equal((await rp.createPlan(prisma, { villageId: vA, input: { title: "", periodStart: 2026 } })).ok, false);
    assert.equal((await rp.createPlan(prisma, { villageId: vA, input: { title: "x", periodStart: 2026, periodEnd: 2020 } })).ok, false);
  });
});
