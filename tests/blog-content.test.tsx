import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  countWords,
  extractHeadings,
  extractLinks,
  isInternalHref,
  readingMinutes,
  slugifyHeading,
} from "../lib/blog/markdown.ts";
import { checkBlogSeo, type BlogCheckInput } from "../lib/blog/seo-check.ts";
import { fitWithin, needsDownscale, BLOG_IMAGE_MAX_SIDE } from "../lib/blog/image-client.ts";
import { isStaticOptimizableImageUrl, buildImageRemotePatterns } from "../lib/image-hosts.ts";
import { BlogMarkdown } from "../components/blog/BlogMarkdown.tsx";
import { BRAND_SUFFIX, SEO_TITLE_MAX } from "../lib/blog/seo-check.ts";
import { BLOG_IMAGE_MAX_BYTES, blogImageKey, sniffImageType } from "../lib/blog/image-upload.ts";

const words = (n: number) => Array.from({ length: n }, (_, i) => `kata${i}`).join(" ");

const ARTICLE = `## Apa itu APBDes

${words(60)}

### Sumber **pendapatan**

${words(60)} [harga](/harga)

## Langkah [menyusun](https://klandesa.com/platform) dokumen

${words(60)}
`;

describe("utilitas markdown blog", () => {
  it("slugifyHeading: huruf kecil, tanpa tanda baca, bahasa Indonesia aman", () => {
    assert.equal(slugifyHeading("Apa itu APBDes?"), "apa-itu-apbdes");
    assert.equal(slugifyHeading("  Dana   Desa -- 2026 "), "dana-desa-2026");
    assert.equal(slugifyHeading("???"), "bagian");
  });

  it("extractHeadings: h2/h3, sintaks inline dibuang, id kembar diberi akhiran", () => {
    const h = extractHeadings(`# Satu\n## Dua\n### Tiga **tebal**\n## Dua\n#### Empat\n`);
    assert.deepEqual(
      h.map((x) => [x.level, x.text, x.id]),
      [
        [2, "Satu", "satu"],
        [2, "Dua", "dua"],
        [3, "Tiga tebal", "tiga-tebal"],
        [2, "Dua", "dua-2"],
      ],
    );
  });

  it("extractHeadings mengabaikan '#' di dalam blok kode berpagar", () => {
    const h = extractHeadings("## Asli\n```bash\n# komentar shell\n## bukan heading\n```\n## Kedua\n");
    assert.deepEqual(h.map((x) => x.text), ["Asli", "Kedua"]);
  });

  it("countWords/readingMinutes: sintaks dan blok kode tidak dihitung, minimal 1 menit", () => {
    assert.equal(countWords("## Judul\n\n**satu** dua [tiga](/x)\n\n```\nabaikan ini semua\n```\n- empat\n"), 5);
    assert.equal(countWords(""), 0);
    assert.equal(readingMinutes(""), 1);
    assert.equal(readingMinutes(words(401)), 3);
  });

  it("extractLinks/isInternalHref membedakan tautan internal dan eksternal", () => {
    const links = extractLinks("[a](/harga) ![gambar](/x.png) [b](https://example.com/y) [c](https://www.klandesa.com/demo)");
    assert.deepEqual(links.map((l) => l.href), ["/harga", "https://example.com/y", "https://www.klandesa.com/demo"]);
    assert.equal(isInternalHref("/harga"), true);
    assert.equal(isInternalHref("//evil.com/x"), false);
    assert.equal(isInternalHref("https://klandesa.com/demo"), true);
    assert.equal(isInternalHref("https://klandesa.com.evil.com/"), false);
    assert.equal(isInternalHref("#bagian"), false);
  });
});

