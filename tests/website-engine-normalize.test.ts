import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTemplateStructure,
  parseCustomization,
  resolveEffectiveStructure,
} from "@/lib/website-engine/normalize";

test("normalizeTemplateStructure provides defaults", () => {
  const n = normalizeTemplateStructure(null);
  assert.equal(n.version, 1);
  assert.ok(Array.isArray(n.pages.home.sections));
  assert.ok(n.pages.home.sections.length > 0);
});

test("parseCustomization returns empty object for null", () => {
  const c = parseCustomization(null);
  assert.deepEqual(c, {});
});

test("resolveEffectiveStructure merges overrides (v1 home)", () => {
  const templateStructure = {
    version: 1,
    pages: {
      home: { sections: [{ kind: "hero" }, { kind: "news", limit: 5 }] },
    },
  };
  const customization = {
    overrides: { pages: { home: { sections: [{ kind: "contact" }] } } },
  };
  const e = resolveEffectiveStructure({ templateStructure, customization });
  const home = e.pages.find((p) => p.slug === "");
  assert.ok(home);
  assert.deepEqual(home!.sections, [{ kind: "contact" }]);
});

test("template-level preset merges before overrides", () => {
  const templateStructure = {
    version: 1,
    pages: {
      home: { sections: [{ kind: "hero" }] },
    },
    presets: [
      {
        key: "wisata_highlight",
        name: "Sorot",
        structure: {
          version: 1,
          pages: {
            home: {
              sections: [
                { kind: "news", limit: 4, title: "Info" },
                { kind: "contact" },
              ],
            },
          },
        },
      },
    ],
  };
  const customization = { presetKey: "wisata_highlight" };
  const e = resolveEffectiveStructure({ templateStructure, customization });
  const home = e.pages.find((p) => p.slug === "");
  assert.ok(home);
  assert.equal(home!.sections.length, 2);
  assert.equal(home!.sections[0].kind, "news");
});

test("builtin preset used when template has no matching key", () => {
  const templateStructure = {
    version: 1,
    pages: {
      home: { sections: [{ kind: "hero" }, { kind: "contact" }] },
    },
    presets: [],
  };
  const customization = { presetKey: "news_first" };
  const e = resolveEffectiveStructure({ templateStructure, customization });
  const home = e.pages.find((p) => p.slug === "");
  assert.ok(home);
  assert.ok(home!.sections.some((s) => s.kind === "news"));
});

test("resolveEffectiveStructure applies v2 overlay", () => {
  const templateStructure = {
    version: 1,
    pages: {
      home: { sections: [{ kind: "hero" }] },
    },
  };
  const customization = {
    overrides: {
      version: 2,
      nav: [
        { label: "Tentang", href: "/tentang", external: false },
      ],
      pages: [
        { id: "home", slug: "", title: "Beranda", sections: [{ kind: "hero" }] },
        {
          id: "about",
          slug: "tentang",
          title: "Tentang",
          sections: [{ kind: "rich_text", title: "Isi", body: "Halo" }],
        },
      ],
    },
  };
  const e = resolveEffectiveStructure({ templateStructure, customization });
  assert.equal(e.nav.length, 1);
  assert.equal(e.pages.length, 2);
  const tentang = e.pages.find((p) => p.slug === "tentang");
  assert.ok(tentang);
  assert.equal(tentang!.sections[0].kind, "rich_text");
});
