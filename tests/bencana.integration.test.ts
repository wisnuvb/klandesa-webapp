/** Tes integrasi Bencana & primitif kejadian terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { readFileSync } from "node:fs";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Bencana (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let inc: typeof import("../lib/incident/service");
  let drm: typeof import("../lib/bencana/service");
  let vA = 0;
  let vB = 0;
  const NOW = new Date("2026-11-01T05:00:00Z");
  const tag = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  let seq = 0;
  const CAN_ALL = { update: true, approve: true };
  const CAN_UPD = { update: true, approve: false };

  const ev = async (villageId: number, o: Record<string, unknown> = {}, domain: "BENCANA" | "KEAMANAN" = "BENCANA") => {
    const r = await inc.createEvent(prisma, { domain, villageId, userId: 1, now: NOW, input: { kind: domain === "BENCANA" ? "BANJIR" : "PENCURIAN", title: "Banjir RW 02", occurredAt: "2026-11-01T01:00:00Z", severity: "MEDIUM", ...o } });
    assert.ok(r.ok, JSON.stringify(r));
    return r.ok ? r.data.id : 0;
  };
  const go = (villageId: number, id: number, to: string, note: string | null = null, can = CAN_ALL, domain: "BENCANA" | "KEAMANAN" = "BENCANA") => inc.transition(prisma, { domain, villageId, id, userId: 1, input: { to, note }, can, now: NOW });
  const resp = (villageId: number, id: number, o: Record<string, unknown> = {}, domain: "BENCANA" | "KEAMANAN" = "BENCANA") => inc.addResponse(prisma, { domain, villageId, id, userId: 1, now: NOW, input: { loggedAt: "2026-11-01T02:00:00Z", kind: "EVAKUASI", description: "Evakuasi warga RT 03", ...o } });
  const mkRes = (villageId: number, name: string, o: Record<string, unknown> = {}) => {
    seq++;
    return prisma.resident.create({ data: { villageId, nik: `${tag.slice(-8)}${String(seq).padStart(8, "0")}`, kk: `${tag.slice(-8)}${String(seq).padStart(8, "1")}`, name, birthplace: "x", birthDate: new Date("1985-05-05"), gender: "Laki-laki", address: "Jl. Mawar", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", rt: "01", rw: "02", phone: "081234567890", ...o } });
  };
  const mkKk = async (villageId: number, name: string, o: { status?: string; rt?: string; rw?: string } = {}) => {
    const head = await mkRes(villageId, name, { rt: o.rt ?? "01", rw: o.rw ?? "02" });
    const hh = await prisma.household.create({ data: { villageId, kkNumber: head.kk!, headResidentId: head.id, address: "Jl. Mawar", rt: o.rt ?? "01", rw: o.rw ?? "02", status: o.status ?? "ACTIVE" } });
    await prisma.resident.update({ where: { id: head.id }, data: { householdId: hh.id } });
    return { household: hh, head };
  };
  const mkAcc = async (villageId: number, residentId: number, status = "ACTIVE") => {
    seq++;
    return prisma.citizenAccount.create({ data: { villageId, residentId, username: `u${tag}${seq}`.slice(0, 30), passwordHash: "x", status } });
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    inc = await import("../lib/incident/service");
    drm = await import("../lib/bencana/service");
    // DB scratch dibuat dari `db push` (tanpa CHECK); pasang CHECK dari berkas migrasi agar pagar DB ikut diuji.
    const sql = readFileSync("docs/PHASE3_BENCANA_MIGRATION.sql", "utf8");
    for (const stmt of sql.split("\n").filter((l) => l.startsWith("ALTER TABLE") && l.includes("CHECK"))) {
      await prisma.$executeRawUnsafe(stmt.replace(/;$/, "")).catch((e: Error) => {
        if (!/Duplicate check constraint|already exists|3822/i.test(e.message)) throw e;
      });
    }
    const mk = (c: string) => prisma.village.create({ data: { code: `${c}${tag}`.slice(0, 20), name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mk("BA")).id;
    vB = (await mk("BB")).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("siklus status bergerbang: lompat ditolak, selesai butuh tindakan, tutup butuh approve, tertutup tidak menerima catatan", async () => {
    const id = await ev(vA, { severity: "HIGH" });
    assert.equal((await go(vA, id, "RESOLVED", "x lengkap")).ok, false, "OPEN→RESOLVED ditolak");
    assert.equal((await go(vA, id, "CLOSED", "x lengkap")).ok, false);
    assert.ok((await go(vA, id, "RESPONDING")).ok);
    const noResp = await go(vA, id, "RESOLVED", "Sudah selesai semua");
    assert.ok(!noResp.ok && noResp.status === 409 && /minimal satu tindakan/.test(noResp.errors[0]!));
    assert.ok((await resp(vA, id)).ok);
    assert.ok((await go(vA, id, "RESOLVED", "Air surut dan warga pulang")).ok);
    const denied = await go(vA, id, "CLOSED", null, CAN_UPD);
    assert.ok(!denied.ok && denied.status === 403, "staf tidak boleh menutup");
    const sup = await go(vA, id, "CLOSED");
    assert.ok(!sup.ok && sup.status === 409 && /supra-desa/.test(sup.errors[0]!), "berat tanpa lapor supra-desa");
    assert.ok((await inc.patchEvent(prisma, { domain: "BENCANA", villageId: vA, id, now: NOW, input: { supraReportedAt: "2026-11-01T03:00:00Z", supraReportedTo: "BPBD Kabupaten", supraReference: "L-12" } })).ok);
    assert.ok((await go(vA, id, "CLOSED")).ok);
    for (const r of [await resp(vA, id), await inc.patchEvent(prisma, { domain: "BENCANA", villageId: vA, id, input: { title: "Ubah" } }), await inc.addLogistic(prisma, { domain: "BENCANA", villageId: vA, id, userId: 1, input: { recipientName: "Posko", item: "Beras", quantity: 1, unit: "kg", fundingSource: "BPBD", distributedOn: "2026-11-01" } })]) {
      assert.ok(!r.ok && r.status === 409, "kejadian ditutup menolak perubahan");
    }
    const reopen = await go(vA, id, "RESPONDING", "Ada susulan banjir", CAN_UPD);
    assert.ok(!reopen.ok && reopen.status === 403, "membuka kembali butuh approve");
    assert.ok((await go(vA, id, "RESPONDING", "Ada susulan banjir")).ok);
    const d = await inc.getEvent(prisma, { domain: "BENCANA", villageId: vA, id, detail: true, now: NOW });
    assert.ok(d.ok);
    if (d.ok) {
      assert.deepEqual(d.data.statusLog.map((l) => l.to), ["OPEN", "RESPONDING", "RESOLVED", "CLOSED", "RESPONDING"]);
      assert.equal(d.data.event.closedAt, null);
      assert.equal(d.data.event.resolvedAt, null);
    }
  });

  it("hapus: hanya OPEN/CANCELLED tanpa distribusi; batal wajib alasan", async () => {
    const a = await ev(vA);
    assert.equal((await go(vA, a, "CANCELLED")).ok, false);
    assert.ok((await go(vA, a, "CANCELLED", "Salah catat, bukan banjir")).ok);
    assert.ok((await inc.removeEvent(prisma, { domain: "BENCANA", villageId: vA, id: a })).ok);
    const b = await ev(vA);
    assert.ok((await go(vA, b, "RESPONDING")).ok);
    const r = await inc.removeEvent(prisma, { domain: "BENCANA", villageId: vA, id: b });
    assert.ok(!r.ok && r.status === 409);
    const c = await ev(vA);
    assert.ok((await inc.addLogistic(prisma, { domain: "BENCANA", villageId: vA, id: c, userId: 1, now: NOW, input: { recipientName: "Posko", item: "Mie", quantity: 3, unit: "dus", fundingSource: "DONASI", distributedOn: "2026-11-01" } })).ok);
    const r2 = await inc.removeEvent(prisma, { domain: "BENCANA", villageId: vA, id: c });
    assert.ok(!r2.ok && /distribusi/.test(r2.errors[0]!));
  });

  it("isolasi lintas desa DAN lintas domain: kejadian milik desa/domain lain 404 untuk semua operasi", async () => {
    const id = await ev(vA);
    const kid = await ev(vA, {}, "KEAMANAN");
    const ops = async (villageId: number, eid: number, domain: "BENCANA" | "KEAMANAN") => [
      await inc.getEvent(prisma, { domain, villageId, id: eid, detail: true }),
      await inc.patchEvent(prisma, { domain, villageId, id: eid, input: { title: "Retas" } }),
      await inc.removeEvent(prisma, { domain, villageId, id: eid }),
      await go(villageId, eid, "RESPONDING", null, CAN_ALL, domain),
      await resp(villageId, eid, { kind: "LAINNYA" }, domain),
      await inc.removeResponse(prisma, { domain, villageId, id: eid, responseId: 1 }),
      await inc.addLogistic(prisma, { domain, villageId, id: eid, userId: 1, input: { recipientName: "P", item: "Beras", quantity: 1, unit: "kg", fundingSource: "BPBD", distributedOn: "2026-11-01" } }),
    ];
    for (const r of await ops(vB, id, "BENCANA")) assert.ok(!r.ok && r.status === 404 || (!r.ok && r.status === 400), "desa lain: " + JSON.stringify(r));
    for (const r of (await ops(vA, id, "KEAMANAN")).slice(0, 5)) assert.ok(!r.ok && r.status === 404, "domain lain: " + JSON.stringify(r));
    for (const r of (await ops(vA, kid, "BENCANA")).slice(0, 5)) assert.ok(!r.ok && r.status === 404, "keamanan dibaca dari bencana: " + JSON.stringify(r));
    // Daftar dan ringkasan juga terpisah
    const lb = await inc.listEvents(prisma, { domain: "BENCANA", villageId: vA, query: inc.eventListQuery("BENCANA", new URLSearchParams()) });
    const lk = await inc.listEvents(prisma, { domain: "KEAMANAN", villageId: vA, query: inc.eventListQuery("KEAMANAN", new URLSearchParams()) });
    assert.ok(lb.ok && lk.ok);
    if (lb.ok && lk.ok) {
      assert.ok(lb.data.rows.every((r) => r.domain === "BENCANA") && lb.data.rows.some((r) => r.id === id) && !lb.data.rows.some((r) => r.id === kid));
      assert.ok(lk.data.rows.every((r) => r.domain === "KEAMANAN") && lk.data.rows.some((r) => r.id === kid));
    }
    const lv = await inc.listEvents(prisma, { domain: "BENCANA", villageId: vB, query: inc.eventListQuery("BENCANA", new URLSearchParams()) });
    assert.ok(lv.ok && lv.data.total === 0);
    // Jenis kejadian keamanan ditolak pada domain bencana
    const bad = await inc.createEvent(prisma, { domain: "BENCANA", villageId: vA, userId: 1, input: { kind: "PENCURIAN", title: "Pencurian", occurredAt: "2026-11-01T01:00:00Z" }, now: NOW });
    assert.ok(!bad.ok && bad.status === 400);
    // Domain KEAMANAN tidak punya logistik
    const kl = await inc.addLogistic(prisma, { domain: "KEAMANAN", villageId: vA, id: kid, userId: 1, input: {} });
    assert.ok(!kl.ok && kl.status === 400);
    const dk = await inc.getEvent(prisma, { domain: "KEAMANAN", villageId: vA, id: kid, detail: true });
    assert.ok(dk.ok && dk.data.logistics === null);
    const sm = await inc.domainSummary(prisma, { domain: "KEAMANAN", villageId: vA, now: NOW });
    assert.ok(sm.recent.every((r) => r.domain === "KEAMANAN"));
  });

  it("distribusi bantuan: KK harus milik desa dan aktif; nama tersamar tanpa izin rinci; KK 4 digit; ringkasan; anti-ganda", async () => {
    const id = await ev(vA);
    const { household, head } = await mkKk(vA, "Sutarno Hadi");
    const other = await mkKk(vB, "Warga Desa Lain");
    const dead = await mkKk(vA, "Keluarga Pindah", { status: "INACTIVE" });
    const add = (o: Record<string, unknown>) => inc.addLogistic(prisma, { domain: "BENCANA", villageId: vA, id, userId: 7, now: NOW, input: { item: "Beras 5 kg", quantity: 2, unit: "karung", fundingSource: "DD_OPERASIONAL", distributedOn: "2026-11-01", value: "150000", ...o } });

    const x = await add({ householdId: other.household.id });
    assert.ok(!x.ok && x.status === 404, "KK desa lain");
    const y = await add({ householdId: dead.household.id });
    assert.ok(!y.ok && /tidak aktif/.test(y.errors[0]!));

    const first = await add({ householdId: household.id });
    assert.ok(first.ok && first.data.warnings.length === 0);
    const same = await add({ householdId: household.id, item: "  beras 5 KG " });
    assert.ok(!same.ok && same.status === 409 && /sudah dicatat/.test(same.errors[0]!), "hari + barang + KK sama");
    const later = await add({ householdId: household.id, distributedOn: "2026-11-02" });
    assert.ok(later.ok && later.data.warnings.length === 1 && /sudah pernah menerima/.test(later.data.warnings[0]!), "hari lain: sah tetapi diperingatkan");
    assert.ok((await add({ recipientName: "Posko Balai Desa", item: "Tikar" })).ok);
    assert.ok((await add({ recipientName: "Posko Balai Desa", item: "Tikar", quantity: 5 })).ok, "penerima non-KK tidak dikunci unik");

    const rinci = await inc.getEvent(prisma, { domain: "BENCANA", villageId: vA, id, detail: true });
    const ringkas = await inc.getEvent(prisma, { domain: "BENCANA", villageId: vA, id, detail: false });
    assert.ok(rinci.ok && ringkas.ok);
    if (rinci.ok && ringkas.ok) {
      const kkRow = rinci.data.logistics!.rows.find((r) => r.isHousehold)!;
      assert.equal(kkRow.recipientName, "Sutarno Hadi");
      assert.match(kkRow.kk!, /^•+\d{4}$/);
      assert.equal(kkRow.kk!.slice(-4), head.kk!.slice(-4));
      assert.ok(!kkRow.kk!.includes(head.kk!.slice(0, 12)));
      const masked = ringkas.data.logistics!.rows.find((r) => r.isHousehold)!;
      assert.equal(masked.recipientName, "S****** H***");
      assert.equal(masked.kk, null);
      assert.equal(ringkas.data.logistics!.detailVisible, false);
      const json = JSON.stringify(ringkas.data);
      assert.ok(!json.includes("Sutarno") && !json.includes(head.kk!) && !json.includes(head.nik) && !json.includes("081234567890"), "tidak ada PII pada tampilan ringkas");
      assert.equal(JSON.stringify(rinci.data).includes(head.nik), false, "NIK tidak pernah keluar");
      const s = ringkas.data.logistics!.summary;
      assert.equal(s.households, 1);
      assert.equal(s.rows, 4);
      const beras = s.items.find((i) => i.item.toLowerCase().startsWith("beras"))!;
      assert.equal(beras.quantity, 4);
      assert.equal(beras.value, "300000.00");
      assert.equal(s.totalValue, "600000.00", "nilai tiap baris: 2 baris beras + 2 baris tikar");
    }
    // Tanggal sebelum kejadian ditolak
    const early = await add({ recipientName: "Posko", distributedOn: "2026-10-20" });
    assert.ok(!early.ok && early.status === 400);
    // Hapus catatan
    const lg = await prisma.incidentLogistic.findFirstOrThrow({ where: { eventId: id } });
    assert.ok((await inc.removeLogistic(prisma, { domain: "BENCANA", villageId: vA, id, logisticId: lg.id })).ok);
    const wrongV = await inc.removeLogistic(prisma, { domain: "BENCANA", villageId: vB, id, logisticId: lg.id });
    assert.ok(!wrongV.ok && wrongV.status === 404);
  });

  it("cari KK: minimal 3 karakter, hanya desa sendiri, KK aktif, hanya 4 digit KK terakhir", async () => {
    const mine = await mkKk(vA, `Pencarian Unik${tag.slice(-4)}`);
    await mkKk(vB, `Pencarian Unik${tag.slice(-4)}`);
    assert.deepEqual(await inc.searchHouseholds(prisma, { villageId: vA, q: "Pe" }), []);
    const hits = await inc.searchHouseholds(prisma, { villageId: vA, q: `Pencarian Unik${tag.slice(-4)}` });
    assert.equal(hits.length, 1);
    assert.equal(hits[0]!.id, mine.household.id);
    assert.equal(hits[0]!.kkLast4, mine.head.kk!.slice(-4));
    assert.ok(!JSON.stringify(hits).includes(mine.head.kk!));
    const byKk = await inc.searchHouseholds(prisma, { villageId: vA, q: mine.head.kk!.slice(0, 10) });
    assert.ok(byKk.some((h) => h.id === mine.household.id));
    // wildcard LIKE tidak diperlakukan sebagai pola
    assert.equal((await inc.searchHouseholds(prisma, { villageId: vA, q: "%%%" })).length, 0);
  });

  it("KONKURENSI: tiga permintaan 'selesai ditangani' serentak → tepat satu lolos, satu baris riwayat", async () => {
    for (let round = 0; round < 3; round++) {
      const id = await ev(vA);
      assert.ok((await go(vA, id, "RESPONDING")).ok);
      assert.ok((await resp(vA, id)).ok);
      const rs = await Promise.all([1, 2, 3].map((n) => go(vA, id, "RESOLVED", `Selesai versi ${n} lengkap`)));
      assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs));
      const logs = await prisma.incidentStatusLog.count({ where: { eventId: id, toStatus: "RESOLVED" } });
      assert.equal(logs, 1);
    }
  });

  it("KONKURENSI: kejadian tidak pernah 'selesai' tanpa tindakan walau tindakan terakhir dihapus serentak", async () => {
    for (let round = 0; round < 8; round++) {
      const id = await ev(vA);
      assert.ok((await go(vA, id, "RESPONDING")).ok);
      const r = await resp(vA, id);
      assert.ok(r.ok);
      const rid = r.ok ? r.data.id : 0;
      await Promise.all([go(vA, id, "RESOLVED", "Selesai ditangani semua"), inc.removeResponse(prisma, { domain: "BENCANA", villageId: vA, id, responseId: rid })]);
      const st = await prisma.incidentEvent.findUniqueOrThrow({ where: { id }, select: { status: true } });
      const n = await prisma.incidentResponse.count({ where: { eventId: id } });
      assert.ok(!(st.status === "RESOLVED" && n === 0), `putaran ${round}: RESOLVED dengan ${n} tindakan`);
    }
  });

  it("KONKURENSI: pencatatan ganda distribusi yang identik serentak → tepat satu tersimpan", async () => {
    const id = await ev(vA);
    const { household } = await mkKk(vA, "Ganda Serentak");
    const rs = await Promise.all(Array.from({ length: 6 }, () => inc.addLogistic(prisma, { domain: "BENCANA", villageId: vA, id, userId: 1, now: NOW, input: { householdId: household.id, item: "Minyak", quantity: 1, unit: "liter", fundingSource: "DONASI", distributedOn: "2026-11-01" } })));
    assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.errors[0]))));
    assert.equal(await prisma.incidentLogistic.count({ where: { eventId: id } }), 1);
  });

  it("pagar DB: CHECK menolak dampak negatif, koordinat tak berpasangan, status liar, jumlah distribusi nol", async () => {
    const id = await ev(vA);
    const bad = (fn: () => Promise<unknown>) => assert.rejects(fn, /check constraint|CHECK/i);
    await bad(() => prisma.incidentEvent.update({ where: { id }, data: { deathCount: -1 } }));
    await bad(() => prisma.incidentEvent.update({ where: { id }, data: { lossCents: -5n } }));
    await bad(() => prisma.incidentEvent.update({ where: { id }, data: { lat: -7.5 } }));
    await bad(() => prisma.incidentEvent.update({ where: { id }, data: { lat: 95, lng: 10 } }));
    await bad(() => prisma.incidentEvent.update({ where: { id }, data: { status: "SELESAI" } }));
    await bad(() => prisma.incidentEvent.update({ where: { id }, data: { domain: "LAIN" } }));
    await bad(() => prisma.incidentLogistic.create({ data: { villageId: vA, eventId: id, recipientName: "P", item: "x", itemKey: "x", quantity: 0, unit: "kg", fundingSource: "BPBD", distributedOn: new Date("2026-11-01") } }));
    await bad(() => prisma.drmResource.create({ data: { villageId: vA, kind: "SHELTER", name: "x", capacity: -1 } }));
    await bad(() => prisma.drmHazard.create({ data: { villageId: vA, hazardType: "BANJIR", name: "xxx", lat: 10 } }));
  });

  it("ancaman: impor titik rawan lama sekali saja, tiap desa miliknya sendiri, pemetaan jenis/risiko", async () => {
    await prisma.disasterPoint.create({ data: { villageId: vA, name: "Bantaran Kali", disasterType: "flood", riskLevel: "high", rt: "01", rw: "02", lat: -7.6, lng: 110.9, notes: "Meluap tiap hujan lebat", evacuationPlan: "Ke balai desa", lastCheckedAt: new Date("2026-09-05T10:00:00Z") } });
    await prisma.disasterPoint.create({ data: { villageId: vA, name: "Lereng Barat", disasterType: "landslide", riskLevel: "extreme" } });
    await prisma.disasterPoint.create({ data: { villageId: vB, name: "Titik Desa Lain", disasterType: "fire" } });
    const r1 = await drm.importDisasterPoints(prisma, { villageId: vA, userId: 1 });
    assert.ok(r1.ok && r1.data.imported === 2);
    const r2 = await drm.importDisasterPoints(prisma, { villageId: vA, userId: 1 });
    assert.ok(r2.ok && r2.data.imported === 0);
    // dua impor serentak: tetap tidak ganda
    await prisma.disasterPoint.create({ data: { villageId: vA, name: "Angin Kencang Utara", disasterType: "other", riskLevel: "low" } });
    await Promise.all([drm.importDisasterPoints(prisma, { villageId: vA, userId: 1 }), drm.importDisasterPoints(prisma, { villageId: vA, userId: 1 })]);
    const list = await drm.listHazards(prisma, { villageId: vA });
    assert.equal(list.length, 3);
    assert.deepEqual(list.map((h) => h.riskLevel), ["EXTREME", "HIGH", "LOW"], "diurut dari risiko tertinggi");
    const flood = list.find((h) => h.name === "Bantaran Kali")!;
    assert.equal(flood.hazardType, "BANJIR");
    assert.equal(flood.lastReviewedOn, "2026-09-05");
    assert.ok(flood.fromDisasterPoint && /Rencana evakuasi: Ke balai desa/.test(flood.description!));
    assert.equal((await drm.listHazards(prisma, { villageId: vB })).length, 0);
    const rb = await drm.importDisasterPoints(prisma, { villageId: vB, userId: 1 });
    assert.ok(rb.ok && rb.data.imported === 1);
    assert.equal((await drm.listHazards(prisma, { villageId: vA })).length, 3);
  });

  it("CRUD kesiapsiagaan terisolasi per desa; relawan: warga desa sendiri, tidak ganda, kontak hanya untuk izin rinci", async () => {
    const h = await drm.createHazard(prisma, { villageId: vA, userId: 1, input: { hazardType: "GEMPA_BUMI", name: "Zona patahan timur", riskLevel: "HIGH" } });
    assert.ok(h.ok);
    const hid = h.ok ? h.data.id : 0;
    const p = await drm.patchHazard(prisma, { villageId: vB, id: hid, input: { name: "Retas" } });
    assert.ok(!p.ok && p.status === 404);
    assert.ok(!(await drm.removeHazard(prisma, { villageId: vB, id: hid })).ok);
    assert.ok((await drm.patchHazard(prisma, { villageId: vA, id: hid, input: { riskLevel: "EXTREME" } })).ok);

    const sr = await drm.createResource(prisma, { villageId: vA, userId: 1, input: { kind: "SHELTER", name: "Balai Desa", capacity: 150, condition: "BAIK", lat: -7.6, lng: 110.9 } });
    assert.ok(sr.ok);
    assert.ok(!(await drm.removeResource(prisma, { villageId: vB, id: sr.ok ? sr.data.id : 0 })).ok);

    const wA = await mkRes(vA, "Relawan Andi");
    const wB = await mkRes(vB, "Warga Desa B");
    const bad = await drm.createVolunteer(prisma, { villageId: vA, userId: 1, input: { residentId: wB.id } });
    assert.ok(!bad.ok && bad.status === 404, "warga desa lain");
    const v1 = await drm.createVolunteer(prisma, { villageId: vA, userId: 1, input: { residentId: wA.id, team: "Tim Siaga RW 02", role: "Ketua" } });
    assert.ok(v1.ok);
    const dups = await Promise.all([1, 2, 3].map(() => drm.createVolunteer(prisma, { villageId: vA, userId: 1, input: { residentId: wA.id } })));
    assert.equal(dups.filter((d) => d.ok).length, 0, "sudah terdaftar");
    const ringkas = await drm.listVolunteers(prisma, { villageId: vA, detail: false });
    const rinci = await drm.listVolunteers(prisma, { villageId: vA, detail: true });
    assert.equal(ringkas[0]!.phone, null);
    assert.equal(rinci[0]!.phone, "081234567890");
    assert.ok(!JSON.stringify(rinci).includes(wA.nik), "NIK tidak keluar");
    assert.equal((await drm.listVolunteers(prisma, { villageId: vB, detail: true })).length, 0);
    assert.deepEqual(await drm.searchResidents(prisma, { villageId: vA, q: "Re" }), []);
    const found = await drm.searchResidents(prisma, { villageId: vA, q: "Relawan And" });
    assert.deepEqual(Object.keys(found[0]!).sort(), ["id", "name", "rt", "rw"]);
    assert.equal((await drm.searchResidents(prisma, { villageId: vB, q: "Relawan And" })).length, 0);
  });

  it("rencana: lampiran harus milik desa yang sama", async () => {
    const legalB = await prisma.legalDocument.create({ data: { villageId: vB, type: "PERDES", number: "1", year: 2026, title: "Perdes B", enactedAt: new Date("2026-01-01") } });
    const legalA = await prisma.legalDocument.create({ data: { villageId: vA, type: "PERDES", number: "2", year: 2026, title: "Perdes Penanggulangan Bencana", enactedAt: new Date("2026-02-01") } });
    const bad = await drm.createPlan(prisma, { villageId: vA, userId: 1, input: { kind: "PERDES", title: "Perdes bencana", legalDocumentId: legalB.id } });
    assert.ok(!bad.ok && bad.status === 404);
    const ok = await drm.createPlan(prisma, { villageId: vA, userId: 1, input: { kind: "PERDES", title: "Perdes bencana", status: "DITETAPKAN", legalDocumentId: legalA.id } });
    assert.ok(ok.ok);
    const list = await drm.listPlans(prisma, { villageId: vA });
    assert.match(list[0]!.legalDocument!.label, /Perdes Penanggulangan Bencana/);
    const patchBad = await drm.patchPlan(prisma, { villageId: vA, id: ok.ok ? ok.data.id : 0, input: { archiveId: "999999999" } });
    assert.ok(!patchBad.ok && patchBad.status === 404);
    const opts = await drm.planLinkOptions(prisma, { villageId: vA });
    assert.ok(opts.legal.some((l) => l.id === legalA.id) && !opts.legal.some((l) => l.id === legalB.id));
  });

  it("kesiapan Destana: isian butir katalog idempoten (serentak), skor dari butir [V], butir desa terpisah, tingkat dari penilaian", async () => {
    await Promise.all([1, 2, 3, 4].map((n) => drm.setReadiness(prisma, { villageId: vA, userId: 1, input: { code: "P8_A", status: n % 2 ? "SELESAI" : "SEDANG" } })));
    assert.equal(await prisma.drmReadinessItem.count({ where: { villageId: vA, code: "P8_A" } }), 1);
    assert.ok((await drm.setReadiness(prisma, { villageId: vA, userId: 1, input: { code: "P8_B", status: "SELESAI", note: "Perdes 2/2026" } })).ok);
    assert.ok(!(await drm.setReadiness(prisma, { villageId: vA, userId: 1, input: { code: "P8_ZZ", status: "SELESAI" } })).ok);
    const c = await drm.createCustomItem(prisma, { villageId: vA, userId: 1, input: { label: "Simulasi evakuasi tahunan", status: "SELESAI" } });
    assert.ok(c.ok);
    await drm.setReadiness(prisma, { villageId: vA, userId: 1, input: { code: "P8_A", status: "SELESAI" } });
    assert.ok((await drm.createAssessment(prisma, { villageId: vA, userId: 1, input: { kind: "PENILAIAN", doneOn: "2022-03-01", level: "PRATAMA" } })).ok);
    assert.ok((await drm.createAssessment(prisma, { villageId: vA, userId: 1, input: { kind: "PENILAIAN", doneOn: "2025-08-01", level: "MADYA", referenceNo: "BA/12" } })).ok);
    const r = await drm.getReadiness(prisma, { villageId: vA, today: "2026-11-01" });
    assert.equal(r.score.done, 2);
    assert.equal(r.score.total, 17);
    assert.equal(r.custom.length, 1, "butir desa tidak dihitung di skor");
    assert.equal(r.custom[0]!.verified, false);
    assert.equal(r.currentLevel?.level, "MADYA", "tingkat terbaru dari penilaian, bukan dihitung aplikasi");
    assert.equal(r.items.find((i) => i.code === "P8_F")!.detected !== null, true, "ada ancaman tercatat → terdeteksi");
    assert.ok(r.findings.some((f) => f.code === "NO_EVALUATION"));
    const rb = await drm.getReadiness(prisma, { villageId: vB, today: "2026-11-01" });
    assert.equal(rb.score.done, 0);
    assert.equal(rb.custom.length, 0);
    assert.equal(rb.assessments.length, 0);
    const wrong = await drm.patchCustomItem(prisma, { villageId: vB, userId: 1, id: c.ok ? c.data.id : 0, input: { label: "Retas" } });
    assert.ok(!wrong.ok && wrong.status === 404);
    assert.ok(!(await drm.removeCustomItem(prisma, { villageId: vB, id: c.ok ? c.data.id : 0 })).ok);
  });

  describe("peringatan dini", () => {
    let acc: Record<string, number> = {};
    const fakePush = (log: { ids: number[] }[]) => async (_v: number, ids: number[]) => {
      log.push({ ids: [...ids] });
      return ids.length;
    };
    const input = (o: Record<string, unknown> = {}) => ({ level: "SIAGA", hazardType: "BANJIR", title: "Siaga banjir", message: "Warga RW 02 diminta bersiap mengungsi ke balai desa.", targetKind: "AREA", targets: [{ rw: "2", rt: "1" }], expectAccounts: 2, ...o });

    before(async () => {
      // RT 01/RW 02 ditulis "01"/"02"; satu warga menulis "1"/"2"; RT 02 RW 02; RW 03
      const mk = async (name: string, rt: string, rw: string, v = vA, status = "ACTIVE") => (await mkAcc(v, (await mkRes(v, name, { rt, rw })).id, status)).id;
      acc = {
        a: await mk("Warga A", "01", "02"),
        b: await mk("Warga B", "1", "2"),
        c: await mk("Warga C", "02", "02"),
        d: await mk("Warga D", "01", "03"),
        e: await mk("Warga E suspend", "01", "02", vA, "SUSPENDED"),
        f: await mk("Warga F desa lain", "01", "02", vB),
      };
      await prisma.deviceToken.createMany({ data: [acc.a, acc.b].map((accountId, i) => ({ accountType: "citizen", accountId, villageId: vA, expoToken: `ExponentPushToken[${tag}-${i}]`, platform: "android" })) });
    });

    it("penerima per RT/RW dinormalisasi ('01' dan '1' sama), akun nonaktif dan desa lain tidak ikut", async () => {
      const rt = await drm.resolveRecipients(prisma, { villageId: vA, targetKind: "AREA", targets: [{ rw: "2", rt: "1" }] });
      assert.deepEqual(rt.accountIds.sort((x, y) => x - y), [acc.a, acc.b].sort((x, y) => x! - y!));
      assert.equal(rt.devices, 2);
      const rw = await drm.resolveRecipients(prisma, { villageId: vA, targetKind: "AREA", targets: [{ rw: "02", rt: null }] });
      assert.ok(rw.accountIds.includes(acc.c!) && rw.accountIds.length === 3 && !rw.accountIds.includes(acc.e!) && !rw.accountIds.includes(acc.f!));
      const all = await drm.resolveRecipients(prisma, { villageId: vA, targetKind: "ALL", targets: [] });
      assert.ok(all.accountIds.includes(acc.d!) && !all.accountIds.includes(acc.f!) && !all.accountIds.includes(acc.e!));
      const noOne = await drm.resolveRecipients(prisma, { villageId: vA, targetKind: "AREA", targets: [{ rw: "9", rt: null }] });
      assert.equal(noOne.accounts, 0);
    });

    it("pratinjau tidak menulis apa pun; tanpa penerima ditolak tanpa catatan log", async () => {
      const before = await prisma.drmAlert.count({ where: { villageId: vA } });
      const pv = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ preview: true }), now: NOW, push: fakePush([]) });
      assert.ok(pv.ok && pv.data.preview && pv.data.accounts === 2 && pv.data.devices === 2 && pv.data.id === null);
      const none = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ targets: [{ rw: "9" }], expectAccounts: 0 }), now: NOW, push: fakePush([]) });
      assert.ok(!none.ok && none.status === 409);
      assert.equal(await prisma.drmAlert.count({ where: { villageId: vA } }), before);
    });

    it("kirim: kotak masuk tepat untuk sasaran (tipe system), push hanya ke akun itu, log SENT dengan jumlah perangkat", async () => {
      const log: { ids: number[] }[] = [];
      const inboxBefore = await prisma.userNotification.count({ where: { villageId: vA, type: "system", title: "[SIAGA] Siaga banjir RT 1" } });
      const r = await drm.sendAlert(prisma, { villageId: vA, userId: 5, input: input({ title: "Siaga banjir RT 1" }), now: NOW, push: fakePush(log) });
      assert.ok(r.ok && !r.data.preview);
      if (!r.ok) return;
      await r.data.done;
      assert.equal(log.length, 1);
      assert.deepEqual(log[0]!.ids.sort((x, y) => x - y), [acc.a, acc.b].sort((x, y) => x! - y!));
      const inbox = await prisma.userNotification.findMany({ where: { villageId: vA, type: "system", title: "[SIAGA] Siaga banjir RT 1" } });
      assert.equal(inbox.length - inboxBefore, 2);
      assert.deepEqual(inbox.map((n) => n.accountId).sort(), [acc.a, acc.b].sort());
      assert.ok(inbox.every((n) => n.accountType === "citizen" && n.deepLink === null));
      const row = await prisma.drmAlert.findUniqueOrThrow({ where: { id: r.data.id! } });
      assert.equal(row.status, "SENT");
      assert.equal(row.deviceCount, 2);
      assert.equal(row.recipientAccounts, 2);
      assert.equal(row.createdById, 5);
      assert.deepEqual(row.targets, [{ rw: "2", rt: "1" }]);
      // desa lain tidak menerima apa pun
      assert.equal(await prisma.userNotification.count({ where: { villageId: vB, title: { contains: "Siaga banjir RT 1" } } }), 0);
    });

    it("push yang gagal menandai log FAILED tanpa membatalkan kotak masuk; kejadian milik desa lain ditolak", async () => {
      const r = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ title: "Uji gagal push" }), now: NOW, push: async () => { throw new Error("boom"); } });
      assert.ok(r.ok);
      if (r.ok) {
        await r.data.done;
        assert.equal((await prisma.drmAlert.findUniqueOrThrow({ where: { id: r.data.id! } })).status, "FAILED");
        assert.equal(await prisma.userNotification.count({ where: { villageId: vA, title: "[SIAGA] Uji gagal push" } }), 2);
      }
      const evB = await ev(vB);
      const x = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ eventId: evB }), now: NOW, push: fakePush([]) });
      assert.ok(!x.ok && x.status === 404);
      const evK = await ev(vA, {}, "KEAMANAN");
      const y = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ eventId: evK }), now: NOW, push: fakePush([]) });
      assert.ok(!y.ok && y.status === 404, "kejadian keamanan bukan sasaran peringatan bencana");
    });

    it("KONKURENSI: batas 10 siaran per 24 jam desa tidak dapat ditembus oleh permintaan serentak", async () => {
      const village = (await prisma.village.create({ data: { code: `BR${tag}`.slice(0, 20), name: "BR", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
      try {
        const res = await mkRes(village, "Penerima Batas");
        await mkAcc(village, res.id);
        const rs = await Promise.all(Array.from({ length: 16 }, (_, i) => drm.sendAlert(prisma, { villageId: village, userId: 1, input: input({ targetKind: "ALL", targets: undefined, title: `Siaran ${i}`, expectAccounts: 1 }), now: NOW, push: fakePush([]) })));
        for (const r of rs) if (r.ok) await r.data.done;
        assert.equal(rs.filter((r) => r.ok).length, 10, JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.status))));
        assert.ok(rs.filter((r) => !r.ok).every((r) => !r.ok && r.status === 429));
        assert.equal(await prisma.drmAlert.count({ where: { villageId: village } }), 10);
        const list = await drm.listAlerts(prisma, { villageId: village, pageSize: 5 });
        assert.equal(list.total, 10);
        assert.equal(list.rows.length, 5);
        assert.equal(list.rows[0]!.targetLabel, "Seluruh desa");
        assert.equal((await drm.listAlerts(prisma, { villageId: vB })).rows.some((a) => a.title.startsWith("Siaran")), false);
      } finally {
        await prisma.village.delete({ where: { id: village } });
      }
    });

    it("PRATINJAU WAJIB: tanpa expectAccounts ditolak 400; jumlah berbeda ditolak 409 tanpa jejak; judul notifikasi diberi label tingkat oleh server", async () => {
      const logsBefore = await prisma.drmAlert.count({ where: { villageId: vA } });
      const inboxBefore = await prisma.userNotification.count({ where: { villageId: vA } });
      const noPv = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ title: "Tanpa pratinjau", expectAccounts: undefined }), now: NOW, push: fakePush([]) });
      assert.ok(!noPv.ok && noPv.status === 400 && noPv.fieldErrors?.expectAccounts);
      const stale = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ title: "Jumlah usang", expectAccounts: 1 }), now: NOW, push: fakePush([]) });
      assert.ok(!stale.ok && stale.status === 409 && /Jumlah penerima berubah/.test(stale.errors[0]!));
      const bogus = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ title: "Jumlah aneh", expectAccounts: "1e1" }), now: NOW, push: fakePush([]) });
      assert.ok(!bogus.ok && bogus.status === 400);
      assert.equal(await prisma.drmAlert.count({ where: { villageId: vA } }), logsBefore);
      assert.equal(await prisma.userNotification.count({ where: { villageId: vA } }), inboxBefore);
      const ok = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ title: "Label tingkat", level: "AWAS" }), now: NOW, push: fakePush([]) });
      assert.ok(ok.ok);
      if (ok.ok) await ok.data.done;
      const n = await prisma.userNotification.findFirstOrThrow({ where: { villageId: vA, title: { contains: "Label tingkat" } } });
      assert.equal(n.title, "[AWAS] Label tingkat");
    });

    it("isi siaran: tautan, alamat situs, dan nomor panjang ditolak sebelum menulis apa pun", async () => {
      const logsBefore = await prisma.drmAlert.count({ where: { villageId: vA } });
      for (const o of [{ message: "Transfer bantuan ke rekening 1234567890 atas nama desa." }, { title: "Cek bantuan.id sekarang" }, { message: "Klik https://bantuan-desa.xyz untuk mendaftar bantuan." }, { title: "[AWAS] Palsu" }]) {
        const r = await drm.sendAlert(prisma, { villageId: vA, userId: 1, input: input({ title: "Isi uji tolak", ...o }), now: NOW, push: fakePush([]) });
        assert.ok(!r.ok && r.status === 400, JSON.stringify(o));
      }
      assert.equal(await prisma.drmAlert.count({ where: { villageId: vA } }), logsBefore);
    });

    it("KONKURENSI: siaran identik (judul + pesan + sasaran) serentak/berurutan dalam 2 menit → tepat satu lolos", async () => {
      const village = (await prisma.village.create({ data: { code: `BT${tag}`.slice(0, 20), name: "BT", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
      try {
        await mkAcc(village, (await mkRes(village, "Penerima Kembar")).id);
        const send = (o: Record<string, unknown> = {}, at = NOW) => drm.sendAlert(prisma, { villageId: village, userId: 1, input: input({ targetKind: "ALL", targets: undefined, expectAccounts: 1, title: "Siaga kembar", ...o }), now: at, push: fakePush([]) });
        const rs = await Promise.all(Array.from({ length: 6 }, () => send()));
        for (const r of rs) if (r.ok) await r.data.done;
        assert.equal(rs.filter((r) => r.ok).length, 1, JSON.stringify(rs.map((r) => (r.ok ? "ok" : r.status))));
        assert.ok(rs.filter((r) => !r.ok).every((r) => !r.ok && r.status === 409 && /sama persis/.test(r.errors[0]!)));
        assert.equal(await prisma.drmAlert.count({ where: { villageId: village } }), 1);
        // Isi berbeda: sah. Sasaran sama dengan huruf kapital berbeda: tetap kembar. Setelah 2 menit: sah lagi.
        const diff = await send({ message: "Pesan lain yang berbeda isinya sama sekali." });
        assert.ok(diff.ok);
        if (diff.ok) await diff.data.done;
        const again = await send({ title: "SIAGA KEMBAR" });
        assert.ok(!again.ok && again.status === 409, "judul beda huruf besar tetap kembar (kolasi tak peka huruf)");
        const later = await send({}, new Date(NOW.getTime() + 3 * 60_000));
        assert.ok(later.ok);
        if (later.ok) await later.data.done;
      } finally {
        await prisma.village.delete({ where: { id: village } });
      }
    });

    it("pilihan wilayah dari data warga digabung bila hanya beda nol di depan", async () => {
      const opts = await drm.areaOptions(prisma, { villageId: vA });
      const rt1rw2 = opts.filter((o) => Number(o.rw) === 2 && o.rt && Number(o.rt) === 1);
      assert.equal(rt1rw2.length, 1, JSON.stringify(opts));
      assert.ok(rt1rw2[0]!.residents >= 3);
    });
  });

  it("izin menutup ditegakkan di servis: Kepala Desa (approve tanpa update) dapat menutup tetapi tidak menangani; staf tidak dapat menutup", async () => {
    const KADES = { update: false, approve: true };
    const id = await ev(vA);
    assert.ok((await go(vA, id, "RESPONDING")).ok);
    assert.ok((await resp(vA, id)).ok);
    assert.ok((await go(vA, id, "RESOLVED", "Selesai ditangani dengan baik")).ok);
    const staff = await go(vA, id, "CLOSED", null, CAN_UPD);
    assert.ok(!staff.ok && staff.status === 403, "staf tidak boleh menutup");
    const kdCannotHandle = await go(vA, await ev(vA), "RESPONDING", null, KADES);
    assert.ok(!kdCannotHandle.ok && kdCannotHandle.status === 403, "Kepala Desa tidak mengubah status penanganan");
    assert.ok((await go(vA, id, "CLOSED", null, KADES)).ok, "Kepala Desa menutup");
    assert.ok((await go(vA, id, "RESPONDING", "Ada susulan banjir lagi", KADES)).ok, "Kepala Desa membuka kembali");
  });

  it("distribusi ke penerima non-KK yang sama + barang yang sama memunculkan peringatan (bukan blokir)", async () => {
    const id = await ev(vA);
    const add = (o: Record<string, unknown> = {}) => inc.addLogistic(prisma, { domain: "BENCANA", villageId: vA, id, userId: 1, now: NOW, input: { recipientName: "Posko  Balai Desa", item: "Tikar", quantity: 5, unit: "lembar", fundingSource: "DONASI", distributedOn: "2026-11-01", ...o } });
    const a = await add();
    assert.ok(a.ok && a.data.warnings.length === 0);
    const b = await add({ recipientName: "posko balai desa", quantity: 3 });
    assert.ok(b.ok && b.data.warnings.length === 1 && /sudah pernah menerima/.test(b.data.warnings[0]!), "nama beda huruf/spasi tetap dikenali");
    const c = await add({ recipientName: "Posko Balai Dusun" });
    assert.ok(c.ok && c.data.warnings.length === 0, "penerima lain");
    const d = await add({ item: "Selimut" });
    assert.ok(d.ok && d.data.warnings.length === 0, "barang lain");
  });

  it("ringkasan domain: hitungan per status dan dampak tahun berjalan tanpa data pribadi", async () => {
    const v = (await prisma.village.create({ data: { code: `BS${tag}`.slice(0, 20), name: "BS", district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } })).id;
    try {
      await ev(v, { deathCount: 1, displacedCount: 40, affectedHouseholds: 12 });
      const second = await ev(v, { damagedHouses: 5, displacedCount: 10 });
      await go(v, second, "RESPONDING");
      const old = await ev(v, { occurredAt: "2025-03-01T01:00:00Z", deathCount: 9 });
      void old;
      const s = await inc.domainSummary(prisma, { domain: "BENCANA", villageId: v, now: NOW });
      assert.equal(s.byStatus.OPEN, 2);
      assert.equal(s.byStatus.RESPONDING, 1);
      assert.equal(s.active, 3);
      assert.equal(s.yearToDate, 2);
      assert.deepEqual(s.impactYear, { deaths: 1, missing: 0, injured: 0, displaced: 50, households: 12, houses: 5 });
      assert.equal((await inc.domainSummary(prisma, { domain: "KEAMANAN", villageId: v, now: NOW })).active, 0);
    } finally {
      await prisma.village.delete({ where: { id: v } });
    }
  });
});
