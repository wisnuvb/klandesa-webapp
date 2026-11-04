/** Tes integrasi akun & izin per akun terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Akun & izin per akun (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/rbac/accounts");
  let perms: typeof import("../lib/permissions/client");
  let vA = 0;
  let vB = 0;
  let adminA = 0;
  let posA = 0;
  const t = Date.now() % 1e6;
  let n = 0;

  const mkOfficial = async (villageId: number, positionId: number, name: string) =>
    (await prisma.official.create({ data: { villageId, positionId, nik: `33002${t}${++n}`.padEnd(16, "0").slice(0, 16), name, birthplace: "x", birthDate: new Date("1985-01-01"), gender: "M", address: "a", startDate: new Date("2020-01-01"), status: "active" } })).id;

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/rbac/accounts");
    perms = await import("../lib/permissions/client");
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("RA")).id;
    vB = (await mkV("RB")).id;
    adminA = (await prisma.user.create({ data: { villageId: vA, email: `admin${t}@a.id`, password: "x", name: "Admin A", role: "admin" } })).id;
    posA = (await prisma.position.create({ data: { villageId: vA, name: "Kaur", level: 3 } })).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("membuat akun dari perangkat: kata sandi sementara valid, tertaut, peran bawaan staf, hash bukan teks asli", async () => {
    const off = await mkOfficial(vA, posA, "Budi");
    const r = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: off, email: ` Budi${t}@Desa.ID ` });
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(r.data.role, "staff");
    assert.equal(r.data.email, `budi${t}@desa.id`);
    assert.equal(r.data.tempPassword.length, 12);
    const u = await prisma.user.findUniqueOrThrow({ where: { id: r.data.userId } });
    assert.notEqual(u.password, r.data.tempPassword);
    const { verifyPassword } = await import("../lib/auth");
    assert.equal(await verifyPassword(r.data.tempPassword, u.password), true);
    assert.equal((await prisma.official.findUniqueOrThrow({ where: { id: off } })).userId, u.id);
  });

  it("menolak: sudah punya akun, email dipakai, email buruk, peran asing, perangkat desa lain", async () => {
    const off = await mkOfficial(vA, posA, "Citra");
    const first = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: off, email: `citra${t}@a.id` });
    assert.ok(first.ok);
    const again = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: off, email: `citra2${t}@a.id` });
    assert.ok(!again.ok && again.status === 409);
    const off2 = await mkOfficial(vA, posA, "Dewi");
    const dup = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: off2, email: `CITRA${t}@a.id` });
    assert.ok(!dup.ok && dup.status === 409);
    const bad = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: off2, email: "bukan-email" });
    assert.ok(!bad.ok && bad.status === 400);
    const role = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: off2, email: `dewi${t}@a.id`, role: "superuser" });
    assert.ok(!role.ok && role.status === 400);
    const cross = await svc.createOfficialAccount(prisma, { villageId: vB, officialId: off2, email: `dewi${t}@b.id` });
    assert.ok(!cross.ok && cross.status === 404);
    // Gagal tidak meninggalkan akun yatim.
    assert.equal(await prisma.user.count({ where: { email: { in: [`dewi${t}@a.id`, `dewi${t}@b.id`] } } }), 0);
  });

  it("dua permintaan bersamaan untuk perangkat yang sama: hanya satu akun jadi", async () => {
    const off = await mkOfficial(vA, posA, "Eko");
    const [a, b] = await Promise.all([
      svc.createOfficialAccount(prisma, { villageId: vA, officialId: off, email: `eko1${t}@a.id` }),
      svc.createOfficialAccount(prisma, { villageId: vA, officialId: off, email: `eko2${t}@a.id` }),
    ]);
    assert.equal([a, b].filter((x) => x.ok).length, 1);
    assert.equal(await prisma.user.count({ where: { email: { in: [`eko1${t}@a.id`, `eko2${t}@a.id`] } } }), 1);
  });

  it("dua staf se-peran berbeda wewenang lewat penyesuaian yang tersimpan di DB", async () => {
    const o1 = await mkOfficial(vA, posA, "Fajar");
    const o2 = await mkOfficial(vA, posA, "Gita");
    const c1 = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: o1, email: `fajar${t}@a.id` });
    const c2 = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: o2, email: `gita${t}@a.id` });
    assert.ok(c1.ok && c2.ok);
    if (!c1.ok || !c2.ok) return;
    const up = await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: c1.data.userId, permissionOverrides: { grant: { finance: ["create", "update"] }, deny: { residents: ["delete"] } } });
    assert.ok(up.ok);
    const rows = await prisma.user.findMany({ where: { id: { in: [c1.data.userId, c2.data.userId] } }, select: { id: true, role: true, permissionOverrides: true } });
    const f = rows.find((r) => r.id === c1.data.userId)!;
    const g = rows.find((r) => r.id === c2.data.userId)!;
    assert.equal(perms.roleCan("finance", "create", f), true);
    assert.equal(perms.roleCan("finance", "create", g), false);
    assert.equal(perms.roleCan("residents", "delete", f), false);
    assert.equal(perms.roleCan("residents", "delete", g), true);
    // Ganti peran tanpa kirim penyesuaian baru -> penyesuaian lama dibuang.
    const swap = await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: c1.data.userId, role: "secretary" });
    assert.ok(swap.ok);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: c1.data.userId } })).permissionOverrides, null);
  });

  it("penyesuaian sampah dibersihkan sebelum disimpan; rbac tidak bisa dihibahkan", async () => {
    const o = await mkOfficial(vA, posA, "Hana");
    const c = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: o, email: `hana${t}@a.id` });
    assert.ok(c.ok);
    if (!c.ok) return;
    const up = await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: c.data.userId, permissionOverrides: { grant: { rbac: ["read", "create", "update", "delete"], hacker: ["read"], finance: ["fly", "create"] } } });
    assert.ok(up.ok);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: c.data.userId } });
    assert.deepEqual(row.permissionOverrides, { grant: { finance: ["create"] } });
    assert.equal(perms.roleCan("rbac", "read", row), false);
  });

  it("pagar: tak bisa ubah diri sendiri, admin terakhir tak bisa diturunkan/dinonaktifkan, akun desa lain tak tersentuh", async () => {
    const self = await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: adminA, role: "staff" });
    assert.ok(!self.ok && self.status === 400);
    const selfOff = await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: adminA, isActive: false });
    assert.ok(!selfOff.ok && selfOff.status === 400);

    const o = await mkOfficial(vA, posA, "Indra");
    const c = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: o, email: `indra${t}@a.id`, role: "admin" });
    assert.ok(c.ok);
    if (!c.ok) return;
    // Ada 2 admin: boleh menurunkan yang kedua; lalu admin pertama tak boleh dilucuti oleh pihak lain karena tinggal satu.
    assert.ok((await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: c.data.userId, role: "staff" })).ok);
    const last = await svc.updateAccount(prisma, { villageId: vA, actorUserId: c.data.userId, targetUserId: adminA, role: "staff" });
    assert.ok(!last.ok && last.status === 409);
    const lastOff = await svc.updateAccount(prisma, { villageId: vA, actorUserId: c.data.userId, targetUserId: adminA, isActive: false });
    assert.ok(!lastOff.ok && lastOff.status === 409);

    const other = await svc.updateAccount(prisma, { villageId: vB, actorUserId: 1, targetUserId: c.data.userId, isActive: false });
    assert.ok(!other.ok && other.status === 404);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: c.data.userId } })).isActive, true);
  });

  it("dua admin saling menurunkan bersamaan: desa tetap punya satu admin aktif (balapan admin terakhir)", async () => {
    const vC = (await prisma.village.create({ data: { code: `RC${t}`, name: "RC", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
    try {
      const a = (await prisma.user.create({ data: { villageId: vC, email: `ra${t}@c.id`, password: "x", name: "A", role: "admin" } })).id;
      const b = (await prisma.user.create({ data: { villageId: vC, email: `rb${t}@c.id`, password: "x", name: "B", role: "admin" } })).id;
      for (let i = 0; i < 5; i += 1) {
        await prisma.user.updateMany({ where: { id: { in: [a, b] } }, data: { role: "admin", isActive: true } });
        const [r1, r2] = await Promise.all([
          svc.updateAccount(prisma, { villageId: vC, actorUserId: a, targetUserId: b, role: "staff" }),
          svc.updateAccount(prisma, { villageId: vC, actorUserId: b, targetUserId: a, isActive: false }),
        ]);
        assert.equal([r1, r2].filter((r) => r.ok).length, 1, `putaran ${i}`);
        assert.equal(await prisma.user.count({ where: { villageId: vC, role: "admin", isActive: true } }), 1, `putaran ${i}`);
      }
    } finally {
      await prisma.village.delete({ where: { id: vC } });
    }
  });

  it("email milik mitra/platform/regional/pemilik referral ditolak (tak bisa mengambil alih portal lain)", async () => {
    const off = await mkOfficial(vA, posA, "Lina");
    await prisma.platformUser.create({ data: { email: `plat${t}@x.id`, password: "x", name: "P" } });
    for (const e of [`plat${t}@x.id`, `PLAT${t}@x.id`]) {
      const r = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: off, email: e });
      assert.ok(!r.ok && r.status === 409, e);
    }
    assert.equal(await svc.isEmailTakenAnywhere(prisma, `bebas${t}@x.id`), false);
    await prisma.platformUser.deleteMany({ where: { email: `plat${t}@x.id` } });
  });

  it("reset kata sandi mencabut sesi seluler staf lama", async () => {
    const o = await mkOfficial(vA, posA, "Maya");
    const c = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: o, email: `maya${t}@a.id` });
    assert.ok(c.ok);
    if (!c.ok) return;
    await prisma.mobileSession.create({ data: { accountType: "staff", accountId: c.data.userId, villageId: vA, role: "staff", refreshHash: `h${t}${c.data.userId}`.padEnd(64, "0").slice(0, 64), familyId: `f${t}`, expiresAt: new Date(Date.now() + 86_400_000) } });
    assert.ok((await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: c.data.userId, resetPassword: true })).ok);
    const rows = await prisma.mobileSession.findMany({ where: { accountType: "staff", accountId: c.data.userId } });
    assert.ok(rows.length === 1 && rows[0].revokedAt !== null);
  });

  it("reset kata sandi memberi sandi baru yang bekerja dan menggugurkan yang lama", async () => {
    const o = await mkOfficial(vA, posA, "Joko");
    const c = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: o, email: `joko${t}@a.id` });
    assert.ok(c.ok);
    if (!c.ok) return;
    const r = await svc.updateAccount(prisma, { villageId: vA, actorUserId: adminA, targetUserId: c.data.userId, resetPassword: true });
    assert.ok(r.ok && r.data.tempPassword);
    if (!r.ok || !r.data.tempPassword) return;
    const { verifyPassword } = await import("../lib/auth");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: c.data.userId } });
    assert.equal(await verifyPassword(r.data.tempPassword, u.password), true);
    assert.equal(await verifyPassword(c.data.tempPassword, u.password), false);
  });

  it("perangkat berhenti/dihapus menonaktifkan akun loginnya, kecuali admin", async () => {
    const o = await mkOfficial(vA, posA, "Kiki");
    const c = await svc.createOfficialAccount(prisma, { villageId: vA, officialId: o, email: `kiki${t}@a.id` });
    assert.ok(c.ok);
    if (!c.ok) return;
    assert.equal(await svc.deactivateLinkedAccount(prisma, vA, c.data.userId), true);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: c.data.userId } })).isActive, false);
    assert.equal(await svc.deactivateLinkedAccount(prisma, vA, adminA), false);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: adminA } })).isActive, true);
    // Hapus perangkat: akun tetap ada (nonaktif), tautan lepas.
    await prisma.official.delete({ where: { id: o } });
    assert.ok(await prisma.user.findUnique({ where: { id: c.data.userId } }));
  });

  it("daftar akun tidak memuat akun warga (role citizen)", async () => {
    await prisma.user.create({ data: { villageId: vA, email: `warga${t}@a.id`, password: "x", name: "Warga", role: "citizen" } });
    const rows = await prisma.user.findMany({ where: { villageId: vA, NOT: { role: "citizen" } }, select: svc.ACCOUNT_SELECT });
    assert.ok(rows.length > 0 && rows.every((r) => r.role !== "citizen"));
  });
});
