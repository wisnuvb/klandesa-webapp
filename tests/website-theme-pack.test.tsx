import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CORE_BASE_PACKS,
  compareSemver,
  themePackToTemplateStructure,
  validateThemePackManifest,
  type ThemePackManifestV1,
} from "@/lib/website-engine/theme-pack-manifest";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";
import {
  resolveEffectiveStructure,
  resolveEffectiveTheme,
} from "@/lib/website-engine/normalize";
import { listPresetOptions } from "@/lib/website-engine/preset-options";
import { getTemplatePack, listRegisteredPackKeys } from "@/lib/website-engine/template-packs/registry";
import { renderWebsiteSection, sectionSchemaForTemplate } from "@/lib/website-engine/site-sections";
import { clampStructureVariants } from "@/lib/website-engine/resolved-structure";
import { mergeVariantAllowlists } from "@/lib/website-engine/block-variants";

const VALID = {
  manifestVersion: 1,
  key: "desa-hijau",
  name: "Desa Hijau",
  version: "1.0.0",
  description: "Tema hijau segar untuk desa pertanian.",
  category: "agriculture",
  author: { name: "Studio Tani", url: "https://studiotani.id" },
  basePack: "modern-village",
  theme: {
    primary: "#15803d",
    accent: "#14532d",
    fontHeading: '"Poppins", ui-sans-serif, system-ui, sans-serif',
    radiusMd: "1.25rem",
  },
  blockVariants: { stats: ["band", "inline"] },
  pages: {
    home: {
      sections: [
        { kind: "hero", title: "Selamat datang" },
        { kind: "stats", items: [{ label: "Penduduk", value: "1.200" }] },
        { kind: "news", limit: 4 },
        { kind: "contact" },
      ],
    },
  },
  presets: [{ key: "berita_dulu", name: "Berita dulu", sections: [{ kind: "news", limit: 10 }, { kind: "contact" }] }],
  features: ["Responsif", "Cepat"],
  previews: { image: "https://cdn.studiotani.id/a.jpg", thumbnail: "https://cdn.studiotani.id/t.jpg" },
  suggestedPriceIdr: 900000,
};

function ok(raw: unknown): ThemePackManifestV1 {
  const r = validateThemePackManifest(raw, { reservedKeys: listRegisteredPackKeys() });
  assert.equal(r.ok, true, r.ok ? "" : JSON.stringify(r.errors));
  if (!r.ok) throw new Error("unreachable");
  return r.manifest;
}

function bad(raw: unknown) {
  const r = validateThemePackManifest(raw, { reservedKeys: listRegisteredPackKeys() });
  assert.equal(r.ok, false);
  return r.ok ? [] : r.errors;
}

const mut = (patch: (m: Record<string, unknown>) => void) => {
  const m = JSON.parse(JSON.stringify(VALID)) as Record<string, unknown>;
  patch(m);
  return m;
};

test("basePack yang diizinkan benar-benar terdaftar di registry", () => {
  for (const id of CORE_BASE_PACKS) assert.equal(getTemplatePack(id).id, id);
});

test("manifest valid lolos dan dinormalisasi", () => {
  const m = ok(VALID);
  assert.equal(m.key, "desa-hijau");
  assert.equal(m.theme.primary, "#15803d");
  assert.equal(m.pages.home.sections.length, 4);
});

test("kunci asing di mana pun ditolak", () => {
  for (const patch of [
    (m: Record<string, unknown>) => (m.script = "alert(1)"),
    (m: Record<string, unknown>) => ((m.theme as Record<string, unknown>).customCss = "body{}"),
    (m: Record<string, unknown>) => ((m.author as Record<string, unknown>).email = "x"),
    (m: Record<string, unknown>) => ((m.previews as Record<string, unknown>).tracker = "x"),
  ]) {
    const errs = bad(mut(patch));
    assert.ok(errs.some((e) => e.message === "Kunci tidak dikenal"), JSON.stringify(errs));
  }
});

test("warna harus heksadesimal; ekspresi CSS ditolak", () => {
  for (const v of ["red", "rgb(0,0,0)", "url(https://evil.id/x)", "#12", "#gggggg", "var(--x)", "#fff;background:red"]) {
    const errs = bad(mut((m) => ((m.theme as Record<string, unknown>).surface = v)));
    assert.ok(errs.some((e) => e.path === "theme.surface"), v);
  }
});

