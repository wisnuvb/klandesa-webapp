import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BLOCK_VARIANTS,
  cleanBlockVariant,
  clampSectionVariant,
  defaultBlockVariant,
  type BlockVariantKind,
} from "@/lib/website-engine/block-variants";
import { renderWebsiteSection, sectionSchemaForTemplate, WEBSITE_SECTION_REGISTRY } from "@/lib/website-engine/site-sections";
import { resolveEffectiveStructure } from "@/lib/website-engine/normalize";
import type { WebsiteSection } from "@/lib/website-engine/types";

const VILLAGE = { name: "Karanganyar", address: "Jl. Raya 1", phone: null, email: null, website: null };
const PACKS = ["modern-village", "classic-heritage", "default"];
const KINDS = Object.keys(BLOCK_VARIANTS) as BlockVariantKind[];

function sample(kind: BlockVariantKind, variant?: string): WebsiteSection {
  const base = { kind, variant } as Record<string, unknown>;
  switch (kind) {
    case "features":
      return { ...base, items: [{ title: "Satu", body: "a" }, { title: "Dua", body: "b" }] } as WebsiteSection;
    case "stats":
      return { ...base, items: [{ label: "Penduduk", value: "3.245" }, { label: "Dusun", value: "4" }] } as WebsiteSection;
    case "gallery":
      return { ...base, items: [{ url: "/a.jpg", caption: "Foto A" }, { url: "/b.jpg", caption: "Foto B" }] } as WebsiteSection;
    case "faq":
      return { ...base, items: [{ q: "Jam buka?", a: "08.00" }] } as WebsiteSection;
    case "testimonials":
      return { ...base, items: [{ quote: "Bagus", name: "Budi" }] } as WebsiteSection;
  }
}

function html(pack: string, section: WebsiteSection): string {
  return renderToStaticMarkup(<>{renderWebsiteSection({ templateKey: pack, section, village: VILLAGE, news: [] })}</>);
}

test("cleanBlockVariant menerima yang dikenal, menolak yang asing atau bukan string", () => {
  assert.equal(cleanBlockVariant("stats", "band"), "band");
  assert.equal(cleanBlockVariant("stats", "mosaic"), undefined, "varian milik blok lain");
  assert.equal(cleanBlockVariant("stats", "<script>"), undefined);
  assert.equal(cleanBlockVariant("stats", 3), undefined);
  assert.equal(cleanBlockVariant("stats", undefined), undefined);
});

test("allowlist pack membatasi varian yang diterima", () => {
  assert.equal(cleanBlockVariant("stats", "band", ["cards", "inline"]), undefined);
  assert.equal(cleanBlockVariant("stats", "inline", ["cards", "inline"]), "inline");
});

test("clampSectionVariant: varian terlarang dibuang, blok tanpa varian tidak disentuh", () => {
  const s = { kind: "gallery", variant: "mosaic" } as WebsiteSection;
  const clamped = clampSectionVariant(s, { gallery: ["grid"] });
  assert.equal((clamped as { variant?: string }).variant, undefined);
  const ok = clampSectionVariant(s, { gallery: ["grid", "mosaic"] });
  assert.equal(ok, s, "tidak ada perubahan = objek sama");
  const hero = { kind: "hero", variant: "split" } as WebsiteSection;
  assert.equal(clampSectionVariant(hero, { gallery: ["grid"] }), hero);
});

test("varian bawaan adalah pilihan pertama dan nama tiap blok punya minimal 2 varian", () => {
  for (const k of KINDS) {
    assert.ok(BLOCK_VARIANTS[k].length >= 2, k);
    assert.equal(defaultBlockVariant(k), BLOCK_VARIANTS[k][0].value);
  }
});

test("registry: createDefault memakai varian bawaan dan field variant tersedia", () => {
  for (const k of KINDS) {
    const def = WEBSITE_SECTION_REGISTRY[k];
    assert.equal((def.createDefault() as { variant?: string }).variant, defaultBlockVariant(k));
    const f = def.cmsFields.find((x) => x.type === "variant");
    assert.ok(f && f.type === "variant", k);
    assert.deepEqual(
      f.type === "variant" && f.options.map((o) => o.value),
      BLOCK_VARIANTS[k].map((v) => v.value),
    );
  }
});

test("schema untuk template menyertakan field variant", () => {
  const schema = sectionSchemaForTemplate("modern-village", KINDS);
  for (const entry of schema) assert.ok(entry.cmsFields.some((f) => f.type === "variant"), entry.kind);
});

test("sanitizer menyimpan varian valid dan membuang yang asing", () => {
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
            { kind: "stats", variant: "band", items: [{ label: "A", value: "1" }] },
            { kind: "gallery", variant: "evil", items: [{ url: "/a.jpg" }] },
            { kind: "faq", variant: "stats-band", items: [{ q: "q", a: "a" }] },
          ],
        },
      ],
    },
  };
  const sections = resolveEffectiveStructure({ templateStructure, customization }).pages[0].sections as Array<{
    variant?: string;
  }>;
  assert.equal(sections[0].variant, "band");
  assert.equal(sections[1].variant, undefined);
  assert.equal(sections[2].variant, undefined);
});

for (const pack of PACKS) {
  for (const kind of KINDS) {
    for (const v of BLOCK_VARIANTS[kind]) {
      test(`[${pack}] ${kind}/${v.value} dirender dengan penanda dan isi`, () => {
        const out = html(pack, sample(kind, v.value));
        assert.ok(out.includes(`data-variant="${v.value}"`), "penanda data-variant");
        const content: Record<BlockVariantKind, string> = {
          features: "Satu",
          stats: "3.245",
          gallery: 'alt="Foto A"',
          faq: "Jam buka?",
          testimonials: "Bagus",
        };
        assert.ok(out.includes(content[kind]), "isi tampil");
      });
    }
    test(`[${pack}] ${kind}: varian tidak dikenal jatuh ke bawaan`, () => {
      const out = html(pack, sample(kind, "tidak-ada"));
      assert.ok(out.includes(`data-variant="${defaultBlockVariant(kind)}"`));
    });
  }
}

test("varian benar-benar berbeda markup (bukan sekadar atribut)", () => {
  for (const kind of KINDS) {
    const outs = BLOCK_VARIANTS[kind].map((v) => html("modern-village", sample(kind, v.value)).replace(/data-variant="[^"]*"/, ""));
    assert.equal(new Set(outs).size, outs.length, `${kind}: setiap varian punya markup unik`);
  }
});

test("galeri strip bisa difokus dan berlabel; stats band memakai warna utama", () => {
  const strip = html("default", sample("gallery", "strip"));
  assert.ok(strip.includes('role="region"') && strip.includes('tabindex="0"') && strip.includes("aria-label="));
  assert.ok(html("default", sample("stats", "band")).includes("--site-primary"));
});

test("FAQ terbuka memakai daftar definisi, akordeon memakai details", () => {
  assert.ok(html("default", sample("faq", "open")).includes("<dt"));
  assert.ok(html("default", sample("faq", "accordion")).includes("<details"));
});