describe("render BlogMarkdown", () => {
  const html = renderToStaticMarkup(createElement(BlogMarkdown, { content: ARTICLE }));

  it("menghasilkan heading semantik (bukan teks '##') dengan id sama dengan daftar isi", () => {
    assert.ok(!html.includes("##"));
    for (const h of extractHeadings(ARTICLE)) {
      assert.match(html, new RegExp(`<h${h.level} id="${h.id}"`), `heading ${h.id}`);
    }
  });

  it("h1 di isi diturunkan jadi h2 (halaman hanya punya satu h1)", () => {
    const out = renderToStaticMarkup(createElement(BlogMarkdown, { content: "# Judul dalam isi\n\nteks" }));
    assert.ok(!out.includes("<h1"));
    assert.match(out, /<h2 id="judul-dalam-isi"/);
  });

  it("tautan eksternal membuka tab baru dengan rel aman; internal tanpa target", () => {
    const out = renderToStaticMarkup(
      createElement(BlogMarkdown, { content: "[ext](https://example.com) [int](/harga) [abs](https://klandesa.com/demo?x=1)" }),
    );
    assert.match(out, /<a href="https:\/\/example\.com"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    assert.match(out, /<a[^>]*href="\/harga"/);
    assert.match(out, /href="\/demo\?x=1"/);
  });

  it("HTML mentah dan javascript: tidak lolos", () => {
    const out = renderToStaticMarkup(
      createElement(BlogMarkdown, { content: "<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n<img src=x onerror=alert(1)>" }),
    );
    // Teks "onerror" boleh tampil sebagai teks ter-escape; yang tidak boleh adalah elemen/atribut aktif.
    assert.ok(!out.includes("<script"));
    assert.ok(!out.includes("<img"));
    assert.ok(!/href="javascript:/i.test(out));
    assert.ok(!out.includes("javascript:"));
  });

  it("tabel GFM dibungkus wilayah yang bisa digulir keyboard", () => {
    const out = renderToStaticMarkup(createElement(BlogMarkdown, { content: "| a | b |\n|---|---|\n| 1 | 2 |\n" }));
    assert.match(out, /role="region"[^>]*tabindex="0"|tabindex="0"[^>]*role="region"/);
    assert.match(out, /<th scope="col"/);
  });
});

describe("pemeriksa SEO blog", () => {
  const good: BlogCheckInput = {
    title: "Cara Menyusun APBDes Tepat Waktu Tahun Ini",
    slug: "cara-menyusun-apbdes",
    excerpt: "Ringkasan.",
    content: ARTICLE + "\n" + words(300),
    seoTitle: "Cara Menyusun APBDes Tepat Waktu, Langkah demi Langkah",
    seoDescription:
      "Panduan menyusun APBDes untuk perangkat desa: tahapan, dokumen yang disiapkan, dan kesalahan umum yang perlu dihindari agar tepat waktu.",
    coverImageUrl: "https://images.unsplash.com/x",
    tags: ["apbdes", "keuangan desa"],
  };
  const byId = (r: ReturnType<typeof checkBlogSeo>, id: string) => r.items.find((i) => i.id === id);

  it("artikel lengkap lolos tanpa fail", () => {
    const r = checkBlogSeo(good);
    assert.equal(r.fail, 0, JSON.stringify(r.items.filter((i) => i.status !== "ok")));
    assert.equal(r.canPublish, true);
  });

  it("artikel tipis, tanpa judul/deskripsi/slug → fail dan tidak bisa terbit", () => {
    const r = checkBlogSeo({ title: "", slug: "", content: "pendek saja" });
    for (const id of ["title", "description", "slug", "length"]) assert.equal(byId(r, id)?.status, "fail", id);
    assert.equal(r.canPublish, false);
  });

  it("slug tidak valid → fail", () => {
    assert.equal(byId(checkBlogSeo({ ...good, slug: "Cara Menyusun_APBDes" }), "slug")?.status, "fail");
  });

  it("penanda sisa (TODO, [isi ...], lorem ipsum) memblokir; tautan Markdown bernama 'sumber' tidak", () => {
    for (const bad of ["[isi nama desa]", "TODO lengkapi", "lorem ipsum dolor"]) {
      assert.equal(checkBlogSeo({ ...good, content: `${good.content}\n${bad}` }).canPublish, false, bad);
    }
    assert.equal(checkBlogSeo({ ...good, content: `${good.content}\n[sumber resmi](https://example.com)` }).canPublish, true);
  });

  it("judul/deskripsi berlebih, tanpa cover, tanpa tautan internal, tanpa tag → saran (warn), tetap bisa terbit", () => {
    const r = checkBlogSeo({
      ...good,
      seoTitle: "x".repeat(80),
      seoDescription: "y".repeat(200),
      coverImageUrl: null,
      tags: [],
      content: good.content!.replace(/\]\(\/harga\)|\]\(https:\/\/klandesa\.com\/platform\)/g, "](https://example.com)"),
    });
    for (const id of ["title", "description", "cover", "tags", "internal-links"]) {
      assert.equal(byId(r, id)?.status, "warn", id);
    }
    assert.equal(r.canPublish, true);
  });

  it("H1 di dalam isi diberi peringatan", () => {
    assert.equal(byId(checkBlogSeo({ ...good, content: `# Judul ganda\n${good.content}` }), "h1")?.status, "warn");
  });
});

