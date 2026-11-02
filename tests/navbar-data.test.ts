import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NAV_ITEMS, isPathActive, listNavPaths } from "../components/features/navbar-data.ts";

const root = process.cwd();

/** Jangkar (#id) yang dituju menu, dan berkas yang harus memuat `id="..."`-nya. */
const HASH_TARGETS: Record<string, string> = {
  tentang: "components/features/AboutSection.tsx",
  kontak: "components/features/CTASection.tsx",
  "aplikasi-seluler": "components/features/marketing/MobileAppSection.tsx",
};

function allHrefs(): string[] {
  const out: string[] = [];
  for (const item of NAV_ITEMS) {
    if (item.type === "link") out.push(item.href);
    else {
      for (const l of item.group.links) out.push(l.href);
      if (item.group.feature?.kind === "link") out.push(item.group.feature.href);
    }
  }
  return out;
}

describe("data navigasi landing", () => {
  it("setiap tautan menu menunjuk halaman yang ada di app/(landing)", () => {
    for (const path of new Set(listNavPaths())) {
      const file = path === "/" ? "app/(landing)/page.tsx" : `app/(landing)${path}/page.tsx`;
      assert.ok(existsSync(join(root, file)), `Menu menaut ${path} tetapi ${file} tidak ada`);
    }
  });

  it("setiap jangkar hash punya elemen id yang cocok", () => {
    for (const href of allHrefs().filter((h) => h.includes("#"))) {
      assert.ok(href.startsWith("/#"), `Tautan hash harus berbentuk "/#id" agar bekerja dari halaman mana pun: ${href}`);
      const id = href.slice(2);
      const file = HASH_TARGETS[id];
      assert.ok(file, `Daftarkan jangkar "${id}" di HASH_TARGETS`);
      const src = readFileSync(join(root, file), "utf8");
      assert.ok(src.includes(`id="${id}"`), `${file} tidak memuat id="${id}"`);
    }
  });

  it("tidak ada href ganda di dalam satu grup", () => {
    for (const item of NAV_ITEMS) {
      if (item.type !== "group") continue;
      const hrefs = item.group.links.map((l) => l.href);
      assert.equal(new Set(hrefs).size, hrefs.length, `href ganda di grup ${item.group.id}`);
    }
  });

  it("penanda aktif: induk aktif untuk anak rute, hash tidak pernah aktif", () => {
    assert.equal(isPathActive("/platform/sdgs", "/platform"), true);
    assert.equal(isPathActive("/platformx", "/platform"), false);
    assert.equal(isPathActive("/", "/"), true);
    assert.equal(isPathActive("/harga", "/"), false);
    assert.equal(isPathActive("/", "/#tentang"), false);
  });
});
