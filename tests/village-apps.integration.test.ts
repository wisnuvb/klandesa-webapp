/** Tes integrasi Aplikasi Desa (templat, tinjauan, pasang, dasbor) terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Aplikasi Desa (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let apps: typeof import("../lib/village-apps/service");
  let cd: typeof import("../lib/custom-data/service");
  let vA = 0;
  let vB = 0;
  let vC = 0;
  let tableId = 0;
  let templateId = 0;
  let lineage = "";

  const submit = (over: Partial<Parameters<typeof apps.submitTemplate>[1]> = {}) =>
    apps.submitTemplate(prisma, { villageId: vA, villageName: "Desa A", userId: 1, tableIds: [tableId], name: "Posyandu Praktis", description: "Catat kunjungan posyandu.", ...over });
  const install = (villageId: number, id = templateId) => apps.installTemplate(prisma, { villageId, userId: 1, templateId: id });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    apps = await import("../lib/village-apps/service");
    cd = await import("../lib/custom-data/service");
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("AA")).id;
    vB = (await mkV("AB")).id;
    vC = (await mkV("AC")).id;
    const tb = await cd.createTable(prisma, {
      villageId: vA,
      userId: 1,
      input: {
        name: "Kunjungan Posyandu",
        fields: [
          { label: "Nama Balita", type: "text", required: true, piiClass: "PERSONAL" },
          { label: "Status Gizi", type: "select", options: ["Baik", "Kurang"] },
          { label: "Berat", type: "number", options: { min: 0, max: 40 } },
          { label: "Catatan Bidan", type: "longtext", piiClass: "SENSITIVE" },
        ],
      },
    });
    assert.ok(tb.ok);
    tableId = tb.ok ? tb.data.id : 0;
    // data milik desa A yang TIDAK boleh ikut templat
    await cd.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_balita: "RAHASIA-ANAK", status_gizi: "Baik", berat: 12, catatan_bidan: "RAHASIA-MEDIS" } });
  });
  after(async () => {
    for (const id of [vA, vB, vC]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.appTemplate.deleteMany({ where: { publisherName: { in: ["Desa A", "Resmi"] } } });
    await prisma.$disconnect();
  });

  it("mengajukan templat: hanya skema, tanpa baris data; menunggu tinjauan dan belum tampil di galeri", async () => {
    const r = await submit();
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    templateId = r.ok ? r.data.id : 0;
    const row = await prisma.appTemplate.findUniqueOrThrow({ where: { id: templateId } });
    lineage = row.lineageKey;
    assert.equal(row.status, "PENDING");
    assert.equal(row.version, 1);
    assert.equal(row.publisherVillageId, vA);
    const json = JSON.stringify(row.manifest);
    assert.ok(!/RAHASIA/.test(json), "tidak ada isi baris di manifes");
    assert.ok(json.includes('"piiClass":"PERSONAL"') && json.includes('"piiClass":"SENSITIVE"'), "kelas data ikut");
    const g = await apps.listGallery(prisma, vB);
    assert.ok(!g.published.some((p) => p.lineageKey === lineage), "belum ditinjau → tak terlihat desa lain");
    assert.equal((await apps.getTemplateDetail(prisma, vB, templateId)), null, "desa lain tak bisa melihat PENDING");
    assert.equal((await apps.listGallery(prisma, vA)).mine.length, 1);
    assert.equal((await install(vB)).ok, false, "PENDING tak bisa dipasang");
    assert.equal(!(await install(vB)).ok && (await install(vB) as { status: number }).status, 404);
  });

  it("masukan buruk ditolak; tabel desa lain tidak bisa dibagikan", async () => {
    assert.equal((await submit({ name: " " })).ok, false);
    assert.equal((await submit({ description: "" })).ok, false);
    assert.equal((await submit({ tableIds: [] })).ok, false);
    assert.equal((await submit({ tableIds: "x" })).ok, false);
    assert.equal((await submit({ tableIds: [tableId], villageId: vB, villageName: "Desa B" })).ok, false, "tabel milik desa A, diajukan desa B");
    assert.equal((await submit({ lineageKey: "app_tidakada" })).ok, false);
  });

  it("peninjau melihat peringatan; menolak butuh alasan; keputusan hanya sekali", async () => {
    const list = await apps.listForReview(prisma, "PENDING");
    const item = list.find((x) => x.id === templateId);
    assert.ok(item);
    assert.ok(item!.tables[0].fields.some((f) => f.piiClass === "SENSITIVE"));
    assert.equal((await apps.decideTemplate(prisma, { id: templateId, adminId: 1, decision: "reject" })).ok, false, "tanpa alasan");
    assert.equal((await apps.decideTemplate(prisma, { id: 999999, adminId: 1, decision: "approve" })).ok, false);
    const ok = await apps.decideTemplate(prisma, { id: templateId, adminId: 1, decision: "approve", note: "Rapi" });
    assert.ok(ok.ok);
    const again = await apps.decideTemplate(prisma, { id: templateId, adminId: 1, decision: "reject", note: "x" });
    assert.equal(!again.ok && again.status, 409);
    assert.equal((await prisma.appTemplate.findUniqueOrThrow({ where: { id: templateId } })).status, "PUBLISHED");
  });

  it("setelah terbit: tampil di galeri desa lain dengan ringkasan; pemasangan membuat tabel TANPA data", async () => {
    const g = await apps.listGallery(prisma, vB);
    const card = g.published.find((p) => p.lineageKey === lineage);
    assert.ok(card, "tampil di galeri");
    assert.equal(card!.summary.tables[0].personal, 1);
    assert.equal(card!.installed, false);
    const detail = await apps.getTemplateDetail(prisma, vB, templateId);
    assert.ok(Array.isArray(detail?.warnings), "peringatan otomatis juga terlihat oleh pemasang");
    assert.equal(detail?.reviewNote, null, "catatan internal peninjau tidak terlihat desa lain");
    const own = (await apps.listGallery(prisma, vA)).mine.find((m) => m.id === templateId);
    assert.equal(own?.reviewNote, "Rapi", "penerbit melihat catatannya");

    const r = await install(vB);
    const card2 = (await apps.listGallery(prisma, vB)).published.find((p) => p.lineageKey === lineage);
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    const tid = r.ok ? r.data.tableIds[0] : 0;
    const made = await cd.getTable(prisma, vB, { id: tid });
    assert.equal(made?.name, "Kunjungan Posyandu");
    assert.equal(made?.recordCount, 0, "tidak ada baris dari desa penerbit");
    const cls = Object.fromEntries((made?.fields ?? []).map((f) => [f.label, f.piiClass]));
    assert.deepEqual(cls, { "Nama Balita": "PERSONAL", "Status Gizi": "NONE", Berat: "NONE", "Catatan Bidan": "SENSITIVE" }, "kelas data terbawa persis");
    assert.equal((await prisma.customRecord.count({ where: { villageId: vB } })), 0);
    assert.equal(card2?.installCount, 1, "hitungan = jumlah desa");
    assert.equal((await apps.listGallery(prisma, vB)).published.find((p) => p.lineageKey === lineage)?.installed, true);
  });

  it("tidak bisa dipasang dua kali di desa yang sama; desa lain tetap bisa; tidak ada kunci API yang tercipta", async () => {
    const dup = await install(vB);
    assert.equal(!dup.ok && dup.status, 409);
    assert.equal(await prisma.customTable.count({ where: { villageId: vB } }), 1, "tidak ada tabel ganda");
    const c = await install(vC);
    assert.ok(c.ok);
    assert.equal(await prisma.apiKey.count({ where: { villageId: { in: [vB, vC] } } }), 0, "memasang tidak memberi akses API");
    assert.equal(await prisma.webhookEndpoint.count({ where: { villageId: { in: [vB, vC] } } }), 0);
  });

  it("dasbor: hitung, terbaru, rincian, dan total dihitung dari tabel desa itu sendiri (tidak bocor antar desa)", async () => {
    const inst = (await apps.listInstalls(prisma, vB))[0];
    const tableB = inst.tables[0].tableId;
    for (const [n, g, b] of [["Ani", "Baik", 10], ["Budi", "Kurang", 8], ["Cici", "Baik", 12]] as const) {
      const r = await cd.createRecord(prisma, { villageId: vB, tableId: tableB, userId: 1, data: { nama_balita: n, status_gizi: g, berat: b } });
      assert.ok(r.ok);
    }
    const d = await apps.getDashboard(prisma, { villageId: vB, id: inst.id });
    assert.ok(d);
    const by = (t: string) => d!.widgets.find((w) => w.type === t)!;
    assert.equal((by("count") as { value: number }).value, 3, "hanya 3 baris desa B, bukan baris desa A");
    const recent = by("recent") as { rows: { values: Record<string, unknown> }[] };
    assert.equal(recent.rows.length, 3);
    assert.equal(recent.rows[0].values.nama_balita, "Cici", "terbaru dulu");
    assert.ok(!JSON.stringify(d).includes("RAHASIA"), "data desa penerbit tidak muncul");
    const sum = d!.widgets.find((w) => w.type === "sum");
    assert.equal(sum, undefined, "templat otomatis hanya punya count dan recent");

    assert.equal(await apps.getDashboard(prisma, { villageId: vC, id: inst.id }), null, "desa lain tak bisa membuka dasbor ini");
    await prisma.customRecord.deleteMany({ where: { tableId: tableB } });
  });

  it("widget breakdown dan sum bekerja pada manifes buatan peninjau resmi", async () => {
    const manifest = {
      schemaVersion: 1,
      tables: [{ ref: "gizi", name: "Gizi Resmi", description: null, linkResident: false, fields: [{ label: "Status", type: "select", required: false, options: ["Baik", "Kurang"], piiClass: "NONE" }, { label: "Berat", type: "number", required: false, options: null, piiClass: "NONE" }] }],
      dashboard: [{ type: "breakdown", title: "Per status", table: "gizi", field: "Status" }, { type: "sum", title: "Total berat", table: "gizi", field: "Berat" }],
    };
    const t = await prisma.appTemplate.create({ data: { lineageKey: `app_uji${Date.now()}`, version: 1, publisherName: "Resmi", official: true, name: "Gizi Resmi", description: "x", manifest, manifestHash: "h", warnings: [], status: "PUBLISHED", publishedAt: new Date() } });
    const r = await install(vB, t.id);
    assert.ok(r.ok, r.ok ? "" : r.errors.join());
    const inst = (await apps.listInstalls(prisma, vB)).find((i) => i.name === "Gizi Resmi")!;
    const tid = inst.tables[0].tableId;
    for (const [s, w] of [["Baik", 10], ["Baik", 20], ["Kurang", 6]] as const) await cd.createRecord(prisma, { villageId: vB, tableId: tid, userId: 1, data: { status: s, berat: w } });
    await cd.createRecord(prisma, { villageId: vB, tableId: tid, userId: 1, data: { berat: 4 } });
    const d = await apps.getDashboard(prisma, { villageId: vB, id: inst.id });
    const br = d!.widgets.find((w) => w.type === "breakdown") as { items: { label: string; count: number }[] };
    assert.deepEqual(br.items.map((i) => [i.label, i.count]), [["Baik", 2], ["(kosong)", 1], ["Kurang", 1]]);
    const sum = d!.widgets.find((w) => w.type === "sum") as { total: number; average: number; filled: number };
    assert.deepEqual([sum.total, sum.filled, sum.average], [40, 4, 10]);

    // tabel diarsipkan → widget menyatakan tidak tersedia, bukan galat
    await prisma.customTable.update({ where: { id: tid }, data: { isArchived: true } });
    const d2 = await apps.getDashboard(prisma, { villageId: vB, id: inst.id });
    assert.ok(d2!.widgets.every((w) => w.available === false));
    await prisma.appInstall.deleteMany({ where: { templateId: t.id } });
    await prisma.appTemplate.delete({ where: { id: t.id } });
  });

  it("manifes tersimpan yang rusak/dimanipulasi tidak bisa dipasang", async () => {
    const t = await prisma.appTemplate.create({
      data: { lineageKey: `app_rusak${Date.now()}`, version: 1, publisherName: "Resmi", name: "Rusak", description: "x", manifest: { schemaVersion: 1, tables: [{ ref: "a", name: "A", fields: [{ label: "x", type: "text", piiClass: "NONE", script: "alert(1)" }] }], dashboard: [] }, manifestHash: "h", warnings: [], status: "PUBLISHED", publishedAt: new Date() },
    });
    const before = await prisma.customTable.count({ where: { villageId: vC } });
    const r = await install(vC, t.id);
    assert.equal(r.ok, false);
    assert.equal(await prisma.customTable.count({ where: { villageId: vC } }), before, "tidak ada tabel tercipta");
    assert.equal((await apps.decideTemplate(prisma, { id: t.id, adminId: 1, decision: "approve" })).ok, false, "sudah PUBLISHED");
    await prisma.appTemplate.delete({ where: { id: t.id } });
  });

  it("gagal di tengah pemasangan (batas tabel): semua tabel dibatalkan", async () => {
    const mk = await prisma.village.create({ data: { code: `AL${Date.now() % 1e6}`, name: "Penuh", district: "k", regency: "r", province: "p", address: "a" } });
    for (let i = 0; i < 19; i++) await cd.createTable(prisma, { villageId: mk.id, userId: 1, input: { name: `T${i}`, fields: [{ label: "x", type: "text" }] } });
    const tbl = (ref: string) => ({ ref, name: `Baru ${ref}`, description: null, linkResident: false, fields: [{ label: "x", type: "text", required: false, options: null, piiClass: "NONE" }] });
    const t = await prisma.appTemplate.create({
      data: { lineageKey: `app_dua${Date.now()}`, version: 1, publisherName: "Resmi", name: "Dua tabel", description: "x", manifest: { schemaVersion: 1, tables: [tbl("a"), tbl("b")], dashboard: [] }, manifestHash: "h", warnings: [], status: "PUBLISHED", publishedAt: new Date() },
    });
    const r = await install(mk.id, t.id);
    assert.equal(r.ok, false);
    assert.equal(await prisma.customTable.count({ where: { villageId: mk.id } }), 19, "tabel pertama ikut dibatalkan");
    assert.equal(await prisma.appInstall.count({ where: { villageId: mk.id } }), 0);
    assert.equal(await prisma.appInstall.count({ where: { templateId: t.id } }), 0);
    await prisma.village.delete({ where: { id: mk.id } });
    await prisma.appTemplate.delete({ where: { id: t.id } });
  });

  it("melepas aplikasi tidak menghapus tabel dan datanya; desa lain tak bisa melepas", async () => {
    const inst = (await apps.listInstalls(prisma, vC)).find((i) => i.name === "Posyandu Praktis")!;
    assert.equal(await apps.uninstall(prisma, { villageId: vB, id: inst.id }), false);
    assert.equal(await apps.uninstall(prisma, { villageId: vC, id: inst.id }), true);
    assert.equal(await prisma.customTable.count({ where: { id: inst.tables[0].tableId } }), 1, "tabel tetap ada");
    const again = await install(vC);
    assert.ok(again.ok, "boleh dipasang lagi setelah dilepas");
  });

  it("versi baru: harus dari penerbit yang sama, ditinjau ulang, dan tanpa perubahan ditolak", async () => {
    assert.equal(!(await submit({ lineageKey: lineage })).ok && (await submit({ lineageKey: lineage }) as { status: number }).status, 409, "tak ada perubahan");
    await cd.changeSchema(prisma, { villageId: vA, tableId, change: { addFields: [{ label: "Tinggi", type: "number" }] } });
    const v2 = await submit({ lineageKey: lineage });
    assert.ok(v2.ok);
    assert.equal(v2.ok && v2.data.version, 2);
    const other = await submit({ lineageKey: lineage, villageId: vB, villageName: "Desa B" });
    assert.equal(other.ok, false, "desa lain tak bisa menerbitkan versi atas templat desa A");
    const g = await apps.listGallery(prisma, vB);
    assert.equal(g.published.find((p) => p.lineageKey === lineage)?.version, 1, "versi 2 belum ditinjau → galeri masih v1");
    await apps.decideTemplate(prisma, { id: v2.ok ? v2.data.id : 0, adminId: 1, decision: "approve" });
    assert.equal((await apps.listGallery(prisma, vB)).published.find((p) => p.lineageKey === lineage)?.version, 2);
  });

  it("menarik templat: hilang dari galeri, pemasangan lama tetap jalan; hanya penerbit yang bisa menarik", async () => {
    const g = (await apps.listGallery(prisma, vA)).mine.filter((m) => m.status === "PUBLISHED");
    assert.ok(g.length >= 1);
    assert.equal((await apps.withdrawTemplate(prisma, { villageId: vB, id: g[0].id })).ok, false);
    for (const m of g) assert.ok((await apps.withdrawTemplate(prisma, { villageId: vA, id: m.id })).ok);
    assert.ok(!(await apps.listGallery(prisma, vB)).published.some((p) => p.lineageKey === lineage), "hilang dari galeri");
    assert.ok((await apps.listInstalls(prisma, vB)).length >= 1, "pemasangan lama tidak terpengaruh");
    assert.equal((await apps.withdrawTemplate(prisma, { villageId: vA, id: g[0].id })).ok, false, "sudah ditarik");
  });

  it("hitungan pemasangan tak bisa digelembungkan dengan pasang-lepas berulang", async () => {
    const t = await prisma.appTemplate.create({ data: { lineageKey: `app_gem${Date.now()}`, version: 1, publisherName: "Resmi", name: "Gembung", description: "x", manifest: { schemaVersion: 1, tables: [{ ref: "a", name: "Gembung", description: null, linkResident: false, fields: [{ label: "x", type: "text", required: false, options: null, piiClass: "NONE" }] }], dashboard: [] }, manifestHash: "h", warnings: [], status: "PUBLISHED", publishedAt: new Date() } });
    const lineageKey = t.lineageKey;
    const count = async () => (await apps.listGallery(prisma, vB)).published.find((p) => p.lineageKey === lineageKey)?.installCount;
    for (let i = 0; i < 3; i++) {
      const r = await install(vB, t.id);
      assert.ok(r.ok, r.ok ? "" : r.errors.join());
      const inst = (await apps.listInstalls(prisma, vB)).find((x) => x.name === "Gembung")!;
      assert.equal(await count(), 1, "satu desa = satu hitungan");
      await apps.uninstall(prisma, { villageId: vB, id: inst.id });
    }
    assert.equal(await count(), 0);
    await prisma.appInstall.deleteMany({ where: { templateId: t.id } });
    await prisma.appTemplate.delete({ where: { id: t.id } });
  });

  it("admin platform bisa mencabut templat terbit (wajib beralasan) dan mengatur lencana resmi; pemasangan lama tetap", async () => {
    const tb = await cd.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Untuk Dicabut", fields: [{ label: "x", type: "text" }] } });
    assert.ok(tb.ok);
    const sub = await apps.submitTemplate(prisma, { villageId: vA, villageName: "Desa A", userId: 1, tableIds: [tb.ok ? tb.data.id : 0], name: "Dicabut", description: "x" });
    assert.ok(sub.ok);
    const id = sub.ok ? sub.data.id : 0;
    assert.equal((await apps.unpublishTemplate(prisma, { id, adminId: 1, reason: "x" })).ok, false, "belum terbit");
    assert.equal((await apps.setTemplateOfficial(prisma, { id, official: true })).ok, false, "belum terbit");
    await apps.decideTemplate(prisma, { id, adminId: 1, decision: "approve", official: true });
    assert.ok((await apps.listGallery(prisma, vB)).published.find((p) => p.id === id)?.official);
    assert.ok((await apps.setTemplateOfficial(prisma, { id, official: false })).ok);
    assert.equal((await apps.listGallery(prisma, vB)).published.find((p) => p.id === id)?.official, false);
    assert.ok((await install(vC, id)).ok);

    assert.equal((await apps.unpublishTemplate(prisma, { id, adminId: 1, reason: "  " })).ok, false, "alasan wajib");
    assert.ok((await apps.unpublishTemplate(prisma, { id, adminId: 1, reason: "Kolom NIK salah tanda" })).ok);
    assert.ok(!(await apps.listGallery(prisma, vB)).published.some((p) => p.id === id), "hilang dari galeri");
    assert.equal((await install(vB, id)).ok, false, "tak bisa dipasang lagi");
    assert.ok((await apps.listInstalls(prisma, vC)).some((i) => i.name === "Dicabut"), "pemasangan lama tetap");
    const mine = (await apps.listGallery(prisma, vA)).mine.find((m) => m.id === id);
    assert.equal(mine?.status, "WITHDRAWN");
    assert.equal(mine?.reviewNote, "Kolom NIK salah tanda", "penerbit tahu alasannya");
    assert.equal((await apps.unpublishTemplate(prisma, { id, adminId: 1, reason: "lagi" })).ok, false, "sudah dicabut");
  });

  it("pengajuan: manifes identik yang masih menunggu ditolak; pemasangan paralel tidak menghasilkan 500 atau tabel ganda", async () => {
    const tb = await cd.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Kembar", fields: [{ label: "y", type: "text" }] } });
    assert.ok(tb.ok);
    const args = { villageId: vA, villageName: "Desa A", userId: 1, tableIds: [tb.ok ? tb.data.id : 0], name: "Kembar", description: "x" };
    assert.ok((await apps.submitTemplate(prisma, args)).ok);
    const dup = await apps.submitTemplate(prisma, args);
    assert.equal(!dup.ok && dup.status, 409);

    const pub = await prisma.appTemplate.create({ data: { lineageKey: `app_par${Date.now()}`, version: 1, publisherName: "Resmi", name: "Paralel", description: "x", manifest: { schemaVersion: 1, tables: [{ ref: "a", name: "Paralel", description: null, linkResident: false, fields: [{ label: "x", type: "text", required: false, options: null, piiClass: "NONE" }] }], dashboard: [] }, manifestHash: "h", warnings: [], status: "PUBLISHED", publishedAt: new Date() } });
    const v = await prisma.village.create({ data: { code: `AQ${Date.now() % 1e6}`, name: "Paralel", district: "k", regency: "r", province: "p", address: "a" } });
    const res = await Promise.all([install(v.id, pub.id), install(v.id, pub.id), install(v.id, pub.id)]);
    assert.equal(res.filter((r) => r.ok).length, 1, "tepat satu berhasil");
    assert.ok(res.filter((r) => !r.ok).every((r) => !r.ok && r.status === 409), "yang lain 409, bukan galat server");
    assert.equal(await prisma.customTable.count({ where: { villageId: v.id } }), 1, "tidak ada tabel ganda");
    await prisma.village.delete({ where: { id: v.id } });
    await prisma.appTemplate.delete({ where: { id: pub.id } });
  });

  it("menghapus desa penerbit tidak menghapus templat/pemasangan desa lain", async () => {
    const t = Date.now() % 1e6;
    const pub = await prisma.village.create({ data: { code: `AP${t}`, name: "Penerbit", district: "k", regency: "r", province: "p", address: "a" } });
    const tb = await cd.createTable(prisma, { villageId: pub.id, userId: 1, input: { name: "Sampel", fields: [{ label: "x", type: "text" }] } });
    assert.ok(tb.ok);
    const sub = await apps.submitTemplate(prisma, { villageId: pub.id, villageName: "Desa A", userId: 1, tableIds: [tb.ok ? tb.data.id : 0], name: "Sampel", description: "x" });
    assert.ok(sub.ok);
    await apps.decideTemplate(prisma, { id: sub.ok ? sub.data.id : 0, adminId: 1, decision: "approve" });
    await install(vC, sub.ok ? sub.data.id : 0);
    await prisma.village.delete({ where: { id: pub.id } });
    const row = await prisma.appTemplate.findUniqueOrThrow({ where: { id: sub.ok ? sub.data.id : 0 } });
    assert.equal(row.publisherVillageId, null, "SetNull");
    assert.ok((await apps.listInstalls(prisma, vC)).some((i) => i.name === "Sampel"));
  });
});
