import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ITEM_LIMITS,
  faqItems,
  featureItems,
  galleryItems,
  statItems,
  testimonialItems,
  upgradeSectionItems,
} from "@/lib/website-engine/section-items";
import { resolveEffectiveStructure } from "@/lib/website-engine/normalize";
import type { WebsiteSection } from "@/lib/website-engine/types";

test("data lama (slot tetap) terbaca sebagai daftar, slot kosong dibuang", () => {
  const legacy = {
    kind: "features",
    item1_title: "Cepat",
    item1_body: "Layanan cepat",
    item2_title: "",
    item3_title: "Transparan",
  };
  assert.deepEqual(featureItems(legacy), [
    { title: "Cepat", body: "Layanan cepat" },
    { title: "Transparan" },
  ]);
  assert.deepEqual(
    statItems({ kind: "stats", stat1_label: "Penduduk", stat1_value: "3.245", stat3_label: "Dusun" }),
    [{ label: "Penduduk", value: "3.245" }, { label: "Dusun" }],
  );
  assert.deepEqual(galleryItems({ kind: "gallery", image2_url: "https://x.id/a.jpg", image5_url: " " }), [
    { url: "https://x.id/a.jpg" },
  ]);
  assert.deepEqual(faqItems({ kind: "faq", q1: "Jam buka?", a1: "08.00", q4: "Biaya?", a4: "Gratis" }), [
    { q: "Jam buka?", a: "08.00" },
    { q: "Biaya?", a: "Gratis" },
  ]);
  assert.deepEqual(testimonialItems({ kind: "testimonials", quote2: "Bagus", name2: "Budi", role2: "Warga" }), [
    { quote: "Bagus", name: "Budi", role: "Warga" },
  ]);
});

test("items (bentuk baru) menang atas slot lama, termasuk bila kosong", () => {
  const both = { kind: "features", item1_title: "Lama", items: [{ title: "Baru" }] };
  assert.deepEqual(featureItems(both), [{ title: "Baru" }]);
  const emptied = { kind: "features", item1_title: "Lama", items: [] };
  assert.deepEqual(featureItems(emptied), []);
});

test("item dibersihkan: dipotong, dipangkas, dan yang kosong dibuang", () => {
  const out = featureItems({
    items: [{ title: "  A  ", body: "x".repeat(700) }, { title: "", body: "  " }, "bukan objek", null],
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].title, "A");
  assert.equal(out[0].body?.length, 600);
});

test("jumlah item dibatasi", () => {
  const many = Array.from({ length: 100 }, (_, i) => ({ title: `T${i}` }));
  assert.equal(featureItems({ items: many }).length, ITEM_LIMITS.features);
  const imgs = Array.from({ length: 100 }, (_, i) => ({ url: `https://x.id/${i}.jpg` }));
  assert.equal(galleryItems({ items: imgs }).length, ITEM_LIMITS.gallery);
});

test("galeri tanpa url dibuang, caption dipertahankan", () => {
  assert.deepEqual(galleryItems({ items: [{ url: "" }, { url: "https://x.id/a.jpg", caption: "Balai desa" }] }), [
    { url: "https://x.id/a.jpg", caption: "Balai desa" },
  ]);
});

test("upgradeSectionItems membuang slot lama dan idempoten", () => {
  const legacy = { kind: "faq", title: "FAQ", q1: "A?", a1: "B", q2: "", a2: "" } as unknown as WebsiteSection;
  const up = upgradeSectionItems(legacy) as unknown as Record<string, unknown>;
  assert.equal("q1" in up, false);
  assert.deepEqual(up.items, [{ q: "A?", a: "B" }]);
  assert.equal(up.title, "FAQ");
  assert.deepEqual(upgradeSectionItems(up as unknown as WebsiteSection), up);
});

test("blok tanpa daftar tidak diubah", () => {
  const hero = { kind: "hero", title: "x" } as WebsiteSection;
  assert.equal(upgradeSectionItems(hero), hero);
});

test("resolveEffectiveStructure menaikkan section template DB lama ke items", () => {
  const templateStructure = {
    version: 1,
    pages: { home: { sections: [{ kind: "stats", stat1_label: "Penduduk", stat1_value: "10" }] } },
  };
  const e = resolveEffectiveStructure({ templateStructure, customization: null });
  const s = e.pages[0].sections[0] as unknown as Record<string, unknown>;
  assert.deepEqual(s.items, [{ label: "Penduduk", value: "10" }]);
  assert.equal("stat1_label" in s, false);
});

test("simpan bentuk baru lewat override v2 lalu dibaca kembali", () => {
  const templateStructure = { version: 1, pages: { home: { sections: [{ kind: "hero" }] } } };
  const customization = {
    overrides: {
      version: 2,
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          sections: [
            {
              kind: "features",
              items: [
                { title: "A", body: "a" },
                { title: "B", body: "b" },
                { title: "C", body: "c" },
                { title: "D", body: "d" },
                { title: "E", body: "e" },
              ],
            },
          ],
        },
      ],
    },
  };
  const e = resolveEffectiveStructure({ templateStructure, customization });
  const s = e.pages[0].sections[0] as unknown as { items: unknown[] };
  assert.equal(s.items.length, 5);
});
