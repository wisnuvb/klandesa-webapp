/** Tes integrasi Keamanan & ketertiban terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { readFileSync } from "node:fs";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Keamanan & ketertiban (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let S: typeof import("../lib/keamanan/service");
  let R: typeof import("../lib/keamanan/ronda");
  let K: typeof import("../lib/keamanan/kejadian");
  let inc: typeof import("../lib/incident/service");
  let vA = 0;
  let vB = 0;
  const TODAY = "2026-11-01";
  const NOW = new Date("2026-11-01T05:00:00Z");
  const tag = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  let seq = 0;
  const CAN_ALL = { update: true, approve: true };
  const CAN_UPD = { update: true, approve: false };
  const date = (s: string) => new Date(`${s}T00:00:00.000Z`);

  const mkRes = (villageId: number, name: string, o: Record<string, unknown> = {}) => {
    seq++;
    return prisma.resident.create({ data: { villageId, nik: `${tag.slice(-8)}${String(seq).padStart(8, "0")}`, kk: `${tag.slice(-8)}${String(seq).padStart(8, "1")}`, name, birthplace: "x", birthDate: new Date("1985-05-05"), gender: "Laki-laki", address: "Jl. Mawar", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", rt: "01", rw: "02", phone: "081234567890", ...o } });
  };
  const mkGroup = async (villageId: number, name: string, nPeople: number, o: Record<string, unknown> = {}) => {
    const g = await R.createGroup(prisma, { villageId, userId: 1, input: { name, rt: "01", rw: "02", perShift: 2, ...o } });
    assert.ok(g.ok, JSON.stringify(g));
    const ids: number[] = [];
    for (let i = 0; i < nPeople; i++) {
      const res = await mkRes(villageId, `Peserta ${name} ${i + 1}`);
      const p = await R.addPerson(prisma, { villageId, groupId: g.ok ? g.data.id : 0, userId: 1, input: { residentId: res.id } });
      assert.ok(p.ok, JSON.stringify(p));
      ids.push(res.id);
    }
    return { id: g.ok ? g.data.id : 0, residents: ids };
  };
  const gen = (villageId: number, groupId: number, input: Record<string, unknown>, apply = true) => R.generateSchedule(prisma, { villageId, userId: 1, groupId, input, apply, today: TODAY });
  const shiftsOf = (groupId: number) => prisma.securityRondaShift.findMany({ where: { groupId }, orderBy: [{ shiftDate: "asc" }, { id: "asc" }] });
  const ev = async (villageId: number, o: Record<string, unknown> = {}) => {
    const r = await K.createSecurityEvent(prisma, { villageId, userId: 1, now: NOW, input: { kind: "PERKELAHIAN", title: "Keributan di warung", occurredAt: "2026-11-01T01:00:00Z", severity: "MEDIUM", ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const med = async (villageId: number, eventId: number, o: Record<string, unknown> = {}) => {
    const r = await K.createMediation(prisma, { villageId, eventId, userId: 1, input: { scheduledAt: "2026-11-05T02:00:00Z", place: "Balai Desa", mediator: "Kaur Pemerintahan", ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const party = (villageId: number, mediationId: number, o: Record<string, unknown>) => K.addParty(prisma, { villageId, mediationId, today: TODAY, input: { attended: true, ...o } });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    S = await import("../lib/keamanan/service");
    R = await import("../lib/keamanan/ronda");
    K = await import("../lib/keamanan/kejadian");
    inc = await import("../lib/incident/service");
    // DB scratch dibuat dari `db push` (tanpa CHECK); pasang CHECK dari berkas migrasi agar pagar DB ikut diuji.
    for (const file of ["docs/PHASE3_BENCANA_MIGRATION.sql", "docs/PHASE3_KEAMANAN_MIGRATION.sql"]) {
      const sql = readFileSync(file, "utf8");
      for (const stmt of sql.split("\n").filter((l) => l.startsWith("ALTER TABLE") && l.includes("CHECK"))) {
        await prisma.$executeRawUnsafe(stmt.replace(/;$/, "")).catch((e: Error) => {
          if (!/Duplicate check constraint|already exists|3822/i.test(e.message)) throw e;
        });
      }
    }
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${tag}`.slice(0, 20), name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("KA")).id;
    vB = (await mk("KB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.incidentEvent.deleteMany({ where: { villageId: { in: [vA, vB] } } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------------------------------------------------
  it("Satlinmas: anggota dari warga desa sendiri, satu jabatan tunggal, akhiri dan aktifkan kembali, isolasi desa", async () => {
    const a1 = await mkRes(vA, "Sutarno Hadi", { birthDate: new Date("1966-12-01") });
    const a2 = await mkRes(vA, "Budi Santoso");
    const b1 = await mkRes(vB, "Warga Desa B");
    const m1 = await S.createMember(prisma, { villageId: vA, userId: 1, input: { residentId: a1.id, role: "KEPALA_PELAKSANA", decreeNumber: "SK/1/2026", squadKind: "PENGAMANAN", squadName: "Regu 1" } });
    assert.ok(m1.ok, JSON.stringify(m1));
    const dup = await S.createMember(prisma, { villageId: vA, userId: 1, input: { residentId: a1.id } });
    assert.ok(!dup.ok && dup.status === 409 && /sudah terdaftar/.test(dup.errors[0]!));
    const other = await S.createMember(prisma, { villageId: vA, userId: 1, input: { residentId: b1.id } });
    assert.ok(!other.ok && other.status === 404, "warga desa lain ditolak");
    const second = await S.createMember(prisma, { villageId: vA, userId: 1, input: { residentId: a2.id, role: "KEPALA_PELAKSANA" } });
    assert.ok(!second.ok && second.status === 409 && /sudah terisi/.test(second.errors[0]!), "kepala pelaksana tunggal");
    const m2 = await S.createMember(prisma, { villageId: vA, userId: 1, input: { residentId: a2.id } });
    assert.ok(m2.ok);

    const list = await S.listMembers(prisma, { villageId: vA, detail: false, today: TODAY });
    assert.equal(list.counts.active, 2);
    const row1 = list.rows.find((r) => r.residentId === a1.id)!;
    assert.equal(row1.age, 59);
    assert.equal(row1.phone, null, "telepon tersembunyi tanpa izin rinci");
    assert.ok(row1.findings.some((f) => f.code === "NOT_INAUGURATED"));
    assert.equal(list.squads.length, 1);
    assert.match(list.squads[0]!.findings[0]!.message, /paling sedikit 5/);
    const detail = await S.listMembers(prisma, { villageId: vA, detail: true, today: TODAY });
    assert.equal(detail.rows.find((r) => r.residentId === a1.id)!.phone, "081234567890");
    assert.equal((await S.listMembers(prisma, { villageId: vB, detail: true, today: TODAY })).rows.length, 0, "desa B tidak melihat anggota desa A");
    assert.ok(JSON.stringify(list).indexOf(a1.nik) === -1, "NIK tidak pernah keluar");

    const mid = m1.ok ? m1.data.id : 0;
    assert.ok(!(await S.patchMember(prisma, { villageId: vB, id: mid, input: { note: "x" } })).ok, "lintas desa ditolak");
    assert.ok(!(await S.endMember(prisma, { villageId: vB, id: mid, input: { endedOn: "2026-11-01", endReason: "PINDAH" } })).ok);
    assert.ok(!(await S.removeMember(prisma, { villageId: vB, id: mid })).ok);
    assert.ok((await S.endMember(prisma, { villageId: vA, id: mid, input: { endedOn: "2026-10-31", endReason: "PINDAH", endDecree: "SK/9" } })).ok);
    assert.ok(!(await S.endMember(prisma, { villageId: vA, id: mid, input: { endedOn: "2026-10-31", endReason: "PINDAH" } })).ok, "sudah berakhir");
    // jabatan tunggal dilepas setelah pejabat berakhir
    assert.ok((await S.patchMember(prisma, { villageId: vA, id: m2.ok ? m2.data.id : 0, input: { role: "KEPALA_PELAKSANA" } })).ok);
    const re = await S.reactivateMember(prisma, { villageId: vA, id: mid });
    assert.ok(!re.ok && re.status === 409, "jabatan sudah diisi pengganti");
    assert.ok((await S.patchMember(prisma, { villageId: vA, id: m2.ok ? m2.data.id : 0, input: { role: "ANGGOTA" } })).ok);
    assert.ok((await S.reactivateMember(prisma, { villageId: vA, id: mid })).ok);
  });

  it("Satlinmas: dua pengisian jabatan tunggal serentak, hanya satu berhasil", async () => {
    const ppl = await Promise.all([mkRes(vB, "Calon 1"), mkRes(vB, "Calon 2"), mkRes(vB, "Calon 3")]);
    const rs = await Promise.all(ppl.map((p) => S.createMember(prisma, { villageId: vB, userId: 1, input: { residentId: p.id, role: "KEPALA_SATLINMAS" } })));
    assert.equal(rs.filter((r) => r.ok).length, 1);
    assert.equal(rs.filter((r) => !r.ok && r.status === 409).length, 2);
  });

  it("perlengkapan: tautan inventaris harus milik desa yang sama; CRUD terisolasi", async () => {
    const item = await prisma.inventoryItem.create({ data: { villageId: vA, name: "Kentongan", category: "PERALATAN", origin: "APBDES", acquiredYear: 2024 } });
    const foreign = await prisma.inventoryItem.create({ data: { villageId: vB, name: "Barang B", category: "PERALATAN", origin: "APBDES", acquiredYear: 2024 } });
    const ok = await S.createEquipment(prisma, { villageId: vA, userId: 1, input: { category: "KOMUNIKASI", name: "Kentongan pos RW 02", quantity: 2, inventoryItemId: item.id } });
    assert.ok(ok.ok, JSON.stringify(ok));
    const bad = await S.createEquipment(prisma, { villageId: vA, userId: 1, input: { category: "KOMUNIKASI", name: "Alat X", inventoryItemId: foreign.id } });
    assert.ok(!bad.ok && bad.status === 404);
    const list = await S.listEquipment(prisma, { villageId: vA });
    assert.equal(list.rows[0]!.inventory?.label, "Kentongan");
    assert.ok(!list.inventoryOptions.some((o) => o.id === foreign.id));
    assert.equal((await S.listEquipment(prisma, { villageId: vB })).rows.length, 0);
    const id = ok.ok ? ok.data.id : 0;
    assert.ok(!(await S.patchEquipment(prisma, { villageId: vB, id, input: { quantity: 9 } })).ok);
    assert.ok((await S.patchEquipment(prisma, { villageId: vA, id, input: { condition: "RUSAK" } })).ok);
    assert.equal((await S.getOverview(prisma, { villageId: vA, today: TODAY })).counts.equipmentNeedsCare, 1);
    assert.ok(!(await S.removeEquipment(prisma, { villageId: vB, id })).ok);
    assert.ok((await S.removeEquipment(prisma, { villageId: vA, id })).ok);
  });

  // -------------------------------------------------------------------------------------------------------------------
  it("regu ronda: nama unik per desa, peserta sedesa, tidak boleh dihapus bila punya riwayat", async () => {
    const g = await mkGroup(vA, "Ronda RT 01", 4);
    assert.ok(!(await R.createGroup(prisma, { villageId: vA, userId: 1, input: { name: "Ronda RT 01" } })).ok, "nama ganda");
    assert.ok((await R.createGroup(prisma, { villageId: vB, userId: 1, input: { name: "Ronda RT 01" } })).ok, "nama sama di desa lain boleh");
    const foreign = await mkRes(vB, "Warga B");
    const r = await R.addPerson(prisma, { villageId: vA, groupId: g.id, userId: 1, input: { residentId: foreign.id } });
    assert.ok(!r.ok && r.status === 404);
    const dup = await R.addPerson(prisma, { villageId: vA, groupId: g.id, userId: 1, input: { residentId: g.residents[0] } });
    assert.ok(!dup.ok && dup.status === 409);
    assert.ok(!(await R.patchGroup(prisma, { villageId: vB, id: g.id, input: { perShift: 3 } })).ok, "lintas desa");
    assert.ok(!(await R.addPerson(prisma, { villageId: vB, groupId: g.id, userId: 1, input: { residentId: foreign.id } })).ok);
    const sched = await gen(vA, g.id, { from: "2026-11-02", to: "2026-11-03" });
    assert.ok(sched.ok);
    const del = await R.removeGroup(prisma, { villageId: vA, id: g.id });
    assert.ok(!del.ok && del.status === 409 && /Nonaktifkan/.test(del.errors[0]!));
    const people = await prisma.securityRondaPerson.findMany({ where: { groupId: g.id } });
    const delP = await R.removePerson(prisma, { villageId: vA, groupId: g.id, id: people[0]!.id });
    assert.ok(delP.ok || /riwayat/.test(delP.ok ? "" : delP.errors[0]!));
    const empty = await mkGroup(vA, "Ronda kosong", 0);
    assert.ok((await R.removeGroup(prisma, { villageId: vA, id: empty.id })).ok);
    const list = await R.listGroups(prisma, { villageId: vA, today: TODAY });
    assert.ok(list.some((x) => x.name === "Ronda RT 01"));
    assert.equal((await R.listGroups(prisma, { villageId: vB, today: TODAY })).some((x) => x.id === g.id), false);
  });

  it("jadwal: pratinjau tidak menulis; penerapan adil (selisih <= 1), malam terisi tidak ditimpa, masa lalu ditolak", async () => {
    const g = await mkGroup(vA, "Ronda Adil", 7);
    const pv = await gen(vA, g.id, { from: "2026-11-02", to: "2026-11-15" }, false);
    assert.ok(pv.ok && !pv.data.applied && pv.data.created === 0);
    assert.equal((await shiftsOf(g.id)).length, 0, "pratinjau tanpa efek");
    const ap = await gen(vA, g.id, { from: "2026-11-02", to: "2026-11-15" });
    assert.ok(ap.ok && ap.data.applied && ap.data.created === 28, JSON.stringify(ap));
    assert.ok(ap.data.spread <= 1);
    const rows = await shiftsOf(g.id);
    assert.equal(rows.length, 28);
    const per = new Map<number, number>();
    for (const r of rows) per.set(r.residentId, (per.get(r.residentId) ?? 0) + 1);
    assert.equal(per.size, 7);
    assert.equal(Math.max(...per.values()) - Math.min(...per.values()), 0, "14 malam x 2 petugas / 7 orang = 4 sama rata");
    assert.deepEqual(ap.data.nights.map((n) => n.people.map((p) => p.residentId)), ap.data.nights.map((n) => rows.filter((r) => r.shiftDate.toISOString().slice(0, 10) === n.date).map((r) => r.residentId)), "yang dipratinjau = yang tersimpan");
    // Ulangi pada rentang tumpang: malam yang ada dilewati, yang baru terisi, riwayat memengaruhi keadilan
    const again = await gen(vA, g.id, { from: "2026-11-10", to: "2026-11-20" });
    assert.ok(again.ok && again.data.skippedDates.length === 6 && again.data.created === 10, JSON.stringify(again.ok ? again.data.skippedDates : again));
    assert.equal((await shiftsOf(g.id)).length, 38);
    const past = await gen(vA, g.id, { from: "2026-10-30", to: "2026-11-03" });
    assert.ok(!past.ok && past.status === 400);
    // pengecualian dan ketidaktersediaan
    const g2 = await mkGroup(vA, "Ronda Kecuali", 4);
    const ex = await gen(vA, g2.id, { from: "2026-11-02", to: "2026-11-08", excludeResidentIds: [g2.residents[0]], unavailable: [{ residentId: g2.residents[1], date: "2026-11-03" }] });
    assert.ok(ex.ok);
    const rows2 = await shiftsOf(g2.id);
    assert.ok(!rows2.some((r) => r.residentId === g2.residents[0]), "yang dikecualikan tidak dijadwalkan");
    assert.ok(!rows2.some((r) => r.residentId === g2.residents[1] && r.shiftDate.toISOString().startsWith("2026-11-03")));
    // peserta nonaktif tidak dijadwalkan; tanpa peserta aktif ditolak
    const g3 = await mkGroup(vA, "Ronda Nonaktif", 2);
    const ppl = await prisma.securityRondaPerson.findMany({ where: { groupId: g3.id } });
    for (const p of ppl) assert.ok((await R.patchPerson(prisma, { villageId: vA, groupId: g3.id, id: p.id, input: { active: false }, today: TODAY })).ok);
    const none = await gen(vA, g3.id, { from: "2026-11-02", to: "2026-11-03" });
    assert.ok(!none.ok && none.status === 409);
    // isolasi
    const foreign = await gen(vB, g.id, { from: "2026-11-02", to: "2026-11-03" });
    assert.ok(!foreign.ok && foreign.status === 404, "desa lain tidak dapat membuat jadwal regu ini");
    const sch = await R.getSchedule(prisma, { villageId: vB, groupId: g.id, from: "2026-11-02", to: "2026-11-03" });
    assert.ok(!sch.ok && sch.status === 404);
  });

  it("jadwal: dua pembuatan serentak tidak menggandakan giliran", async () => {
    const g = await mkGroup(vA, "Ronda Serentak", 5);
    const rs = await Promise.all([gen(vA, g.id, { from: "2026-12-01", to: "2026-12-10" }), gen(vA, g.id, { from: "2026-12-01", to: "2026-12-10" })]);
    assert.ok(rs.every((r) => r.ok), JSON.stringify(rs));
    const rows = await shiftsOf(g.id);
    assert.equal(rows.length, 20, "10 malam x 2, tanpa ganda");
    const keys = new Set(rows.map((r) => `${r.shiftDate.toISOString()}|${r.residentId}`));
    assert.equal(keys.size, 20);
    const created = rs.map((r) => (r.ok ? r.data.created : -1)).sort((a, b) => a - b);
    assert.deepEqual(created, [0, 20], "yang kalah mendapati semua malam sudah terisi");
  });

  it("giliran manual dan kehadiran: batas per malam, hanya malam ini atau sebelumnya yang dicatat, riwayat tidak dihapus", async () => {
    const g = await mkGroup(vA, "Ronda Manual", 3, { perShift: 1, startTime: "01:00", endTime: "04:00" });
    const [p1, p2] = g.residents;
    const add = (d: string, rid: number) => R.addShift(prisma, { villageId: vA, groupId: g.id, userId: 1, today: TODAY, input: { shiftDate: d, residentId: rid } });
    const s1 = await add("2026-11-01", p1!);
    assert.ok(s1.ok);
    const full = await add("2026-11-01", p2!);
    assert.ok(!full.ok && full.status === 409 && /sudah terisi/.test(full.errors[0]!));
    assert.ok(!(await add("2026-10-31", p1!)).ok, "malam lalu ditolak");
    const outsider = await mkRes(vA, "Bukan peserta");
    assert.ok(!(await add("2026-11-02", outsider.id)).ok);
    const s2 = await add("2026-11-03", p1!);
    assert.ok(s2.ok);
    const mark = (id: number, attendance: string, villageId = vA) => R.markAttendance(prisma, { villageId, id, userId: 7, today: TODAY, now: NOW, input: { attendance, attendanceNote: "Tepat waktu" } });
    const future = await mark(s2.ok ? s2.data.id : 0, "PRESENT");
    assert.ok(!future.ok && future.status === 409 && /belum tiba/.test(future.errors[0]!));
    assert.ok(!(await mark(s1.ok ? s1.data.id : 0, "PRESENT", vB)).ok, "lintas desa");
    // malam ini baru boleh dicatat setelah jam mulai jaga regu (Asia/Jakarta): NOW = 12.00 WIB
    const late = await mkGroup(vA, "Ronda Malam Hari", 2, { perShift: 1, startTime: "22:00", endTime: "04:00" });
    const lateShift = await R.addShift(prisma, { villageId: vA, groupId: late.id, userId: 1, today: TODAY, input: { shiftDate: TODAY, residentId: late.residents[0] } });
    assert.ok(lateShift.ok);
    const early = await mark(lateShift.ok ? lateShift.data.id : 0, "PRESENT");
    assert.ok(!early.ok && early.status === 409 && /dimulai pukul 22:00/.test(early.errors[0]!), JSON.stringify(early));
    assert.ok((await mark(lateShift.ok ? lateShift.data.id : 0, "PENDING")).ok, "mengosongkan selalu boleh");
    const afterStart = await R.markAttendance(prisma, { villageId: vA, id: lateShift.ok ? lateShift.data.id : 0, userId: 7, today: TODAY, now: new Date("2026-11-01T15:30:00Z"), input: { attendance: "LATE" } });
    assert.ok(afterStart.ok && afterStart.data.previous === "PENDING", "setelah 22.00 WIB boleh, nilai lama dikembalikan untuk audit");
    const first = await mark(s1.ok ? s1.data.id : 0, "PRESENT");
    assert.ok(first.ok && first.data.previous === "PENDING");
    const row = await prisma.securityRondaShift.findFirstOrThrow({ where: { id: s1.ok ? s1.data.id : 0 } });
    assert.equal(row.attendance, "PRESENT");
    assert.equal(row.markedById, 7);
    assert.ok(row.markedAt);
    assert.ok(!(await R.markAttendance(prisma, { villageId: vA, id: row.id, userId: 7, today: TODAY, input: { attendance: "TERLAMBAT" } })).ok);
    const delDone = await R.removeShift(prisma, { villageId: vA, id: row.id, today: TODAY });
    assert.ok(!delDone.ok && delDone.status === 409);
    assert.ok((await mark(row.id, "PENDING")).ok, "dapat dikosongkan");
    assert.equal((await prisma.securityRondaShift.findFirstOrThrow({ where: { id: row.id } })).markedById, null);
    assert.ok(!(await R.removeShift(prisma, { villageId: vB, id: s2.ok ? s2.data.id : 0, today: TODAY })).ok);
    assert.ok((await R.removeShift(prisma, { villageId: vA, id: s2.ok ? s2.data.id : 0, today: TODAY })).ok, "giliran mendatang tanpa kehadiran boleh dihapus");
  });

  // -------------------------------------------------------------------------------------------------------------------
  it("tukar giliran: ganti dan tukar berlaku hanya setelah disetujui; aturan malam ganda; riwayat jejak; isolasi", async () => {
    const g = await mkGroup(vA, "Ronda Tukar", 4, { perShift: 1 });
    const [a, b, c] = g.residents as [number, number, number];
    const add = async (d: string, rid: number) => {
      const r = await R.addShift(prisma, { villageId: vA, groupId: g.id, userId: 1, today: TODAY, input: { shiftDate: d, residentId: rid } });
      assert.ok(r.ok, JSON.stringify(r));
      return r.ok ? r.data.id : 0;
    };
    const sA = await add("2026-11-10", a);
    const sB = await add("2026-11-12", b);
    const sw = (shiftId: number, o: Record<string, unknown>, villageId = vA) => R.createSwap(prisma, { villageId, userId: 1, today: TODAY, input: { shiftId, ...o } });
    const dec = (id: number, decision: string, note: string | null = null, villageId = vA) => R.decideSwap(prisma, { villageId, id, userId: 2, today: TODAY, now: NOW, input: { decision, note } });

    // ganti: c menggantikan a
    const w1 = await sw(sA, { counterpartResidentId: c, counterpartAgreed: true, reason: "Ada hajatan" });
    assert.ok(w1.ok, JSON.stringify(w1));
    assert.equal((await prisma.securityRondaShift.findFirstOrThrow({ where: { id: sA } })).residentId, a, "belum berlaku sebelum diputuskan");
    assert.ok(!(await sw(sA, { counterpartResidentId: c, counterpartAgreed: true })).ok, "satu permintaan menunggu per giliran");
    assert.ok(!(await dec(w1.ok ? w1.data.id : 0, "APPROVE", null, vB)).ok, "desa lain tidak dapat memutuskan");
    assert.ok((await dec(w1.ok ? w1.data.id : 0, "APPROVE")).ok);
    const afterA = await prisma.securityRondaShift.findFirstOrThrow({ where: { id: sA } });
    assert.equal(afterA.residentId, c);
    assert.equal(afterA.replacedResidentId, a);
    assert.equal(afterA.source, "SWAP");
    const again = await dec(w1.ok ? w1.data.id : 0, "APPROVE");
    assert.ok(!again.ok && again.status === 409 && /sudah berstatus/.test(again.errors[0]!));

    // tukar: b dan c saling mengambil giliran
    const w2 = await sw(sA, { counterpartResidentId: b, counterpartShiftId: sB, counterpartAgreed: true });
    assert.ok(w2.ok, JSON.stringify(w2));
    // tanpa persetujuan pihak kedua tidak dapat disetujui
    const w3 = await sw(sB, { counterpartResidentId: c, counterpartAgreed: false });
    assert.ok(w3.ok);
    const noAgree = await dec(w3.ok ? w3.data.id : 0, "APPROVE");
    assert.ok(!noAgree.ok && /belum tercatat setuju/.test(noAgree.errors[0]!));
    assert.ok(!(await dec(w3.ok ? w3.data.id : 0, "REJECT", "x")).ok, "alasan wajib");
    assert.ok((await dec(w3.ok ? w3.data.id : 0, "REJECT", "Pihak kedua tidak setuju")).ok);
    assert.ok((await dec(w2.ok ? w2.data.id : 0, "APPROVE")).ok);
    const rows = await prisma.securityRondaShift.findMany({ where: { id: { in: [sA, sB] } }, orderBy: { id: "asc" } });
    assert.deepEqual(rows.map((r) => r.residentId), [b, c], "a→(c)→b pada 10 Nov; b→c pada 12 Nov");

    // kehadiran sudah dicatat → tidak dapat ditukar; giliran lewat/di luar regu ditolak
    const sPast = await prisma.securityRondaShift.create({ data: { villageId: vA, groupId: g.id, shiftDate: date("2026-11-01"), residentId: a, attendance: "PRESENT" } });
    assert.ok(!(await sw(sPast.id, { counterpartResidentId: b, counterpartAgreed: true })).ok);
    assert.ok(!(await sw(sA, { counterpartResidentId: 999999999, counterpartAgreed: true })).ok, "pihak kedua bukan peserta");
    assert.ok(!(await sw(sA, { counterpartResidentId: c, counterpartAgreed: true }, vB)).ok, "desa lain tidak melihat giliran ini");
    const listed = await R.listSwaps(prisma, { villageId: vA, groupId: g.id });
    assert.ok(listed.length >= 3 && listed.some((s) => s.status === "REJECTED" && s.decisionNote));
    assert.equal((await R.listSwaps(prisma, { villageId: vB, groupId: g.id })).length, 0);
  });

  it("tukar giliran: persetujuan ganda serentak atas satu permintaan; dua permintaan yang menumpuk orang di malam sama", async () => {
    const g = await mkGroup(vA, "Ronda Balapan", 4, { perShift: 2 });
    const [a, b, c] = g.residents as [number, number, number];
    const add = async (d: string, rid: number) => {
      const r = await R.addShift(prisma, { villageId: vA, groupId: g.id, userId: 1, today: TODAY, input: { shiftDate: d, residentId: rid } });
      assert.ok(r.ok);
      return r.ok ? r.data.id : 0;
    };
    const sA = await add("2026-11-20", a);
    const sB = await add("2026-11-20", b);
    const mk = async (shiftId: number, cp: number) => {
      const r = await R.createSwap(prisma, { villageId: vA, userId: 1, today: TODAY, input: { shiftId, counterpartResidentId: cp, counterpartAgreed: true } });
      assert.ok(r.ok, JSON.stringify(r));
      return r.ok ? r.data.id : 0;
    };
    const dec = (id: number) => R.decideSwap(prisma, { villageId: vA, id, userId: 2, today: TODAY, input: { decision: "APPROVE" } });
    // (1) satu permintaan, dua persetujuan serentak
    const w1 = await mk(sA, c);
    const r1 = await Promise.all([dec(w1), dec(w1)]);
    assert.equal(r1.filter((r) => r.ok).length, 1, JSON.stringify(r1));
    assert.equal(r1.filter((r) => !r.ok && r.status === 409).length, 1);
    // (2) c kini bertugas 20 Nov (menggantikan a). b minta digantikan d (bukan c) dan a-baru... gunakan dua permintaan untuk orang yang sama
    const d = g.residents[3]!;
    const sC = await add("2026-11-21", a);
    const sD = await add("2026-11-21", b);
    const wx = await mk(sC, d);
    const wy = await mk(sD, d);
    const r2 = await Promise.all([dec(wx), dec(wy)]);
    assert.equal(r2.filter((r) => r.ok).length, 1, "d tidak boleh bertugas dua kali pada 21 Nov: " + JSON.stringify(r2));
    const night = await prisma.securityRondaShift.findMany({ where: { groupId: g.id, shiftDate: date("2026-11-21") } });
    assert.equal(new Set(night.map((r) => r.residentId)).size, 2);
    assert.ok(night.some((r) => r.residentId === d));
    void sB;
  });

  it("tukar giliran basi: persetujuan ditolak bila giliran sudah dipegang orang lain sejak diajukan", async () => {
    const g = await mkGroup(vA, "Ronda Basi", 4, { perShift: 1 });
    const [a, b, c, d] = g.residents as [number, number, number, number];
    const add = async (dt: string, rid: number) => {
      const r = await R.addShift(prisma, { villageId: vA, groupId: g.id, userId: 1, today: TODAY, input: { shiftDate: dt, residentId: rid } });
      assert.ok(r.ok);
      return r.ok ? r.data.id : 0;
    };
    const sA = await add("2026-11-25", a);
    const sB = await add("2026-11-27", b);
    const dec = (id: number) => R.decideSwap(prisma, { villageId: vA, id, userId: 2, today: TODAY, input: { decision: "APPROVE" } });
    // (1) giliran pemohon pindah tangan setelah permintaan diajukan
    const w1 = await R.createSwap(prisma, { villageId: vA, userId: 1, today: TODAY, input: { shiftId: sA, counterpartResidentId: c, counterpartAgreed: true } });
    assert.ok(w1.ok);
    await prisma.securityRondaShift.update({ where: { id: sA }, data: { residentId: d } });
    const stale1 = await dec(w1.ok ? w1.data.id : 0);
    assert.ok(!stale1.ok && stale1.status === 409 && /sudah dipegang orang lain/.test(stale1.errors[0]!), JSON.stringify(stale1));
    assert.equal((await prisma.securityRondaShift.findFirstOrThrow({ where: { id: sA } })).residentId, d, "tidak ada perpindahan");
    assert.ok((await R.decideSwap(prisma, { villageId: vA, id: w1.ok ? w1.data.id : 0, userId: 2, today: TODAY, input: { decision: "REJECT", note: "Permintaan basi" } })).ok, "dapat ditolak");
    // (2) giliran pihak kedua pindah tangan
    const w2 = await R.createSwap(prisma, { villageId: vA, userId: 1, today: TODAY, input: { shiftId: sA, counterpartResidentId: b, counterpartShiftId: sB, counterpartAgreed: true } });
    assert.ok(w2.ok, JSON.stringify(w2));
    await prisma.securityRondaShift.update({ where: { id: sB }, data: { residentId: c } });
    const stale2 = await dec(w2.ok ? w2.data.id : 0);
    assert.ok(!stale2.ok && stale2.status === 409 && /sudah dipegang orang lain/.test(stale2.errors[0]!), JSON.stringify(stale2));
  });

  it("rentang jadwal ekstrem ditolak cepat tanpa membangun jutaan tanggal", async () => {
    const g = await mkGroup(vA, "Ronda Rentang", 2);
    const t0 = Date.now();
    for (const [from, to] of [["0000-01-01", "9999-12-31"], ["2026-01-01", "2030-01-01"], ["2026-11-10", "2026-11-01"], ["2026-11-01", "2027-01-02"]]) {
      const r = await R.getSchedule(prisma, { villageId: vA, groupId: g.id, from, to });
      assert.ok(!r.ok && r.status === 400, `${from}..${to}`);
    }
    assert.ok((await R.getSchedule(prisma, { villageId: vA, groupId: g.id, from: "2026-11-01", to: "2027-01-01" })).ok, "62 malam sah");
    assert.ok(Date.now() - t0 < 3000, "cepat");
  });

  it("Kepala Desa (approve tanpa update) dapat menutup tetapi tidak memulai penanganan; staf (update tanpa approve) sebaliknya", async () => {
    const KADES = { update: false, approve: true };
    const id = await ev(vA, { severity: "LOW" });
    const t = (to: string, can: { update: boolean; approve: boolean }, note: string | null = null) => K.transitionSecurity(prisma, { villageId: vA, id, userId: 1, input: { to, note }, can, now: NOW });
    const d1 = await t("RESPONDING", KADES);
    assert.ok(!d1.ok && d1.status === 403, "Kepala Desa tidak punya update");
    assert.ok((await t("RESPONDING", CAN_UPD)).ok);
    assert.ok((await K.addSecurityResponse(prisma, { villageId: vA, id, userId: 1, now: NOW, input: { loggedAt: "2026-11-01T02:00:00Z", kind: "PATROLI", description: "Patroli lokasi kejadian" } })).ok);
    assert.ok((await t("RESOLVED", CAN_UPD, "Sudah beres, warga damai")).ok);
    const staff = await t("CLOSED", CAN_UPD);
    assert.ok(!staff.ok && staff.status === 403, "staf tidak dapat menutup");
    assert.ok((await t("CLOSED", KADES)).ok, "Kepala Desa dapat menutup");
    const reopen = await t("RESPONDING", CAN_UPD, "Ada susulan keributan");
    assert.ok(!reopen.ok && reopen.status === 403, "staf tidak dapat membuka kembali");
    assert.ok((await t("RESPONDING", KADES, "Ada susulan keributan")).ok, "Kepala Desa dapat membuka kembali");
  });

  it("catatan ronda: eskalasi ke kejadian hanya sekali (serentak), temuan saja, tidak dapat dihapus setelah dieskalasi", async () => {
    const g = await mkGroup(vA, "Ronda Catatan", 2, { postName: "Pos RW 02" });
    const log = (o: Record<string, unknown> = {}) => R.createRondaLog(prisma, { villageId: vA, groupId: g.id, userId: 1, today: TODAY, input: { shiftDate: "2026-10-31", loggedAt: "2026-10-31T20:30:00Z", kind: "TEMUAN", description: "Ada orang asing mengintai rumah kosong di RT 01", reporter: "Pak Ronda", ...o } });
    const nihil = await log({ kind: "NIHIL", description: "Situasi aman terkendali sepanjang malam" });
    const temuan = await log();
    assert.ok(nihil.ok && temuan.ok);
    assert.ok(!(await R.createRondaLog(prisma, { villageId: vB, groupId: g.id, userId: 1, today: TODAY, input: { shiftDate: "2026-10-31", loggedAt: "2026-10-31T20:30:00Z", kind: "NIHIL", description: "Lintas desa" } })).ok);
    assert.ok(!(await log({ shiftDate: "2026-11-05" })).ok, "masa depan");
    const esc = (id: number, villageId = vA) => K.escalateRondaLog(prisma, { villageId, logId: id, userId: 1, now: NOW, input: { kind: "ORANG_MENCURIGAKAN", title: "Orang asing mengintai rumah kosong", severity: "LOW" } });
    const nr = await esc(nihil.ok ? nihil.data.id : 0);
    assert.ok(!nr.ok && nr.status === 400);
    assert.ok(!(await esc(temuan.ok ? temuan.data.id : 0, vB)).ok);
    const rs = await Promise.all([esc(temuan.ok ? temuan.data.id : 0), esc(temuan.ok ? temuan.data.id : 0)]);
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs));
    const events = await prisma.incidentEvent.findMany({ where: { villageId: vA, domain: "KEAMANAN", title: "Orang asing mengintai rumah kosong" } });
    assert.equal(events.length, 1, "yang kalah membuang kejadian yang dibuatnya");
    assert.equal(events[0]!.rw, "02");
    assert.equal(events[0]!.locationText, "Pos Pos RW 02");
    const row = await prisma.securityRondaLog.findFirstOrThrow({ where: { id: temuan.ok ? temuan.data.id : 0 } });
    assert.equal(row.eventId, events[0]!.id);
    const del = await R.removeRondaLog(prisma, { villageId: vA, id: row.id });
    assert.ok(!del.ok && del.status === 409);
    assert.ok((await R.removeRondaLog(prisma, { villageId: vA, id: nihil.ok ? nihil.data.id : 0 })).ok);
    const list = await R.listRondaLogs(prisma, { villageId: vA, groupId: g.id, page: 1 });
    assert.equal(list.total, 1);
    assert.equal((await R.listRondaLogs(prisma, { villageId: vB, groupId: g.id, page: 1 })).total, 0);
    // penjaga teks: catatan ronda tentang kekerasan seksual ditolak oleh skema
    assert.ok(!(await log({ description: "Terdengar korban kekerasan seksual di gang" })).ok);
  });

  // -------------------------------------------------------------------------------------------------------------------
  it("kejadian keamanan: domain terkunci, penjaga kekerasan perempuan/anak, isolasi desa dan domain", async () => {
    const bad = await K.createSecurityEvent(prisma, { villageId: vA, userId: 1, now: NOW, input: { kind: "LAINNYA", title: "Laporan KDRT di RT 03", occurredAt: "2026-11-01T01:00:00Z" } });
    assert.ok(!bad.ok && bad.status === 422 && /UPTD PPA/.test(bad.errors[0]!));
    const bad2 = await K.createSecurityEvent(prisma, { villageId: vA, userId: 1, now: NOW, input: { kind: "LAINNYA", title: "Keributan", description: "Dugaan pencabulan terhadap anak tetangga", occurredAt: "2026-11-01T01:00:00Z" } });
    assert.ok(!bad2.ok && bad2.status === 422);
    assert.equal(await prisma.incidentEvent.count({ where: { villageId: vA, title: { contains: "KDRT" } } }), 0, "tidak ada yang tersimpan");
    const id = await ev(vA);
    const patchBad = await K.patchSecurityEvent(prisma, { villageId: vA, id, input: { description: "korban kekerasan seksual" } });
    assert.ok(!patchBad.ok && patchBad.status === 422);
    const respBad = await K.addSecurityResponse(prisma, { villageId: vA, id, userId: 1, input: { loggedAt: "2026-11-01T02:00:00Z", kind: "PATROLI", description: "Mendampingi korban KDRT" } });
    assert.ok(!respBad.ok && respBad.status === 422);
    // kejadian BENCANA tidak dapat dibaca/ diubah lewat servis keamanan, dan sebaliknya
    const bencana = await inc.createEvent(prisma, { domain: "BENCANA", villageId: vA, userId: 1, now: NOW, input: { kind: "BANJIR", title: "Banjir", occurredAt: "2026-11-01T01:00:00Z" } });
    assert.ok(bencana.ok);
    const bid = bencana.ok ? bencana.data.id : 0;
    assert.ok(!(await K.getSecurityEvent(prisma, { villageId: vA, id: bid, detail: true, showReports: true, today: TODAY })).ok);
    assert.ok(!(await K.createMediation(prisma, { villageId: vA, eventId: bid, userId: 1, input: { scheduledAt: "2026-11-05T02:00:00Z", place: "Balai", mediator: "Kaur" } })).ok);
    assert.ok(!(await K.createFollowup(prisma, { villageId: vA, eventId: bid, userId: 1, input: { description: "Tindak lanjut banjir" } })).ok);
    assert.ok(!(await K.patchSecurityEvent(prisma, { villageId: vA, id: bid, input: { title: "Ubah" } })).ok);
    assert.ok(!(await K.removeSecurityEvent(prisma, { villageId: vA, id: bid })).ok);
    assert.ok(!(await K.transitionSecurity(prisma, { villageId: vA, id: bid, userId: 1, input: { to: "RESPONDING" }, can: CAN_ALL })).ok);
    assert.equal((await inc.getEvent(prisma, { domain: "BENCANA", villageId: vA, id: bid, detail: true })).ok, true, "kejadian bencana tak tersentuh");
    // lintas desa
    assert.ok(!(await K.getSecurityEvent(prisma, { villageId: vB, id, detail: true, showReports: true, today: TODAY })).ok);
    assert.ok(!(await K.createMediation(prisma, { villageId: vB, eventId: id, userId: 1, input: { scheduledAt: "2026-11-05T02:00:00Z", place: "Balai", mediator: "Kaur" } })).ok);
    const lst = await K.listSecurityEvents(prisma, { villageId: vA, query: K.eventListQuery(new URLSearchParams()) });
    assert.ok(lst.ok && lst.data.rows.every((r) => r.domain === "KEAMANAN") && !lst.data.rows.some((r) => r.id === bid));
  });

  it("mediasi: pihak tersamar tanpa izin rinci, anak ditandai, gerbang hasil, final setelah selesai, tanpa NIK", async () => {
    const id = await ev(vA, { title: "Sengketa batas pekarangan", kind: "KONFLIK_WARGA" });
    const mid = await med(vA, id);
    const pa = await mkRes(vA, "Sutarno Hadi");
    const pb = await mkRes(vA, "Kusno Widodo");
    const kid = await mkRes(vA, "Anak Kecil", { birthDate: new Date("2014-03-03") });
    const foreign = await mkRes(vB, "Warga Desa B");
    const r1 = await party(vA, mid, { side: "PIHAK_A", residentId: pa.id, agrees: true, note: "CATATAN-PIHAK-RAHASIA" });
    const r2 = await party(vA, mid, { side: "PIHAK_B", residentId: pb.id, agrees: true });
    assert.ok(r1.ok && r2.ok);
    assert.ok(!(await party(vA, mid, { side: "PIHAK_B", residentId: pb.id })).ok, "warga ganda pada satu mediasi");
    const f = await party(vA, mid, { side: "SAKSI", residentId: foreign.id });
    assert.ok(!f.ok && f.status === 404, "warga desa lain ditolak");
    assert.ok(!(await K.addParty(prisma, { villageId: vB, mediationId: mid, today: TODAY, input: { side: "SAKSI", name: "X" } })).ok, "lintas desa");
    const k = await party(vA, mid, { side: "SAKSI", residentId: kid.id });
    assert.ok(k.ok && k.data.isMinor === true, "anak ditandai dari tanggal lahir warga");
    const typed = await party(vA, mid, { side: "SAKSI", name: "Tetangga Sebelah", isMinor: false });
    assert.ok(typed.ok);

    const masked = await K.getSecurityEvent(prisma, { villageId: vA, id, detail: false, showReports: false, today: TODAY });
    assert.ok(masked.ok);
    const ps = masked.ok ? masked.data.mediations[0]!.parties : [];
    assert.equal(ps.find((p) => p.side === "PIHAK_A")!.name, "S****** H***");
    assert.ok(ps.every((p) => p.masked));
    const json = JSON.stringify(masked);
    for (const secret of ["Sutarno", "Kusno", "Anak Kecil", "Tetangga Sebelah", pa.nik, pa.kk!, "081234567890"]) assert.equal(json.includes(secret), false, `bocor: ${secret}`);
    assert.equal(json.includes("CATATAN-PIHAK-RAHASIA"), false, "catatan pihak tersembunyi tanpa izin rinci");
    const open = await K.getSecurityEvent(prisma, { villageId: vA, id, detail: true, showReports: false, today: TODAY });
    assert.ok(open.ok && open.data.mediations[0]!.parties.some((p) => p.name === "Sutarno Hadi"));
    assert.ok(open.ok && open.data.mediations[0]!.parties.some((p) => p.note === "CATATAN-PIHAK-RAHASIA"), "izin rinci melihat catatan pihak");
    const minorView = open.ok ? open.data.mediations[0]!.parties.find((p) => p.isMinor)! : null;
    assert.ok(minorView && minorView.masked && minorView.name === "A*** K****", "nama pihak anak tersamar untuk SEMUA peran, juga izin rinci");
    assert.equal(JSON.stringify(open).includes("Anak Kecil"), false);
    assert.ok(!JSON.stringify(open).includes(pa.nik), "bahkan dengan izin rinci tidak ada NIK");

    const done = (o: Record<string, unknown>) => K.completeMediation(prisma, { villageId: vA, id: mid, input: o });
    const g1 = await done({ outcome: "SEPAKAT", agreement: "Kedua pihak sepakat memasang patok batas bersama." });
    assert.ok(!g1.ok && /pendamping/.test(g1.errors[0]!), "anak hadir butuh pendamping");
    const guard = await party(vA, mid, { side: "PENDAMPING", name: "Ibu dari anak" });
    assert.ok(guard.ok);
    const g2 = await done({ outcome: "SEPAKAT", agreement: "singkat" });
    assert.ok(!g2.ok, "kesepakatan minimal 10 karakter");
    // pihak kedua belum menyetujui
    const p2 = await prisma.securityMediationParty.findFirstOrThrow({ where: { mediationId: mid, side: "PIHAK_B" } });
    assert.ok((await K.patchParty(prisma, { villageId: vA, mediationId: mid, id: p2.id, input: { agrees: false } })).ok);
    const g3 = await done({ outcome: "SEPAKAT", agreement: "Kedua pihak sepakat memasang patok batas bersama." });
    assert.ok(!g3.ok && /menyetujui/.test(g3.errors[0]!));
    assert.ok((await K.patchParty(prisma, { villageId: vA, mediationId: mid, id: p2.id, input: { agrees: true } })).ok);
    assert.ok(!(await K.completeMediation(prisma, { villageId: vB, id: mid, input: { outcome: "DITUNDA" } })).ok, "lintas desa");
    const ok = await done({ outcome: "SEPAKAT", agreement: "Kedua pihak sepakat memasang patok batas bersama." });
    assert.ok(ok.ok, JSON.stringify(ok));
    // final
    for (const r of [await K.patchMediation(prisma, { villageId: vA, id: mid, input: { place: "Rumah" } }), await party(vA, mid, { side: "SAKSI", name: "Terlambat" }), await K.removeMediation(prisma, { villageId: vA, id: mid }), await K.cancelMediation(prisma, { villageId: vA, id: mid, input: { note: "Batalkan saja" } }), await done({ outcome: "DITUNDA" })]) {
      assert.ok(!r.ok && r.status === 409);
    }
    assert.ok(!(await K.removeParty(prisma, { villageId: vA, mediationId: mid, id: p2.id })).ok);
    const row = await prisma.securityMediation.findFirstOrThrow({ where: { id: mid } });
    assert.equal(row.status, "COMPLETED");
    assert.equal(row.outcome, "SEPAKAT");
    // isi kesepakatan hanya untuk izin rinci
    const plain = await K.getSecurityEvent(prisma, { villageId: vA, id, detail: false, showReports: false, today: TODAY });
    assert.ok(plain.ok && plain.data.mediations[0]!.agreement === null && plain.data.mediations[0]!.agreementHidden === true);
    assert.equal(JSON.stringify(plain).includes("patok batas"), false);
    const full = await K.getSecurityEvent(prisma, { villageId: vA, id, detail: true, showReports: false, today: TODAY });
    assert.ok(full.ok && /patok batas/.test(full.data.mediations[0]!.agreement ?? ""));
  });

  it("mediasi: selesai dan batal serentak, hanya satu menang; kejadian ditutup menolak mediasi baru", async () => {
    const id = await ev(vA);
    const mid = await med(vA, id);
    const a = await mkRes(vA, "Pihak Satu");
    const b = await mkRes(vA, "Pihak Dua");
    assert.ok((await party(vA, mid, { side: "PIHAK_A", residentId: a.id })).ok && (await party(vA, mid, { side: "PIHAK_B", residentId: b.id })).ok);
    const rs = await Promise.all([K.completeMediation(prisma, { villageId: vA, id: mid, input: { outcome: "TIDAK_SEPAKAT" } }), K.cancelMediation(prisma, { villageId: vA, id: mid, input: { note: "Dibatalkan pihak pertama" } })]);
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs));
    const row = await prisma.securityMediation.findFirstOrThrow({ where: { id: mid } });
    assert.ok((row.status === "COMPLETED" && row.outcome === "TIDAK_SEPAKAT") || (row.status === "CANCELLED" && row.outcome === null), JSON.stringify(row));
    // batalkan kejadian lalu mediasi baru ditolak
    const id2 = await ev(vA);
    assert.ok((await K.transitionSecurity(prisma, { villageId: vA, id: id2, userId: 1, input: { to: "CANCELLED", note: "Salah catat" }, can: CAN_UPD })).ok);
    const late = await K.createMediation(prisma, { villageId: vA, eventId: id2, userId: 1, input: { scheduledAt: "2026-11-05T02:00:00Z", place: "Balai", mediator: "Kaur" } });
    assert.ok(!late.ok && late.status === 409 && /ditutup atau dibatalkan/.test(late.errors[0]!));
  });

  it("tindak lanjut dan penutupan kejadian: gerbang alasan, izin approve, riwayat tidak terhapus", async () => {
    const id = await ev(vA, { severity: "LOW" });
    const fu = await K.createFollowup(prisma, { villageId: vA, eventId: id, userId: 1, input: { description: "Pasang lampu jalan di tikungan", dueOn: "2026-10-20", assignee: "Kaur Umum" } });
    assert.ok(fu.ok);
    const fid = fu.ok ? fu.data.id : 0;
    assert.ok(!(await K.createFollowup(prisma, { villageId: vA, eventId: id, userId: 1, input: { description: "Dengan mediasi asing", mediationId: 999999 } })).ok);
    assert.ok(!(await K.completeFollowup(prisma, { villageId: vB, id: fid, input: {} })).ok, "lintas desa");
    const view = await K.getSecurityEvent(prisma, { villageId: vA, id, detail: false, showReports: false, today: TODAY });
    assert.ok(view.ok && view.data.followups[0]!.overdue === true);
    assert.equal((await S.getOverview(prisma, { villageId: vA, today: TODAY })).counts.overdueFollowups >= 1, true);
    // lengkapi siklus status sampai selesai ditangani
    const t = (to: string, note: string | null = null, can = CAN_ALL) => K.transitionSecurity(prisma, { villageId: vA, id, userId: 1, input: { to, note }, can, now: NOW });
    assert.ok((await t("RESPONDING")).ok);
    assert.ok((await K.addSecurityResponse(prisma, { villageId: vA, id, userId: 1, now: NOW, input: { loggedAt: "2026-11-01T02:00:00Z", kind: "TINDAK_LANJUT", description: "Koordinasi pemasangan lampu" } })).ok);
    assert.ok((await t("RESOLVED", "Warga sepakat, lampu dipasang")).ok);
    const denied = await t("CLOSED", "Sudah beres semua", CAN_UPD);
    assert.ok(!denied.ok && denied.status === 403, "staf tidak menutup");
    const gate = await t("CLOSED");
    assert.ok(!gate.ok && gate.status === 409 && /1 tindak lanjut belum selesai/.test(gate.errors[0]!));
    const reason = await t("CLOSED", "Ditutup, tindak lanjut dipantau lewat program lain");
    assert.ok(reason.ok, "alasan membuka gerbang");
    // kejadian ditutup: tindak lanjut tidak dapat diselesaikan/dihapus/ditambah
    for (const r of [await K.completeFollowup(prisma, { villageId: vA, id: fid, input: {} }), await K.removeFollowup(prisma, { villageId: vA, id: fid }), await K.createFollowup(prisma, { villageId: vA, eventId: id, userId: 1, input: { description: "Tambahan" } })]) assert.ok(!r.ok && r.status === 409);
    assert.ok((await t("RESPONDING", "Ada keluhan lagi")).ok);
    assert.ok((await K.completeFollowup(prisma, { villageId: vA, id: fid, input: { doneNote: "Lampu terpasang" }, now: NOW })).ok);
    assert.ok(!(await K.completeFollowup(prisma, { villageId: vA, id: fid, input: {} })).ok, "sudah selesai");
    assert.ok(!(await K.removeFollowup(prisma, { villageId: vA, id: fid })).ok, "yang selesai disimpan sebagai riwayat");
    assert.ok((await t("RESOLVED", "Selesai kembali")).ok);
    assert.ok((await t("CLOSED")).ok, "tidak ada tindak lanjut terbuka");
  });

  it("hapus kejadian: ditolak bila ada mediasi/tindak lanjut; tautan pengaduan dibersihkan; catatan ronda dilepas", async () => {
    const id = await ev(vA);
    const mid = await med(vA, id);
    const del = await K.removeSecurityEvent(prisma, { villageId: vA, id });
    assert.ok(!del.ok && del.status === 409 && /berita acara mediasi/.test(del.errors[0]!));
    assert.ok((await K.removeMediation(prisma, { villageId: vA, id: mid })).ok);
    const rep = await prisma.citizenReport.create({ data: { villageId: vA, reportType: "WARGA", title: "Pencurian ayam di RT 01", content: "isi laporan rahasia", reporterName: "Pelapor Rahasia", reporterNik: "3374012345678901", category: "keamanan" } });
    const link = await K.addReportLink(prisma, { villageId: vA, eventId: id, userId: 1, input: { citizenReportId: rep.id.toString() } });
    assert.ok(link.ok, JSON.stringify(link));
    const g = await mkGroup(vA, "Ronda Hapus", 1);
    const lg = await R.createRondaLog(prisma, { villageId: vA, groupId: g.id, userId: 1, today: TODAY, input: { shiftDate: "2026-10-31", loggedAt: "2026-10-31T20:30:00Z", kind: "TEMUAN", description: "Pagar rumah rusak dirusak orang" } });
    assert.ok(lg.ok);
    await prisma.securityRondaLog.update({ where: { id: lg.ok ? lg.data.id : 0 }, data: { eventId: id } });
    assert.ok((await K.removeSecurityEvent(prisma, { villageId: vA, id })).ok);
    assert.equal(await prisma.securityReportLink.count({ where: { eventId: id } }), 0);
    assert.equal((await prisma.securityRondaLog.findFirstOrThrow({ where: { id: lg.ok ? lg.data.id : 0 } })).eventId, null);
    assert.equal(await prisma.incidentEvent.count({ where: { id } }), 0);
  });

  it("tautan pengaduan: baca-saja, sedesa, tanpa pelapor/isi, judul disembunyikan tanpa izin baca Pengaduan", async () => {
    const id = await ev(vA);
    const rep = await prisma.citizenReport.create({ data: { villageId: vA, reportType: "WARGA", title: "Lampu jalan mati di RW 02", content: "ISI-RAHASIA-123", reporterName: "NAMA-PELAPOR-XYZ", reporterNik: "3374019999999999", category: "keamanan" } });
    const foreign = await prisma.citizenReport.create({ data: { villageId: vB, reportType: "WARGA", title: "Lampu jalan mati di RW 02", content: "x", reporterName: "y" } });
    const hits = await K.searchReports(prisma, { villageId: vA, q: "lampu jalan" });
    assert.ok(hits.some((h) => h.id === rep.id.toString()) && !hits.some((h) => h.id === foreign.id.toString()), "hanya Pengaduan desa sendiri");
    assert.ok(!JSON.stringify(hits).includes("RAHASIA") && !JSON.stringify(hits).includes("PELAPOR"));
    assert.deepEqual(await K.searchReports(prisma, { villageId: vA, q: "la" }), []);
    assert.deepEqual((await K.searchReports(prisma, { villageId: vA, q: "100%_%" })).length, 0, "karakter pola dilucuti");
    const x = await K.addReportLink(prisma, { villageId: vA, eventId: id, userId: 1, input: { citizenReportId: foreign.id.toString() } });
    assert.ok(!x.ok && x.status === 404, "pengaduan desa lain ditolak");
    assert.ok((await K.addReportLink(prisma, { villageId: vA, eventId: id, userId: 1, input: { citizenReportId: rep.id.toString() } })).ok);
    const dup = await K.addReportLink(prisma, { villageId: vA, eventId: id, userId: 1, input: { citizenReportId: rep.id.toString() } });
    assert.ok(!dup.ok && dup.status === 409);
    const shown = await K.getSecurityEvent(prisma, { villageId: vA, id, detail: false, showReports: true, today: TODAY });
    assert.ok(shown.ok && shown.data.reports[0]!.title === "Lampu jalan mati di RW 02");
    assert.ok(!JSON.stringify(shown).includes("RAHASIA") && !JSON.stringify(shown).includes("XYZ") && !JSON.stringify(shown).includes("3374019999999999"));
    const hidden = await K.getSecurityEvent(prisma, { villageId: vA, id, detail: false, showReports: false, today: TODAY });
    assert.ok(hidden.ok && hidden.data.reports[0]!.title === null && hidden.data.reports.length === 1);
    const lid = shown.ok ? shown.data.reports[0]!.id : 0;
    assert.ok(!(await K.removeReportLink(prisma, { villageId: vB, eventId: id, id: lid })).ok);
    assert.ok((await K.removeReportLink(prisma, { villageId: vA, eventId: id, id: lid })).ok);
  });

  // -------------------------------------------------------------------------------------------------------------------
  it("kerawanan dan kontak: CRUD terisolasi, petunjuk dari kejadian hanya hitungan", async () => {
    await ev(vA, { rw: "05", rt: "01", title: "Keributan RW 05" });
    await ev(vA, { rw: "05", rt: "01", title: "Pencurian RW 05", kind: "PENCURIAN" });
    const r = await S.createRisk(prisma, { villageId: vA, userId: 1, input: { name: "Tikungan Kali Gede", kind: "LAKA_LANTAS", level: "HIGH", rw: "05", lat: -7.6, lng: 110.9 } });
    assert.ok(r.ok);
    assert.ok(!(await S.createRisk(prisma, { villageId: vA, userId: 1, input: { name: "Tanpa pasangan", kind: "PENCURIAN", lat: -7.6 } })).ok);
    const list = await S.listRisks(prisma, { villageId: vA, now: NOW });
    assert.equal(list.rows.length, 1);
    assert.ok(list.hints.some((h) => h.rw === "05" && h.events >= 2));
    assert.ok(!JSON.stringify(list.hints).includes("Keributan"), "hanya hitungan");
    assert.equal((await S.listRisks(prisma, { villageId: vB })).rows.length, 0);
    const id = r.ok ? r.data.id : 0;
    assert.ok(!(await S.patchRisk(prisma, { villageId: vB, id, input: { level: "LOW" } })).ok);
    assert.ok((await S.patchRisk(prisma, { villageId: vA, id, input: { level: "LOW", active: false } })).ok);
    assert.ok(!(await S.removeRisk(prisma, { villageId: vB, id })).ok);
    assert.ok((await S.removeRisk(prisma, { villageId: vA, id })).ok);

    const c = await S.createContact(prisma, { villageId: vA, userId: 1, input: { kind: "UPTD_PPA", name: "UPTD PPA Kabupaten", phone: "(0271) 123-456" } });
    assert.ok(c.ok);
    assert.equal((await S.listContacts(prisma, { villageId: vB })).length, 0);
    assert.equal((await S.listContacts(prisma, { villageId: vA })).length, 1);
    const cid = c.ok ? c.data.id : 0;
    assert.ok(!(await S.patchContact(prisma, { villageId: vB, id: cid, input: { phone: "000" } })).ok);
    assert.ok(!(await S.removeContact(prisma, { villageId: vB, id: cid })).ok);
    assert.ok((await S.removeContact(prisma, { villageId: vA, id: cid })).ok);
  });

  it("ringkasan: hitungan hanya milik desa sendiri; malam ini; temuan regu", async () => {
    const g = await mkGroup(vB, "Ronda Ringkas", 1, { perShift: 2 });
    const [p] = g.residents;
    await prisma.securityRondaShift.create({ data: { villageId: vB, groupId: g.id, shiftDate: date(TODAY), residentId: p!, attendance: "PRESENT" } });
    const o = await S.getOverview(prisma, { villageId: vB, today: TODAY, now: NOW });
    assert.ok(o.counts.activeGroups >= 1);
    assert.equal(o.tonight.assigned, 1);
    assert.equal(o.tonight.present, 1);
    assert.ok(o.findings.some((f) => f.code === "TOO_FEW_PEOPLE" && f.message.includes("Ronda Ringkas")));
    const a = await S.getOverview(prisma, { villageId: vA, today: TODAY, now: NOW });
    assert.ok(!a.findings.some((f) => f.message.includes("Ronda Ringkas")), "temuan desa lain tidak bocor");
    assert.ok(a.incidents.yearToDate >= 1);
    assert.equal(o.incidents.recent.every((e) => e.domain === "KEAMANAN"), true);
  });

  it("pagar CHECK di basis data: status berakhir, hasil mediasi, petugas per malam, koordinat", async () => {
    const res = await mkRes(vA, "Uji Check");
    const bad = (p: Promise<unknown>) => assert.rejects(p);
    await bad(prisma.securityMember.create({ data: { villageId: vA, residentId: res.id, status: "ENDED" } }));
    await bad(prisma.securityMember.create({ data: { villageId: vA, residentId: res.id, role: "KOMANDAN" } }));
    await bad(prisma.securityRondaGroup.create({ data: { villageId: vA, name: "Cek 0", perShift: 0 } }));
    await bad(prisma.securityRondaGroup.create({ data: { villageId: vA, name: "Cek jam", startTime: "25:99" } }));
    const evId = await ev(vA);
    await bad(prisma.securityMediation.create({ data: { villageId: vA, eventId: evId, scheduledAt: NOW, place: "x", mediator: "y", status: "COMPLETED" } }));
    await bad(prisma.securityMediation.create({ data: { villageId: vA, eventId: evId, scheduledAt: NOW, place: "x", mediator: "y", status: "SCHEDULED", outcome: "SEPAKAT" } }));
    await bad(prisma.securityFollowup.create({ data: { villageId: vA, eventId: evId, description: "x", status: "DONE" } }));
    await bad(prisma.securityRiskArea.create({ data: { villageId: vA, name: "x", kind: "PENCURIAN", lat: 1 } }));
    await bad(prisma.securityReportLink.create({ data: { villageId: vA, eventId: evId, citizenReportId: 0n } }));
    await bad(prisma.securityRondaShift.create({ data: { villageId: vA, groupId: (await mkGroup(vA, "Cek shift", 0)).id, shiftDate: date(TODAY), residentId: res.id, attendance: "HADIR" } }));
  });
});
