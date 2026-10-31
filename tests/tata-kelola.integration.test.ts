/** Tes integrasi produk hukum, register surat, dan lembaga desa terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Tata kelola (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let legal: typeof import("../lib/tata-kelola/legal");
  let reg: typeof import("../lib/tata-kelola/register");
  let inst: typeof import("../lib/tata-kelola/institutions");
  let vA = 0;
  let vB = 0;
  let residentA = 0;
  let residentB = 0;
  const NOW = new Date("2026-11-01T03:00:00Z");

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    legal = await import("../lib/tata-kelola/legal");
    reg = await import("../lib/tata-kelola/register");
    inst = await import("../lib/tata-kelola/institutions");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("TA")).id;
    vB = (await mkV("TB")).id;
    const mkR = (villageId: number, nik: string, name: string) =>
      prisma.resident.create({ data: { villageId, nik, name, birthplace: "x", birthDate: new Date("1980-01-01"), gender: "Laki-laki", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga" } });
    residentA = (await mkR(vA, `3300000000${t}1`.slice(0, 16), "Warga Desa A")).id;
    residentB = (await mkR(vB, `3300000000${t}2`.slice(0, 16), "Warga Desa B")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  describe("produk hukum", () => {
    const base = { type: "PERDES", number: "1", title: "APBDesa", enactedAt: "2026-01-10" };
    it("mencatat, menolak nomor ganda per jenis+tahun, tetapi nomor sama di desa lain boleh", async () => {
      const a = await legal.createLegal(prisma, { villageId: vA, userId: 1, input: base, now: NOW });
      assert.ok(a.ok);
      const dup = await legal.createLegal(prisma, { villageId: vA, userId: 1, input: base, now: NOW });
      assert.ok(!dup.ok && dup.status === 409 && dup.fieldErrors?.number);
      const otherType = await legal.createLegal(prisma, { villageId: vA, userId: 1, input: { ...base, type: "PERKADES" }, now: NOW });
      assert.ok(otherType.ok);
      const otherVillage = await legal.createLegal(prisma, { villageId: vB, userId: 1, input: base, now: NOW });
      assert.ok(otherVillage.ok);
    });
    it("mencabut sekali saja, tak bisa mencabut sebelum ditetapkan, dan desa lain tak bisa menyentuh", async () => {
      const r = await legal.createLegal(prisma, { villageId: vA, userId: 1, input: { ...base, number: "2" }, now: NOW });
      const id = r.ok ? r.data.id : 0;
      assert.ok(!(await legal.revokeLegal(prisma, { villageId: vA, id, input: { revokedAt: "2025-01-01" }, now: NOW })).ok);
      assert.ok(!(await legal.revokeLegal(prisma, { villageId: vB, id, input: { revokedAt: "2026-06-01" }, now: NOW })).ok, "desa lain 404");
      const ok = await legal.revokeLegal(prisma, { villageId: vA, id, input: { revokedAt: "2026-06-01", revokedByRef: "Perdes 9/2026" }, now: NOW });
      assert.ok(ok.ok && ok.data.status === "DICABUT");
      const again = await legal.revokeLegal(prisma, { villageId: vA, id, input: { revokedAt: "2026-06-02" }, now: NOW });
      assert.ok(!again.ok && again.status === 409);
    });
    it("daftar: filter status/jenis/tahun, pencarian, hitungan 'berlaku' per jenis; hapus hanya milik sendiri", async () => {
      const inForce = await legal.listLegal(prisma, vA, { status: "BERLAKU", page: 1, pageSize: 50 });
      assert.ok(inForce.items.every((i) => i.status === "BERLAKU"));
      assert.equal(inForce.inForce.PERDES, 1);
      const revoked = await legal.listLegal(prisma, vA, { status: "DICABUT", page: 1, pageSize: 50 });
      assert.equal(revoked.total, 1);
      assert.equal((await legal.listLegal(prisma, vA, { type: "constructor", page: 1, pageSize: 50 })).total, 3, "jenis asing diabaikan");
      assert.equal((await legal.listLegal(prisma, vA, { search: "APBDesa", page: 1, pageSize: 50 })).total, 3);
      const victim = inForce.items[0].id;
      assert.ok(!(await legal.deleteLegal(prisma, vB, victim)).ok);
      assert.ok((await legal.deleteLegal(prisma, vA, victim)).ok);
    });
  });

  describe("register surat", () => {
    const mk = (direction: string, over: Record<string, unknown> = {}) => reg.createRegister(prisma, { villageId: vA, userId: 1, input: { direction, letterDate: "2026-10-01", registeredAt: "2026-10-03", party: "Kecamatan", subject: "Undangan", ...over }, now: NOW });
    it("nomor agenda berurutan per arah dan tahun, mulai 1 lagi di tahun baru dan arah lain", async () => {
      const a = await mk("IN");
      const b = await mk("IN");
      const out = await mk("OUT");
      const prev = await mk("IN", { letterDate: "2025-12-01", registeredAt: "2025-12-05" });
      assert.ok(a.ok && b.ok && out.ok && prev.ok);
      if (a.ok && b.ok && out.ok && prev.ok) {
        assert.deepEqual([a.data.agendaNo, b.data.agendaNo, out.data.agendaNo, prev.data.agendaNo], [1, 2, 1, 1]);
        assert.equal(b.data.agendaLabel, "002/2026");
      }
    });
    it("pencatatan serentak tak menghasilkan nomor ganda dan tak ada yang hilang", async () => {
      const results = await Promise.all(Array.from({ length: 6 }, (_, i) => mk("IN", { subject: `Serentak ${i}`, registeredAt: "2026-10-04" })));
      const numbers = results.map((r) => (r.ok ? r.data.agendaNo : -1)).sort((x, y) => x - y);
      assert.equal(new Set(numbers).size, numbers.length, "tak ada nomor ganda");
      const okCount = results.filter((r) => r.ok).length;
      assert.equal(okCount, 6, "semua pencatat serentak mendapat nomor sendiri");
      const stored = await prisma.mailRegister.findMany({ where: { villageId: vA, direction: "IN", year: 2026 }, select: { agendaNo: true } });
      assert.equal(new Set(stored.map((s) => s.agendaNo)).size, stored.length);
    });
    it("ubah: arah tetap, tahun tak boleh pindah, desa lain tak bisa", async () => {
      const r = await mk("OUT", { subject: "Balasan" });
      const id = r.ok ? r.data.id : 0;
      const upd = await reg.updateRegister(prisma, { villageId: vA, id, input: { direction: "IN", letterDate: "2026-10-01", registeredAt: "2026-10-05", party: "Camat", subject: "Balasan 2" }, now: NOW });
      assert.ok(r.ok && upd.ok);
      if (r.ok && upd.ok) assert.deepEqual([upd.data.direction, upd.data.party, upd.data.agendaNo], ["OUT", "Camat", r.data.agendaNo]);
      const moved = await reg.updateRegister(prisma, { villageId: vA, id, input: { letterDate: "2025-10-01", registeredAt: "2025-10-05", party: "Camat", subject: "x" }, now: NOW });
      assert.ok(!moved.ok && moved.status === 400);
      const other = await reg.updateRegister(prisma, { villageId: vB, id, input: { letterDate: "2026-10-01", registeredAt: "2026-10-05", party: "Z", subject: "DIBAJAK" }, now: NOW });
      assert.ok(!other.ok && other.status === 404);
      assert.equal((await prisma.mailRegister.findUniqueOrThrow({ where: { id } })).subject, "Balasan 2");
    });
    it("daftar: filter arah/tahun dan pencarian; desa lain kosong", async () => {
      const outs = await reg.listRegister(prisma, vA, { direction: "OUT", page: 1, pageSize: 50 });
      assert.ok(outs.items.every((i) => i.direction === "OUT"));
      assert.equal((await reg.listRegister(prisma, vA, { year: 2025, page: 1, pageSize: 50 })).total, 1);
      assert.ok((await reg.listRegister(prisma, vA, { search: "Serentak", page: 1, pageSize: 50 })).total >= 1);
      assert.equal((await reg.listRegister(prisma, vB, { page: 1, pageSize: 50 })).total, 0);
    });
  });

  describe("lembaga desa", () => {
    let instId = 0;
    it("membuat lembaga dan menambah anggota; nama diisi dari data warga", async () => {
      const i = await inst.createInstitution(prisma, { villageId: vA, userId: 1, input: { type: "BPD", name: "BPD Desa A", periodStart: "2020-01-01", periodEnd: "2026-01-01" }, now: NOW });
      assert.ok(i.ok);
      instId = i.ok ? i.data.id : 0;
      assert.ok(i.ok && i.data.periodEnded);
      const m = await inst.addMember(prisma, { villageId: vA, institutionId: instId, input: { role: "KETUA", residentId: residentA }, now: NOW });
      assert.ok(m.ok && m.data.members[0].name === "Warga Desa A");
      const free = await inst.addMember(prisma, { villageId: vA, institutionId: instId, input: { role: "ANGGOTA", name: "Tokoh Masyarakat" }, now: NOW });
      assert.ok(free.ok && free.data.members.length === 2);
    });
    it("isolasi: warga desa lain tak bisa dijadikan anggota; desa lain tak bisa menambah/ubah/hapus", async () => {
      const cross = await inst.addMember(prisma, { villageId: vA, institutionId: instId, input: { role: "ANGGOTA", residentId: residentB }, now: NOW });
      assert.ok(!cross.ok && cross.status === 400);
      assert.ok(!(await inst.addMember(prisma, { villageId: vB, institutionId: instId, input: { role: "ANGGOTA", name: "Penyusup" }, now: NOW })).ok);
      const member = (await prisma.institutionMember.findFirstOrThrow({ where: { institutionId: instId } })).id;
      assert.ok(!(await inst.updateMember(prisma, { villageId: vB, institutionId: instId, memberId: member, input: { role: "KETUA", name: "DIBAJAK" }, now: NOW })).ok);
      assert.ok(!(await inst.removeMember(prisma, { villageId: vB, institutionId: instId, memberId: member, now: NOW })).ok);
      assert.ok(!(await inst.updateInstitution(prisma, { villageId: vB, id: instId, input: { type: "BPD", name: "DIBAJAK" }, now: NOW })).ok);
      assert.ok(!(await inst.deleteInstitution(prisma, vB, instId)).ok);
      assert.equal((await prisma.institutionMember.findUniqueOrThrow({ where: { id: member } })).name, "Warga Desa A");
      const list = await inst.listInstitutions(prisma, vB, NOW);
      assert.equal(list.length, 0);
    });
    it("anggota diganti: yang berakhir tetap jadi riwayat; mengubah anggota lembaga lain lewat id lembaga salah ditolak", async () => {
      const other = await inst.createInstitution(prisma, { villageId: vA, userId: 1, input: { type: "LPM", name: "LPM A" }, now: NOW });
      const otherId = other.ok ? other.data.id : 0;
      const member = (await prisma.institutionMember.findFirstOrThrow({ where: { institutionId: instId } })).id;
      assert.ok(!(await inst.updateMember(prisma, { villageId: vA, institutionId: otherId, memberId: member, input: { role: "KETUA", name: "Salah lembaga" }, now: NOW })).ok);
      const ended = await inst.updateMember(prisma, { villageId: vA, institutionId: instId, memberId: member, input: { role: "KETUA", residentId: residentA, startsAt: "2020-01-01", endsAt: "2025-01-01" }, now: NOW });
      assert.ok(ended.ok && ended.data.members.find((m) => m.id === member)?.active === false);
      assert.equal(ended.ok && ended.data.members[ended.data.members.length - 1].id, member, "yang berakhir di urutan terakhir");
    });
    it("hapus warga tidak menghapus anggota (nama tersimpan); hapus lembaga ikut menghapus anggotanya", async () => {
      await prisma.resident.delete({ where: { id: residentA } });
      const remaining = await prisma.institutionMember.findMany({ where: { institutionId: instId } });
      assert.equal(remaining.length, 2);
      assert.ok(remaining.every((m) => m.residentId === null));
      assert.ok((await inst.deleteInstitution(prisma, vA, instId)).ok);
      assert.equal(await prisma.institutionMember.count({ where: { institutionId: instId } }), 0);
    });
  });
});
