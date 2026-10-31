/**
 * Tes integrasi usulan perubahan data (maker-checker) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("usulan perubahan data (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/proposals/service");
  let cd: typeof import("../lib/custom-data/service");
  let keys: typeof import("../lib/api-keys/keys");
  let route: typeof import("../app/api/v1/data/[slug]/usulan/route");
  let vA = 0;
  let vB = 0;
  let tableId = 0;
  let strictTableId = 0;
  let otherTableId = 0;
  let keyProp = { secret: "", id: 0, prefix: "", name: "Aplikasi usul" };
  let keyRead = "";
  let keyProp2 = { secret: "", id: 0, prefix: "", name: "Aplikasi lain" };

  const submit = (data: unknown, over: Partial<Parameters<typeof svc.submitProposal>[1]> = {}, key = keyProp) =>
    svc.submitProposal(prisma, { villageId: vA, key: { id: key.id, prefix: key.prefix, name: key.name }, slug: "penerima-bantuan", body: data, ...over });
  const decide = (id: string, decision: "approve" | "reject", over: { villageId?: number; reason?: string; now?: Date } = {}) =>
    svc.decideProposal(prisma, { villageId: over.villageId ?? vA, id: BigInt(id), userId: 1, decision, reason: over.reason, now: over.now });
  const countRecords = (tid = tableId) => prisma.customRecord.count({ where: { tableId: tid, deletedAt: null } });
  const http = async (secret: string, method: "GET" | "POST", slug: string, body?: unknown) => {
    const req = new Request(`http://localhost/api/v1/data/${slug}/usulan`, { method, headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const res = await (method === "GET" ? route.GET : route.POST)(req, { params: Promise.resolve({ slug }) });
    return { status: res.status, body: await res.json() };
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/proposals/service");
    cd = await import("../lib/custom-data/service");
    keys = await import("../lib/api-keys/keys");
    route = await import("../app/api/v1/data/[slug]/usulan/route");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("PA")).id;
    vB = (await mkV("PB")).id;
    const mkK = async (name: string, scopes: string[]) => {
      const r = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name, scopes: scopes as never, expiresInDays: null });
      assert.ok(r.ok);
      return r.ok ? { secret: r.secret, id: r.key.id, prefix: r.key.prefix, name } : keyProp;
    };
    keyProp = await mkK("Aplikasi usul", ["data-kustom:propose"]);
    keyProp2 = await mkK("Aplikasi lain", ["data-kustom:propose"]);
    keyRead = (await mkK("Hanya baca", ["data-kustom:read"])).secret;

    const a = await cd.createTable(prisma, {
      villageId: vA,
      userId: 1,
      input: {
        name: "Penerima Bantuan",
        fields: [
          { label: "Nama Penerima", type: "text", required: true },
          { label: "Jenis Bantuan", type: "select", options: ["Beras", "Uang"] },
          { label: "Jumlah", type: "number", options: { min: 0, max: 100 } },
          { label: "Catatan Kesehatan", type: "longtext", piiClass: "SENSITIVE" },
          { label: "No HP", type: "text", piiClass: "PERSONAL" },
        ],
      },
    });
    assert.ok(a.ok);
    tableId = a.ok ? a.data.id : 0;
    const s = await cd.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Wajib Pribadi", fields: [{ label: "Nama", type: "text", required: true }, { label: "Telepon", type: "text", required: true, piiClass: "PERSONAL" }] } });
    assert.ok(s.ok);
    strictTableId = s.ok ? s.data.id : 0;
    const o = await cd.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Tabel Lain", fields: [{ label: "Nama", type: "text" }] } });
    assert.ok(o.ok);
    otherTableId = o.ok ? o.data.id : 0;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });
  const cleanProposals = () => prisma.changeProposal.deleteMany({ where: { villageId: vA } });

  it("usulan tambah baris diterima tetapi DATA BELUM BERUBAH", async () => {
    const r = await submit({ operation: "create", data: { nama_penerima: "Budi", jumlah: 5 }, note: "Dari form kecamatan" });
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    assert.equal(await countRecords(), 0, "tidak ada baris sebelum disetujui");
    const row = await prisma.changeProposal.findFirstOrThrow({ where: { villageId: vA } });
    assert.equal(row.status, "PENDING");
    assert.equal(row.source, "api_key");
    assert.equal(row.keyPrefix, keyProp.prefix);
    assert.deepEqual(row.payload, { nama_penerima: "Budi", jumlah: 5 });
    assert.ok(row.expiresAt.getTime() > Date.now() + 29 * 86_400_000);
    await cleanProposals();
  });

  it("kolom pribadi/sensitif, tak dikenal, dan kunci berbahaya ditolak dengan pesan jelas", async () => {
    for (const [data, re] of [
      [{ nama_penerima: "X", no_hp: "0812" }, /No HP.*data pribadi/],
      [{ nama_penerima: "X", catatan_kesehatan: "diabetes" }, /Catatan Kesehatan.*data pribadi/],
      [{ nama_penerima: "X", ngawur: 1 }, /tidak dikenal/],
    ] as const) {
      const r = await submit({ operation: "create", data });
      assert.equal(r.ok, false);
      assert.match(!r.ok ? r.errors.join(" ") : "", re);
    }
    const proto = await submit({ operation: "create", data: JSON.parse('{"nama_penerima":"X","__proto__":{"x":1}}') });
    assert.equal(proto.ok, false, "__proto__ ditolak");
    assert.equal(await prisma.changeProposal.count({ where: { villageId: vA } }), 0, "ditolak = tidak ada baris usulan");
  });

  it("validasi tipe dan batas mengikuti skema; masukan bentuk salah ditolak", async () => {
    assert.equal((await submit({ operation: "create", data: { nama_penerima: "X", jumlah: 999 } })).ok, false, "melewati batas angka");
    assert.equal((await submit({ operation: "create", data: { jenis_bantuan: "Emas", nama_penerima: "X" } })).ok, false, "pilihan tak ada");
    assert.equal((await submit({ operation: "create", data: { jumlah: 3 } })).ok, false, "kolom wajib kosong");
    assert.equal((await submit({ operation: "create", data: {} })).ok, false);
    for (const bad of [null, "teks", [], { operation: "hapus", data: { a: 1 } }, { operation: "create" }, { operation: "create", data: [] }]) {
      assert.equal((await submit(bad)).ok, false, JSON.stringify(bad));
    }
    assert.equal((await submit({ operation: "create", data: { nama_penerima: "X" } }, { slug: "tidak-ada" })).ok, false);
    assert.equal(await prisma.changeProposal.count({ where: { villageId: vA } }), 0);
  });

  it("tabel dengan kolom WAJIB pribadi: tak bisa mengusulkan baris baru", async () => {
    const r = await submit({ operation: "create", data: { nama: "Budi" } }, { slug: "wajib-pribadi" });
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.status, 409);
    assert.match(!r.ok ? r.errors[0] : "", /Telepon/);
  });

  it("usulan ubah: baris harus ada di tabel itu dan desa itu; hanya kolom yang disebut yang diusulkan", async () => {
    const rec = await cd.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "Siti", jumlah: 1, no_hp: "0812" } });
    assert.ok(rec.ok);
    const id = rec.ok ? rec.data.id : "0";
    const ok = await submit({ operation: "update", recordId: id, data: { jumlah: 9 } });
    assert.ok(ok.ok, ok.ok ? "" : ok.errors.join());
    const row = await prisma.changeProposal.findFirstOrThrow({ where: { villageId: vA } });
    assert.deepEqual(row.payload, { jumlah: 9 });
    assert.equal(String(row.targetRecordId), id);

    assert.equal((await submit({ operation: "update", data: { jumlah: 9 } })).ok, false, "tanpa recordId");
    assert.equal((await submit({ operation: "update", recordId: "abc", data: { jumlah: 9 } })).ok, false);
    assert.equal((await submit({ operation: "update", recordId: "999999999", data: { jumlah: 9 } })).ok, false, "baris tak ada");
    assert.equal((await submit({ operation: "update", recordId: id, data: { jumlah: 9 } }, { slug: "tabel-lain" })).ok, false, "baris milik tabel lain");
    // mengosongkan kolom opsional = null
    const clear = await submit({ operation: "update", recordId: id, data: { jumlah: null } });
    assert.ok(clear.ok);
    assert.deepEqual((await prisma.changeProposal.findFirstOrThrow({ where: { villageId: vA }, orderBy: { id: "desc" } })).payload, { jumlah: null });
    await cleanProposals();
    await prisma.customRecord.deleteMany({ where: { tableId } });
  });

  it("persetujuan menerapkan perubahan lewat jalur operator, sekali saja; baris tercipta bertautan", async () => {
    const r = await submit({ operation: "create", data: { nama_penerima: "Budi", jenis_bantuan: "Beras" } });
    assert.ok(r.ok);
    const id = r.ok ? r.data.id : "0";
    const d = await decide(id, "approve");
    assert.ok(d.ok, d.ok ? "" : d.errors.join());
    assert.equal(await countRecords(), 1);
    const rec = await prisma.customRecord.findFirstOrThrow({ where: { tableId } });
    assert.deepEqual(rec.data, { nama_penerima: "Budi", jenis_bantuan: "Beras" });
    const row = await prisma.changeProposal.findUniqueOrThrow({ where: { id: BigInt(id) } });
    assert.equal(row.status, "APPLIED");
    assert.equal(row.appliedRecordId, rec.id);
    assert.equal(row.decidedById, 1);
    assert.ok(row.decidedAt);

    const again = await decide(id, "approve");
    assert.equal(again.ok, false);
    assert.equal(!again.ok && again.status, 409);
    assert.equal(await countRecords(), 1, "tidak diterapkan dua kali");
    await cleanProposals();
  });

  it("dua admin menyetujui bersamaan: tepat satu baris tercipta", async () => {
    const r = await submit({ operation: "create", data: { nama_penerima: "Balapan" } });
    assert.ok(r.ok);
    const id = r.ok ? r.data.id : "0";
    const before = await countRecords();
    const res = await Promise.all([decide(id, "approve"), decide(id, "approve"), decide(id, "approve")]);
    assert.equal(res.filter((x) => x.ok).length, 1);
    assert.equal(await countRecords(), before + 1);
    await cleanProposals();
  });

  it("usulan ubah disetujui memperbarui baris; kolom pribadi baris itu tak tersentuh", async () => {
    const rec = await cd.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "Siti", jumlah: 1, no_hp: "0812-RAHASIA" } });
    assert.ok(rec.ok);
    const rid = rec.ok ? rec.data.id : "0";
    const p = await submit({ operation: "update", recordId: rid, data: { jumlah: 7 } });
    assert.ok(p.ok);
    const list = await svc.listProposals(prisma, { villageId: vA });
    assert.deepEqual(list[0].changes, [{ key: "jumlah", label: "Jumlah", type: "number", value: 7, before: 1 }]);
    assert.ok(!JSON.stringify(list).includes("RAHASIA"), "daftar usulan tidak membocorkan kolom lain");
    const d = await decide(p.ok ? p.data.id : "0", "approve");
    assert.ok(d.ok);
    const after = await prisma.customRecord.findUniqueOrThrow({ where: { id: BigInt(rid) } });
    assert.deepEqual(after.data, { nama_penerima: "Siti", jumlah: 7, no_hp: "0812-RAHASIA" });
    await cleanProposals();
    await prisma.customRecord.deleteMany({ where: { tableId } });
  });

  it("tidak bisa diterapkan (baris sudah dihapus): semua dibatalkan, usulan tetap menunggu", async () => {
    const rec = await cd.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "Hilang" } });
    assert.ok(rec.ok);
    const rid = rec.ok ? rec.data.id : "0";
    const p = await submit({ operation: "update", recordId: rid, data: { jumlah: 2 } });
    assert.ok(p.ok);
    await cd.deleteRecord(prisma, { villageId: vA, recordId: BigInt(rid), userId: 1 });
    const d = await decide(p.ok ? p.data.id : "0", "approve");
    assert.equal(d.ok, false);
    assert.match(!d.ok ? d.errors[0] : "", /Tidak bisa diterapkan/);
    const row = await prisma.changeProposal.findUniqueOrThrow({ where: { id: BigInt(p.ok ? p.data.id : "0") } });
    assert.equal(row.status, "PENDING", "klaim ikut dibatalkan");
    assert.equal(row.decidedAt, null);
    await decide(p.ok ? p.data.id : "0", "reject", { reason: "Baris sudah tidak ada" });
    await cleanProposals();
    await prisma.customRecord.deleteMany({ where: { tableId } });
  });

  it("penolakan menyimpan alasan, tidak mengubah data, dan terlihat oleh aplikasi pengusul", async () => {
    const p = await submit({ operation: "create", data: { nama_penerima: "Ditolak" } });
    assert.ok(p.ok);
    const id = p.ok ? p.data.id : "0";
    const d = await decide(id, "reject", { reason: "  Data ganda  " });
    assert.ok(d.ok && d.data.status === "REJECTED");
    assert.equal(await countRecords(), 0);
    const own = await svc.listOwnProposals(prisma, { villageId: vA, keyId: keyProp.id, slug: "penerima-bantuan" });
    assert.equal(own?.[0].status, "REJECTED");
    assert.equal(own?.[0].rejectionReason, "Data ganda");
    assert.deepEqual(await svc.listOwnProposals(prisma, { villageId: vA, keyId: keyProp2.id, slug: "penerima-bantuan" }), [], "kunci lain tidak melihat usulan ini");
    assert.equal(await svc.listOwnProposals(prisma, { villageId: vB, keyId: keyProp.id, slug: "penerima-bantuan" }), null, "desa lain tidak punya tabel itu");
    await cleanProposals();
  });

  it("kolom yang kemudian ditandai pribadi: persetujuan ditolak dan nilainya tak tampil di daftar", async () => {
    const p = await submit({ operation: "create", data: { nama_penerima: "Rahasia-Kolom" } });
    assert.ok(p.ok);
    await prisma.customField.updateMany({ where: { tableId, key: "nama_penerima" }, data: { piiClass: "PERSONAL" } });
    const list = await svc.listProposals(prisma, { villageId: vA });
    assert.ok(!JSON.stringify(list).includes("Rahasia-Kolom"), "nilai kolom yang kini pribadi disembunyikan");
    const d = await decide(p.ok ? p.data.id : "0", "approve");
    assert.equal(d.ok, false);
    assert.match(!d.ok ? d.errors[0] : "", /data pribadi/);
    assert.equal(await countRecords(), 0);
    await prisma.customField.updateMany({ where: { tableId, key: "nama_penerima" }, data: { piiClass: "NONE" } });
    await cleanProposals();
  });

  it("kolom bernama constructor tak merusak usulan (tanpa 500)", async () => {
    const t = await cd.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Konstruktor", fields: [{ label: "Constructor", type: "text" }, { label: "Nama", type: "text" }] } });
    assert.ok(t.ok);
    const r = await submit({ operation: "create", data: { nama: "A", constructor: null } }, { slug: t.ok ? t.data.slug : "" });
    assert.ok(r.ok || r.status === 422, "ditolak rapi atau diterima, bukan melempar galat");
    await cleanProposals();
  });

  it("desa lain tidak bisa memutuskan usulan; usulan kedaluwarsa tidak bisa diterapkan", async () => {
    const p = await submit({ operation: "create", data: { nama_penerima: "Isolasi" } });
    assert.ok(p.ok);
    const id = p.ok ? p.data.id : "0";
    const cross = await decide(id, "approve", { villageId: vB });
    assert.equal(!cross.ok && cross.status, 404);
    assert.equal(await countRecords(), 0);

    const late = new Date(Date.now() + (svc.PROPOSAL_TTL_DAYS + 1) * 86_400_000);
    const exp = await decide(id, "approve", { now: late });
    assert.equal(!exp.ok && exp.status, 410);
    assert.equal((await prisma.changeProposal.findUniqueOrThrow({ where: { id: BigInt(id) } })).status, "EXPIRED");
    assert.equal(await countRecords(), 0);
    await cleanProposals();
  });

  it("batas usulan menunggu per kunci; kunci lain tetap bisa mengusulkan", async () => {
    for (let i = 0; i < svc.MAX_PENDING_PER_KEY; i++) assert.ok((await submit({ operation: "create", data: { nama_penerima: `N${i}` } })).ok);
    const over = await submit({ operation: "create", data: { nama_penerima: "Lebih" } });
    assert.equal(!over.ok && over.status, 429);
    assert.ok((await submit({ operation: "create", data: { nama_penerima: "Kunci lain" } }, {}, keyProp2)).ok);
    await cleanProposals();
  });

  it("antarmuka /api/v1: POST → 202 menunggu; scope baca tak bisa mengusulkan; GET melihat status; data tak berubah", async () => {
    const denied = await http(keyRead, "POST", "penerima-bantuan", { operation: "create", data: { nama_penerima: "X" } });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error.code, "insufficient_scope");

    const ok = await http(keyProp.secret, "POST", "penerima-bantuan", { operation: "create", data: { nama_penerima: "Lewat API" } });
    assert.equal(ok.status, 202);
    assert.equal(ok.body.data.status, "PENDING");
    assert.equal(await countRecords(), 0);

    const bad = await http(keyProp.secret, "POST", "penerima-bantuan", { operation: "create", data: { nama_penerima: "X", no_hp: "1" } });
    assert.equal(bad.status, 422);
    assert.match(bad.body.error.message, /data pribadi/);
    assert.equal((await http(keyProp.secret, "POST", "tidak-ada", { operation: "create", data: { a: 1 } })).status, 404);
    assert.equal((await http(keyProp.secret, "POST", "Bad Slug!", {})).status, 400);

    const list = await http(keyProp.secret, "GET", "penerima-bantuan");
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].status, "PENDING");
    assert.equal((await http(keyRead, "GET", "penerima-bantuan")).status, 403);
    await cleanProposals();
  });

  it("webhook usulan.baru hanya terkirim ke tujuan yang berlangganan (tanpa isi usulan)", async () => {
    const wh = await import("../lib/webhooks/service");
    const ep = await wh.createEndpoint(prisma, { villageId: vA, userId: 1, name: "Admin", url: "https://webhook.invalid/h", events: ["usulan.baru"] });
    assert.ok(ep.ok);
    await http(keyProp.secret, "POST", "penerima-bantuan", { operation: "create", data: { nama_penerima: "Rahasia123" } });
    await new Promise((r) => setTimeout(r, 400));
    const dl = await prisma.webhookDelivery.findMany({ where: { villageId: vA, eventType: "usulan.baru" } });
    assert.ok(dl.length >= 1);
    assert.ok(!JSON.stringify(dl[0].payload).includes("Rahasia123"), "payload webhook tidak memuat isi usulan");
    await prisma.webhookEndpoint.deleteMany({ where: { villageId: vA } });
    await cleanProposals();
  });

  it("menghapus desa menghapus usulannya", async () => {
    const t = Date.now() % 1e6;
    const v = await prisma.village.create({ data: { code: `PZ${t}`, name: "Sementara", district: "k", regency: "r", province: "p", address: "a" } });
    await prisma.changeProposal.create({ data: { villageId: v.id, source: "api_key", entity: "custom_record", operation: "create", tableId: 1, payload: {}, expiresAt: new Date() } });
    await prisma.village.delete({ where: { id: v.id } });
    assert.equal(await prisma.changeProposal.count({ where: { villageId: v.id } }), 0);
    void otherTableId;
    void strictTableId;
  });
});
