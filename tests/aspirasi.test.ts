import assert from "node:assert/strict";
import test from "node:test";
import { ASPIRATION_CATEGORIES, REPLY_KINDS, REPLY_KIND_PROGRESS, categoryLabel, isAspirationCategory, isFlagReason } from "@/lib/aspirasi/catalog";
import { cleanPublicText, maskPersonalData, tidyText } from "@/lib/aspirasi/text";
import { areaSlug, aspirationPath, aspirationSlug, codeFromSegment, isAspirationCode, newAspirationCode, slugify } from "@/lib/aspirasi/slug";
import { indexGraceCutoff, isAreaIndexable, isAspirasiIndexingEnabled, isAspirationIndexable } from "@/lib/aspirasi/seo";
import { inspectWebp, aspirationPhotoKey } from "@/lib/aspirasi/photos";
import { claimMatchScore, nextProgress, readPhotos, ASPIRATION_PHOTO_KEY_RE } from "@/lib/aspirasi/service";
import { canModerate, isModerationAction } from "@/lib/aspirasi/moderation";
import { fetchWilayah, isValidParent, kindFromCode, parseLevel, resolveVillageCode } from "@/lib/aspirasi/wilayah";
import { ipGroup } from "@/lib/aspirasi/http";
import { buildOwnerAspirasiEmail, buildClaimDecisionEmail } from "@/lib/aspirasi/notify";

// ---------------------------------------------------------------------------------------------------------------- teks
test("NIK atau nomor KK ditolak, apa pun pemisahnya", () => {
  assert.equal(maskPersonalData("NIK saya 6402010101010001 tolong").ok, false);
  assert.equal(maskPersonalData("KK 6402 0101 0101 0001").ok, false);
  assert.equal(maskPersonalData("kode 6402-0101-0101-0001").ok, false);
  assert.equal(maskPersonalData("sebanyak 12345 warga").ok, true);
});

test("telepon, email, dan tautan disamarkan; teks lain utuh", () => {
  const r = maskPersonalData("Hubungi Pak RT 0812-3456-7890 atau budi@mail.com, lihat https://x.id/foto dan www.spam.com sekarang");
  assert.ok(r.ok);
  if (r.ok) {
    assert.doesNotMatch(r.text, /0812|budi@|https:|www\./);
    assert.match(r.text, /\[nomor disembunyikan\]/);
    assert.match(r.text, /\[email disembunyikan\]/);
    assert.match(r.text, /\[tautan dihapus\]/);
    assert.deepEqual(r.masked.sort(), ["email", "nomor telepon", "tautan"]);
  }
  const plain = maskPersonalData("Jalan rusak sepanjang 200 meter di dekat balai desa.");
  assert.ok(plain.ok && plain.text === "Jalan rusak sepanjang 200 meter di dekat balai desa." && plain.masked.length === 0);
});

test("tidyText merapikan spasi, karakter kontrol, dan baris kosong berlebih", () => {
  assert.equal(tidyText("  a   b \r\n\r\n\r\n\r\n c\u0000d  "), "a b\n\ncd");
  assert.equal(tidyText(null), "");
});

test("cleanPublicText memeriksa panjang minimal dan maksimal", () => {
  assert.equal(cleanPublicText("pendek", "Judul", 10, 50).ok, false);
  assert.equal(cleanPublicText("x".repeat(60), "Judul", 10, 50).ok, false);
  assert.equal(cleanPublicText("Sampah menumpuk di tepi sungai", "Judul", 10, 50).ok, true);
});

// ---------------------------------------------------------------------------------------------------------------- slug & kode
test("slugify membuang aksen, simbol, dan memotong tanpa tanda hubung di ujung", () => {
  assert.equal(slugify("Sampah & Limbah: Jl. Mawar No. 5!"), "sampah-dan-limbah-jl-mawar-no-5");
  assert.equal(slugify("Café Désa"), "cafe-desa");
  assert.equal(slugify("a".repeat(100), 10), "aaaaaaaaaa");
  assert.equal(aspirationSlug("???"), "aspirasi");
});

test("slug desa: 'Kabupaten' dibuang, 'Kota' dipertahankan", () => {
  assert.equal(areaSlug({ name: "Muara Badak Ulu", district: "Muara Badak", regency: "Kabupaten Kutai Kartanegara" }), "muara-badak-ulu-muara-badak-kutai-kartanegara");
  assert.equal(areaSlug({ name: "Tebet Timur", district: "Tebet", regency: "Kota Jakarta Selatan" }), "tebet-timur-tebet-kota-jakarta-selatan");
});

