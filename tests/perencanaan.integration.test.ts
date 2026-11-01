/** Tes integrasi Musyawarah Desa dan siklus RKP Desa terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Musyawarah Desa dan RKP Desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let md: typeof import("../lib/musdes/service");
  let rk: typeof import("../lib/rkpdes/service");
  let vA = 0;
  let vB = 0;
  let seq = 0;
  const NOW = new Date("2026-11-01T03:00:00Z");

  const resident = (villageId: number, name: string, gender = "Perempuan") => {
    seq += 1;
    return prisma.resident.create({ data: { villageId, nik: `${Date.now() % 1e9}${seq}`.padEnd(16, "0").slice(0, 16), name, birthplace: "x", birthDate: new Date("1985-05-05"), gender, address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Istri", rt: "01", rw: "02" } });
  };
  const mkMeeting = async (villageId: number, kind = "MUSDES_PERENCANAAN", extra: Record<string, unknown> = {}) => {
    const r = await md.createMeeting(prisma, { villageId, userId: 1, input: { kind, title: `Musyawarah ${kind}`, scheduledOn: "2026-06-10", planYear: 2027, ...extra } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const held = async (villageId: number, id: number) => {
    const r = await md.transition(prisma, { villageId, id, userId: 1, action: "held", input: { heldOn: "2026-06-10" } });
    assert.ok(r.ok, JSON.stringify(r));
  };
  const perdes = (villageId: number, number: string) => prisma.legalDocument.create({ data: { villageId, type: "PERDES", number, year: 2026, title: "Perdes RKP Desa 2027", enactedAt: new Date("2026-09-20"), status: "BERLAKU" } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    md = await import("../lib/musdes/service");
    rk = await import("../lib/rkpdes/service");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("PA")).id;
    vB = (await mkV("PB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("Musdes: alur dijadwalkan → terlaksana → berita acara → final; setelah final semua terkunci; buka kembali butuh alasan", async () => {
    const id = await mkMeeting(vA, "MUSDES_BLT");
    // belum terlaksana: keputusan dan berita acara belum boleh
    assert.equal((await md.addDecision(prisma, { villageId: vA, meetingId: id, input: { text: "Menetapkan penerima" } })).ok, false);
    assert.equal((await md.transition(prisma, { villageId: vA, id, userId: 1, action: "finalize" })).ok, false);

    assert.ok((await md.addAttendees(prisma, { villageId: vA, meetingId: id, input: { name: "Bu Sari", unsur: "KELOMPOK_PEREMPUAN", gender: "P", present: true } })).ok);
    assert.ok((await md.addAttendees(prisma, { villageId: vA, meetingId: id, input: { name: "Pak Joko", unsur: "BPD", gender: "L" } })).ok);
    await held(vA, id);
    assert.equal((await md.transition(prisma, { villageId: vA, id, userId: 1, action: "held" })).ok, false, "tidak bisa ditandai terlaksana dua kali");

    // berita acara terlalu pendek / tanpa peserta hadir ditolak saat finalisasi
    assert.ok((await md.transition(prisma, { villageId: vA, id, userId: 1, action: "minutes", input: { minutesNo: "BA/1", minutesText: "singkat" } })).ok);
    assert.equal((await md.transition(prisma, { villageId: vA, id, userId: 1, action: "finalize" })).ok, false);
    assert.ok((await md.transition(prisma, { villageId: vA, id, userId: 1, action: "minutes", input: { minutesNo: "BA/1", minutesText: "Musyawarah Desa menetapkan daftar penerima BLT Desa." } })).ok);
    assert.ok((await md.addDecision(prisma, { villageId: vA, meetingId: id, input: { text: "Menetapkan 25 keluarga penerima manfaat" } })).ok);

    const fin = await md.transition(prisma, { villageId: vA, id, userId: 7, action: "finalize" });
    assert.ok(fin.ok, JSON.stringify(fin));
    if (fin.ok) assert.ok(fin.data.warnings.some((w) => w.code === "NO_POOR"), "peringatan keterwakilan dikembalikan saat final");

    // terkunci
    assert.equal((await md.addAttendees(prisma, { villageId: vA, meetingId: id, input: { name: "Terlambat", unsur: "WARGA" } })).ok, false);
    assert.equal((await md.addDecision(prisma, { villageId: vA, meetingId: id, input: { text: "x" } })).ok, false);
    assert.equal((await md.updateMeeting(prisma, { villageId: vA, id, input: { title: "Ganti judul", scheduledOn: "2026-06-11" } })).ok, false);
    assert.equal((await md.deleteMeeting(prisma, { villageId: vA, id })).ok, false);

    assert.equal((await md.transition(prisma, { villageId: vA, id, userId: 1, action: "reopen", input: { reason: "x" } })).ok, false, "alasan wajib");
    assert.ok((await md.transition(prisma, { villageId: vA, id, userId: 1, action: "reopen", input: { reason: "Salah ketik nama peserta" } })).ok);
    assert.ok((await md.addAttendees(prisma, { villageId: vA, meetingId: id, input: { name: "Bu Rini", unsur: "DISABILITAS" } })).ok, "setelah dibuka kembali bisa diubah");
    const row = await prisma.villageMeeting.findUniqueOrThrow({ where: { id } });
    assert.equal(row.status, "HELD");
    assert.equal(row.finalizedAt, null);
  });

  it("Musdes: batal hanya saat dijadwalkan dan wajib beralasan; hapus hanya yang dijadwalkan/dibatalkan", async () => {
    const a = await mkMeeting(vA);
    assert.equal((await md.transition(prisma, { villageId: vA, id: a, userId: 1, action: "cancel", input: { reason: "abc" } })).ok, false);
    assert.ok((await md.transition(prisma, { villageId: vA, id: a, userId: 1, action: "cancel", input: { reason: "Kades berhalangan" } })).ok);
    assert.equal((await md.addAttendees(prisma, { villageId: vA, meetingId: a, input: { name: "x", unsur: "WARGA" } })).ok, false);
    assert.ok((await md.deleteMeeting(prisma, { villageId: vA, id: a })).ok);

    const b = await mkMeeting(vA);
    await held(vA, b);
    assert.equal((await md.transition(prisma, { villageId: vA, id: b, userId: 1, action: "cancel", input: { reason: "Sudah terlanjur" } })).ok, false);
    assert.equal((await md.deleteMeeting(prisma, { villageId: vA, id: b })).ok, false, "musyawarah terlaksana adalah catatan resmi");
  });

  it("Musdes: peserta dari data warga (nama dan jenis kelamin terisi, tak ganda, hanya warga desa sendiri) dan tambah banyak sekaligus", async () => {
    const id = await mkMeeting(vA);
    const r1 = await resident(vA, "Warga Satu", "Perempuan");
    const rB = await resident(vB, "Warga Desa Lain", "Laki-laki");
    assert.ok((await md.addAttendees(prisma, { villageId: vA, meetingId: id, input: { residentId: r1.id, unsur: "KELOMPOK_MISKIN" } })).ok);
    assert.equal((await md.addAttendees(prisma, { villageId: vA, meetingId: id, input: { residentId: r1.id, unsur: "WARGA" } })).ok, false, "tak ganda");
    assert.equal((await md.addAttendees(prisma, { villageId: vA, meetingId: id, input: { residentId: rB.id, unsur: "WARGA" } })).ok, false, "warga desa lain ditolak");
    const d = await md.getMeeting(prisma, vA, id);
    assert.equal(d?.attendees[0].name, "Warga Satu");
    assert.equal(d?.attendees[0].gender, "P");

    const names = Array.from({ length: 100 }, (_, i) => `Peserta ${i + 1}`);
    const bulk = await md.addAttendeesBulk(prisma, { villageId: vA, meetingId: id, names, unsur: "WARGA", present: true });
    assert.ok(bulk.ok && bulk.data.added === 100);
    assert.equal((await md.addAttendeesBulk(prisma, { villageId: vA, meetingId: id, names: [...names, "lebih"], unsur: "WARGA" })).ok, false, "maksimal 100 per sekali tambah");
    assert.equal((await md.addAttendeesBulk(prisma, { villageId: vA, meetingId: id, names: ["x"], unsur: "NGAWUR" })).ok, false);
    assert.equal((await md.getMeeting(prisma, vA, id))?.counts.invited, 101);
    await md.transition(prisma, { villageId: vA, id, userId: 1, action: "all-present", input: { present: true } });
    assert.equal((await md.getMeeting(prisma, vA, id))?.counts.present, 101);
  });

  it("Musdes: dua keputusan dicatat bersamaan mendapat nomor urut berbeda (kunci baris mencegah bentrok)", async () => {
    const id = await mkMeeting(vA);
    await held(vA, id);
    const rs = await Promise.all(Array.from({ length: 6 }, (_, i) => md.addDecision(prisma, { villageId: vA, meetingId: id, input: { text: `Keputusan ${i + 1}` } })));
    assert.ok(rs.every((r) => r.ok), JSON.stringify(rs.filter((r) => !r.ok)));
    const seqs = (await prisma.villageMeetingDecision.findMany({ where: { meetingId: id }, orderBy: { seq: "asc" } })).map((d) => d.seq);
    assert.deepEqual(seqs, [1, 2, 3, 4, 5, 6]);
  });

  it("Musdes: desa lain tidak dapat membaca atau mengubah musyawarah ini", async () => {
    const id = await mkMeeting(vA);
    assert.equal(await md.getMeeting(prisma, vB, id), null);
    assert.equal((await md.updateMeeting(prisma, { villageId: vB, id, input: { title: "Retas", scheduledOn: "2026-06-11" } })).ok, false);
    assert.equal((await md.addAttendees(prisma, { villageId: vB, meetingId: id, input: { name: "x", unsur: "WARGA" } })).ok, false);
    assert.equal((await md.transition(prisma, { villageId: vB, id, userId: 1, action: "held" })).ok, false);
    assert.equal((await md.deleteMeeting(prisma, { villageId: vB, id })).ok, false);
    const list = await md.listMeetings(prisma, vB, { page: 1, pageSize: 50 });
    assert.ok(list.meetings.every((m) => m.id !== id));
  });

  // --- RKP Desa ---------------------------------------------------------------

  async function villageWithPlan(tag: string) {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `${tag}${t}`, name: tag, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    const plan = await prisma.rpjmdesPlan.create({ data: { villageId: v.id, title: "RPJM Desa", periodStart: 2026, periodEnd: 2033, status: "active" } });
    return { villageId: v.id, planId: plan.id };
  }
  const newDoc = async (villageId: number, year = 2027) => {
    const r = await rk.createDocument(prisma, { villageId, userId: 1, input: { year } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const act = (o: Record<string, unknown> = {}) => ({ title: "Rabat jalan dusun", activityCode: "2.1.01", estimatedBudget: "100000000", fundSource: "DD", method: "SWAKELOLA", outputName: "Jalan", outputVolume: "250", outputUnit: "meter", executorChair: "A", executorSecretary: "B", executorTreasurer: "C", executorHasWoman: true, rabVerifiedAt: "2026-10-20", ...o });

  it("RKP Desa: dokumen tahun yang sama tidak ganda, memakai RPJM Desa yang mencakup tahunnya", async () => {
    const { villageId, planId } = await villageWithPlan("RK1");
    try {
      const id = await newDoc(villageId);
      assert.equal((await rk.createDocument(prisma, { villageId, userId: 1, input: { year: 2027 } })).ok, false);
      const d = await rk.getDocument(prisma, villageId, id, NOW);
      assert.equal(d?.document.plan?.id, planId);
      assert.equal(d?.document.plan?.termYears, 8);
      assert.equal(d?.document.progress.total, 8);
      const noPlan = await rk.createDocument(prisma, { villageId, userId: 1, input: { year: 2040 } });
      assert.ok(noPlan.ok);
      if (noPlan.ok) {
        const x = await rk.saveActivity(prisma, { villageId, documentId: noPlan.data.id, input: act() });
        assert.equal(x.ok, false, "tanpa RPJM Desa yang mencakup tahunnya kegiatan belum bisa dibuat");
      }
    } finally {
      await prisma.village.delete({ where: { id: villageId } });
    }
  });

  it("RKP Desa: tautan musyawarah dan Perdes divalidasi jenisnya dan kepemilikannya", async () => {
    const { villageId } = await villageWithPlan("RK2");
    const other = await villageWithPlan("RK2B");
    try {
      const id = await newDoc(villageId);
      const wrongKind = await mkMeeting(villageId, "MUSRENBANGDES");
      const musdes = await mkMeeting(villageId, "MUSDES_PERENCANAAN");
      const foreign = await mkMeeting(other.villageId, "MUSDES_PERENCANAAN");
      assert.equal((await rk.patchDocument(prisma, { villageId, id, input: { musdesMeetingId: wrongKind } })).ok, false);
      assert.equal((await rk.patchDocument(prisma, { villageId, id, input: { musdesMeetingId: foreign } })).ok, false, "musyawarah desa lain");
      assert.ok((await rk.patchDocument(prisma, { villageId, id, input: { musdesMeetingId: musdes } })).ok);

      let d = await rk.getDocument(prisma, villageId, id, NOW);
      assert.equal(d?.document.steps.find((s) => s.key === "musdes")?.state, "overdue", "belum terlaksana dan tenggat Juni lewat");
      await held(villageId, musdes);
      d = await rk.getDocument(prisma, villageId, id, NOW);
      const step = d?.document.steps.find((s) => s.key === "musdes");
      assert.equal(step?.state, "done");
      assert.equal(step?.doneAt, "2026-06-10");
      assert.equal(step?.doneLate, false);

      const l = await perdes(villageId, "3/2026");
      const lOther = await perdes(other.villageId, "9/2026");
      const nonPerdes = await prisma.legalDocument.create({ data: { villageId, type: "PERKADES", number: "1/2026", year: 2026, title: "x", enactedAt: new Date("2026-01-01"), status: "BERLAKU" } });
      assert.equal((await rk.patchDocument(prisma, { villageId, id, input: { legalDocumentId: lOther.id } })).ok, false);
      assert.equal((await rk.patchDocument(prisma, { villageId, id, input: { legalDocumentId: nonPerdes.id } })).ok, false);
      assert.ok((await rk.patchDocument(prisma, { villageId, id, input: { legalDocumentId: l.id } })).ok);
      d = await rk.getDocument(prisma, villageId, id, NOW);
      const pStep = d?.document.steps.find((s) => s.key === "perdes");
      assert.equal(pStep?.state, "done");
      assert.equal(pStep?.doneLate, false, "20 September ≤ 30 September");
      // satu Perdes tak boleh dipakai dua dokumen
      const id2 = await newDoc(villageId, 2028);
      assert.equal((await rk.patchDocument(prisma, { villageId, id: id2, input: { legalDocumentId: l.id } })).ok, false);
    } finally {
      await prisma.village.deleteMany({ where: { id: { in: [villageId, other.villageId] } } });
    }
  });

  it("RKP Desa: setelah Perdes ditetapkan isi terkunci (hanya data usulan yang boleh); perubahan lewat dokumen perubahan", async () => {
    const { villageId } = await villageWithPlan("RK3");
    try {
      const id = await newDoc(villageId);
      assert.equal((await rk.createDocument(prisma, { villageId, userId: 1, input: { year: 2027, perubahan: true, changeReason: "KEBIJAKAN" } })).ok, false, "belum ditetapkan, belum perlu perubahan");
      const a = await rk.saveActivity(prisma, { villageId, documentId: id, input: act() });
      assert.ok(a.ok);
      const activityId = a.ok ? a.data.id : 0;
      const l = await perdes(villageId, "4/2026");
      assert.ok((await rk.patchDocument(prisma, { villageId, id, input: { legalDocumentId: l.id } })).ok);

      assert.equal((await rk.patchDocument(prisma, { villageId, id, input: { teamFormedAt: "2026-06-01" } })).ok, false);
      assert.equal((await rk.patchDocument(prisma, { villageId, id, input: { legalDocumentId: null } })).ok, false, "tautan Perdes tak bisa dilepas");
      assert.equal((await rk.saveActivity(prisma, { villageId, documentId: id, input: act({ title: "Baru" }) })).ok, false);
      assert.equal((await rk.saveActivity(prisma, { villageId, documentId: id, activityId, input: act({ title: "Ubah" }) })).ok, false);
      assert.equal((await rk.removeActivity(prisma, { villageId, documentId: id, activityId })).ok, false);
      assert.equal((await rk.addTeamMember(prisma, { villageId, documentId: id, input: { name: "x", role: "ANGGOTA" } })).ok, false);
      assert.equal((await rk.upsertPagu(prisma, { villageId, documentId: id, input: { source: "DD", amount: 1 } })).ok, false);
      assert.equal((await rk.addIncoming(prisma, { villageId, documentId: id, input: { level: "PUSAT", name: "x" } })).ok, false);
      assert.equal((await rk.deleteDocument(prisma, { villageId, id })).ok, false);
      assert.ok((await rk.patchDocument(prisma, { villageId, id, input: { usulanSubmittedAt: "2026-11-05", usulanRef: "Surat 12/2026" } })).ok, "daftar usulan masih boleh dicatat");

      const p = await rk.createDocument(prisma, { villageId, userId: 1, input: { year: 2027, perubahan: true, changeReason: "PERISTIWA_KHUSUS" } });
      assert.ok(p.ok, JSON.stringify(p));
      const view = p.ok ? await rk.getDocument(prisma, villageId, p.data.id, NOW) : null;
      assert.equal(view?.document.revision, 1);
      assert.deepEqual(view?.document.steps.map((s) => s.key), ["rancangan", "musrenbang", "perdes"]);
      assert.ok(p.ok && (await rk.saveActivity(prisma, { villageId, documentId: p.data.id, input: act({ title: "Kegiatan perubahan" }) })).ok);
    } finally {
      await prisma.village.delete({ where: { id: villageId } });
    }
  });

  it("RKP Desa: kegiatan, anggaran per sumber (tepat sampai sen), dan peringatan kelengkapan serta pagu", async () => {
    const { villageId, planId } = await villageWithPlan("RK4");
    try {
      const id = await newDoc(villageId);
      assert.ok((await rk.upsertPagu(prisma, { villageId, documentId: id, input: { source: "DD", amount: "150000000" } })).ok);
      assert.ok((await rk.saveActivity(prisma, { villageId, documentId: id, input: act({ estimatedBudget: "0.10" }) })).ok);
      assert.ok((await rk.saveActivity(prisma, { villageId, documentId: id, input: act({ title: "Posyandu", activityCode: "3.1.01", estimatedBudget: "0.20", fundSource: "ADD" }) })).ok);
      assert.ok((await rk.saveActivity(prisma, { villageId, documentId: id, input: { title: "Belum lengkap" } })).ok);
      const d = await rk.getDocument(prisma, villageId, id, NOW);
      const sum = d!.document.activitySummary;
      assert.equal(sum.count, 3);
      assert.equal(sum.totalBudget, "0.30", "0,10 + 0,20 tepat");
      assert.equal(sum.complete, 2);
      assert.deepEqual(sum.bySource, { DD: "0.10", ADD: "0.20" });
      assert.equal(d!.document.paguWarnings.length, 1, "ADD tanpa pagu tercatat");
      assert.ok(d!.document.activities.find((a) => a.title === "Belum lengkap")!.warnings.length >= 6);
      const row = await prisma.rkpdesActivity.findFirstOrThrow({ where: { documentId: id, title: "Posyandu" } });
      assert.equal(row.planId, planId);
      assert.equal(row.year, 2027);
      assert.equal(row.source, "internal");
      assert.equal(row.activityCode, "3.1.01");

      assert.equal((await rk.saveActivity(prisma, { villageId, documentId: id, input: act({ activityCode: "9.9.99" }) })).ok, false);
      assert.equal((await rk.upsertPagu(prisma, { villageId, documentId: id, input: { source: "DD", amount: "200000000" } })).ok, true, "pagu sumber yang sama diperbarui, bukan digandakan");
      assert.equal(await prisma.rkpdesPaguIndicative.count({ where: { documentId: id } }), 1);
      assert.equal((await rk.removePagu(prisma, { villageId, documentId: id, source: "TIDAKADA" })).ok, false);
    } finally {
      await prisma.village.delete({ where: { id: villageId } });
    }
  });

  it("RKP Desa: pagu sumber sama disimpan bersamaan tidak bentrok (kunci baris dokumen)", async () => {
    const { villageId } = await villageWithPlan("RK5");
    try {
      const id = await newDoc(villageId);
      const rs = await Promise.all(Array.from({ length: 6 }, (_, i) => rk.upsertPagu(prisma, { villageId, documentId: id, input: { source: "DD", amount: String((i + 1) * 1000) } })));
      assert.ok(rs.every((r) => r.ok), JSON.stringify(rs.filter((r) => !r.ok)));
      assert.equal(await prisma.rkpdesPaguIndicative.count({ where: { documentId: id } }), 1);
    } finally {
      await prisma.village.delete({ where: { id: villageId } });
    }
  });

  it("RKP Desa: tim penyusun dari data warga (tak ganda, desa sendiri) dan peringatan komposisi", async () => {
    const { villageId } = await villageWithPlan("RK6");
    const other = await villageWithPlan("RK6B");
    try {
      const id = await newDoc(villageId);
      const r1 = await resident(villageId, "Ibu Ketua LPM", "Perempuan");
      const rOther = await resident(other.villageId, "Orang Lain", "Laki-laki");
      assert.ok((await rk.addTeamMember(prisma, { villageId, documentId: id, input: { residentId: r1.id, role: "SEKRETARIS", position: "Ketua LPM" } })).ok);
      assert.equal((await rk.addTeamMember(prisma, { villageId, documentId: id, input: { residentId: r1.id, role: "ANGGOTA" } })).ok, false);
      assert.equal((await rk.addTeamMember(prisma, { villageId, documentId: id, input: { residentId: rOther.id, role: "ANGGOTA" } })).ok, false);
      const d = await rk.getDocument(prisma, villageId, id, NOW);
      assert.equal(d?.document.team[0].gender, "P");
      assert.equal(d?.document.team[0].name, "Ibu Ketua LPM");
      assert.ok(d?.document.teamWarnings.some((w) => w.includes("paling sedikit 7")));
      assert.ok(!d?.document.teamWarnings.some((w) => w.includes("perempuan")), "sudah ada perempuan");
      assert.ok(d?.document.teamWarnings.some((w) => w.includes("pembina")));
    } finally {
      await prisma.village.deleteMany({ where: { id: { in: [villageId, other.villageId] } } });
    }
  });

  it("RKP Desa: persetujuan Kepala Desa butuh rancangan selesai, dan tak bisa dicabut setelah Musrenbangdes terlaksana", async () => {
    const { villageId } = await villageWithPlan("RK7");
    try {
      const id = await newDoc(villageId);
      assert.equal((await rk.approveDraft(prisma, { villageId, id, userId: 1, date: new Date("2026-08-20") })).ok, false, "rancangan belum selesai");
      assert.ok((await rk.patchDocument(prisma, { villageId, id, input: { draftReadyAt: "2026-08-10", draftMinutesRef: "BA tim 1/2026" } })).ok);
      assert.ok((await rk.approveDraft(prisma, { villageId, id, userId: 9, date: new Date("2026-08-20") })).ok);
      let row = await prisma.rkpdesDocument.findUniqueOrThrow({ where: { id } });
      assert.equal(row.draftApprovedById, 9);
      assert.ok((await rk.approveDraft(prisma, { villageId, id, userId: 9, date: null })).ok, "boleh dicabut selama belum ada Musrenbangdes");
      assert.ok((await rk.approveDraft(prisma, { villageId, id, userId: 9, date: new Date("2026-08-21") })).ok);

      const mus = await mkMeeting(villageId, "MUSRENBANGDES");
      assert.ok((await rk.patchDocument(prisma, { villageId, id, input: { musrenbangMeetingId: mus } })).ok);
      await held(villageId, mus);
      assert.equal((await rk.approveDraft(prisma, { villageId, id, userId: 9, date: null })).ok, false);
      row = await prisma.rkpdesDocument.findUniqueOrThrow({ where: { id } });
      assert.ok(row.draftApprovedAt);
    } finally {
      await prisma.village.delete({ where: { id: villageId } });
    }
  });

  it("RKP Desa: dokumen dengan kegiatan tidak bisa dihapus; desa lain tidak melihat atau mengubahnya", async () => {
    const { villageId } = await villageWithPlan("RK8");
    const other = await villageWithPlan("RK8B");
    try {
      const id = await newDoc(villageId);
      assert.ok((await rk.saveActivity(prisma, { villageId, documentId: id, input: act() })).ok);
      assert.equal((await rk.deleteDocument(prisma, { villageId, id })).ok, false);
      assert.equal(await rk.getDocument(prisma, other.villageId, id, NOW), null);
      assert.equal((await rk.patchDocument(prisma, { villageId: other.villageId, id, input: { teamDecreeRef: "x" } })).ok, false);
      assert.equal((await rk.saveActivity(prisma, { villageId: other.villageId, documentId: id, input: act() })).ok, false);
      assert.equal((await rk.addTeamMember(prisma, { villageId: other.villageId, documentId: id, input: { name: "x", role: "ANGGOTA" } })).ok, false);
      const list = await rk.listDocuments(prisma, other.villageId, NOW);
      assert.equal(list.documents.length, 0);
      const mine = await rk.listDocuments(prisma, villageId, NOW);
      assert.equal(mine.documents[0].activityCount, 1);
      assert.equal(mine.documents[0].next?.key, "musdes");
      assert.ok(mine.documents[0].overdue >= 1);

      const a = await prisma.rkpdesActivity.findFirstOrThrow({ where: { documentId: id } });
      assert.ok((await rk.removeActivity(prisma, { villageId, documentId: id, activityId: a.id })).ok);
      assert.ok((await rk.deleteDocument(prisma, { villageId, id })).ok);
    } finally {
      await prisma.village.deleteMany({ where: { id: { in: [villageId, other.villageId] } } });
    }
  });

  const apbDoc = async (villageId: number, version: number, status: string, lines: { code?: string; account: string; cents: bigint; fund?: string }[]) => {
    const d = await prisma.apbdesDocument.create({ data: { villageId, year: 2027, version, status } });
    await prisma.apbdesLine.createMany({ data: lines.map((l) => ({ documentId: d.id, villageId, activityCode: l.code ?? null, accountCode: l.account, description: "x", amountCents: l.cents, fundSource: l.fund ?? null })) });
    return d.id;
  };

  it("Keselarasan: membandingkan per kegiatan, memilih dokumen APB Desa, dan tertutup antar desa", async () => {
    const { villageId } = await villageWithPlan("AL1");
    const other = await villageWithPlan("AL2");
    const al = await import("../lib/rkpdes/alignment-service");
    try {
      const id = await newDoc(villageId);
      for (const a of [act(), act({ title: "Posyandu", activityCode: "3.1.02", estimatedBudget: "5000000", fundSource: "ADD" }), act({ title: "Gorong-gorong", activityCode: "2.1.02", estimatedBudget: "7000000" }), act({ title: "Belum berkode", activityCode: null, estimatedBudget: "1000000" })]) {
        const r = await rk.saveActivity(prisma, { villageId, documentId: id, input: a });
        assert.ok(r.ok, JSON.stringify(r));
      }
      const empty = await al.loadAlignment(prisma, { villageId, documentId: id });
      assert.ok(empty.ok && empty.data.apbdes === null && empty.data.dpaReady === false && empty.data.rows.length === 3 && empty.data.counts.BELUM_DIANGGARKAN === 3);

      const first = await apbDoc(villageId, 0, "DITETAPKAN", [
        { code: "2.1.01", account: "5.2.1.01", cents: 10_000_000_000n, fund: "DD" },
        { code: "3.1.02", account: "5.2.1.01", cents: 300_000_000n, fund: "ADD" },
        { code: "1.1.01", account: "5.2.1.01", cents: 200_000_000n, fund: "ADD" },
        { account: "4.2.1.01", cents: 99_000_000_000n },
      ]);
      const amend = await apbDoc(villageId, 1, "DRAFT", [{ code: "2.1.01", account: "5.2.1.01", cents: 10_000_000_000n, fund: "DD" }]);

      const r = await al.loadAlignment(prisma, { villageId, documentId: id, apbdesId: first });
      assert.ok(r.ok, JSON.stringify(r));
      if (r.ok) {
        const by = Object.fromEntries(r.data.rows.map((x) => [x.activityCode, x]));
        assert.equal(by["2.1.01"].state, "SELARAS");
        assert.equal(by["3.1.02"].state, "KURANG");
        assert.equal(by["3.1.02"].diff, "-2000000.00");
        assert.equal(by["2.1.02"].state, "BELUM_DIANGGARKAN");
        assert.equal(by["1.1.01"].state, "TIDAK_DI_RKP");
        assert.equal(r.data.uncoded.count, 1);
        assert.equal(r.data.totals.rkp, "113000000.00", "total RKP memuat kegiatan tak berkode");
        assert.equal(r.data.totals.apb, "105000000.00", "pendapatan tidak ikut dihitung sebagai belanja");
        assert.equal(r.data.dpaReady, true);
        assert.equal(r.data.warnings.length, 4);
      }
      // default = dokumen terbaru (perubahan, draf): belum bisa jadi dasar DPA
      const def = await al.loadAlignment(prisma, { villageId, documentId: id });
      assert.ok(def.ok && def.data.apbdes?.id === amend && def.data.dpaReady === false && def.data.apbdesOptions[0].id === amend);

      // tertutup antar desa
      assert.equal((await al.loadAlignment(prisma, { villageId: other.villageId, documentId: id })).ok, false);
      const foreignApb = await apbDoc(other.villageId, 0, "DITETAPKAN", [{ code: "2.1.01", account: "5.2.1.01", cents: 100n }]);
      assert.equal((await al.loadAlignment(prisma, { villageId, documentId: id, apbdesId: foreignApb })).ok, false, "dokumen APB Desa desa lain tidak bisa dipilih");
    } finally {
      await prisma.village.deleteMany({ where: { id: { in: [villageId, other.villageId] } } });
    }
  });

  it("Siapkan DPA dari RKP Desa: hanya kegiatan di APB Desa yang berlaku, tanpa menimpa, aman diulang", async () => {
    const { villageId } = await villageWithPlan("AL3");
    const other = await villageWithPlan("AL4");
    const al = await import("../lib/rkpdes/alignment-service");
    try {
      const id = await newDoc(villageId);
      for (const a of [
        act(),
        act({ title: "Posyandu", activityCode: "3.1.02", estimatedBudget: "5000000", fundSource: "ADD", outputName: null, outputVolume: null, outputUnit: null, executorChair: null, executorSecretary: null, executorTreasurer: null }),
        act({ title: "Pos ronda", activityCode: "5.3.00", location: "RT 3" }),
        act({ title: "Pos ronda 2", activityCode: "5.3.00" }),
        act({ title: "Belum di APB", activityCode: "2.1.02" }),
        act({ title: "Sudah ada DPA", activityCode: "1.1.01" }),
      ]) assert.ok((await rk.saveActivity(prisma, { villageId, documentId: id, input: a })).ok);

      assert.equal((await al.prefillDpa(prisma, { villageId, documentId: id })).ok, false, "tanpa APB Desa ditetapkan, DPA tidak disiapkan");
      await apbDoc(villageId, 0, "DITETAPKAN", ["2.1.01", "3.1.02", "5.3.00", "1.1.01"].map((code) => ({ code, account: "5.2.1.01", cents: 100_000n })));
      await prisma.apbdesActivityPlan.create({ data: { villageId, year: 2027, activityCode: "1.1.01", executorName: "Kaur Umum" } });

      const r = await al.prefillDpa(prisma, { villageId, documentId: id });
      assert.ok(r.ok, JSON.stringify(r));
      if (r.ok) {
        assert.equal(r.data.created, 1);
        const why = Object.fromEntries(r.data.skipped.map((s) => [s.activityCode, s.reason]));
        assert.match(why["3.1.02"], /kosong/);
        assert.match(why["5.3.00"], /2 kegiatan/);
        assert.match(why["2.1.02"], /Belum ada belanjanya/);
        assert.match(why["1.1.01"], /tidak ditimpa/);
      }
      const plan = await prisma.apbdesActivityPlan.findUniqueOrThrow({ where: { villageId_year_activityCode: { villageId, year: 2027, activityCode: "2.1.01" } } });
      assert.equal(plan.status, "DRAFT");
      assert.equal(plan.outputName, "Jalan");
      assert.equal(plan.outputVolume?.toFixed(2), "250.00");
      assert.equal(plan.outputUnit, "meter");
      assert.equal(plan.team, "Ketua: A; Sekretaris: B; Bendahara: C");
      assert.equal(plan.executorName, null, "pelaksana Kaur/Kasi tidak ada di RKP Desa");
      assert.equal((await prisma.apbdesActivityPlan.findUniqueOrThrow({ where: { villageId_year_activityCode: { villageId, year: 2027, activityCode: "1.1.01" } } })).executorName, "Kaur Umum");

      const again = await al.prefillDpa(prisma, { villageId, documentId: id });
      assert.ok(again.ok && again.data.created === 0, "diulang tidak membuat ganda");
      assert.equal((await al.prefillDpa(prisma, { villageId: other.villageId, documentId: id })).ok, false);
      assert.equal(await prisma.apbdesActivityPlan.count({ where: { villageId: other.villageId } }), 0);
    } finally {
      await prisma.village.deleteMany({ where: { id: { in: [villageId, other.villageId] } } });
    }
  });
});
