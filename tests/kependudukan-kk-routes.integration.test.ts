/**
 * Tes integrasi RUTE /api/kk* dengan sesi JWT sungguhan terhadap MySQL sementara. Membuktikan sifat keamanannya:
 * peran selain admin tidak pernah menerima nomor KK/NIK lengkap (tersamar di server), tidak bisa meminta `full` atau
 * mengekspor, `ref` desa lain tidak terbaca, dan pembukaan lengkap dicatat di audit. Butuh KEP_TEST_DATABASE_URL.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("rute /api/kk (sesi nyata, MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let NextRequest: typeof import("next/server").NextRequest;
  let XLSX: typeof import("xlsx");
  let listRoute: typeof import("../app/api/kk/route");
  let detailRoute: typeof import("../app/api/kk/[kk]/route");
  let exportRoute: typeof import("../app/api/kk/export/route");
  let historyRoute: typeof import("../app/api/kk/[kk]/riwayat/route");
  let splitRoute: typeof import("../app/api/kk/[kk]/pecah/route");
  let summaryRoute: typeof import("../app/api/kk/ringkasan/route");

  const SECRET = "uji-rahasia-kk-0123456789abcdef";
  const KK_A = "3508070101100001";
  const NIK_A = "3508070101900011";
  const KK_B = "3508070101100002";
  let village: { id: number; code: string };
  let other: { id: number; code: string };
  const cookies: Record<string, string> = {};
  let refA = 0;
  let foreignRef = 0;

  const call = (path: string, who: string | null, init: { method?: string; body?: unknown } = {}) =>
    new NextRequest(`http://localhost${path}`, {
      method: init.method ?? "GET",
      headers: { ...(who ? { cookie: `next-auth.session-token=${cookies[who]}` } : {}), ...(init.body ? { "content-type": "application/json" } : {}) },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });
  const params = (kk: string) => ({ params: Promise.resolve({ kk }) });
  const text = async (r: Response) => await r.text();

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET = SECRET;
    delete process.env.NEXTAUTH_URL;
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    XLSX = await import("xlsx");
    const { encode } = await import("next-auth/jwt");
    listRoute = await import("../app/api/kk/route");
    detailRoute = await import("../app/api/kk/[kk]/route");
    exportRoute = await import("../app/api/kk/export/route");
    historyRoute = await import("../app/api/kk/[kk]/riwayat/route");
    splitRoute = await import("../app/api/kk/[kk]/pecah/route");
    summaryRoute = await import("../app/api/kk/ringkasan/route");

    const t = Date.now() % 1e6;
    const mkVillage = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a" } });
    village = await mkVillage("R");
    other = await mkVillage("Q");

    for (const role of ["admin", "staff", "village_head"]) {
      const u = await prisma.user.create({ data: { villageId: village.id, email: `${role}${t}@uji.test`, password: "x", name: role, role } });
      cookies[role] = await encode({
        secret: SECRET,
        token: { sub: String(u.id), id: String(u.id), role, villageId: village.id, villageCode: village.code, accountType: "village", name: role, email: u.email },
      });
    }

    const mk = (villageId: number, kk: string, nik: string, name: string, role: string) =>
      prisma.resident.create({
        data: { villageId, nik, kk, name, birthplace: "Lumajang", birthDate: new Date("1990-01-01"), gender: "Laki-laki", religion: "Islam", maritalStatus: "Menikah", familyRole: role, address: "Jl. Mawar 1", rt: "01", rw: "02", hamlet: "Karangsari" },
      });
    refA = (await mk(village.id, KK_A, NIK_A, "Budi Santoso", "Kepala Keluarga")).id;
    await mk(village.id, KK_A, "3508074101920012", "Siti", "Istri");
    await mk(village.id, KK_B, "3508070101900013", "=CMD()|' calc'!A1", "Kepala Keluarga"); // nama berbahaya untuk CSV
    foreignRef = (await mk(other.id, "3508070101100099", "3508070101900099", "Warga Lain", "Kepala Keluarga")).id;
  });

  after(async () => {
    for (const v of [village, other]) if (v) await prisma.village.delete({ where: { id: v.id } });
    await prisma.$disconnect();
  });

  it("tanpa sesi: 401 di semua rute", async () => {
    assert.equal((await listRoute.GET(call("/api/kk", null))).status, 401);
    assert.equal((await summaryRoute.GET(call("/api/kk/ringkasan", null))).status, 401);
    assert.equal((await detailRoute.GET(call(`/api/kk/${refA}`, null), params(String(refA)))).status, 401);
    assert.equal((await exportRoute.GET(call("/api/kk/export", null))).status, 401);
    assert.equal((await historyRoute.GET(call(`/api/kk/${refA}/riwayat`, null), params(String(refA)))).status, 401);
  });

  it("daftar untuk staf: tersamar, tidak ada nomor lengkap di respons, canFull=false", async () => {
    const res = await listRoute.GET(call("/api/kk?pageSize=100", "staff"));
    assert.equal(res.status, 200);
    const body = await text(res);
    assert.ok(!body.includes(KK_A), "nomor KK lengkap bocor");
    assert.ok(!body.includes(NIK_A), "NIK lengkap bocor");
    const j = JSON.parse(body);
    assert.equal(j.total, 2);
    assert.equal(j.canFull, false);
    const a = j.rows.find((r: { kepalaKeluarga: string }) => r.kepalaKeluarga === "Budi Santoso");
    assert.equal(a.kk, null);
    assert.equal(a.kkMasked, "•••• •••• •••• 0001");
    assert.equal(a.ref, refA);
    assert.equal(a.jumlahAnggota, 2);
  });

  it("staf dan kepala desa tidak bisa meminta full (403); admin boleh dan tercatat di audit", async () => {
    for (const who of ["staff", "village_head"]) {
      assert.equal((await listRoute.GET(call("/api/kk?full=1", who))).status, 403, who);
      assert.equal((await detailRoute.GET(call(`/api/kk/${refA}?full=1`, who), params(String(refA)))).status, 403, who);
    }
    const before = await prisma.auditLog.count({ where: { villageId: village.id, action: "reveal" } });
    const admin = await (await listRoute.GET(call("/api/kk?full=1&pageSize=100", "admin"))).json();
    assert.equal(admin.canFull, true);
    assert.ok(admin.rows.some((r: { kk: string | null }) => r.kk === KK_A));
    assert.equal(await prisma.auditLog.count({ where: { villageId: village.id, action: "reveal" } }), before + 1);
    // Admin tanpa full tetap tersamar (aman secara bawaan).
    const plain = await (await listRoute.GET(call("/api/kk", "admin"))).json();
    assert.ok(plain.rows.every((r: { kk: string | null }) => r.kk === null));
  });

  it("detail lewat ref: NIK dan KK tersamar untuk staf; admin dengan full melihat lengkap dan tercatat", async () => {
    const res = await detailRoute.GET(call(`/api/kk/${refA}`, "staff"), params(String(refA)));
    assert.equal(res.status, 200);
    const body = await text(res);
    assert.ok(!body.includes(KK_A) && !body.includes(NIK_A), "nomor lengkap bocor di detail");
    const j = JSON.parse(body);
    assert.equal(j.ref, refA);
    assert.equal(j.family_card_number, "•••• •••• •••• 0001");
    assert.equal(j.revealed, false);
    assert.equal(j.canFull, false);
    assert.equal(j.anggotaKeluarga.length, 2);
    const budi = j.anggotaKeluarga.find((a: { name: string }) => a.name === "Budi Santoso");
    assert.equal(budi.id_number, "•••• •••• •••• 0011");
    assert.equal(budi.gender, "M", "Laki-laki harus terbaca sebagai M");

    const before = await prisma.auditLog.count({ where: { villageId: village.id, action: "reveal", entity: "kk" } });
    const full = await (await detailRoute.GET(call(`/api/kk/${refA}?full=1`, "admin"), params(String(refA)))).json();
    assert.equal(full.family_card_number, KK_A);
    assert.equal(full.anggotaKeluarga.find((a: { name: string }) => a.name === "Budi Santoso").id_number, NIK_A);
    assert.equal(await prisma.auditLog.count({ where: { villageId: village.id, action: "reveal", entity: "kk" } }), before + 1);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { villageId: village.id, action: "reveal", entity: "kk" }, orderBy: { id: "desc" } });
    assert.ok(!JSON.stringify({ e: log.entityId, c: log.changes }).includes(KK_A), "audit tidak boleh memuat nomor KK lengkap");
  });

  it("ref desa lain atau tak dikenal = 404; nomor KK utuh (rute lama) tetap terbaca tetapi tersamar", async () => {
    for (const k of [String(foreignRef), "999999999"]) {
      assert.equal((await detailRoute.GET(call(`/api/kk/${k}`, "staff"), params(k))).status, 404, k);
      assert.equal((await historyRoute.GET(call(`/api/kk/${k}/riwayat`, "staff"), params(k))).status, 404, k);
    }
    const legacy = await detailRoute.GET(call(`/api/kk/${KK_A}`, "staff"), params(KK_A));
    assert.equal(legacy.status, 200);
    assert.ok(!(await text(legacy)).includes(NIK_A));
    // KK milik desa lain lewat nomor utuh tidak boleh terbaca.
    const foreign = await detailRoute.GET(call("/api/kk/3508070101100099", "staff"), params("3508070101100099"));
    assert.equal(foreign.status, 404);
  });

  it("ekspor: hanya admin; staf dan kepala desa 403", async () => {
    for (const who of ["staff", "village_head"]) assert.equal((await exportRoute.GET(call("/api/kk/export", who))).status, 403, who);
    assert.equal((await exportRoute.GET(call("/api/kk/export", "admin"))).status, 200);
  });

  it("ekspor CSV: nomor KK berspasi, rumus dinetralkan, tercatat di audit tanpa teks pencarian", async () => {
    const before = await prisma.auditLog.count({ where: { villageId: village.id, action: "export", entity: "kk_list" } });
    const res = await exportRoute.GET(call("/api/kk/export?format=csv&search=Budi", "admin"));
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
    const csv = await text(res);
    assert.ok(csv.includes("3508 0701 0110 0001"));
    assert.ok(!csv.includes("CMD"), "pencarian 'Budi' tidak boleh membawa KK lain");
    assert.equal(await prisma.auditLog.count({ where: { villageId: village.id, action: "export", entity: "kk_list" } }), before + 1);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { villageId: village.id, action: "export", entity: "kk_list" }, orderBy: { id: "desc" } });
    assert.ok(!JSON.stringify({ e: log.entityId, c: log.changes }).includes("Budi"), "audit tidak boleh memuat teks pencarian");

    const all = await text(await exportRoute.GET(call("/api/kk/export?format=csv", "admin")));
    assert.ok(all.includes(`"'=CMD()`), "nama berawalan '=' harus diberi apostrof agar tidak dijalankan Excel");
    assert.ok(!all.includes(`"=CMD`));
  });

  it("ekspor Excel: berkas .xlsx utuh (bukan teks rusak) dan isinya benar", async () => {
    const res = await exportRoute.GET(call("/api/kk/export", "admin"));
    assert.match(res.headers.get("content-type") ?? "", /spreadsheetml/);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.subarray(0, 2).toString(), "PK", "xlsx adalah arsip zip");
    const book = XLSX.read(buf);
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]]);
    assert.equal(rows.length, 2);
    assert.ok(rows.some((r) => r["Nomor KK"] === "3508 0701 0110 0001" && r["Anggota Aktif"] === 2));
  });

  it("ekspor tanpa hasil: 404, bukan berkas kosong", async () => {
    assert.equal((await exportRoute.GET(call("/api/kk/export?search=tidakadanama", "admin"))).status, 404);
  });

  it("Pecah KK lewat ref: kepala desa (baca saja) 403; staf diterima ke tahap validasi (bukan 404)", async () => {
    const hs = await splitRoute.POST(call(`/api/kk/${refA}/pecah?periksa=1`, "village_head", { method: "POST", body: {} }), params(String(refA)));
    assert.equal(hs.status, 403);
    const st = await splitRoute.POST(call(`/api/kk/${refA}/pecah?periksa=1`, "staff", { method: "POST", body: {} }), params(String(refA)));
    assert.equal(st.status, 400, "ref terbaca, badan kosong ditolak validasi");
    const nf = await splitRoute.POST(call(`/api/kk/${foreignRef}/pecah?periksa=1`, "staff", { method: "POST", body: {} }), params(String(foreignRef)));
    assert.equal(nf.status, 404, "ref desa lain tidak boleh dipecah");
  });

  it("riwayat: terbaca staf, kosong dengan keterangan bila Buku Mutasi belum aktif", async () => {
    const res = await historyRoute.GET(call(`/api/kk/${refA}/riwayat`, "staff"), params(String(refA)));
    assert.equal(res.status, 200);
    const j = await res.json();
    assert.equal(j.enabled, false);
    assert.deepEqual(j.items, []);
  });

  it("riwayat berisi: kejadian atas KK atau anggotanya muncul, milik desa lain tidak, tanpa NIK", async () => {
    await prisma.residentMutation.create({ data: { villageId: village.id, type: "MOVE_OUT", status: "APPLIED", effectiveDate: new Date("2026-03-01"), residentId: refA, residentName: "Budi Santoso", residentNikLast4: "0011", householdKk: KK_A } });
    await prisma.residentMutation.create({ data: { villageId: other.id, type: "DEATH", status: "APPLIED", effectiveDate: new Date("2026-03-02"), residentId: foreignRef, residentName: "Warga Lain", householdKk: "3508070101100099" } });
    const res = await historyRoute.GET(call(`/api/kk/${refA}/riwayat`, "staff"), params(String(refA)));
    const body = await text(res);
    const j = JSON.parse(body);
    assert.equal(j.items.length, 1);
    assert.equal(j.items[0].type, "MOVE_OUT");
    assert.equal(j.items[0].residentName, "Budi Santoso");
    assert.ok(!body.includes("0011") && !body.includes(NIK_A) && !body.includes("Warga Lain"));
  });

  it("ringkasan: terbaca staf, hanya angka", async () => {
    const j = await (await summaryRoute.GET(call("/api/kk/ringkasan", "staff"))).json();
    assert.equal(j.totalKk, 2);
    assert.equal(j.totalJiwa, 3);
  });
});