test("font di luar daftar didukung ditolak; radius dibatasi", () => {
  assert.ok(bad(mut((m) => ((m.theme as Record<string, unknown>).fontBody = "Comic Sans MS"))).some((e) => e.path === "theme.fontBody"));
  assert.ok(bad(mut((m) => ((m.theme as Record<string, unknown>).fontBody = "Inter; }</style><script>"))).some((e) => e.path === "theme.fontBody"));
  assert.ok(bad(mut((m) => ((m.theme as Record<string, unknown>).radiusMd = "10rem"))).some((e) => e.path === "theme.radiusMd"));
  assert.ok(bad(mut((m) => ((m.theme as Record<string, unknown>).radiusMd = "1rem; x"))).some((e) => e.path === "theme.radiusMd"));
});

test("kontras dijaga: warna utama terang ditolak", () => {
  const errs = bad(mut((m) => ((m.theme as Record<string, unknown>).primary = "#facc15")));
  assert.ok(errs.some((e) => e.path === "theme.primary" && e.message.includes("Kontras")));
  const errs2 = bad(mut((m) => ((m.theme as Record<string, unknown>).mutedForeground = "#cccccc")));
  assert.ok(errs2.some((e) => e.path === "theme.mutedForeground"));
});

test("key: format, kunci pack bawaan dilarang", () => {
  for (const k of ["Desa Hijau", "ab", "modern-village", "default", "tourism-village", "a--b", "x".repeat(60)]) {
    assert.ok(bad(mut((m) => (m.key = k))).some((e) => e.path === "key"), k);
  }
});

test("versi, kategori, dan basePack divalidasi", () => {
  assert.ok(bad(mut((m) => (m.version = "1.0"))).some((e) => e.path === "version"));
  assert.ok(bad(mut((m) => (m.category = "lain"))).some((e) => e.path === "category"));
  assert.ok(bad(mut((m) => (m.basePack = "buatan-sendiri"))).some((e) => e.path === "basePack"));
});

test("alamat pratinjau wajib https", () => {
  assert.ok(bad(mut((m) => ((m.previews as Record<string, unknown>).image = "http://x.id/a.jpg"))).some((e) => e.path === "previews.image"));
  assert.ok(bad(mut((m) => ((m.previews as Record<string, unknown>).thumbnail = "javascript:alert(1)"))).some((e) => e.path === "previews.thumbnail"));
  assert.ok(bad(mut((m) => ((m.author as Record<string, unknown>).url = "ftp://x.id"))).some((e) => e.path === "author.url"));
});

test("blok tak dikenal, kosong, atau terlalu banyak ditolak", () => {
  assert.ok(bad(mut((m) => ((m.pages as { home: { sections: unknown[] } }).home.sections = [{ kind: "iframe" }]))).some((e) => e.path.includes("kind")));
  assert.ok(bad(mut((m) => ((m.pages as { home: { sections: unknown[] } }).home.sections = []))).length > 0);
  const many = Array.from({ length: 31 }, () => ({ kind: "contact" }));
  assert.ok(bad(mut((m) => ((m.pages as { home: { sections: unknown[] } }).home.sections = many))).length > 0);
});

test("blok dibersihkan sanitizer yang sama dengan CMS (href berbahaya dinetralkan)", () => {
  const m = ok(
    mut((x) => {
      (x.pages as { home: { sections: unknown[] } }).home.sections = [
        { kind: "cta", title: "Hubungi", button_href: "javascript:alert(1)" },
      ];
    }),
  );
  const cta = m.pages.home.sections[0] as { button_href?: string };
  assert.ok(!cta.button_href?.startsWith("javascript"));
});

test("preset: kunci ganda dan format salah ditolak", () => {
  const dup = mut((m) => (m.presets = [VALID.presets[0], VALID.presets[0]]));
  assert.ok(bad(dup).some((e) => e.message.includes("ganda")));
  assert.ok(bad(mut((m) => (m.presets = [{ ...VALID.presets[0], key: "Preset Baru!" }]))).length > 0);
});

test("blockVariants: varian asing dan blok tanpa varian ditolak", () => {
  assert.ok(bad(mut((m) => (m.blockVariants = { stats: ["tidak-ada"] }))).some((e) => e.path === "blockVariants.stats"));
  assert.ok(bad(mut((m) => (m.blockVariants = { hero: ["center"] }))).some((e) => e.path === "blockVariants.hero"));
  assert.ok(bad(mut((m) => (m.blockVariants = { stats: [] }))).some((e) => e.path === "blockVariants.stats"));
});

