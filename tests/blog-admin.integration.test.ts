/**
 * API admin blog: pagar mutu terbit (/publish dan PUT status), konfirmasi ganti slug artikel terbit, slug terlarang,
 * unggah gambar aman memori (/images), dan penghapusan cover lama di Spaces. Handler asli + MySQL scratch; Spaces
 * TIDAK pernah dihubungi (env dikosongkan, atau S3Client.prototype.send dipalsukan dengan penampung).
 * Bagian murni (tanpa DB) selalu jalan; bagian DB butuh KEP_TEST_DATABASE_URL ke DB "scratch"/"test".
 */
import assert from "node:assert/strict";
import { describe, it, before, after, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";
import { S3Client, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SKIP, setupEnv, makeAdmin, call, auditOf, type Prisma } from "./helpers/platform-admin";
import {
  BLOG_IMAGE_MAX_BYTES,
  BLOG_UPLOAD_BODY_LIMIT,
  BodyTooLargeError,
  blogKeyFromUrl,
  findBlogImageUrls,
  readBodyWithLimit,
  removedBlogImageUrls,
} from "../lib/blog/image-upload.ts";
import { FORBIDDEN_BLOG_SLUGS, forbiddenBlogSlugMessage, isForbiddenBlogSlug } from "../lib/blog/slug-rules.ts";

const CDN = "https://uji-bucket.sgp1.digitaloceanspaces.com";
const UUID = "123e4567-e89b-12d3-a456-426614174000";
const words = (n: number) => Array.from({ length: n }, (_, i) => `kata${i}`).join(" ");

describe("blog admin: bagian murni", () => {
  it("blogKeyFromUrl: hanya pola blog/YYYY/MM/uuid.ext di bawah CDN kita", () => {
    assert.equal(blogKeyFromUrl(`${CDN}/blog/2026/11/${UUID}.webp`, CDN), `blog/2026/11/${UUID}.webp`);
    assert.equal(blogKeyFromUrl(`${CDN}/blog/2026/11/${UUID}.jpg`, `${CDN}/`), `blog/2026/11/${UUID}.jpg`);
    assert.equal(blogKeyFromUrl(`${CDN}/blog/2026/11/${UUID}.png`, CDN), `blog/2026/11/${UUID}.png`);
    const bad = [
      `${CDN}/villages/x/foto/${UUID}.jpg`, // folder lain
      `${CDN}/blog/2026/11/${UUID}.svg`, // ekstensi lain
      `${CDN}/blog/2026/11/../../villages/x/${UUID}.jpg`, // traversal
      `${CDN}/blog/2026/11/${UUID}.jpg?x=1`, // query
      `${CDN}/blog/2026/11/${UUID}.jpg#a`, // fragmen
      `${CDN}/blog/2026/11/%2e%2e/${UUID}.jpg`, // ter-encode
      `${CDN}/blog/2026/11/bukan-uuid.jpg`,
      `${CDN}/blog/26/11/${UUID}.jpg`,
      `https://evil.example/blog/2026/11/${UUID}.jpg`, // host lain
      `https://uji-bucket.sgp1.digitaloceanspaces.com.evil.example/blog/2026/11/${UUID}.jpg`,
      `https://images.unsplash.com/photo-1`,
      `/blog/2026/11/${UUID}.jpg`,
      "",
    ];
    for (const u of bad) assert.equal(blogKeyFromUrl(u, CDN), null, u);
  });

  it("readBodyWithLimit: membaca utuh bila di bawah batas; melempar dan membatalkan stream bila melebihi", async () => {
    const mk = (chunks: number[]) => {
      let i = 0;
      let cancelled = false;
      const stream = new ReadableStream<Uint8Array>({
        pull(c) {
          if (i < chunks.length) c.enqueue(new Uint8Array(chunks[i++]).fill(7));
          else c.close();
        },
        cancel() {
          cancelled = true;
        },
      });
      return { stream, wasCancelled: () => cancelled };
    };
    const ok = mk([10, 20, 30]);
    assert.equal((await readBodyWithLimit(ok.stream, 100)).byteLength, 60);
    assert.equal((await readBodyWithLimit(null, 100)).byteLength, 0);
    const big = mk([60, 60, 60]);
    await assert.rejects(readBodyWithLimit(big.stream, 100), BodyTooLargeError);
    assert.equal(big.wasCancelled(), true, "stream dibatalkan, tidak dibaca sampai habis");
  });

  it("findBlogImageUrls/removedBlogImageUrls: hanya gambar blog kita, di gambar/tautan/URL polos; tanpa duplikat; host lain diabaikan", () => {
    const a = `${CDN}/blog/2026/11/${UUID}.webp`;
    const b = `${CDN}/blog/2026/10/223e4567-e89b-12d3-a456-426614174001.png`;
    const text = `![x](${a}) teks [lihat](${b}) ${a} ![u](https://images.unsplash.com/photo-1) ![o](${CDN}/lain/2026/11/${UUID}.webp) ![l](/blog/2026/11/${UUID}.webp)`;
    assert.deepEqual(findBlogImageUrls(text, CDN), [a, b]);
    assert.deepEqual(findBlogImageUrls("", CDN), []);
    assert.deepEqual(findBlogImageUrls(`${CDN}/blog/2026/11/${UUID}.webp.bak ${CDN}/blog/2026/11/${UUID}.webpx`, CDN), [], "ekstensi lebih panjang bukan gambar kita");
    assert.deepEqual(findBlogImageUrls(`${CDN}/blog/2026/11/${UUID.toUpperCase()}.webp`, CDN), [], "huruf besar tidak dikenali (tak pernah kita hasilkan)");
    // CDN dengan karakter regex tidak merusak pencocokan
    assert.deepEqual(findBlogImageUrls(`https://cdn.x.id/blog/2026/11/${UUID}.jpg`, "https://cdn.x.id/"), [`https://cdn.x.id/blog/2026/11/${UUID}.jpg`]);
    assert.deepEqual(findBlogImageUrls(`https://cdnaxid/blog/2026/11/${UUID}.jpg`, "https://cdn.x.id"), []);

    assert.deepEqual(removedBlogImageUrls(`![x](${a}) ![y](${b})`, `![y](${b})`, CDN), [a]);
    assert.deepEqual(removedBlogImageUrls(`![x](${a})`, `![x](${a}) tambahan`, CDN), []);
    assert.deepEqual(removedBlogImageUrls(null, "isi", CDN), []);
    assert.deepEqual(removedBlogImageUrls(`![x](${a})`, null, CDN), [a]);
  });

  it("slug terlarang: minimal topik, feed, rss, page; tidak peka huruf besar; slug biasa lolos", () => {
    for (const s of ["topik", "feed", "rss", "page", "Topik", " FEED "]) assert.equal(isForbiddenBlogSlug(s), true, s);
    for (const s of ["topik-desa", "cara-menyusun-apbdes", "pages", "feeds"]) assert.equal(isForbiddenBlogSlug(s), false, s);
    for (const s of ["topik", "feed", "rss", "page"]) assert.ok(FORBIDDEN_BLOG_SLUGS.has(s));
    assert.match(forbiddenBlogSlugMessage("feed"), /feed/);
  });
});

describe("blog admin: API (MySQL nyata)", { skip: SKIP }, () => {
  let prisma: Prisma;
  let H: {
    posts: typeof import("../app/api/admin/blog/posts/route");
    post: typeof import("../app/api/admin/blog/posts/[id]/route");
    publish: typeof import("../app/api/admin/blog/posts/[id]/publish/route");
    images: typeof import("../app/api/admin/blog/images/route");
  };
  let admin: Awaited<ReturnType<typeof makeAdmin>>;
  let support: Awaited<ReturnType<typeof makeAdmin>>;
  const t = Date.now() % 1e6;
  const created: bigint[] = [];
  const idp = (n: bigint | string) => ({ id: String(n) });
  const savedEnv: Record<string, string | undefined> = {};
  const SPACES_KEYS = ["SPACES_REGION", "SPACES_BUCKET", "SPACES_ENDPOINT", "SPACES_ACCESS_KEY_ID", "SPACES_SECRET_ACCESS_KEY", "SPACES_CDN_BASE_URL"];

  const put = (pid: bigint, body: unknown) => call(H.post.PUT as never, "PUT", "/x", admin.cookie, body, idp(pid));
  const publish = (pid: bigint) => call(H.publish.POST as never, "POST", "/x", admin.cookie, {}, idp(pid));
  const row = (pid: bigint) => prisma.blogPost.findUniqueOrThrow({ where: { id: pid } });

  async function newPost(slug: string, data: Record<string, unknown> = {}): Promise<bigint> {
    const p = await prisma.blogPost.create({ data: { title: `Artikel ${slug}`, slug, ...data } as never, select: { id: true } });
    created.push(p.id);
    return p.id;
  }
  const GOOD = { content: words(150), excerpt: "Ringkasan artikel uji." };

  before(async () => {
    const env = await setupEnv();
    prisma = env.prisma;
    H = {
      posts: await import("../app/api/admin/blog/posts/route"),
      post: await import("../app/api/admin/blog/posts/[id]/route"),
      publish: await import("../app/api/admin/blog/posts/[id]/publish/route"),
      images: await import("../app/api/admin/blog/images/route"),
    };
    admin = await makeAdmin(prisma, env.encode, `blogadm-${t}`);
    support = await makeAdmin(prisma, env.encode, `blogsup-${t}`, "platform_support");
  });

  beforeEach(() => {
    for (const k of SPACES_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k]; // tes tidak boleh menyentuh Spaces sungguhan
    }
  });
  afterEach(() => {
    for (const k of SPACES_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  after(async () => {
    await prisma.blogPost.deleteMany({ where: { OR: [{ id: { in: created } }, { slug: { startsWith: `uji-blog-${t}` } }] } });
    await prisma.platformAuditLog.deleteMany({ where: { actorId: { in: [admin.user.id, support.user.id] } } });
    await prisma.platformUser.deleteMany({ where: { id: { in: [admin.user.id, support.user.id] } } });
    await prisma.$disconnect();
  });

  describe("pagar mutu terbit", () => {
    it("/publish: artikel tipis 422 (draf tetap draf); artikel lengkap 200", async () => {
      const pid = await newPost(`uji-blog-${t}-tipis`, { content: "terlalu pendek" });
      const r = await publish(pid);
      assert.equal(r.status, 422);
      const j = (await r.json()) as { error: string; checks: { id: string; status: string }[] };
      assert.match(j.error, /Belum bisa diterbitkan/);
      assert.ok(j.checks.some((c) => c.id === "length" && c.status === "fail"));
      assert.equal((await row(pid)).status, "draft");
      assert.equal((await row(pid)).publishedAt, null);

      assert.equal((await put(pid, GOOD)).status, 200);
      const ok = await publish(pid);
      assert.equal(ok.status, 200);
      const after = await row(pid);
      assert.equal(after.status, "published");
      assert.ok(after.publishedAt);
    });

    it("/publish: penanda sisa ([isi ...]) memblokir walau panjang cukup", async () => {
      const pid = await newPost(`uji-blog-${t}-sisa`, { content: `${words(150)} [isi nama desa]`, excerpt: "Ringkasan." });
      const r = await publish(pid);
      assert.equal(r.status, 422);
      assert.match(((await r.json()) as { error: string }).error, /Penanda sisa/);
    });

    it("PUT status=published: 422 bila gagal pemeriksaan (tak ada perubahan tersimpan); 200 bila lolos", async () => {
      const pid = await newPost(`uji-blog-${t}-put`, { content: "pendek" });
      const r = await put(pid, { status: "published", title: "Judul diganti oleh percobaan gagal" });
      assert.equal(r.status, 422);
      const unchanged = await row(pid);
      assert.equal(unchanged.status, "draft");
      assert.equal(unchanged.title, `Artikel uji-blog-${t}-put`, "penolakan terjadi sebelum transaksi menulis apa pun");

      // Isi dikirim bersamaan dengan status: pemeriksaan memakai keadaan gabungan.
      const ok = await put(pid, { status: "published", ...GOOD });
      assert.equal(ok.status, 200);
      assert.equal((await row(pid)).status, "published");
    });

    it("menyunting artikel yang SUDAH terbit tidak diblokir pemeriksaan (hanya peralihan ke terbit yang dijaga)", async () => {
      const pid = await newPost(`uji-blog-${t}-live`, { ...GOOD, status: "published", publishedAt: new Date() });
      const r = await put(pid, { content: "dipangkas jadi pendek", status: "published" });
      assert.equal(r.status, 200);
    });
  });

  describe("ganti slug artikel terbit", () => {
    it("terbit: 409 tanpa allowSlugChange (slug tetap); 200 dengan allowSlugChange:true; slug sama tanpa flag 200", async () => {
      const slug = `uji-blog-${t}-slug`;
      const pid = await newPost(slug, { ...GOOD, status: "published", publishedAt: new Date() });

      const no = await put(pid, { slug: `${slug}-baru` });
      assert.equal(no.status, 409);
      assert.equal(((await no.json()) as { code: string }).code, "SLUG_CHANGE_NEEDS_CONFIRM");
      assert.equal((await row(pid)).slug, slug);

      assert.equal((await put(pid, { slug: `${slug}-baru`, allowSlugChange: false })).status, 409, "hanya true yang sah");
      assert.equal((await put(pid, { slug })).status, 200, "slug tidak berubah → tidak perlu konfirmasi");

      const yes = await put(pid, { slug: `${slug}-baru`, allowSlugChange: true });
      assert.equal(yes.status, 200);
      assert.equal((await row(pid)).slug, `${slug}-baru`);
    });

    it("draf bebas ganti slug tanpa konfirmasi", async () => {
      const slug = `uji-blog-${t}-draf`;
      const pid = await newPost(slug);
      assert.equal((await put(pid, { slug: `${slug}-v2` })).status, 200);
      assert.equal((await row(pid)).slug, `${slug}-v2`);
    });
  });

  describe("slug terlarang", () => {
    it("POST create: 400 untuk topik/feed/rss/page (dari judul maupun slug eksplisit); judul lain 201", async () => {
      for (const body of [{ title: "Topik" }, { title: "Apa saja", slug: "feed" }, { title: "x", slug: "RSS" }, { title: "Page" }]) {
        const r = await call(H.posts.POST as never, "POST", "/x", admin.cookie, body);
        assert.equal(r.status, 400, JSON.stringify(body));
        assert.match(((await r.json()) as { error: string }).error, /dicadangkan/);
      }
      const ok = await call(H.posts.POST as never, "POST", "/x", admin.cookie, { title: `Uji blog ${t} topik desa`, slug: `uji-blog-${t}-topik-desa` });
      assert.equal(ok.status, 201);
      created.push(BigInt(((await ok.json()) as { id: string }).id));
    });

    it("PUT slug terlarang 400 (slug tak berubah)", async () => {
      const slug = `uji-blog-${t}-terlarang`;
      const pid = await newPost(slug);
      for (const bad of ["topik", "feed", "RSS", "page"]) {
        assert.equal((await put(pid, { slug: bad })).status, 400, bad);
      }
      assert.equal((await row(pid)).slug, slug);
    });
  });

  describe("unggah gambar (/images)", () => {
    const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);

    async function multipart(file: Uint8Array | null, name = "x.png", type = "image/png") {
      const fd = new FormData();
      if (file) fd.append("file", new File([file as BlobPart], name, { type }));
      const res = new Response(fd);
      const ct = res.headers.get("content-type")!;
      const body = new Uint8Array(await res.arrayBuffer());
      return { ct, body };
    }
    function raw(cookie: string | null, opts: { ct?: string | null; body?: Uint8Array | string; length?: string | null }) {
      const headers: Record<string, string> = { "x-real-ip": "10.77.0.1" };
      if (cookie) headers.cookie = `next-auth.session-token=${cookie}`;
      if (opts.ct) headers["content-type"] = opts.ct;
      if (opts.length) headers["content-length"] = opts.length;
      const req = new NextRequest("http://localhost/api/admin/blog/images", { method: "POST", headers, body: (opts.body ?? "") as BodyInit });
      return H.images.POST(req);
    }
    const send = async (cookie: string | null, file: Uint8Array | null, over: { length?: string | null; name?: string; type?: string } = {}) => {
      const { ct, body } = await multipart(file, over.name, over.type);
      return raw(cookie, { ct, body, length: over.length === undefined ? String(body.byteLength) : over.length });
    };

    it("401 tanpa sesi, 403 peran dukungan", async () => {
      assert.equal((await send(null, PNG)).status, 401);
      assert.equal((await send(support.cookie, PNG)).status, 403);
    });

    it("415 bila bukan multipart/form-data", async () => {
      const r = await raw(admin.cookie, { ct: "application/json", body: "{}", length: "2" });
      assert.equal(r.status, 415);
      assert.equal((await raw(admin.cookie, { ct: null, body: "x", length: "1" })).status, 415);
    });

    it("411 tanpa Content-Length", async () => {
      const r = await send(admin.cookie, PNG, { length: null });
      assert.equal(r.status, 411);
    });

    it("413: Content-Length melebihi batas ditolak sebelum body dibaca", async () => {
      const r = await send(admin.cookie, PNG, { length: String(BLOG_UPLOAD_BODY_LIMIT + 1) });
      assert.equal(r.status, 413);
    });

    it("413: header berbohong (kecil) tetapi body nyata melebihi batas → dibatasi oleh pembaca ber-batas", async () => {
      const big = new Uint8Array(BLOG_UPLOAD_BODY_LIMIT + 4096);
      big.set(PNG);
      const r = await send(admin.cookie, big, { length: "100" });
      assert.equal(r.status, 413);
    });

    it("413: berkas > 5 MB walau body masih di bawah batas amplop multipart", async () => {
      const f = new Uint8Array(BLOG_IMAGE_MAX_BYTES + 10 * 1024);
      f.set(PNG);
      const r = await send(admin.cookie, f);
      assert.equal(r.status, 413);
    });

    it("415 untuk SVG (juga bila dikirim dengan nama .png / tipe image/png) dan HTML", async () => {
      const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      assert.equal((await send(admin.cookie, svg, { name: "a.svg", type: "image/svg+xml" })).status, 415);
      assert.equal((await send(admin.cookie, svg, { name: "a.png", type: "image/png" })).status, 415);
      assert.equal((await send(admin.cookie, new TextEncoder().encode("<html></html>"))).status, 415);
    });

    it("400 bila field file tidak ada", async () => {
      assert.equal((await send(admin.cookie, null)).status, 400);
    });

    it("503 untuk gambar sah bila Spaces belum dikonfigurasi (env SPACES_* kosong) — tanpa menghubungi Spaces", async () => {
      for (const k of SPACES_KEYS) assert.equal(process.env[k], undefined);
      const r = await send(admin.cookie, PNG);
      assert.equal(r.status, 503);
    });
  });

  describe("penghapusan cover lama di Spaces (S3Client.send dipalsukan)", () => {
    const sent: { Key?: string; Bucket?: string }[] = [];
    const puts: { Key?: string; ContentType?: string; bytes: number }[] = [];
    const realSend = S3Client.prototype.send;

    beforeEach(() => {
      sent.length = 0;
      puts.length = 0;
      process.env.SPACES_REGION = "sgp1";
      process.env.SPACES_BUCKET = "uji-bucket";
      process.env.SPACES_ENDPOINT = "https://sgp1.digitaloceanspaces.com";
      process.env.SPACES_ACCESS_KEY_ID = "uji";
      process.env.SPACES_SECRET_ACCESS_KEY = "uji";
      process.env.SPACES_CDN_BASE_URL = CDN;
      (S3Client.prototype as unknown as { send: unknown }).send = async (cmd: unknown) => {
        if (cmd instanceof DeleteObjectCommand) sent.push({ Key: cmd.input.Key, Bucket: cmd.input.Bucket });
        if (cmd instanceof PutObjectCommand) {
          puts.push({ Key: cmd.input.Key, ContentType: cmd.input.ContentType, bytes: (cmd.input.Body as Uint8Array).byteLength });
        }
        return {};
      };
    });
    afterEach(() => {
      (S3Client.prototype as unknown as { send: unknown }).send = realSend;
    });

    const blogUrl = (suffix: string) => `${CDN}/blog/2026/11/${suffix}.webp`;
    const uuid = (n: number) => `123e4567-e89b-12d3-a456-4266141740${String(n).padStart(2, "0")}`;

    it("unggah sah lewat FormData sungguhan → 201, kunci blog/YYYY/MM/uuid.png, ContentType dari ISI berkas, diaudit", async () => {
      const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 9, 9, 9, 9]);
      const fd = new FormData();
      // Nama/tipe klien sengaja menyesatkan: yang dipakai tipe hasil sniff.
      fd.append("file", new File([png as BlobPart], "../../etc/passwd.svg", { type: "image/svg+xml" }));
      const res = new Response(fd);
      const ct = res.headers.get("content-type")!;
      const body = new Uint8Array(await res.arrayBuffer());
      const req = new NextRequest("http://localhost/api/admin/blog/images", {
        method: "POST",
        headers: { cookie: `next-auth.session-token=${admin.cookie}`, "content-type": ct, "content-length": String(body.byteLength), "x-real-ip": "10.77.0.2" },
        body: body as BodyInit,
      });
      const r = await H.images.POST(req);
      assert.equal(r.status, 201);
      const j = (await r.json()) as { url: string; key: string; mime: string };
      assert.match(j.key, /^blog\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.png$/);
      assert.equal(j.url, `${CDN}/${j.key}`);
      assert.equal(j.mime, "image/png");
      assert.deepEqual(puts, [{ Key: j.key, ContentType: "image/png", bytes: png.byteLength }]);
      assert.equal(blogKeyFromUrl(j.url, CDN), j.key, "URL hasil unggah dikenali penghapus cover");
      assert.ok((await auditOf(prisma, admin.user.id, "blog.image_upload")).some((l) => l.targetId === `blog_image:${j.key}`));
    });

    it("ganti cover blog → objek lama dihapus (key & bucket benar) dan diaudit dengan key saja", async () => {
      const old = blogUrl(uuid(1));
      const pid = await newPost(`uji-blog-${t}-c1`, { coverImageUrl: old });
      const r = await put(pid, { coverImageUrl: blogUrl(uuid(2)) });
      assert.equal(r.status, 200);
      assert.deepEqual(sent, [{ Key: `blog/2026/11/${uuid(1)}.webp`, Bucket: "uji-bucket" }]);
      const log = (await auditOf(prisma, admin.user.id, "blog.image_delete")).find((l) => l.targetId === `blog_post:${pid}`);
      assert.ok(log);
      assert.deepEqual((log!.metadata as { keys: string[] }).keys, [`blog/2026/11/${uuid(1)}.webp`]);
      assert.ok(!JSON.stringify(log!.metadata).includes(CDN), "metadata hanya berisi key, bukan URL");
    });

    it("hapus cover (string kosong) → objek lama dihapus", async () => {
      const pid = await newPost(`uji-blog-${t}-c2`, { coverImageUrl: blogUrl(uuid(3)) });
      assert.equal((await put(pid, { coverImageUrl: "" })).status, 200);
      assert.deepEqual(sent.map((s) => s.Key), [`blog/2026/11/${uuid(3)}.webp`]);
      assert.equal((await row(pid)).coverImageUrl, null);
    });

    it("TIDAK menghapus: cover Unsplash, folder bukan blog, URL sama dipertahankan, atau Spaces tak terkonfigurasi", async () => {
      const a = await newPost(`uji-blog-${t}-c3`, { coverImageUrl: "https://images.unsplash.com/photo-1" });
      assert.equal((await put(a, { coverImageUrl: blogUrl(uuid(4)) })).status, 200);
      const b = await newPost(`uji-blog-${t}-c4`, { coverImageUrl: `${CDN}/villages/x/foto/${uuid(5)}.jpg` });
      assert.equal((await put(b, { coverImageUrl: "" })).status, 200);
      const c = await newPost(`uji-blog-${t}-c5`, { coverImageUrl: blogUrl(uuid(6)) });
      assert.equal((await put(c, { coverImageUrl: blogUrl(uuid(6)), title: "judul baru" })).status, 200);
      assert.deepEqual(sent, []);

      for (const k of SPACES_KEYS) delete process.env[k];
      const d = await newPost(`uji-blog-${t}-c6`, { coverImageUrl: blogUrl(uuid(7)) });
      assert.equal((await put(d, { coverImageUrl: "" })).status, 200, "Spaces mati tidak menggagalkan simpan");
      assert.deepEqual(sent, []);
    });

    it("TIDAK menghapus bila URL masih dipakai: di isi artikel ini, cover artikel lain, atau isi artikel lain", async () => {
      const shared = blogUrl(uuid(8));
      const own = await newPost(`uji-blog-${t}-c7`, { coverImageUrl: shared });
      assert.equal((await put(own, { coverImageUrl: "", content: `${words(20)} ![alt](${shared}) lagi` })).status, 200);
      assert.deepEqual(sent, [], "masih di isi artikel ini");

      const shared2 = blogUrl(uuid(9));
      const p1 = await newPost(`uji-blog-${t}-c8`, { coverImageUrl: shared2 });
      await newPost(`uji-blog-${t}-c9`, { coverImageUrl: shared2 });
      assert.equal((await put(p1, { coverImageUrl: "" })).status, 200);
      assert.deepEqual(sent, [], "masih jadi cover artikel lain");

      const shared3 = blogUrl(uuid(10));
      const p2 = await newPost(`uji-blog-${t}-c10`, { coverImageUrl: shared3 });
      await newPost(`uji-blog-${t}-c11`, { content: `teks ![x](${shared3})` });
      assert.equal((await put(p2, { coverImageUrl: "" })).status, 200);
      assert.deepEqual(sent, [], "masih dipakai di isi artikel lain");
    });

    it("gambar dibuang dari ISI artikel → objek dihapus & diaudit; gambar yang tetap ada tidak disentuh", async () => {
      const keep = blogUrl(uuid(20));
      const drop = blogUrl(uuid(21));
      const pid = await newPost(`uji-blog-${t}-i1`, { content: `${words(20)} ![a](${keep}) dan ![b](${drop})` });
      assert.equal((await put(pid, { content: `${words(20)} ![a](${keep}) saja` })).status, 200);
      assert.deepEqual(sent, [{ Key: `blog/2026/11/${uuid(21)}.webp`, Bucket: "uji-bucket" }]);
      const log = (await auditOf(prisma, admin.user.id, "blog.image_delete")).find((l) => l.targetId === `blog_post:${pid}`);
      assert.deepEqual((log!.metadata as { keys: string[] }).keys, [`blog/2026/11/${uuid(21)}.webp`]);
    });

    it("menyunting isi tanpa membuang gambar, atau tanpa mengirim content, tidak menghapus apa pun", async () => {
      const img = blogUrl(uuid(22));
      const pid = await newPost(`uji-blog-${t}-i2`, { content: `${words(10)} ![a](${img})` });
      assert.equal((await put(pid, { content: `${words(30)} ![a](${img}) tambah` })).status, 200);
      assert.equal((await put(pid, { title: "judul baru saja" })).status, 200);
      assert.deepEqual(sent, []);
    });

    it("gambar dibuang dari isi TIDAK dihapus bila jadi cover artikel ini, atau dipakai artikel lain; Unsplash dan folder lain diabaikan", async () => {
      const asCover = blogUrl(uuid(23));
      const p1 = await newPost(`uji-blog-${t}-i3`, { coverImageUrl: asCover, content: `x ![a](${asCover})` });
      assert.equal((await put(p1, { content: "tanpa gambar lagi" })).status, 200);
      assert.deepEqual(sent, [], "masih cover artikel ini");

      const shared = blogUrl(uuid(24));
      const p2 = await newPost(`uji-blog-${t}-i4`, { content: `x ![a](${shared})` });
      await newPost(`uji-blog-${t}-i5`, { content: `lain ![a](${shared})` });
      assert.equal((await put(p2, { content: "kosong" })).status, 200);
      assert.deepEqual(sent, [], "masih dipakai artikel lain");

      const p3 = await newPost(`uji-blog-${t}-i6`, { content: `![u](https://images.unsplash.com/photo-9) ![o](${CDN}/villages/x/${uuid(25)}.webp)` });
      assert.equal((await put(p3, { content: "bersih" })).status, 200);
      assert.deepEqual(sent, [], "bukan gambar blog kita");
    });

    it("cover diganti DAN gambar isi dibuang dalam satu simpan → keduanya dihapus", async () => {
      const oldCover = blogUrl(uuid(26));
      const inline = blogUrl(uuid(27));
      const pid = await newPost(`uji-blog-${t}-i7`, { coverImageUrl: oldCover, content: `x ![a](${inline})` });
      assert.equal((await put(pid, { coverImageUrl: "", content: "bersih" })).status, 200);
      assert.deepEqual(sent.map((s) => s.Key).sort(), [`blog/2026/11/${uuid(26)}.webp`, `blog/2026/11/${uuid(27)}.webp`].sort());
    });

    it("kegagalan hapus di Spaces tidak menggagalkan simpan dan tidak diaudit sebagai terhapus", async () => {
      (S3Client.prototype as unknown as { send: unknown }).send = async () => {
        throw new Error("Spaces mati");
      };
      const old = blogUrl(uuid(11));
      const pid = await newPost(`uji-blog-${t}-c12`, { coverImageUrl: old });
      assert.equal((await put(pid, { coverImageUrl: "" })).status, 200);
      assert.equal((await auditOf(prisma, admin.user.id, "blog.image_delete")).filter((l) => l.targetId === `blog_post:${pid}`).length, 0);
    });
  });
});
