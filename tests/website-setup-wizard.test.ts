import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contrastRatio,
  deriveAccent,
  dominantColorFromPixels,
  ensureReadableOnWhite,
  hexToRgb,
} from "@/lib/website-engine/color";
import {
  applySetupToEngine,
  readSetupFromEngine,
  SETUP_FONT_STYLES,
  suggestStats,
  type SetupContent,
} from "@/lib/website-engine/setup-wizard";
import type { ResolvedEngineStructure } from "@/lib/website-engine/types";

function px(...rgba: Array<[number, number, number, number]>): number[] {
  return rgba.flat();
}

test("warna dominan mengabaikan putih, hitam, abu-abu, dan transparan", () => {
  const data = px(
    ...Array.from({ length: 50 }, () => [255, 255, 255, 255] as [number, number, number, number]),
    ...Array.from({ length: 30 }, () => [0, 0, 0, 255] as [number, number, number, number]),
    ...Array.from({ length: 30 }, () => [128, 128, 128, 255] as [number, number, number, number]),
    ...Array.from({ length: 40 }, () => [200, 30, 30, 0] as [number, number, number, number]),
    ...Array.from({ length: 10 }, () => [20, 120, 60, 255] as [number, number, number, number]),
  );
  assert.deepEqual(hexToRgb(dominantColorFromPixels(data, 1)!), [20, 120, 60]);
});

test("logo tanpa warna menghasilkan null", () => {
  const data = px(...Array.from({ length: 20 }, () => [255, 255, 255, 255] as [number, number, number, number]));
  assert.equal(dominantColorFromPixels(data, 1), null);
});

test("warna terang digelapkan sampai kontras teks putih memenuhi 4.5", () => {
  const out = ensureReadableOnWhite("#facc15");
  assert.ok(contrastRatio(out, "#ffffff") >= 4.5, out);
  const already = "#0f766e";
  assert.equal(ensureReadableOnWhite(already), already);
});

test("hex tidak valid dikembalikan apa adanya", () => {
  assert.equal(ensureReadableOnWhite("bukan warna"), "bukan warna");
});

test("aksen turunan sangat terbaca di atas putih", () => {
  assert.ok(contrastRatio(deriveAccent("#0f766e"), "#ffffff") >= 7);
  assert.ok(contrastRatio(deriveAccent("#facc15"), "#ffffff") >= 7);
});

test("gaya huruf punya nilai font yang valid", () => {
  for (const f of SETUP_FONT_STYLES) {
    assert.ok(f.fontBody.length > 0 && f.fontHeading.length > 0, f.key);
  }
});

test("suggestStats memformat ribuan dan mengosongkan nol", () => {
  const s = suggestStats({ total: 3245, households: 0, hamlets: 4 });
  assert.equal(s[0].value, "3.245");
  assert.equal(s[1].value, "");
  assert.equal(s[2].value, "4");
});

const ENGINE: ResolvedEngineStructure = {
  version: 2,
  nav: [{ label: "Beranda", href: "/" }],
  pages: [
    { id: "home", slug: "", title: "Beranda", sections: [{ kind: "hero" }, { kind: "news", limit: 6 }, { kind: "contact" }] },
    { id: "p-tentang", slug: "tentang", title: "Tentang", sections: [{ kind: "rich_text", body: "x" }] },
  ],
};

const CONTENT: SetupContent = {
  heroTitle: " Selamat datang ",
  heroSubtitle: "Desa maju",
  heroImageUrl: "https://x.id/a.jpg",
  showStats: true,
  stats: [
    { label: "Penduduk", value: "3.245" },
    { label: "KK", value: "" },
    { label: "Dusun", value: "4" },
  ],
};

test("setup mengisi hero, menyisipkan stats setelah hero, dan tidak menyentuh halaman lain", () => {
  const out = applySetupToEngine(ENGINE, CONTENT);
  const home = out.pages[0];
  assert.deepEqual(home.sections.map((s) => s.kind), ["hero", "stats", "news", "contact"]);
  const hero = home.sections[0];
  assert.equal(hero.kind === "hero" && hero.title, "Selamat datang");
  const stats = home.sections[1];
  // Baris dengan label tapi nilai kosong dipertahankan (tampil "KK —"); baris kosong total dibuang.
  assert.deepEqual(stats.kind === "stats" && stats.items, [
    { label: "Penduduk", value: "3.245" },
    { label: "KK" },
    { label: "Dusun", value: "4" },
  ]);
  assert.deepEqual(out.pages[1], ENGINE.pages[1]);
  assert.deepEqual(out.nav, ENGINE.nav);
});

test("setup tidak mengubah objek masukan", () => {
  const before = JSON.stringify(ENGINE);
  applySetupToEngine(ENGINE, CONTENT);
  assert.equal(JSON.stringify(ENGINE), before);
});

test("showStats=false membuang blok stats yang ada", () => {
  const withStats = applySetupToEngine(ENGINE, CONTENT);
  const out = applySetupToEngine(withStats, { ...CONTENT, showStats: false });
  assert.equal(out.pages[0].sections.some((s) => s.kind === "stats"), false);
});

test("menjalankan setup dua kali tidak menggandakan blok", () => {
  const once = applySetupToEngine(ENGINE, CONTENT);
  const twice = applySetupToEngine(once, CONTENT);
  assert.deepEqual(twice.pages[0].sections.map((s) => s.kind), ["hero", "stats", "news", "contact"]);
});

test("beranda tanpa hero mendapat hero baru di posisi pertama", () => {
  const e: ResolvedEngineStructure = { ...ENGINE, pages: [{ id: "home", slug: "", title: "Beranda", sections: [{ kind: "news" }] }] };
  const out = applySetupToEngine(e, { ...CONTENT, showStats: false });
  assert.equal(out.pages[0].sections[0].kind, "hero");
});

test("readSetupFromEngine membaca isian yang sudah ada (bisa dibuka ulang)", () => {
  const round = readSetupFromEngine(applySetupToEngine(ENGINE, CONTENT));
  assert.equal(round.heroTitle, "Selamat datang");
  assert.equal(round.showStats, true);
  assert.equal(round.stats[0].value, "3.245");
});

test("wizard tidak menghapus angka ke-4 dan seterusnya yang ditambah lewat CMS", () => {
  const e: ResolvedEngineStructure = {
    ...ENGINE,
    pages: [
      {
        id: "home",
        slug: "",
        title: "Beranda",
        sections: [
          { kind: "hero" },
          {
            kind: "stats",
            items: [
              { label: "A", value: "1" },
              { label: "B", value: "2" },
              { label: "C", value: "3" },
              { label: "D", value: "4" },
            ],
          },
        ],
      },
    ],
  };
  const out = applySetupToEngine(e, { ...CONTENT, stats: [{ label: "A", value: "9" }, { label: "", value: "" }, { label: "", value: "" }] });
  const stats = out.pages[0].sections.find((s) => s.kind === "stats");
  assert.deepEqual(stats && stats.kind === "stats" && stats.items, [
    { label: "A", value: "9" },
    { label: "D", value: "4" },
  ]);
});
