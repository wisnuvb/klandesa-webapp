/** Tes integrasi data kustom terhadap MySQL sungguhan. Butuh KEP_TEST_DATABASE_URL ke DB ber-nama "scratch"/"test". */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("data kustom (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let svc: typeof import("../lib/custom-data/service");
  let keys: typeof import("../lib/api-keys/keys");
  let v1List: (req: Request) => Promise<Response>;
  let v1Rows: (req: Request, ctx: { params: Promise<{ slug: string }> }) => Promise<Response>;
  let vA = 0;
  let vB = 0;
  let keyA = "";
  let keyNarrow = "";
  let tableId = 0;
  let linkedId = 0;
  let residentA = 0;
  let residentB = 0;
  const SECRET_NOTE = "Catatan rahasia: diabetes";

  const api = async (secret: string, path: string, slug?: string) => {
    const req = new Request(`http://localhost${path}`, { headers: { authorization: `Bearer ${secret}` } });
    const res = slug ? await v1Rows(req, { params: Promise.resolve({ slug }) }) : await v1List(req);
    return { status: res.status, body: await res.json() };
  };

  before(async () => {
    process.env.DATABASE_URL = URL_;
    ({ prisma } = await import("../lib/prisma"));
    svc = await import("../lib/custom-data/service");
    keys = await import("../lib/api-keys/keys");
    v1List = (await import("../app/api/v1/data/route")).GET;
    v1Rows = (await import("../app/api/v1/data/[slug]/route")).GET;
    const t = Date.now() % 1e6;
    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: c, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("CA")).id;
    vB = (await mkV("CB")).id;
    const mkR = (v: number, nik: string) => prisma.resident.create({ data: { villageId: v, nik, name: `Warga ${nik.slice(-2)}`, birthplace: "x", birthDate: new Date("1990-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: "Anak", address: "a" } });
    residentA = (await mkR(vA, "3508000000070001")).id;
    residentB = (await mkR(vB, "3508000000070002")).id;
    const k = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "data", scopes: ["data-kustom:read"], expiresInDays: null });
    const n = await keys.createApiKey(prisma, { villageId: vA, userId: 1, name: "sempit", scopes: ["statistik:read"], expiresInDays: null });
    assert.ok(k.ok && n.ok);
    keyA = k.ok ? k.secret : "";
    keyNarrow = n.ok ? n.secret : "";
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  const baseFields = [
    { label: "Nama Penerima", type: "text", required: true },
    { label: "Jenis Bantuan", type: "select", options: ["Beras", "Uang"] },
    { label: "Jumlah", type: "number", options: { min: 0, max: 100 } },
    { label: "Catatan Kesehatan", type: "longtext", piiClass: "SENSITIVE" },
    { label: "No HP", type: "text", piiClass: "PERSONAL" },
  ];

  it("membuat tabel: skema tersimpan, slug dari nama; nama kembar mendapat slug berbeda", async () => {
    const a = await svc.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Penerima Bantuan", fields: baseFields } });
    assert.ok(a.ok);
    tableId = a.ok ? a.data.id : 0;
    assert.equal(a.ok && a.data.slug, "penerima-bantuan");
    const dup = await svc.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Penerima Bantuan", fields: [{ label: "X", type: "text" }] } });
    assert.ok(dup.ok && dup.data.slug === "penerima-bantuan-2");
    const other = await svc.createTable(prisma, { villageId: vB, userId: 1, input: { name: "Penerima Bantuan", fields: [{ label: "X", type: "text" }] } });
    assert.ok(other.ok && other.data.slug === "penerima-bantuan", "slug unik per desa, bukan global");
    const linked = await svc.createTable(prisma, { villageId: vA, userId: 1, input: { name: "Data Lansia", linkResident: true, fields: [{ label: "Kondisi", type: "text" }] } });
    assert.ok(linked.ok);
    linkedId = linked.ok ? linked.data.id : 0;
    const t = await svc.getTable(prisma, vA, { id: tableId });
    assert.deepEqual(t!.fields.map((f) => f.key), ["nama_penerima", "jenis_bantuan", "jumlah", "catatan_kesehatan", "no_hp"]);
  });

  it("tabel tidak terlihat dari desa lain", async () => {
    assert.equal(await svc.getTable(prisma, vB, { id: tableId }), null);
    assert.equal((await svc.listTables(prisma, vB)).some((t) => t.id === tableId), false);
    const r = await svc.createRecord(prisma, { villageId: vB, tableId, userId: 1, data: { nama_penerima: "x" } });
    assert.ok(!r.ok && r.status === 404);
  });

  it("baris: validasi per kolom, tersimpan, dan nilai dinormalkan", async () => {
    const bad = await svc.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "", jumlah: 500 } });
    assert.ok(!bad.ok && bad.status === 422 && bad.fieldErrors?.nama_penerima && bad.fieldErrors?.jumlah);
    const ok = await svc.createRecord(prisma, { villageId: vA, tableId, userId: 7, data: { nama_penerima: " Siti ", jenis_bantuan: "Beras", jumlah: "10", catatan_kesehatan: SECRET_NOTE, no_hp: "0812" } });
    assert.ok(ok.ok);
    assert.equal(ok.ok && ok.data.data.nama_penerima, "Siti");
    assert.equal(ok.ok && ok.data.data.jumlah, 10);
    const unknown = await svc.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "x", palsu: 1 } });
    assert.ok(!unknown.ok && unknown.fieldErrors?.palsu);
  });

  it("tabel terkait warga: wajib pilih warga milik desa ini; tabel biasa menolak residentId", async () => {
    const none = await svc.createRecord(prisma, { villageId: vA, tableId: linkedId, userId: 1, data: { kondisi: "sehat" } });
    assert.ok(!none.ok && none.status === 422);
    const cross = await svc.createRecord(prisma, { villageId: vA, tableId: linkedId, userId: 1, data: { kondisi: "x" }, residentId: residentB });
    assert.ok(!cross.ok && /tidak ditemukan/.test(cross.errors[0]), "warga desa lain ditolak");
    const ok = await svc.createRecord(prisma, { villageId: vA, tableId: linkedId, userId: 1, data: { kondisi: "sehat" }, residentId: residentA });
    assert.ok(ok.ok && ok.data.resident?.id === residentA);
    const plain = await svc.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "x" }, residentId: residentA });
    assert.ok(!plain.ok && /tidak terkait warga/.test(plain.errors[0]));
  });

  it("ubah baris menggabung nilai lama; desa lain tidak bisa mengubah atau menghapus", async () => {
    const r = await svc.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "Budi", jumlah: 5 } });
    assert.ok(r.ok);
    const id = BigInt(r.ok ? r.data.id : 0);
    const up = await svc.updateRecord(prisma, { villageId: vA, recordId: id, userId: 2, data: { jenis_bantuan: "Uang" } });
    assert.ok(up.ok);
    assert.deepEqual(up.ok && up.data.data, { nama_penerima: "Budi", jumlah: 5, jenis_bantuan: "Uang" });
    const foreign = await svc.updateRecord(prisma, { villageId: vB, recordId: id, userId: 9, data: { nama_penerima: "Dibajak" } });
    assert.ok(!foreign.ok && foreign.status === 404);
    assert.equal(await svc.deleteRecord(prisma, { villageId: vB, recordId: id, userId: 9 }), null);
    assert.equal((await prisma.customRecord.findUniqueOrThrow({ where: { id } })).deletedAt, null);
  });

  it("hapus lunak: hilang dari daftar, hitungan, dan API, tetapi baris masih ada", async () => {
    const r = await svc.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "Akan dihapus" } });
    assert.ok(r.ok);
    const id = BigInt(r.ok ? r.data.id : 0);
    const before = (await svc.getTable(prisma, vA, { id: tableId }))!.recordCount;
    assert.equal(await svc.deleteRecord(prisma, { villageId: vA, recordId: id, userId: 1 }), tableId);
    assert.equal((await svc.getTable(prisma, vA, { id: tableId }))!.recordCount, before - 1);
    const list = await svc.listRecords(prisma, { villageId: vA, tableId, limit: 100 });
    assert.ok(!list.items.some((i) => i.id === String(id)));
    assert.ok((await prisma.customRecord.findUniqueOrThrow({ where: { id } })).deletedAt);
    assert.equal(await svc.deleteRecord(prisma, { villageId: vA, recordId: id, userId: 1 }), null, "tak bisa dihapus dua kali");
  });

  it("skema: pratinjau tidak menulis; kolom wajib baru ditolak pada tabel berisi; tambah/arsip/ganti nama berjalan", async () => {
    const before = await svc.getTable(prisma, vA, { id: tableId });
    const dry = await svc.changeSchema(prisma, { villageId: vA, tableId, dryRun: true, change: { addFields: [{ label: "Alamat", type: "text" }], archiveFields: ["no_hp"] } });
    assert.ok(dry.ok && dry.data.diff.added.length === 1);
    assert.deepEqual((await svc.getTable(prisma, vA, { id: tableId }))!.fields.length, before!.fields.length, "dry run tidak mengubah apa pun");

    const req = await svc.changeSchema(prisma, { villageId: vA, tableId, change: { addFields: [{ label: "Wajib Baru", type: "text", required: true }] } });
    assert.ok(!req.ok && /sudah berisi data/.test(req.errors[0]));

    const ok = await svc.changeSchema(prisma, { villageId: vA, tableId, change: { addFields: [{ label: "Alamat", type: "text" }], renameFields: { jumlah: "Jumlah (kg)" }, addOptions: { jenis_bantuan: ["Sembako"] } } });
    assert.ok(ok.ok);
    const t = await svc.getTable(prisma, vA, { id: tableId });
    assert.equal(t!.fields.find((f) => f.key === "jumlah")!.label, "Jumlah (kg)");
    assert.deepEqual(t!.fields.find((f) => f.key === "jenis_bantuan")!.options, ["Beras", "Uang", "Sembako"]);
    assert.ok(t!.fields.some((f) => f.key === "alamat"));
    const other = await svc.changeSchema(prisma, { villageId: vB, tableId, change: { name: "Dibajak" } });
    assert.ok(!other.ok && other.status === 404);
  });

  it("kolom diarsipkan: nilai lama tetap di DB, tapi ditolak saat ditulis dan hilang dari tampilan", async () => {
    const r = await svc.changeSchema(prisma, { villageId: vA, tableId, change: { archiveFields: ["no_hp"] } });
    assert.ok(r.ok);
    const t = await svc.getTable(prisma, vA, { id: tableId });
    assert.equal(t!.fields.find((f) => f.key === "no_hp")!.isArchived, true);
    const w = await svc.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "x", no_hp: "081" } });
    assert.ok(!w.ok && w.fieldErrors?.no_hp);
    const row = await prisma.customRecord.findFirstOrThrow({ where: { tableId, villageId: vA }, orderBy: { id: "asc" } });
    assert.equal((row.data as Record<string, unknown>).no_hp, "0812", "nilai lama tidak dihapus");
  });

  it("CSV: memuat kolom aktif termasuk pribadi (untuk yang berwenang), tanpa kolom arsip, rumus dinetralkan", async () => {
    await svc.createRecord(prisma, { villageId: vA, tableId, userId: 1, data: { nama_penerima: "=SUM(1+1)" } });
    const csv = await svc.exportCsv(prisma, vA, (await svc.getTable(prisma, vA, { id: tableId }))!);
    assert.ok(csv.startsWith("﻿"));
    assert.ok(csv.includes("Catatan Kesehatan"));
    assert.ok(!csv.includes("No HP"), "kolom arsip tidak diekspor");
    assert.ok(csv.includes(`"'=SUM(1+1)"`));
    const linked = await svc.exportCsv(prisma, vA, (await svc.getTable(prisma, vA, { id: linkedId }))!);
    assert.ok(linked.includes("NIK (4 digit akhir)") && linked.includes("0001") && !linked.includes("3508000000070001"));
  });

  it("API v1: kolom PERSONAL/SENSITIVE/arsip tidak pernah keluar; tautan warga tidak keluar", async () => {
    const list = await api(keyA, "/api/v1/data");
    assert.equal(list.status, 200);
    const t = list.body.data.find((x: { slug: string }) => x.slug === "penerima-bantuan");
    assert.deepEqual(t.fields.map((f: { key: string }) => f.key), ["nama_penerima", "jenis_bantuan", "jumlah", "alamat"]);
    const rows = await api(keyA, "/api/v1/data/penerima-bantuan?limit=100", "penerima-bantuan");
    assert.equal(rows.status, 200);
    const json = JSON.stringify(rows.body);
    for (const leak of [SECRET_NOTE, "0812", "catatan_kesehatan", "no_hp", "diabetes"]) assert.ok(!json.includes(leak), leak);
    assert.ok(rows.body.data.length >= 3);
    assert.ok(rows.body.data.every((r: { data: Record<string, unknown> }) => Object.keys(r.data).every((k) => ["nama_penerima", "jenis_bantuan", "jumlah", "alamat"].includes(k))));
    const lin = await api(keyA, "/api/v1/data/data-lansia", "data-lansia");
    assert.ok(!JSON.stringify(lin.body).includes("residentId") && !JSON.stringify(lin.body).includes("Warga 01"));
  });

  it("API v1: membuka kolom pribadi menjadi NONE baru membuatnya keluar (dan hanya itu)", async () => {
    await svc.changeSchema(prisma, { villageId: vA, tableId, change: { setPii: { catatan_kesehatan: "NONE" } } });
    const rows = await api(keyA, "/api/v1/data/penerima-bantuan?limit=100", "penerima-bantuan");
    assert.ok(JSON.stringify(rows.body).includes(SECRET_NOTE));
    await svc.changeSchema(prisma, { villageId: vA, tableId, change: { setPii: { catatan_kesehatan: "SENSITIVE" } } });
    assert.ok(!JSON.stringify((await api(keyA, "/api/v1/data/penerima-bantuan?limit=100", "penerima-bantuan")).body).includes(SECRET_NOTE));
  });

  it("API v1: paginasi kursor, isolasi desa, scope, slug tak valid, tabel diarsipkan", async () => {
    const seen: number[] = [];
    let cursor = "";
    for (let i = 0; i < 10; i++) {
      const r = await api(keyA, `/api/v1/data/penerima-bantuan?limit=2${cursor ? `&cursor=${cursor}` : ""}`, "penerima-bantuan");
      seen.push(...r.body.data.map((x: { id: number }) => x.id));
      if (!r.body.page.hasMore) break;
      cursor = r.body.page.nextCursor;
    }
    assert.ok(seen.length >= 3 && new Set(seen).size === seen.length);
    assert.deepEqual([...seen].sort((a, b) => a - b), seen);

    assert.equal((await api(keyNarrow, "/api/v1/data")).status, 403);
    assert.equal((await api(keyNarrow, "/api/v1/data/x", "x")).status, 403);
    assert.equal((await api(keyA, "/api/v1/data/Bukan_Slug!", "Bukan_Slug!")).status, 400);
    assert.equal((await api(keyA, "/api/v1/data/tidak-ada", "tidak-ada")).status, 404);

    const mine = (await api(keyA, "/api/v1/data")).body.data.map((x: { slug: string }) => x.slug);
    assert.ok(mine.includes("penerima-bantuan-2"));
    const bOnly = await svc.createTable(prisma, { villageId: vB, userId: 1, input: { name: "Hanya Desa B", fields: [{ label: "Isi", type: "text" }] } });
    assert.ok(bOnly.ok);
    await svc.createRecord(prisma, { villageId: vB, tableId: bOnly.ok ? bOnly.data.id : 0, userId: 1, data: { isi: "milik B" } });
    assert.ok(!(await api(keyA, "/api/v1/data")).body.data.some((x: { slug: string }) => x.slug === "hanya-desa-b"), "tabel desa lain tak tampil");
    const peek = await api(keyA, "/api/v1/data/hanya-desa-b", "hanya-desa-b");
    assert.equal(peek.status, 404);
    assert.ok(!JSON.stringify(peek.body).includes("milik B"));
    assert.equal((await api(keyA, "/api/v1/data/penerima-bantuan-2", "penerima-bantuan-2")).status, 200);

    assert.ok(await svc.archiveTable(prisma, vA, tableId));
    assert.equal((await api(keyA, "/api/v1/data/penerima-bantuan", "penerima-bantuan")).status, 404, "tabel arsip hilang dari API");
    assert.equal(await svc.archiveTable(prisma, vA, tableId), false);
    assert.equal(await svc.archiveTable(prisma, vB, tableId), false, "desa lain tak bisa mengarsipkan");
  });

  it("batas jumlah tabel per desa ditegakkan; menghapus desa menghapus seluruh data kustom", async () => {
    const v = await prisma.village.create({ data: { code: `CL${Date.now() % 1e6}`, name: "Batas", district: "k", regency: "r", province: "p", address: "a" } });
    let last: Awaited<ReturnType<typeof svc.createTable>> | null = null;
    for (let i = 0; i < 22; i++) {
      last = await svc.createTable(prisma, { villageId: v.id, userId: 1, input: { name: `Tabel ${i}`, fields: [{ label: "A", type: "text" }] } });
      if (!last.ok) break;
    }
    assert.ok(last && !last.ok && last.status === 409);
    assert.equal(await prisma.customTable.count({ where: { villageId: v.id } }), 20);
    await prisma.village.delete({ where: { id: v.id } });
    assert.equal(await prisma.customTable.count({ where: { villageId: v.id } }), 0);
    assert.equal(await prisma.customField.count({ where: { table: { villageId: v.id } } }), 0);
  });
});
