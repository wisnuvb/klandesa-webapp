import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildBlogFeed, cdata, escapeXml, imageMimeFromUrl, rfc822 } from "../lib/blog/feed.ts";

const meta = { origin: "https://klandesa.com/", title: "Blog Klandesa", description: "Artikel & panduan <desa>" };
const item = (over: Partial<Parameters<typeof buildBlogFeed>[1][number]> = {}) => ({
  title: "APBDes & Dana Desa",
  slug: "apbdes-dana-desa",
  excerpt: "Ringkasan artikel.",
  coverImageUrl: null,
  publishedAt: new Date(Date.UTC(2026, 10, 13, 2, 30, 0)),
  ...over,
});

describe("feed RSS blog", () => {
  it("escapeXml: lima karakter khusus di-escape, karakter kontrol tidak sah dibuang", () => {
    assert.equal(escapeXml(`a & b < c > "d" 'e'`), "a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;");
    assert.equal(escapeXml("a\u0000b\u0008c\td\ne"), "abc\td\ne");
  });

  it("cdata: urutan ]]> dipecah sehingga tidak menutup CDATA lebih awal", () => {
    const out = cdata("x ]]> <script>alert(1)</script>");
    assert.equal(out, "<![CDATA[x ]]]]><![CDATA[> <script>alert(1)</script>]]>");
    // Isi CDATA yang digabung kembali sama dengan teks asli.
    const joined = out.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").replace(/\]\]><!\[CDATA\[/g, "");
    assert.equal(joined, "x ]]> <script>alert(1)</script>");
  });

  it("rfc822: format tanggal UTC yang dipakai RSS", () => {
    assert.equal(rfc822(new Date(Date.UTC(2026, 10, 13, 2, 30, 0))), "Fri, 13 Nov 2026 02:30:00 GMT");
  });

  it("imageMimeFromUrl: dari ekstensi path, abaikan query; tak dikenal = null", () => {
    assert.equal(imageMimeFromUrl("https://x.id/a/b.JPG?w=1"), "image/jpeg");
    assert.equal(imageMimeFromUrl("https://x.id/a.webp"), "image/webp");
    assert.equal(imageMimeFromUrl("https://x.id/a.svg"), null);
    assert.equal(imageMimeFromUrl("bukan url"), null);
  });

  it("struktur RSS 2.0: channel, atom:link self, item dengan guid permalink dan pubDate", () => {
    const xml = buildBlogFeed(meta, [item({ tags: ["APBDes", "Keuangan <desa>"] })]);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.match(xml, /<rss version="2\.0"[^>]*xmlns:atom=/);
    assert.match(xml, /<title>Blog Klandesa<\/title>/);
    assert.match(xml, /<link>https:\/\/klandesa\.com\/blog<\/link>/);
    assert.match(xml, /<description>Artikel &amp; panduan &lt;desa&gt;<\/description>/);
    assert.match(xml, /<atom:link href="https:\/\/klandesa\.com\/blog\/feed\.xml" rel="self" type="application\/rss\+xml"\/>/);
    assert.match(xml, /<title>APBDes &amp; Dana Desa<\/title>/);
    assert.match(xml, /<guid isPermaLink="true">https:\/\/klandesa\.com\/blog\/apbdes-dana-desa<\/guid>/);
    assert.match(xml, /<pubDate>Fri, 13 Nov 2026 02:30:00 GMT<\/pubDate>/);
    assert.match(xml, /<description><!\[CDATA\[Ringkasan artikel\.\]\]><\/description>/);
    assert.match(xml, /<category>Keuangan &lt;desa&gt;<\/category>/);
    assert.equal((xml.match(/<item>/g) ?? []).length, 1);
  });

  it("artikel diurutkan terbaru dulu; lastBuildDate = artikel terbaru", () => {
    const old = item({ slug: "lama", publishedAt: new Date(Date.UTC(2026, 0, 1)) });
    const recent = item({ slug: "baru", publishedAt: new Date(Date.UTC(2026, 10, 1)) });
    const xml = buildBlogFeed(meta, [old, recent]);
    assert.ok(xml.indexOf("/blog/baru") < xml.indexOf("/blog/lama"));
    assert.match(xml, /<lastBuildDate>Sun, 01 Nov 2026 00:00:00 GMT<\/lastBuildDate>/);
  });

  it("cover jadi media:content hanya bila http(s) dan tipenya dikenal", () => {
    const withCover = buildBlogFeed(meta, [item({ coverImageUrl: "https://cdn.klandesa.com/blog/2026/11/a.webp" })]);
    assert.match(withCover, /<media:content url="https:\/\/cdn\.klandesa\.com\/blog\/2026\/11\/a\.webp" medium="image" type="image\/webp"\/>/);
    assert.ok(!buildBlogFeed(meta, [item({ coverImageUrl: "https://x.id/a.svg" })]).includes("media:content"));
    assert.ok(!buildBlogFeed(meta, [item({ coverImageUrl: "/lokal/a.png" })]).includes("media:content"));
  });

  it("tanpa ringkasan tidak ada <description> item; daftar kosong tetap XML valid", () => {
    const xml = buildBlogFeed(meta, [item({ excerpt: "  " })]);
    assert.equal((xml.match(/<description>/g) ?? []).length, 1); // hanya milik channel
    const empty = buildBlogFeed(meta, []);
    assert.ok(empty.includes("</channel>") && !empty.includes("<item>"));
  });

  it("judul berisi ]]> atau tag tidak merusak XML", () => {
    const xml = buildBlogFeed(meta, [item({ title: "A ]]> <b>B</b>", excerpt: "x ]]> y" })]);
    assert.match(xml, /<title>A \]\]&gt; &lt;b&gt;B&lt;\/b&gt;<\/title>/);
    assert.ok(!xml.includes("<b>"));
  });
});
