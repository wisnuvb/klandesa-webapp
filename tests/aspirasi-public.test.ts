import assert from "node:assert/strict";
import test from "node:test";
import {
  aspirationJsonLd,
  aspirationMetaDescription,
  aspirationTitleTag,
  breadcrumbJsonLd,
  excerpt,
  isPublicAspirationIndexable,
  jsonLd,
  pageFromQuery,
  resolveAspirationSegment,
  withQuery,
} from "@/lib/aspirasi/page-utils";
import { pageItems } from "@/lib/blog/pagination";

const ON = { ASPIRASI_INDEXING: "on" } as unknown as NodeJS.ProcessEnv;
const OFF = {} as unknown as NodeJS.ProcessEnv;
const now = new Date("2026-12-01T00:00:00Z");
const base = { noindex: false, publishedAt: new Date("2026-11-10T00:00:00Z"), body: "x".repeat(260), openFlags: 0 };

test("segmen alamat: kanonik tidak dialihkan, slug beda dialihkan permanen, kode salah = null", () => {
  const a = { slug: "sampah-menumpuk", code: "abcdefghjk" };
  assert.deepEqual(resolveAspirationSegment("sampah-menumpuk-abcdefghjk", a), { code: "abcdefghjk", redirectTo: null });
  assert.deepEqual(resolveAspirationSegment("judul-lama-abcdefghjk", a), { code: "abcdefghjk", redirectTo: "/aspirasi/laporan/sampah-menumpuk-abcdefghjk" });
  assert.deepEqual(resolveAspirationSegment("abcdefghjk", a), { code: "abcdefghjk", redirectTo: "/aspirasi/laporan/sampah-menumpuk-abcdefghjk" });
  assert.equal(resolveAspirationSegment("tanpa-kode", a).code, null);
  assert.deepEqual(resolveAspirationSegment("sampah-abcdefghjk", null), { code: "abcdefghjk", redirectTo: null });
});

test("pagar indeks: mati tanpa env, dan menolak noindex, flag terbuka, masa tenggang, isi pendek", () => {
  assert.equal(isPublicAspirationIndexable(base, now, OFF), false);
  assert.equal(isPublicAspirationIndexable(base, now, ON), true);
  assert.equal(isPublicAspirationIndexable({ ...base, noindex: true }, now, ON), false);
  assert.equal(isPublicAspirationIndexable({ ...base, openFlags: 1 }, now, ON), false);
  assert.equal(isPublicAspirationIndexable({ ...base, body: "pendek" }, now, ON), false);
  assert.equal(isPublicAspirationIndexable({ ...base, publishedAt: new Date("2026-11-28T00:00:00Z") }, now, ON), false);
  assert.equal(isPublicAspirationIndexable({ ...base, publishedAt: null }, now, ON), false);
});

test("ringkasan dan judul meta dipotong rapi", () => {
  assert.equal(excerpt("a  b\n\nc"), "a b c");
  const long = excerpt("kata ".repeat(100), 50);
  assert.ok(long.length <= 50 && long.endsWith("…"));
  assert.ok(aspirationTitleTag("J".repeat(100)).length <= 45);
  assert.equal(aspirationTitleTag("Judul pendek"), "Judul pendek");
  const d = aspirationMetaDescription({ title: "t", body: "isi laporan", category: "sampah", area: { name: "Sukamaju", regency: "Kabupaten X" } });
  assert.match(d, /Sampah dan kebersihan di Sukamaju, Kabupaten X: isi laporan/);
});

test("JSON-LD: penulis anonim, tanpa data pelapor, aman di dalam <script>", () => {
  const ld = aspirationJsonLd(
    { title: "Judul", body: "Isi </script><script>alert(1)</script>", publishedAt: new Date("2026-11-10T00:00:00Z"), area: { name: "A", district: "B", regency: "C", province: "D" } },
    "https://klandesa.com/aspirasi/laporan/judul-abcdefghjk",
  );
  assert.equal(ld["@type"], "DiscussionForumPosting");
  assert.deepEqual(ld.author, { "@type": "Person", name: "Warga desa" });
  const out = jsonLd(ld);
  assert.ok(!out.includes("</script>"));
  assert.deepEqual(JSON.parse(out).author, ld.author);
  const bc = breadcrumbJsonLd([{ name: "A", url: "https://x/a" }, { name: "B", url: "https://x/b" }]);
  assert.equal(bc.itemListElement[1]!.position, 2);
});

test("query paginasi: halaman 1 dan nilai kosong dibuang, nomor halaman ketat", () => {
  assert.equal(withQuery("/aspirasi", { kategori: "sampah", status: undefined, page: 1 }), "/aspirasi?kategori=sampah");
  assert.equal(withQuery("/aspirasi", { page: 3 }), "/aspirasi?page=3");
  assert.equal(withQuery("/aspirasi", {}), "/aspirasi");
  assert.equal(pageFromQuery("2"), 2);
  assert.equal(pageFromQuery("02"), 1);
  assert.equal(pageFromQuery("abc"), 1);
  assert.equal(pageFromQuery(undefined), 1);
  assert.deepEqual(pageItems(1, 1), [1]);
});
