import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AI_MAX_OPS,
  buildDesignMessages,
  buildProposal,
  extractJsonObject,
  type AiDesignContext,
} from "@/lib/website-engine/ai-design";
import { BASE_VILLAGE_WEBSITE_CAPS } from "@/lib/website-engine/feature-capabilities";
import { contrastRatio } from "@/lib/website-engine/color";
import type { ResolvedEngineStructure } from "@/lib/website-engine/types";

const ENGINE: ResolvedEngineStructure = {
  version: 2,
  nav: [{ label: "Beranda", href: "/" }],
  pages: [
    {
      id: "home",
      slug: "",
      title: "Beranda",
      sections: [
        { kind: "hero", title: "Selamat datang" },
        { kind: "stats", items: [{ label: "Penduduk", value: "1.200" }] },
        { kind: "news", limit: 6 },
        { kind: "contact" },
      ],
    },
    { id: "p-tentang", slug: "tentang", title: "Tentang", sections: [{ kind: "rich_text", body: "Tentang desa" }] },
  ],
};

const CTX: AiDesignContext = {
  templateKey: "modern-village",
  capabilities: [...BASE_VILLAGE_WEBSITE_CAPS],
  villageName: "Karanganyar",
  place: "Kec. Yosowilangun, Lumajang",
  engine: ENGINE,
  theme: { primary: "#0f766e" },
};

const reply = (o: unknown) => JSON.stringify(o);
function good(o: unknown, ctx: AiDesignContext = CTX) {
  const r = buildProposal(reply(o), ctx);
  assert.equal(r.ok, true, r.ok ? "" : r.error);
  if (!r.ok) throw new Error("unreachable");
  return r.proposal;
}

// ---- parsing ----

