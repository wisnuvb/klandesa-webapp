/* eslint-disable @typescript-eslint/no-explicit-any -- badan respons JSON diperiksa dinamis di tes */
/**
 * Tes integrasi pesanan produk UKM (API mobile + layanan admin) terhadap MySQL sungguhan.
 * Butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test". Memanggil handler rute langsung dengan token mobile asli.
 */
import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";

const URL_ = process.env.KEP_TEST_DATABASE_URL;
const dbName = URL_ ? new URL(URL_).pathname.replace(/^\//, "") : "";
const enabled = Boolean(URL_) && /scratch|test/i.test(dbName);

describe("Pesanan produk UKM (MySQL nyata)", { skip: enabled ? false : "KEP_TEST_DATABASE_URL tidak diisi / bukan DB scratch" }, () => {
  let prisma: typeof import("../lib/prisma").prisma;
  let NextRequest: typeof import("next/server").NextRequest;
  let sign: typeof import("../lib/mobile/tokens").signMobileAccessToken;
  let pesan: typeof import("../app/api/mobile/v1/ukm/[id]/pesan/route");
  let daftar: typeof import("../app/api/mobile/v1/ukm/pesanan/route");
  let satu: typeof import("../app/api/mobile/v1/ukm/pesanan/[id]/route");
  let svc: typeof import("../lib/ukm-order/service");

  let vA = 0;
  let vB = 0;
  const rid: Record<string, number> = {};
  const tok: Record<string, string> = {};
  const pid: Record<string, number> = {};
  const t = `${Date.now() % 1e6}${Math.floor(Math.random() * 1000)}`;

  const req = (path: string, token: string | null, method = "GET", body?: unknown) =>
    new NextRequest(`http://localhost/api/mobile/v1${path}`, {
      method,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), "content-type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  const json = async (res: Response) => ({ status: res.status, body: (await res.json()) as Record<string, any> });
  const idp = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
  const order = (who: string, productId: number, body: unknown = { quantity: 2 }) => pesan.POST(req(`/ukm/${productId}/pesan`, tok[who], "POST", body), idp(productId)).then(json);
  const act = (who: string, id: number, body: unknown) => satu.PATCH(req(`/ukm/pesanan/${id}`, tok[who], "PATCH", body), idp(id)).then(json);
  const get = (who: string, id: number) => satu.GET(req(`/ukm/pesanan/${id}`, tok[who]), idp(id)).then(json);
  const mine = (who: string, qs = "") => daftar.GET(req(`/ukm/pesanan${qs}`, tok[who])).then(json);
  const statusOf = async (id: number) => (await prisma.ukmOrderRequest.findUniqueOrThrow({ where: { id } })).status;
  const eventually = async <T>(fn: () => Promise<T | null | undefined>, ms = 3000): Promise<T | null | undefined> => {
    const end = Date.now() + ms;
    for (;;) {
      const v = await fn();
      if (v || Date.now() > end) return v;
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  const mkProduct = (data: Record<string, unknown>, villageId = vA) => prisma.potential.create({ data: { villageId, category: "UMKM", description: "Deskripsi produk contoh", subCategory: "Makanan", status: "active", ...data } as never });

  before(async () => {
    process.env.DATABASE_URL = URL_;
    process.env.AUTH_SECRET ||= "tes-rahasia-ukm-pesanan-0123456789";
    ({ prisma } = await import("../lib/prisma"));
    ({ NextRequest } = await import("next/server"));
    ({ signMobileAccessToken: sign } = await import("../lib/mobile/tokens"));
    pesan = await import("../app/api/mobile/v1/ukm/[id]/pesan/route");
    daftar = await import("../app/api/mobile/v1/ukm/pesanan/route");
    satu = await import("../app/api/mobile/v1/ukm/pesanan/[id]/route");
    svc = await import("../lib/ukm-order/service");

    const mkV = (c: string) => prisma.village.create({ data: { code: `${c}${t}`, name: `Desa ${c}`, district: "k", regency: "r", province: "p", address: "a", subscriptionStatus: "ACTIVE", subscriptionExpiry: new Date(Date.now() + 30 * 86_400_000) } });
    vA = (await mkV("OA")).id;
    vB = (await mkV("OB")).id;
    let n = 0;
    const mkR = async (key: string, villageId: number, name: string, hamlet: string | null = null) => {
      rid[key] = (await prisma.resident.create({ data: { villageId, nik: `33009${String(++n).padStart(2, "0")}${t}`.padEnd(16, "0").slice(0, 16), name, hamlet, birthplace: "x", birthDate: new Date("1985-01-01"), gender: "Perempuan", address: "a", religion: "Islam", maritalStatus: "Menikah", familyRole: "Kepala Keluarga", isAlive: true } })).id;
      const acc = await prisma.citizenAccount.create({ data: { villageId, residentId: rid[key], username: `ord${t}${key}`, passwordHash: "x", status: "ACTIVE" } });
      tok[key] = sign({ t: "citizen", id: acc.id, villageId, role: "citizen" });
    };
    await mkR("s", vA, "SITI AMINAH PUTRI", "Dusun Mawar"); // penjual dengan kontak tampil
    await mkR("s2", vA, "Dewi Lestari"); // penjual dengan kontak disembunyikan
    await mkR("b", vA, "BUDI SANTOSO", "Dusun Melati"); // pembeli
    await mkR("c", vA, "Cahyo Wibowo");
    await mkR("d", vA, "Dimas Prakoso");
    await mkR("e", vA, "Eko Prasetyo");
    await mkR("f", vA, "Fajar Nugroho");
    await mkR("g", vA, "Galih Pratama");
    await mkR("dup", vA, "Dian Puspita");
    await mkR("lim", vA, "Lukman Hakim");
    await mkR("par", vA, "Paramita Sari");
    await mkR("cd", vA, "Candra Dewi");
    await mkR("pg", vA, "Panji Gumilang");
    for (let i = 1; i <= 6; i++) await mkR(`k${i}`, vA, `Kurnia Warga ${i}`);
    await mkR("vb", vB, "Warga Desa Lain");
    await prisma.user.create({ data: { villageId: vA, email: `admin${t}@ord.test`, password: "x", name: "Admin", role: "admin" } });

    pid.keripik = (await mkProduct({ name: "Keripik Singkong", residentId: rid.s, productionValue: 15000, productionUnit: "bungkus", stockQuantity: 10, contactPhone: "081234567890", contactVisible: true })).id;
    pid.rahasia = (await mkProduct({ name: "Dodol Rahasia", residentId: rid.s2, contactPhone: "081111222233", contactVisible: false })).id;
    pid.desa = (await mkProduct({ name: "Madu Desa" })).id;
    pid.habis = (await mkProduct({ name: "Kerupuk Habis", residentId: rid.s, stockQuantity: 0 })).id;
    pid.pending = (await mkProduct({ name: "Tempe Pending", residentId: rid.s, status: "pending" })).id;
    pid.sembunyi = (await mkProduct({ name: "Wajik Sembunyi", residentId: rid.s, status: "hidden" })).id;
    pid.vb = (await mkProduct({ name: "Produk Desa Lain" }, vB)).id;
    pid.sawah = (await prisma.potential.create({ data: { villageId: vA, category: "Pertanian", name: "Sawah", description: "Bukan UKM", status: "active" } })).id;
    for (const k of ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8"]) pid[k] = (await mkProduct({ name: `Produk ${k}`, residentId: rid.s2 })).id;
  });
  after(async () => {
    for (const id of [vA, vB]) if (id) await prisma.village.delete({ where: { id } });
    await prisma.$disconnect();
  });

  it("memesan produk tayang: tercatat 'Diminta', ada tautan WhatsApp berkode pesanan, penjual diberi tahu, tanpa data pribadi pembeli", async () => {
    const r = await order("b", pid.keripik, { quantity: 3, note: "Pedas" });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const o = r.body.order;
    assert.equal(o.status, "DIMINTA");
    assert.equal(o.quantity, 3);
    assert.equal(o.estimatedTotal, "45000");
    assert.ok(o.whatsappUrl.startsWith("https://wa.me/6281234567890?text="));
    assert.ok(decodeURIComponent(o.whatsappUrl).includes(`#${o.id}`));
    assert.ok(decodeURIComponent(o.whatsappUrl).includes("Pedas"));
    assert.doesNotMatch(JSON.stringify(r.body), /BUDI SANTOSO|nik|buyerResidentId|sellerResidentId/);
    const ev = await prisma.ukmOrderEvent.findMany({ where: { orderId: o.id } });
    assert.equal(ev.length, 1);
    const sellerAcc = await prisma.citizenAccount.findUniqueOrThrow({ where: { residentId: rid.s } });
    const note = await eventually(() => prisma.userNotification.findFirst({ where: { accountType: "citizen", accountId: sellerAcc.id, deepLink: `/ukm/pesanan/${o.id}` } }));
    assert.ok(note, "penjual menerima pemberitahuan");
    assert.ok(note!.body?.includes("Budi S."), "nama pembeli disamarkan");
    assert.doesNotMatch(note!.body ?? "", /SANTOSO/);
  });

  it("ATURAN KONTAK: pemilik menyembunyikan kontak => tidak ada tautan; produk tak tayang => pesanan ditolak; produk disembunyikan kemudian => tautan hilang", async () => {
    const hidden = await order("c", pid.rahasia);
    assert.equal(hidden.status, 201);
    assert.equal(hidden.body.order.whatsappUrl, null);
    assert.doesNotMatch(JSON.stringify(hidden.body), /081111222233|6281111222233/);
    const managed = await order("c", pid.desa);
    assert.equal(managed.status, 201);
    assert.equal(managed.body.order.whatsappUrl, null);
    assert.equal(managed.body.order.seller.managedByVillage, true);
    for (const k of ["pending", "sembunyi", "sawah", "vb"]) assert.equal((await order("c", pid[k]!)).status, 404, k);
    const first = await order("d", pid.keripik);
    assert.ok(first.body.order.whatsappUrl);
    await prisma.potential.update({ where: { id: pid.keripik }, data: { status: "hidden" } });
    const afterHide = await get("d", first.body.order.id);
    assert.equal(afterHide.body.order.whatsappUrl, null);
    assert.doesNotMatch(JSON.stringify(afterHide.body), /081234567890|6281234567890/);
    await prisma.potential.update({ where: { id: pid.keripik }, data: { status: "active", contactVisible: false } });
    assert.equal((await get("d", first.body.order.id)).body.order.whatsappUrl, null);
    await prisma.potential.update({ where: { id: pid.keripik }, data: { contactVisible: true } });
    assert.ok((await get("d", first.body.order.id)).body.order.whatsappUrl);
  });

  it("validasi: jumlah jahat, stok, produk sendiri, tanpa token", async () => {
    for (const quantity of [0, -3, 1000, "abc", 1.5, null, [] as unknown]) {
      const r = await order("e", pid.keripik, { quantity });
      if (quantity === null) continue; // null = jumlah bawaan 1 (sah)
      assert.equal(r.status, 400, String(quantity));
    }
    const tooMany = await order("e", pid.keripik, { quantity: 11 });
    assert.equal(tooMany.status, 400);
    assert.ok(tooMany.body.error.fieldErrors?.quantity);
    assert.equal((await order("e", pid.habis)).status, 400);
    assert.equal((await order("s", pid.keripik)).status, 400, "tak bisa memesan produk sendiri");
    assert.equal((await pesan.POST(req(`/ukm/${pid.keripik}/pesan`, null, "POST", { quantity: 1 }), idp(pid.keripik))).status, 401);
    assert.equal((await order("e", pid.keripik, { quantity: 1, note: "x".repeat(301) })).status, 400);
    assert.equal((await pesan.POST(req("/ukm/abc/pesan", tok.e, "POST", {}), { params: Promise.resolve({ id: "abc" }) })).status, 400);
  });

  it("satu pesanan terbuka per pembeli per produk; setelah dibatalkan boleh memesan lagi", async () => {
    const a = await order("dup", pid.rahasia);
    assert.equal(a.status, 201);
    const dup = await order("dup", pid.rahasia);
    assert.equal(dup.status, 409);
    assert.equal((await act("dup", a.body.order.id, { action: "batal" })).status, 200);
    assert.equal((await prisma.ukmOrderRequest.findUniqueOrThrow({ where: { id: a.body.order.id } })).activeKey, null);
    assert.equal((await order("dup", pid.rahasia)).status, 201);
  });

  it("KONKURENSI: lima permintaan serentak pembeli yang sama untuk produk yang sama hanya menghasilkan satu pesanan", async () => {
    const rs = await Promise.all([1, 2, 3, 4, 5].map(() => order("f", pid.rahasia)));
    assert.equal(rs.filter((r) => r.status === 201).length, 1, JSON.stringify(rs.map((r) => r.status)));
    assert.equal(await prisma.ukmOrderRequest.count({ where: { buyerResidentId: rid.f, productId: pid.rahasia } }), 1);
  });

  it("alur penjual: konfirmasi, selesai, riwayat berurutan; tidak boleh melompat atau mengubah yang sudah selesai", async () => {
    const r = await order("g", pid.desa); // dikelola desa: penjual warga tak punya akses
    const id = r.body.order.id;
    assert.equal((await act("s", id, { action: "konfirmasi" })).status, 404);
    const mk = await order("g", pid.keripik, { quantity: 1 });
    const oid = mk.body.order.id;
    assert.equal((await act("s", oid, { action: "selesai" })).status, 409, "belum dikonfirmasi");
    const ok = await act("s", oid, { action: "konfirmasi" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.order.status, "DIKONFIRMASI");
    assert.equal((await act("g", oid, { action: "batal" })).status, 409, "pembeli tak bisa batal sesudah konfirmasi");
    assert.equal((await act("g", oid, { action: "konfirmasi" })).status, 409);
    const done = await act("s", oid, { action: "selesai" });
    assert.equal(done.body.order.status, "SELESAI");
    assert.equal((await act("s", oid, { action: "batal", note: "terlambat" })).status, 409);
    assert.equal((await act("s", oid, { action: "konfirmasi" })).status, 409);
    assert.equal((await prisma.ukmOrderRequest.findUniqueOrThrow({ where: { id: oid } })).activeKey, null);
    const detail = await get("g", oid);
    assert.deepEqual(detail.body.events.map((e: any) => e.toStatus), ["DIMINTA", "DIKONFIRMASI", "SELESAI"]);
    const buyerNote = await eventually(() => prisma.userNotification.findFirst({ where: { accountType: "citizen", deepLink: `/ukm/pesanan/${oid}`, title: "Pesanan dikonfirmasi" } }));
    assert.ok(buyerNote, "pembeli diberi tahu saat dikonfirmasi");
  });

  it("penjual membatalkan wajib beralasan; alasan tampil ke pembeli", async () => {
    const mk = await order("c", pid.keripik, { quantity: 1 });
    const oid = mk.body.order.id;
    const noReason = await act("s", oid, { action: "batal" });
    assert.equal(noReason.status, 400);
    assert.ok(noReason.body.error.fieldErrors?.note);
    const ok = await act("s", oid, { action: "batal", note: "Stok habis" });
    assert.equal(ok.status, 200);
    assert.equal((await get("c", oid)).body.order.sellerNote, "Stok habis");
  });

  it("KONKURENSI: penjual mengonfirmasi dan pembeli membatalkan bersamaan: tepat satu menang dan riwayat konsisten", async () => {
    for (let round = 0; round < 6; round++) {
      const buyer = `k${round + 1}`;
      const mk = await order(buyer, pid.keripik, { quantity: 1 });
      assert.equal(mk.status, 201, `putaran ${round}`);
      const oid = mk.body.order.id;
      const [a, b] = await Promise.all([act("s", oid, { action: "konfirmasi" }), act(buyer, oid, { action: "batal" })]);
      const wins = [a, b].filter((x) => x.status === 200).length;
      assert.equal(wins, 1, `putaran ${round}: ${a.status}/${b.status}`);
      const events = await prisma.ukmOrderEvent.count({ where: { orderId: oid } });
      assert.equal(events, 2, "satu pembuatan + satu perubahan");
      const st = await statusOf(oid);
      assert.ok(st === "DIKONFIRMASI" || st === "DIBATALKAN");
    }
  });

  it("ISOLASI: pembeli/penjual lain dan desa lain tidak melihat atau mengubah pesanan; daftar hanya milik sendiri", async () => {
    const mk = await order("d", pid.rahasia, { quantity: 1 });
    const oid = mk.body.order.id;
    assert.equal((await get("b", oid)).status, 404, "pembeli lain");
    assert.equal((await get("s", oid)).status, 404, "penjual produk lain");
    assert.equal((await get("vb", oid)).status, 404, "desa lain");
    assert.equal((await act("vb", oid, { action: "batal" })).status, 404);
    assert.equal((await act("b", oid, { action: "batal" })).status, 404);
    assert.equal((await act("s", oid, { action: "konfirmasi" })).status, 404);
    assert.equal(await statusOf(oid), "DIMINTA");
    assert.equal((await order("vb", pid.rahasia)).status, 404, "desa lain tak bisa memesan");
    const sellerView = await get("s2", oid);
    assert.equal(sellerView.status, 200);
    assert.equal(sellerView.body.role, "PENJUAL");
    assert.equal(sellerView.body.order.whatsappUrl, null, "penjual tidak diberi tautan");
    assert.equal(sellerView.body.order.buyer.name, "Dimas P.", "nama pembeli disamarkan untuk penjual");
    assert.doesNotMatch(JSON.stringify(sellerView.body), /Prakoso|nik|buyerResidentId|sellerResidentId|"phone"/i);
    const inbox = await mine("s2", "?peran=jual");
    assert.ok(inbox.body.items.every((i: any) => i.productName !== "Keripik Singkong"));
    assert.ok(inbox.body.items.some((i: any) => i.id === oid));
    const bought = await mine("d");
    assert.ok(bought.body.items.every((i: any) => i.buyer.name === "Dimas P."));
    assert.equal((await mine("vb")).body.items.length, 0);
  });

  it("daftar mobile: paginasi kursor, penyaring status, jumlah menunggu untuk penjual", async () => {
    for (const k of ["a1", "a2", "a3", "a4", "a5"]) assert.equal((await order("pg", pid[k]!, { quantity: 1 })).status, 201);
    const p1 = await mine("pg", "?status=DIMINTA");
    assert.ok(p1.body.items.length >= 5);
    assert.ok(p1.body.items.every((i: any) => i.status === "DIMINTA"));
    const seller = await mine("s2", "?peran=jual");
    assert.ok(seller.body.pendingForMe >= 5);
    const cursor = p1.body.items[1].id;
    const p2 = await mine("pg", `?status=DIMINTA&cursor=${cursor}`);
    assert.ok(p2.body.items.every((i: any) => i.id < cursor));
    assert.equal((await mine("pg", "?cursor=abc")).status, 200);
  });

  it("batas pesanan terbuka per pembeli (10) menghasilkan 429 yang jelas", async () => {
    for (let i = 0; i < 10; i++) await prisma.ukmOrderRequest.create({ data: { villageId: vA, productId: null, productName: `Lama ${i}`, quantity: 1, buyerResidentId: rid.lim, sellerResidentId: rid.s2, status: "DIMINTA", activeKey: null } });
    const r = await order("lim", pid.a6);
    assert.equal(r.status, 429);
    assert.match(r.body.error.message, /belum selesai/);
  });

  it("KONKURENSI: permintaan paralel ke produk berbeda tidak melewati batas 10 pesanan terbuka per pembeli", async () => {
    const products = await Promise.all(Array.from({ length: 14 }, (_, i) => mkProduct({ name: `Produk Paralel ${i}`, residentId: rid.s2 })));
    const rs = await Promise.all(products.map((p) => svc.createOrder(prisma, { villageId: vA, villageName: "Desa OA", buyerResidentId: rid.par, productId: p.id, input: { quantity: 1 } })));
    assert.equal(rs.filter((r) => r.ok).length, 10, JSON.stringify(rs.map((r) => (r.ok ? 201 : r.status))));
    assert.equal(await prisma.ukmOrderRequest.count({ where: { buyerResidentId: rid.par, status: { in: ["DIMINTA", "DIKONFIRMASI"] } } }), 10);
    assert.ok(rs.filter((r) => !r.ok).every((r) => !r.ok && r.status === 429));
  });

  it("batal lalu pesan ulang produk yang sama dibatasi 3 kali sehari (mencegah spam notifikasi ke penjual)", async () => {
    for (let i = 0; i < 3; i++) {
      const r = await svc.createOrder(prisma, { villageId: vA, villageName: "Desa OA", buyerResidentId: rid.cd, productId: pid.rahasia, input: { quantity: 1 } });
      assert.ok(r.ok, `pesanan ke-${i + 1}`);
      const c = await svc.actOnOrder(prisma, { villageId: vA, villageName: "x", orderId: r.ok ? r.data.id : 0, actor: { kind: "PEMBELI", residentId: rid.cd }, input: { action: "batal" } });
      assert.ok(c.ok);
    }
    const fourth = await svc.createOrder(prisma, { villageId: vA, villageName: "Desa OA", buyerResidentId: rid.cd, productId: pid.rahasia, input: { quantity: 1 } });
    assert.ok(!fourth.ok && fourth.status === 429 && fourth.errors[0]!.includes("3 kali"));
    const other = await svc.createOrder(prisma, { villageId: vA, villageName: "Desa OA", buyerResidentId: rid.cd, productId: pid.desa, input: { quantity: 1 } });
    assert.ok(other.ok, "produk lain tidak terpengaruh");
  });

  it("produk dihapus: pesanan tetap ada dengan salinan nama, tanpa tautan WhatsApp", async () => {
    const p = await mkProduct({ name: "Produk Sementara", residentId: rid.s, contactPhone: "081234567890", contactVisible: true });
    const mk = await order("g", p.id, { quantity: 1 });
    assert.equal(mk.status, 201);
    await prisma.potential.delete({ where: { id: p.id } });
    const d = await get("g", mk.body.order.id);
    assert.equal(d.status, 200);
    assert.equal(d.body.order.productName, "Produk Sementara");
    assert.equal(d.body.order.whatsappUrl, null);
  });

  it("admin web: melihat semua pesanan desanya saja, hitungan per status, bertindak atas produk dikelola desa, alasan batal wajib", async () => {
    const list = await svc.listForAdmin(prisma, { villageId: vA, villageName: "Desa OA", page: 1, pageSize: 100 });
    assert.ok(list.total >= 5);
    assert.ok(list.items.some((o) => o.buyer.name === "Cahyo Wibowo"), "admin melihat nama lengkap");
    assert.equal((await svc.listForAdmin(prisma, { villageId: vB, villageName: "Desa OB", page: 1, pageSize: 100 })).total, 0);
    assert.ok(Object.values(list.counts).reduce((a, b) => a + b, 0) >= list.total);
    const managed = await svc.listForAdmin(prisma, { villageId: vA, villageName: "x", managedOnly: true, page: 1, pageSize: 100 });
    assert.ok(managed.items.length > 0 && managed.items.every((o) => o.seller.managedByVillage));
    const search = await svc.listForAdmin(prisma, { villageId: vA, villageName: "x", search: "Madu", page: 1, pageSize: 100 });
    assert.ok(search.items.every((o) => o.productName.includes("Madu")));
    const target = managed.items.find((o) => o.status === "DIMINTA")!;
    const noReason = await svc.actOnOrder(prisma, { villageId: vA, villageName: "x", orderId: target.id, actor: { kind: "ADMIN" }, input: { action: "batal" } });
    assert.ok(!noReason.ok && noReason.status === 400);
    const ok = await svc.actOnOrder(prisma, { villageId: vA, villageName: "x", orderId: target.id, actor: { kind: "ADMIN" }, input: { action: "konfirmasi" } });
    assert.ok(ok.ok);
    const cross = await svc.actOnOrder(prisma, { villageId: vB, villageName: "x", orderId: target.id, actor: { kind: "ADMIN" }, input: { action: "batal", note: "bajak" } });
    assert.ok(!cross.ok && cross.status === 404);
    assert.equal(await svc.getForAdmin(prisma, { villageId: vB, villageName: "x", orderId: target.id }), null);
    const ev = await prisma.ukmOrderEvent.findMany({ where: { orderId: target.id }, orderBy: { id: "asc" } });
    assert.deepEqual(ev.map((e) => e.actorKind), ["PEMBELI", "ADMIN"]);
  });
});