test("masukan bukan objek atau terlalu besar ditolak", () => {
  assert.equal(validateThemePackManifest(null).ok, false);
  assert.equal(validateThemePackManifest([]).ok, false);
  assert.equal(validateThemePackManifest("x").ok, false);
  const huge = mut((m) => (m.description = "x".repeat(200_000)));
  assert.equal(validateThemePackManifest(huge).ok, false);
});

test("semua kesalahan dikumpulkan sekaligus, bukan satu per satu", () => {
  const errs = bad({ manifestVersion: 1 });
  assert.ok(errs.length >= 6, `hanya ${errs.length} kesalahan`);
});

test("compareSemver", () => {
  assert.ok(compareSemver("1.2.0", "1.10.0") < 0);
  assert.ok(compareSemver("2.0.0", "1.99.99") > 0);
  assert.equal(compareSemver("1.0.0", "1.0.0"), 0);
});

// ---- integrasi dengan mesin yang sudah ada ----

test("adaptor: template memakai markup basePack dan tema dari manifest", () => {
  const structure = themePackToTemplateStructure(ok(VALID));
  const tm = parseTemplateStructureManifest(structure);
  assert.equal(tm.templateKey, "modern-village", "render memakai pack inti");
  const theme = resolveEffectiveTheme({ templateStructure: structure, customization: null });
  assert.equal(theme.primary, "#15803d");
  assert.equal(theme.radiusMd, "1.25rem");
  assert.equal(theme.fontHeading, VALID.theme.fontHeading);
});

test("adaptor: beranda, preset, dan section lolos pipeline resolver", () => {
  const structure = themePackToTemplateStructure(ok(VALID));
  const home = resolveEffectiveStructure({ templateStructure: structure, customization: null }).pages[0];
  assert.deepEqual(home.sections.map((s) => s.kind), ["hero", "stats", "news", "contact"]);
  assert.deepEqual(listPresetOptions(structure).map((p) => p.key).includes("berita_dulu"), true);
  const withPreset = resolveEffectiveStructure({ templateStructure: structure, customization: { presetKey: "berita_dulu" } }).pages[0];
  assert.deepEqual(withPreset.sections.map((s) => s.kind), ["news", "contact"]);
});

test("allowlist varian manifest ditegakkan saat resolve (varian bawaan terlarang diganti yang diizinkan)", () => {
  const structure = themePackToTemplateStructure(ok(VALID));
  const home = resolveEffectiveStructure({ templateStructure: structure, customization: null }).pages[0];
  const stats = home.sections.find((s) => s.kind === "stats") as { variant?: string };
  assert.equal(stats.variant, "band", "bawaan 'cards' tidak diizinkan -> varian pertama yang diizinkan");

  const forced = resolveEffectiveStructure({
    templateStructure: structure,
    customization: {
      overrides: { version: 2, pages: [{ id: "home", slug: "", title: "B", sections: [{ kind: "stats", variant: "cards", items: [{ label: "A", value: "1" }] }] }] },
    },
  }).pages[0].sections[0] as { variant?: string };
  assert.equal(forced.variant, "band");

  const allowed = resolveEffectiveStructure({
    templateStructure: structure,
    customization: {
      overrides: { version: 2, pages: [{ id: "home", slug: "", title: "B", sections: [{ kind: "stats", variant: "inline", items: [{ label: "A", value: "1" }] }] }] },
    },
  }).pages[0].sections[0] as { variant?: string };
  assert.equal(allowed.variant, "inline");
});

test("allowlist manifest menyaring pilihan di skema CMS dan hasil PATCH", () => {
  const tm = parseTemplateStructureManifest(themePackToTemplateStructure(ok(VALID)));
  const schema = sectionSchemaForTemplate(tm.templateKey, ["stats"], tm.blockVariants);
  const field = schema[0].cmsFields.find((f) => f.type === "variant");
  assert.deepEqual(field && field.type === "variant" && field.options.map((o) => o.value), ["band", "inline"]);

  const clamped = clampStructureVariants(
    { pages: [{ id: "h", slug: "", title: "B", sections: [{ kind: "stats", variant: "cards" as const }] }] },
    mergeVariantAllowlists(getTemplatePack(tm.templateKey).blockVariants, tm.blockVariants),
  );
  assert.equal((clamped.pages[0].sections[0] as { variant?: string }).variant, "band");
});