test("kode laporan: 10 karakter tanpa huruf yang membingungkan, dan bisa diambil dari akhir alamat", () => {
  const code = newAspirationCode();
  assert.match(code, /^[a-hj-km-np-z2-9]{10}$/);
  assert.ok(isAspirationCode(code));
  assert.ok(!isAspirationCode("ABCDEFGHJK"));
  assert.ok(!isAspirationCode("abc"));
  assert.equal(codeFromSegment(`sampah-menumpuk-${code}`), code);
  assert.equal(codeFromSegment(code), code);
  assert.equal(codeFromSegment("sampah-menumpuk-tanpa-kode"), null);
  assert.equal(aspirationPath({ slug: "jalan-rusak", code }), `/aspirasi/laporan/jalan-rusak-${code}`);
  assert.notEqual(newAspirationCode(), newAspirationCode());
});

// ---------------------------------------------------------------------------------------------------------------- katalog
test("katalog: kategori, alasan flag, dan pemetaan jenis tanggapan lengkap", () => {
  assert.ok(isAspirationCategory("sampah") && !isAspirationCategory("hoax"));
  assert.equal(categoryLabel("jalan"), "Jalan dan jembatan");
  assert.equal(categoryLabel("tak-ada"), "tak-ada");
  assert.ok(isFlagReason("PERSONAL_DATA") && !isFlagReason("BOSAN"));
  assert.equal(ASPIRATION_CATEGORIES.length, new Set(ASPIRATION_CATEGORIES.map((c) => c.value)).size);
  for (const k of REPLY_KINDS) assert.ok(REPLY_KIND_PROGRESS[k], `jenis ${k} punya status`);
});

test("tanggapan biasa tidak menurunkan status yang sudah lebih maju", () => {
  assert.equal(nextProgress("NEW", "RESPONSE"), "RESPONDED");
  assert.equal(nextProgress("IN_PROGRESS", "RESPONSE"), "IN_PROGRESS");
  assert.equal(nextProgress("RESOLVED", "RESPONSE"), "RESOLVED");
  assert.equal(nextProgress("RESOLVED", "DISPUTE"), "DISPUTED");
  assert.equal(nextProgress("DISPUTED", "PROGRESS"), "IN_PROGRESS");
  assert.equal(nextProgress("NEW", "RESOLVED"), "RESOLVED");
});

// ---------------------------------------------------------------------------------------------------------------- SEO
const NOW = new Date("2026-11-21T03:00:00Z");
const base = { status: "PUBLISHED", noindex: false, publishedAt: new Date("2026-11-01T00:00:00Z"), bodyLength: 400, openFlags: 0 };

test("pengindeksan MATI bila ASPIRASI_INDEXING tidak 'on' (bawaan)", () => {
  assert.equal(isAspirasiIndexingEnabled({} as NodeJS.ProcessEnv), false);
  assert.equal(isAspirasiIndexingEnabled({ ASPIRASI_INDEXING: "off" } as unknown as NodeJS.ProcessEnv), false);
  assert.equal(isAspirasiIndexingEnabled({ ASPIRASI_INDEXING: " ON " } as unknown as NodeJS.ProcessEnv), true);
  assert.equal(isAspirationIndexable(base, NOW, {} as NodeJS.ProcessEnv), false);
  assert.equal(isAreaIndexable(99, {} as NodeJS.ProcessEnv), false);
});

test("pagar indeks per laporan: tayang, tanpa noindex, tanpa flag, lewat masa tenggang, cukup panjang", () => {
  const on = { ASPIRASI_INDEXING: "on" } as unknown as NodeJS.ProcessEnv;
  assert.equal(isAspirationIndexable(base, NOW, on), true);
  assert.equal(isAspirationIndexable({ ...base, status: "HIDDEN" }, NOW, on), false);
  assert.equal(isAspirationIndexable({ ...base, noindex: true }, NOW, on), false);
  assert.equal(isAspirationIndexable({ ...base, openFlags: 1 }, NOW, on), false);
  assert.equal(isAspirationIndexable({ ...base, bodyLength: 100 }, NOW, on), false);
  assert.equal(isAspirationIndexable({ ...base, publishedAt: null }, NOW, on), false);
  // 6 hari: belum lewat masa tenggang 7 hari; tepat 7 hari: lolos.
  assert.equal(isAspirationIndexable({ ...base, publishedAt: new Date(NOW.getTime() - 6 * 86_400_000) }, NOW, on), false);
  assert.equal(isAspirationIndexable({ ...base, publishedAt: new Date(NOW.getTime() - 7 * 86_400_000) }, NOW, on), true);
  assert.equal(indexGraceCutoff(NOW).toISOString(), "2026-11-14T03:00:00.000Z");
});