describe("unggah gambar blog", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);

  it("mengenali JPEG, PNG, WebP dari isi berkas", () => {
    assert.deepEqual(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0)), { mime: "image/jpeg", ext: "jpg" });
    assert.deepEqual(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), { mime: "image/png", ext: "png" });
    assert.deepEqual(
      sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)),
      { mime: "image/webp", ext: "webp" },
    );
  });

  it("menolak SVG, HTML, GIF, berkas kosong, dan RIFF non-WebP (WAV)", () => {
    const enc = (t: string) => new TextEncoder().encode(t);
    assert.equal(sniffImageType(enc('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
    assert.equal(sniffImageType(enc("<html><body>x</body></html>")), null);
    assert.equal(sniffImageType(enc("GIF89a")), null);
    assert.equal(sniffImageType(new Uint8Array()), null);
    assert.equal(sniffImageType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45)), null);
  });

  it("kunci objek berpola blog/tahun/bulan/uuid.ext dan batas 5 MB", () => {
    const key = blogImageKey("webp", "11111111-2222-3333-4444-555555555555", new Date(Date.UTC(2026, 10, 13)));
    assert.equal(key, "blog/2026/11/11111111-2222-3333-4444-555555555555.webp");
    assert.equal(BLOG_IMAGE_MAX_BYTES, 5 * 1024 * 1024);
  });
});

describe("audit: perbaikan", () => {
  it("id heading kembar unik dan render berulang menghasilkan HTML identik (murni, aman StrictMode)", () => {
    const md = "## Dua\n\nisi\n\n## Dua\n\nisi\n\n### Tiga\n";
    const a = renderToStaticMarkup(createElement(BlogMarkdown, { content: md }));
    const b = renderToStaticMarkup(createElement(BlogMarkdown, { content: md }));
    assert.equal(a, b);
    assert.match(a, /<h2 id="dua"/);
    assert.match(a, /<h2 id="dua-2"/);
    assert.match(a, /<h3 id="tiga"/);
  });

  it("mailto/tel tidak membuka tab baru", () => {
    const out = renderToStaticMarkup(createElement(BlogMarkdown, { content: "[email](mailto:a@b.id) [telp](tel:+6281)" }));
    assert.ok(!out.includes("_blank"));
  });

  it("pemeriksa judul memperhitungkan akhiran merek dari template layout", () => {
    const base = { title: "x", slug: "x", content: "" };
    const room = SEO_TITLE_MAX - BRAND_SUFFIX.length;
    const at = (n: number) => checkBlogSeo({ ...base, seoTitle: "a".repeat(n) }).items.find((i) => i.id === "title")!.status;
    assert.equal(at(room), "ok");
    assert.equal(at(room + 1), "warn");
    assert.equal(at(5), "warn");
  });

  it("fitWithin tidak memperbesar dan menjaga rasio", () => {
    assert.deepEqual(fitWithin(800, 600, 1920), { width: 800, height: 600 });
    assert.deepEqual(fitWithin(4000, 3000, 1920), { width: 1920, height: 1440 });
    assert.deepEqual(fitWithin(3000, 4000, 1920), { width: 1440, height: 1920 });
    assert.equal(needsDownscale(1200, 800, 100 * 1024), false);
    assert.equal(needsDownscale(1200, 800, 5 * 1024 * 1024), true);
    assert.equal(needsDownscale(BLOG_IMAGE_MAX_SIDE + 1, 100, 1000), true);
  });

  it("next/image hanya untuk host tetap yang pasti terdaftar di remotePatterns", () => {
    assert.equal(isStaticOptimizableImageUrl("https://images.unsplash.com/photo-1"), true);
    assert.equal(isStaticOptimizableImageUrl("https://klandesa-bucket.sgp1.cdn.digitaloceanspaces.com/blog/a.webp"), true);
    assert.equal(isStaticOptimizableImageUrl("https://digitaloceanspaces.com/x"), false);
    assert.equal(isStaticOptimizableImageUrl("https://evil.com/digitaloceanspaces.com/x.png"), false);
    assert.equal(isStaticOptimizableImageUrl("https://evildigitaloceanspaces.com/x.png"), false);
    assert.equal(isStaticOptimizableImageUrl("http://images.unsplash.com/x"), false);
    assert.equal(isStaticOptimizableImageUrl("/blog/local.png"), false);
    // Setiap host tetap benar-benar ada di pola yang dipakai next.config.
    const hosts = buildImageRemotePatterns({ NODE_ENV: "production" }).map((p) => p.hostname);
    assert.ok(hosts.includes("images.unsplash.com") && hosts.includes("**.digitaloceanspaces.com"));
  });
});

describe("audit: performa render (anggaran longgar, mencegah regresi besar)", () => {
  it("artikel 3.000 kata dirender dan dipindai < 250 ms", () => {
    const para = (i: number) => `## Bagian ${i}\n\n${words(120)} [harga](/harga) **tebal**\n\n- a\n- b\n`;
    const md = Array.from({ length: 25 }, (_, i) => para(i)).join("\n");
    const t0 = performance.now();
    const html = renderToStaticMarkup(createElement(BlogMarkdown, { content: md }));
    extractHeadings(md);
    countWords(md);
    const ms = performance.now() - t0;
    assert.ok(countWords(md) >= 3000);
    assert.ok(html.length > 10_000);
    assert.ok(ms < 250, `render ${ms.toFixed(0)} ms`);
  });
});