test("extractJsonObject: murni, berpagar, dengan teks di sekitarnya, dan string berisi kurung", () => {
  assert.deepEqual(extractJsonObject('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJsonObject('Tentu!\n```json\n{"a":{"b":2}}\n```\nSemoga membantu'), { a: { b: 2 } });
  assert.deepEqual(extractJsonObject('{"s":"kurung } di dalam string {"}'), { s: "kurung } di dalam string {" });
  assert.deepEqual(extractJsonObject('{"s":"kutip \\" dan }"}'), { s: 'kutip " dan }' });
});

test("extractJsonObject: sampah, terpotong, atau kosong -> null", () => {
  for (const t of ["", "tidak ada json", '{"a":', "{{{", "[1,2,3]"]) assert.equal(extractJsonObject(t), null, t);
});

test("balasan yang tidak bisa dibaca ditolak dengan pesan yang jelas", () => {
  const r = buildProposal("maaf saya tidak bisa", CTX);
  assert.equal(r.ok, false);
  assert.ok(!r.ok && r.error.includes("Kredit dikembalikan"));
});

// ---- tema ----

test("warna terang otomatis digelapkan sampai terbaca; aksen diturunkan", () => {
  const p = good({ theme: { primary: "#facc15" } });
  assert.ok(contrastRatio(p.theme.primary!, "#ffffff") >= 4.5);
  assert.ok(contrastRatio(p.theme.accent!, "#ffffff") >= 7);
});

test("gaya huruf dan radius hanya dari pilihan tertutup", () => {
  const p = good({ theme: { fontStyle: "klasik", radius: "bulat" } });
  assert.ok(p.theme.fontHeading && p.theme.fontBody);
  assert.equal(p.theme.radiusMd, "1.5rem");
  const q = good({ theme: { fontStyle: "Comic Sans; } body{display:none", radius: "9999px", primary: "#0f766e" }, variants: [{ kind: "stats", variant: "band" }] });
  assert.equal(q.theme.fontBody, undefined);
  assert.equal(q.theme.radiusMd, undefined);
  assert.ok(q.skipped.length >= 2);
});

test("warna bukan hex diabaikan (tidak masuk tema)", () => {
  const p = good({ theme: { primary: "red; background:url(//evil)" }, variants: [{ kind: "stats", variant: "band" }] });
  assert.equal(p.theme.primary, undefined);
  assert.ok(p.skipped.some((s) => s.includes("Warna utama")));
});

// ---- varian ----

test("varian diterapkan ke semua blok sejenis; varian asing dilewati", () => {
  const p = good({ variants: [{ kind: "stats", variant: "band" }, { kind: "stats", variant: "evil" }, { kind: "hero", variant: "x" }] });
  const stats = p.engine.pages[0].sections.find((s) => s.kind === "stats") as { variant?: string };
  assert.equal(stats.variant, "band");
  assert.equal(p.skipped.length, 2);
});

test("allowlist varian template ditegakkan", () => {
  const ctx = { ...CTX, variantAllow: { stats: ["inline"] } };
  const r = buildProposal(reply({ variants: [{ kind: "stats", variant: "band" }] }), ctx);
  assert.equal(r.ok, false, "satu-satunya usulan terlarang -> tidak ada perubahan");
});

// ---- operasi blok ----

test("tambah blok di akhir/awal/posisi tertentu", () => {
  const faq = { kind: "faq", items: [{ q: "Jam buka?", a: "08.00" }] };
  const end = good({ ops: [{ op: "add", at: "end", section: faq }] });
  assert.deepEqual(end.engine.pages[0].sections.map((s) => s.kind), ["hero", "stats", "news", "contact", "faq"]);
  const start = good({ ops: [{ op: "add", at: "start", section: faq }] });
  assert.equal(start.engine.pages[0].sections[0].kind, "faq");
  const at2 = good({ ops: [{ op: "add", at: 2, section: faq }] });
  assert.equal(at2.engine.pages[0].sections[2].kind, "faq");
  const huge = good({ ops: [{ op: "add", at: 999, section: faq }] });
  assert.equal(huge.engine.pages[0].sections.at(-1)?.kind, "faq");
});

test("blok yang tidak ada di template atau tidak dikenal tidak bisa ditambahkan", () => {
  const ctx = { ...CTX, capabilities: BASE_VILLAGE_WEBSITE_CAPS.filter((c) => c !== "section_faq") };
  assert.equal(buildProposal(reply({ ops: [{ op: "add", section: { kind: "faq" } }] }), ctx).ok, false);
  assert.equal(buildProposal(reply({ ops: [{ op: "add", section: { kind: "iframe", src: "https://evil.id" } }] }), CTX).ok, false);
  assert.equal(buildProposal(reply({ ops: [{ op: "add", section: { kind: 7 } }] }), CTX).ok, false);
});

test("update mengubah isi tetapi tidak bisa mengganti jenis blok", () => {
  const p = good({ ops: [{ op: "update", index: 0, set: { title: "Halo Desa", kind: "contact" } }] });
  const hero = p.engine.pages[0].sections[0] as { kind: string; title?: string };
  assert.equal(hero.kind, "hero");
  assert.equal(hero.title, "Halo Desa");
});

test("update menjaga isian lain yang tidak disebut", () => {
  const p = good({ ops: [{ op: "update", index: 1, set: { title: "Sekilas" } }] });
  const stats = p.engine.pages[0].sections[1] as { items?: unknown[]; title?: string };
  assert.equal(stats.title, "Sekilas");
  assert.equal(stats.items?.length, 1, "angka penduduk tidak hilang");
});

test("hapus dan pindah; indeks di luar jangkauan dilewati tanpa merusak yang lain", () => {
  const p = good({
    ops: [
      { op: "remove", index: 99 },
      { op: "move", from: 0, to: 99 },
      { op: "remove", index: 3 },
      { op: "move", from: 2, to: 0 },
    ],
  });
  assert.deepEqual(p.engine.pages[0].sections.map((s) => s.kind), ["news", "hero", "stats"]);
  assert.equal(p.skipped.length, 2);
});

test("operasi pada halaman lain memakai slug; halaman fiktif dilewati", () => {
  const p = good({
    ops: [
      { op: "add", page: "tentang", section: { kind: "contact" } },
      { op: "add", page: "tidak-ada", section: { kind: "contact" } },
    ],
  });
  assert.equal(p.engine.pages[1].sections.length, 2);
  assert.ok(p.skipped.some((s) => s.includes("tidak-ada")));
});

test("operasi tidak valid dilewati satu per satu, yang valid tetap jalan", () => {
  const p = good({
    ops: [{ op: "hapus-semua" }, "string", null, 42, { op: "remove" }, { op: "update", index: 0, set: { title: "OK" } }],
  });
  assert.equal(p.changes.length, 1);
  assert.equal(p.skipped.length, 5);
});

test(`maksimal ${AI_MAX_OPS} operasi dipertimbangkan`, () => {
  const ops = Array.from({ length: 40 }, () => ({ op: "add", section: { kind: "contact" } }));
  const p = good({ ops });
  assert.equal(p.engine.pages[0].sections.length, ENGINE.pages[0].sections.length + AI_MAX_OPS);
  assert.ok(p.skipped.some((s) => s.includes(String(AI_MAX_OPS))));
});

// ---- keamanan: isi yang diusulkan tetap disanitasi ----

test("tautan berbahaya pada CTA dinetralkan", () => {
  const p = good({ ops: [{ op: "add", section: { kind: "cta", title: "Klik", button_href: "javascript:alert(1)" } }] });
  const cta = p.engine.pages[0].sections.at(-1) as { button_href?: string };
  assert.ok(!cta.button_href?.toLowerCase().startsWith("javascript"));
});

test("teks panjang dipotong dan item melebihi batas dipangkas", () => {
  const items = Array.from({ length: 80 }, (_, i) => ({ title: `T${i}`, body: "x".repeat(5000) }));
  const p = good({ ops: [{ op: "add", section: { kind: "features", title: "y".repeat(5000), items } }] });
  const f = p.engine.pages[0].sections.at(-1) as { title?: string; items?: Array<{ body?: string }> };
  assert.ok((f.title?.length ?? 0) <= 200);
  assert.ok((f.items?.length ?? 0) <= 12);
  assert.ok((f.items?.[0].body?.length ?? 0) <= 600);
});

test("AI tidak bisa mengubah menu navigasi atau slug halaman", () => {
  const p = good({
    nav: [{ label: "Judi", href: "https://evil.id" }],
    pages: [{ slug: "hack" }],
    ops: [{ op: "update", index: 0, set: { title: "OK", slug: "hack", nav: [] } }],
  });
  assert.deepEqual(p.engine.nav.map((n) => [n.label, n.href]), ENGINE.nav.map((n) => [n.label, n.href]));
  assert.deepEqual(p.engine.pages.map((x) => x.slug), ["", "tentang"]);
});

test("tidak mengubah struktur masukan (kontrak murni)", () => {
  const before = JSON.stringify(ENGINE);
  good({ ops: [{ op: "remove", index: 0 }], variants: [{ kind: "stats", variant: "band" }] });
  assert.equal(JSON.stringify(ENGINE), before);
});

// ---- tidak ada perubahan ----

test("tanpa perubahan nyata -> ditolak (kredit dikembalikan oleh pemanggil)", () => {
  for (const o of [{}, { summary: "ok" }, { ops: [] }, { variants: [{ kind: "stats", variant: "cards" }] }, { theme: { primary: "#0f766e" } }]) {
    assert.equal(buildProposal(reply(o), CTX).ok, false, JSON.stringify(o));
  }
});

// ---- prompt ----

test("prompt memuat jenis blok, varian yang diizinkan, kondisi saat ini, dan permintaan", () => {
  const { system, user } = buildDesignMessages({ ...CTX, variantAllow: { stats: ["inline"] } }, "buat lebih modern");
  assert.ok(system.includes("faq") && system.includes("testimonials"));
  assert.ok(system.includes("variant: salah satu dari inline"), "hanya varian yang diizinkan ditawarkan");
  assert.ok(!system.includes("band"), "varian terlarang tidak ditawarkan");
  assert.ok(user.includes("[1] stats") && user.includes("Karanganyar") && user.includes("buat lebih modern"));
  assert.ok(system.includes("<data>") && user.includes("<data>"));
});

test("prompt memotong permintaan panjang dan teks desa yang panjang", () => {
  const long = { ...ENGINE, pages: [{ ...ENGINE.pages[0], sections: [{ kind: "hero" as const, title: "A".repeat(500) }] }] };
  const { user } = buildDesignMessages({ ...CTX, engine: long }, "x".repeat(5000));
  assert.ok(user.length < 2500);
});

// ---- putaran penuh: pratinjau == yang tersimpan ----

import { applyPatchToDraft, editingCustomizationRaw } from "@/lib/website-engine/customization-store";
import { resolveEffectiveStructure, resolveEffectiveTheme, parseCustomization } from "@/lib/website-engine/normalize";
import { parseTemplateStructureManifest } from "@/lib/website-engine/manifest";
import { sanitizeV2StructureOverride } from "@/lib/website-engine/resolved-structure";

test("Terapkan menyimpan persis yang dipratinjau, dan situs publik tidak berubah sebelum terbit", () => {
  const templateStructure = {
    version: 1,
    templateKey: "modern-village",
    pages: { home: { sections: [{ kind: "hero" }, { kind: "stats", items: [{ label: "Penduduk", value: "9" }] }, { kind: "contact" }] } },
  };
  const live = { theme: { primary: "#0f766e" } };
  const manifest = parseTemplateStructureManifest(templateStructure);

  const engine = resolveEffectiveStructure({ templateStructure, customization: editingCustomizationRaw(live) });
  const ctx: AiDesignContext = {
    templateKey: manifest.templateKey,
    capabilities: manifest.capabilities,
    villageName: "Desa X",
    engine,
    theme: resolveEffectiveTheme({ templateStructure, customization: live }),
  };
  const r = buildProposal(
    reply({
      theme: { primary: "#1d4ed8", fontStyle: "klasik" },
      variants: [{ kind: "stats", variant: "band" }],
      ops: [
        { op: "add", at: 1, section: { kind: "faq", items: [{ q: "Jam buka?", a: "08.00" }] } },
        { op: "update", index: 0, set: { title: "Halo" } },
      ],
    }),
    ctx,
  );
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const p = r.proposal;

  // Persis seperti route: server mengirim v2 ke klien; klien mengirim PATCH; server menyanitasi ulang lalu menyimpan ke draf.
  const overrides = { version: 2 as const, nav: p.engine.nav, pages: p.engine.pages };
  const resanitized = sanitizeV2StructureOverride(overrides, manifest.templateKey, manifest.capabilities);
  const stored = applyPatchToDraft(live, { overrides: resanitized, theme: p.theme });

  const afterEditing = resolveEffectiveStructure({ templateStructure, customization: editingCustomizationRaw(stored) });
  assert.deepEqual(afterEditing.pages, p.engine.pages, "draf = pratinjau");
  assert.equal(resolveEffectiveTheme({ templateStructure, customization: editingCustomizationRaw(stored) }).primary, p.theme.primary);

  // Publik hanya membaca versi live: tidak ada satu pun perubahan AI yang bocor sebelum terbit.
  const publicEngine = resolveEffectiveStructure({ templateStructure, customization: stored });
  assert.deepEqual(publicEngine.pages, engine.pages);
  assert.equal(resolveEffectiveTheme({ templateStructure, customization: stored }).primary, "#0f766e");
  assert.equal(parseCustomization(stored).draft !== undefined, true);
});