test("render nyata dari paket tema memakai token dan varian paket", () => {
  const structure = themePackToTemplateStructure(ok(VALID));
  const tm = parseTemplateStructureManifest(structure);
  const home = resolveEffectiveStructure({ templateStructure: structure, customization: null }).pages[0];
  const stats = home.sections.find((s) => s.kind === "stats")!;
  const html = renderToStaticMarkup(
    <>{renderWebsiteSection({ templateKey: tm.templateKey, section: stats, village: { name: "X", address: "Y" }, news: [] })}</>,
  );
  assert.ok(html.includes('data-variant="band"') && html.includes("1.200"));
});

test("manifest tanpa blockVariants tidak membatasi apa pun", () => {
  const structure = themePackToTemplateStructure(ok(mut((m) => delete m.blockVariants)));
  assert.equal(parseTemplateStructureManifest(structure).blockVariants, undefined);
});

// ---- aturan pengajuan & review (murni) ----

import { checkSubmission, resolveApprovalPrice } from "@/lib/website-engine/theme-pack-service";
import { themePackToTemplateRow } from "@/lib/website-engine/theme-pack-manifest";

test("pengajuan pertama untuk kunci baru diterima", () => {
  assert.deepEqual(checkSubmission({ existing: [], version: "1.0.0", authorName: "Studio Tani" }), { ok: true });
});

test("versi harus lebih tinggi dari semua versi sebelumnya", () => {
  const existing = [
    { version: "1.0.0", authorName: "Studio Tani" },
    { version: "1.10.0", authorName: "Studio Tani" },
  ];
  assert.equal(checkSubmission({ existing, version: "1.9.0", authorName: "Studio Tani" }).ok, false);
  assert.equal(checkSubmission({ existing, version: "1.10.0", authorName: "Studio Tani" }).ok, false);
  assert.equal(checkSubmission({ existing, version: "1.11.0", authorName: "Studio Tani" }).ok, true);
});

test("kunci tidak bisa dibajak penulis lain (nama dibandingkan tanpa peduli huruf besar/spasi)", () => {
  const existing = [{ version: "1.0.0", authorName: "Studio Tani" }];
  const hijack = checkSubmission({ existing, version: "2.0.0", authorName: "Pihak Lain" });
  assert.equal(hijack.ok, false);
  assert.equal(checkSubmission({ existing, version: "2.0.0", authorName: "  studio tani " }).ok, true);
});

test("harga: reviewer menetapkan > saran penulis; versi berikutnya mempertahankan harga lama", () => {
  assert.deepEqual(resolveApprovalPrice({ requested: 750000, suggested: 900000, existingPrice: null }), { ok: true, price: 750000 });
  assert.deepEqual(resolveApprovalPrice({ requested: undefined, suggested: 900000, existingPrice: null }), { ok: true, price: 900000 });
  assert.deepEqual(resolveApprovalPrice({ requested: undefined, suggested: 900000, existingPrice: 1200000 }), { ok: true, price: 1200000 });
  assert.deepEqual(resolveApprovalPrice({ requested: 0, existingPrice: 1200000 }), { ok: true, price: 0 });
});

test("harga: persetujuan pertama tanpa harga ditolak; nilai tidak wajar ditolak", () => {
  assert.equal(resolveApprovalPrice({ requested: undefined, existingPrice: null }).ok, false);
  for (const bad of [-1, 1.5, "1000", 51_000_000, NaN, {}]) {
    assert.equal(resolveApprovalPrice({ requested: bad, existingPrice: 1000 }).ok, false, String(bad));
  }
});

test("themePackToTemplateRow memetakan semua kolom WebsiteTemplate", () => {
  const row = themePackToTemplateRow(ok(VALID), 900000);
  assert.equal(row.name, "Desa Hijau");
  assert.equal(row.category, "agriculture");
  assert.equal(row.previewImage, "https://cdn.studiotani.id/a.jpg");
  assert.equal(row.thumbnailUrl, "https://cdn.studiotani.id/t.jpg");
  assert.equal(row.demoUrl, null);
  assert.equal(row.price, 900000);
  assert.equal(row.subscriptionType, "yearly");
  assert.equal((row.structure as { slug: string }).slug, "desa-hijau");
});

test("contoh manifest di repo selalu valid (dokumentasi tidak boleh usang)", async () => {
  const { readFile } = await import("node:fs/promises");
  const raw = JSON.parse(
    await readFile(new URL("../lib/website-engine/examples/desa-hijau.theme-pack.json", import.meta.url), "utf8"),
  );
  const m = ok(raw);
  assert.equal(m.key, "desa-hijau");
  assert.equal(m.presets.length, 1);
});
