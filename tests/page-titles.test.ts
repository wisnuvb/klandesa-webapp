import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

/**
 * Penjaga title halaman (untuk laporan "Pages and screens" GA4): setiap page.tsx harus punya title sendiri,
 * di page.tsx atau layout.tsx di folder yang sama, bukan mewarisi default root. Title literal juga harus unik.
 */
const APP = path.join(process.cwd(), "app");
const META = /export\s+(const\s+metadata|(async\s+)?function\s+generateMetadata)/;
// Dibaca dari cakupan metadata: `title: "X"`, `title: { absolute: "X" }`, atau `{ title: "X" }`.
const LITERAL_TITLE = /metadata[^=]*=\s*\{[^}]*?title:\s*(?:\{\s*absolute:\s*)?"([^"]+)"/s;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name === "page.tsx") out.push(full);
  }
  return out;
}

// Halaman yang hanya me-redirect tidak pernah tampil, jadi tidak butuh title.
const REDIRECT_ONLY = new Set([path.join("app", "(landing)", "blog", "topik", "page.tsx")]);
const pages = walk(APP).filter((p) => !REDIRECT_ONLY.has(path.relative(process.cwd(), p)));

function ownMetadataSource(pageFile: string): string | null {
  const own = readFileSync(pageFile, "utf8");
  if (META.test(own)) return own;
  const layout = path.join(path.dirname(pageFile), "layout.tsx");
  if (existsSync(layout)) {
    const l = readFileSync(layout, "utf8");
    if (META.test(l)) return l;
  }
  return null;
}

test("setiap halaman punya metadata title sendiri (bukan default root)", () => {
  const missing = pages
    .filter((p) => ownMetadataSource(p) === null)
    .map((p) => path.relative(process.cwd(), p));
  assert.deepEqual(missing, [], `halaman tanpa title sendiri:\n${missing.join("\n")}`);
});

test("title literal tidak kembar antar halaman", () => {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const p of pages) {
    const src = ownMetadataSource(p);
    const m = src ? LITERAL_TITLE.exec(src) : null;
    if (!m) continue; // generateMetadata / title terhitung: dicakup pemeriksaan runtime
    const key = m[1].toLowerCase();
    const prev = seen.get(key);
    if (prev) dupes.push(`"${m[1]}": ${prev} dan ${path.relative(process.cwd(), p)}`);
    else seen.set(key, path.relative(process.cwd(), p));
  }
  assert.deepEqual(dupes, [], `title kembar:\n${dupes.join("\n")}`);
});
