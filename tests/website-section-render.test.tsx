import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { renderWebsiteSection } from "@/lib/website-engine/site-sections";
import { renderableImageUrl } from "@/lib/website-engine/section-primitives";
import type { WebsiteSection } from "@/lib/website-engine/types";

const VILLAGE = { name: "Karanganyar", address: "Jl. Raya 1", phone: null, email: null, website: null };
const PACKS = ["modern-village", "classic-heritage", "default"];

function html(templateKey: string, section: WebsiteSection): string {
  return renderToStaticMarkup(
    <>{renderWebsiteSection({ templateKey, section, village: VILLAGE, news: [] })}</>,
  );
}

for (const pack of PACKS) {
  test(`[${pack}] features: lebih dari 3 kartu tampil semua`, () => {
    const out = html(pack, {
      kind: "features",
      items: ["A", "B", "C", "D", "E"].map((t) => ({ title: `Judul ${t}`, body: `Isi ${t}` })),
    });
    for (const t of ["A", "B", "C", "D", "E"]) assert.ok(out.includes(`Judul ${t}`), t);
  });

  test(`[${pack}] data lama (slot tetap) tetap tampil`, () => {
    const legacy = { kind: "features", item1_title: "Lama Satu", item3_title: "Lama Tiga" } as unknown as WebsiteSection;
    const out = html(pack, legacy);
    assert.ok(out.includes("Lama Satu") && out.includes("Lama Tiga"));
    assert.equal(out.includes("Fitur 2"), false, "slot kosong tidak lagi menjadi kartu placeholder");
  });

  test(`[${pack}] variabel {{village.name}} di dalam item diganti`, () => {
    const out = html(pack, {
      kind: "faq",
      items: [{ q: "Di mana {{village.name}}?", a: "Alamat {{village.address}}" }],
    });
    assert.ok(out.includes("Di mana Karanganyar?"));
    assert.ok(out.includes("Alamat Jl. Raya 1"));
    assert.equal(out.includes("{{"), false);
  });

  test(`[${pack}] stats, testimoni, dan galeri dirender dari items`, () => {
    assert.ok(html(pack, { kind: "stats", items: [{ label: "Penduduk", value: "3.245" }, { label: "Dusun" }] }).includes("3.245"));
    assert.ok(
      html(pack, { kind: "testimonials", items: [{ quote: "Bagus sekali", name: "Budi", role: "Warga" }] }).includes("Bagus sekali"),
    );
    const g = html(pack, { kind: "gallery", items: [{ url: "/uploads/a.jpg", caption: "Balai desa" }] });
    assert.ok(g.includes('alt="Balai desa"'), "caption dipakai sebagai teks alternatif");
  });
}

test("alamat gambar tidak aman dilewati, tidak membuat render gagal", () => {
  const g = html("modern-village", {
    kind: "gallery",
    items: [
      { url: "http://x.id/a.jpg", caption: "http" },
      { url: "foto.jpg", caption: "tanpa skema" },
      { url: "javascript:alert(1)", caption: "js" },
      { url: "//evil.id/a.jpg", caption: "protocol-relative" },
      { url: "/uploads/ok.jpg", caption: "ok" },
    ],
  });
  assert.ok(g.includes('alt="ok"'));
  for (const bad of ["http", "tanpa skema", "js", "protocol-relative"]) {
    assert.equal(g.includes(`alt="${bad}"`), false, bad);
  }
  const hero = html("modern-village", { kind: "hero", title: "Hai", image_url: "http://x.id/a.jpg" });
  assert.ok(hero.includes("Hai"));
});

test("renderableImageUrl menerima https dan path relatif saja", () => {
  assert.equal(renderableImageUrl("https://cdn.x.id/a.jpg"), "https://cdn.x.id/a.jpg");
  assert.equal(renderableImageUrl("/a.jpg"), "/a.jpg");
  for (const bad of ["http://x.id/a.jpg", "a.jpg", "//x.id/a.jpg", "data:image/png;base64,AAA", "", "  ", null, undefined]) {
    assert.equal(renderableImageUrl(bad), null, String(bad));
  }
});