test("halaman desa baru diindeks bila ada cukup laporan layak indeks", () => {
  const on = { ASPIRASI_INDEXING: "on" } as unknown as NodeJS.ProcessEnv;
  assert.equal(isAreaIndexable(1, on), false);
  assert.equal(isAreaIndexable(2, on), true);
});

// ---------------------------------------------------------------------------------------------------------------- foto
const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const chunk = (id: string, data: number[]) => [...Buffer.from(id, "ascii"), ...u32(data.length), ...data, ...(data.length % 2 ? [0] : [])];
const webp = (...chunks: number[][]) => {
  const body = [...Buffer.from("WEBP", "ascii"), ...chunks.flat()];
  return new Uint8Array([...Buffer.from("RIFF", "ascii"), ...u32(body.length), ...body]);
};

test("WebP bersih diterima; EXIF/XMP/ICCP/animasi/bukan WebP ditolak", () => {
  const img = chunk("VP8 ", [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(inspectWebp(webp(img)), { ok: true });
  assert.deepEqual(inspectWebp(webp(chunk("VP8X", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), img)), { ok: true });
  assert.equal(inspectWebp(webp(img, chunk("EXIF", [1, 2]))).ok, false);
  assert.equal(inspectWebp(webp(img, chunk("XMP ", [1, 2]))).ok, false);
  assert.equal(inspectWebp(webp(chunk("ICCP", [1, 2]), img)).ok, false);
  assert.equal(inspectWebp(webp(chunk("ANIM", [1, 2, 3, 4, 5, 6]), img)).ok, false);
  assert.equal(inspectWebp(webp(chunk("VP8X", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).ok, false); // tanpa data gambar
  assert.equal(inspectWebp(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).ok, false);
  assert.equal(inspectWebp(new Uint8Array(5)).ok, false);
  // Muatan lain yang ditempel di belakang gambar yang sah ditolak (ukuran RIFF harus pas).
  const clean = webp(img);
  assert.equal(inspectWebp(new Uint8Array([...clean, ...Buffer.from("PK\u0003\u0004 muatan lain")])).ok, false);
  assert.equal(inspectWebp(clean.slice(0, clean.length - 2)).ok, false);
});

test("kunci foto dibuat server dan hanya kunci berpola yang dibaca dari DB", () => {
  const key = aspirationPhotoKey("123e4567-e89b-12d3-a456-426614174000", new Date("2026-11-21T03:00:00Z"));
  assert.equal(key, "aspirasi/2026/11/123e4567-e89b-12d3-a456-426614174000.webp");
  assert.ok(ASPIRATION_PHOTO_KEY_RE.test(key));
  assert.ok(!ASPIRATION_PHOTO_KEY_RE.test("blog/2026/11/123e4567-e89b-12d3-a456-426614174000.webp"));
  assert.ok(!ASPIRATION_PHOTO_KEY_RE.test("aspirasi/2026/11/../../etc/passwd.webp"));
  assert.deepEqual(readPhotos([{ key }, { key: "x" }, "bukan-objek", null]), [{ key }]);
  assert.deepEqual(readPhotos(null), []);
  assert.equal(readPhotos(Array.from({ length: 9 }, () => ({ key }))).length, 3);
});

// ---------------------------------------------------------------------------------------------------------------- moderasi
test("perpindahan status moderasi: yang boleh dan yang tidak", () => {
  assert.ok(canModerate("PENDING", "publish") && canModerate("HIDDEN", "publish"));
  assert.ok(!canModerate("REJECTED", "publish") && !canModerate("REMOVED", "publish"));
  assert.ok(canModerate("PENDING", "reject") && !canModerate("PUBLISHED", "reject"));
  assert.ok(canModerate("PUBLISHED", "hide") && !canModerate("PENDING", "hide"));
  assert.ok(canModerate("REJECTED", "reopen") && !canModerate("PUBLISHED", "reopen"));
  assert.ok(!canModerate("REMOVED", "hide") && !canModerate("REMOVED", "edit") && !canModerate("REMOVED", "remove"));
  assert.ok(isModerationAction("noindex") && !isModerationAction("delete"));
});

// ---------------------------------------------------------------------------------------------------------------- klaim
test("petunjuk kecocokan klaim: nama, kecamatan, kabupaten (abaikan awalan Desa/Kab.)", () => {
  const area = { name: "Muara Badak Ulu", district: "Muara Badak", regency: "Kabupaten Kutai Kartanegara" };
  assert.equal(claimMatchScore(area, { name: "Desa Muara Badak Ulu", district: "Kecamatan Muara Badak", regency: "Kab. Kutai Kartanegara" }), 3);
  assert.equal(claimMatchScore(area, { name: "Desa Sumberharjo", district: "Muara Badak", regency: "Kutai Kartanegara" }), 2);
  assert.equal(claimMatchScore(area, { name: "Sumberharjo", district: "Sleman", regency: "Kab. Sleman" }), 0);
  assert.equal(claimMatchScore(area, { name: "", district: "", regency: "" }), 0);
});

// ---------------------------------------------------------------------------------------------------------------- wilayah
test("kode wilayah: tingkat, induk, dan jenis desa/kelurahan", () => {
  assert.equal(parseLevel("villages"), "villages");
  assert.equal(parseLevel("kota"), null);
  assert.ok(isValidParent("provinces", "") && !isValidParent("provinces", "64"));
  assert.ok(isValidParent("regencies", "64") && !isValidParent("regencies", "64.02"));
  assert.ok(isValidParent("villages", "64.02.05") && !isValidParent("villages", "64.02.05.2003"));
  assert.equal(kindFromCode("64.02.05.2003"), "desa");
  assert.equal(kindFromCode("31.74.01.1001"), "kelurahan");
});

function fakeWilayah(): typeof fetch {
  const data: Record<string, Array<{ code: string; name: string }>> = {
    "https://wilayah.id/api/provinces.json": [{ code: "64", name: "Kalimantan Timur" }],
    "https://wilayah.id/api/regencies/64.json": [{ code: "64.02", name: "Kabupaten Kutai Kartanegara" }],
    "https://wilayah.id/api/districts/64.02.json": [{ code: "64.02.05", name: "Muara Badak" }],
    "https://wilayah.id/api/villages/64.02.05.json": [{ code: "64.02.05.2003", name: "Muara Badak Ulu" }],
  };
  return (async (url: string | URL | Request) => {
    const rows = data[String(url)];
    return rows ? new Response(JSON.stringify({ data: rows }), { status: 200 }) : new Response("nf", { status: 404 });
  }) as typeof fetch;
}

test("resolveVillageCode memverifikasi nama dari sumber, kode asing/rusak ditolak", async () => {
  const f = fakeWilayah();
  assert.deepEqual(await resolveVillageCode("64.02.05.2003", f), {
    wilayahCode: "64.02.05.2003", kind: "desa", name: "Muara Badak Ulu", district: "Muara Badak", regency: "Kabupaten Kutai Kartanegara", province: "Kalimantan Timur",
  });
  assert.equal(await resolveVillageCode("64.02.05.9999", f), null);
  assert.equal(await resolveVillageCode("99.99.99.9999", f), null);
  assert.equal(await resolveVillageCode("bukan-kode", f), null);
  assert.deepEqual(await fetchWilayah("regencies", "64.02", f), []); // induk salah tingkat
  const down = (async () => { throw new Error("DNS"); }) as unknown as typeof fetch;
  assert.deepEqual(await fetchWilayah("provinces", "", down), []);
  assert.equal(await resolveVillageCode("64.02.05.2003", down), null);
});

// ---------------------------------------------------------------------------------------------------------------- email
test("email pemilik tidak memuat kontak pelapor dan menandai wilayah manual", () => {
  const m = buildOwnerAspirasiEmail({ kind: "queued", code: "abcdefghjk", title: "Sampah menumpuk di tepi sungai", category: "sampah", area: "Desa X, Kec. Y, Kab. Z", manualArea: true });
  assert.match(m.subject, /menunggu tinjauan/);
  assert.match(m.text, /diketik manual/);
  assert.match(m.text, /Sampah dan kebersihan/);
  assert.match(m.text, /\/admin\/aspirasi/);
  const f = buildOwnerAspirasiEmail({ kind: "flag", code: "abcdefghjk", title: "Judul", reason: "PERSONAL_DATA", source: "VILLAGE", hidden: true });
  assert.match(f.subject, /disembunyikan otomatis/);
  const c = buildClaimDecisionEmail({ decision: "REJECTED", areaName: "Desa X", note: "Bukti belum cukup" });
  assert.match(c.text, /Bukti belum cukup/);
  assert.match(buildClaimDecisionEmail({ decision: "APPROVED", areaName: "Desa X", note: null }).text, /aspirasi-publik/);
});

test("pembatas laju memangkas IPv6 ke /64 sehingga berganti alamat dalam satu jaringan tidak lolos", () => {
  assert.equal(ipGroup("203.0.113.7"), "203.0.113.7");
  assert.equal(ipGroup("::ffff:203.0.113.7"), "203.0.113.7");
  const a = ipGroup("2001:db8:abcd:12:1111:2222:3333:4444");
  const b = ipGroup("2001:DB8:abcd:12::9");
  assert.equal(a, b);
  assert.equal(a, "2001:0db8:abcd:0012::/64");
  assert.notEqual(a, ipGroup("2001:db8:abcd:13::1"));
  assert.equal(ipGroup("::1"), "0000:0000:0000:0000::/64");
});
