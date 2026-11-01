import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_UKM_SETTINGS,
  UKM_LIMITS,
  canToggleUkmVisible,
  mergeUkmSettings,
  normalizeUkmStatus,
  parseContactPhone,
  parseUkmCursor,
  parseUkmInput,
  parseUkmSettings,
  resolveUkmContact,
  toUkmDetail,
  toUkmListItem,
  uniqueCategories,
  ukmPhotoAllowed,
  ukmStatusAfterEdit,
  ukmStatusForNew,
  ukmStatusForVisibility,
  ukmStatusNote,
  type UkmRow,
} from "../lib/mobile/ukm-logic.ts";

const CDN = "https://cdn.klandesa.test";
const CODE = "DESA001";
const own = (name: string) => `${CDN}/villages/${CODE}/mobile-ukm/2026/11/${name}.jpg`;
const ctx = (existing: string[] = []) => ({
  categories: ["Makanan", "Kerajinan"],
  photoAllowed: (u: string) => ukmPhotoAllowed(u, CDN, CODE, existing),
});
const valid = { name: "Keripik Singkong", description: "Keripik renyah buatan rumah, tanpa pengawet." };

describe("parseUkmInput (create)", () => {
  it("menerima isian minimal dan memberi nilai bawaan", () => {
    const r = parseUkmInput(valid, ctx(), "create");
    assert.ok(r.ok);
    assert.deepEqual(r.value, { name: "Keripik Singkong", description: valid.description, photos: [] });
  });

  it("nama dan deskripsi wajib dengan batas panjang", () => {
    for (const bad of [{}, { ...valid, name: "ab" }, { ...valid, name: "x".repeat(101) }, { ...valid, description: "pendek" }, { ...valid, description: "y".repeat(1001) }]) {
      assert.equal(parseUkmInput(bad, ctx(), "create").ok, false);
    }
  });

  it("karakter kontrol dibuang dan spasi dipangkas", () => {
    const r = parseUkmInput({ ...valid, name: "  Kripik\u0000 Pisang\u0007  " }, ctx(), "create");
    assert.ok(r.ok);
    assert.equal(r.value.name, "Kripik Pisang");
  });

  it("harga: bilangan bulat rupiah, kosong/0 = tidak diisi, negatif dan teks ditolak", () => {
    const price = (v: unknown) => parseUkmInput({ ...valid, price: v }, ctx(), "create");
    assert.deepEqual([price(15000), price("15000"), price(null), price(""), price(0)].map((r) => r.ok && r.value.price), [15000, 15000, null, null, null]);
    for (const bad of [-1, "abc", "1.5", 1e13, NaN]) assert.equal(price(bad).ok, false, String(bad));
  });

  it("stok: bilangan bulat 0..999999 atau null", () => {
    const stock = (v: unknown) => parseUkmInput({ ...valid, stock: v }, ctx(), "create");
    assert.deepEqual([stock(0), stock("12"), stock(null), stock("")].map((r) => r.ok && r.value.stock), [0, 12, null, null]);
    for (const bad of [-1, 1.5, 1_000_000, "x"]) assert.equal(stock(bad).ok, false, String(bad));
  });

  it("satuan maksimal 20 huruf, kosong menjadi null", () => {
    assert.equal((parseUkmInput({ ...valid, unit: "  " }, ctx(), "create") as { value: { unit: unknown } }).value.unit, null);
    assert.equal(parseUkmInput({ ...valid, unit: "x".repeat(21) }, ctx(), "create").ok, false);
  });

  it("kategori hanya dari daftar admin; kosong boleh", () => {
    assert.equal(parseUkmInput({ ...valid, category: "Makanan" }, ctx(), "create").ok, true);
    assert.equal(parseUkmInput({ ...valid, category: null }, ctx(), "create").ok, true);
    assert.equal(parseUkmInput({ ...valid, category: "Buatan Sendiri" }, ctx(), "create").ok, false);
  });

  it("foto: hanya unggahan UKM desa ini, tanpa duplikat, maksimal sesuai batas", () => {
    const ok = parseUkmInput({ ...valid, photos: [own("a"), own("a"), own("b")] }, ctx(), "create");
    assert.ok(ok.ok);
    assert.deepEqual(ok.value.photos, [own("a"), own("b")]);
    const bad = [
      ["https://evil.example/x.jpg"],
      [`${CDN}/villages/LAIN/mobile-ukm/x.jpg`],
      [`${CDN}/villages/${CODE}/mobile-reports/x.jpg`],
      [`${CDN}/villages/${CODE}/mobile-ukm/../../secret.jpg`],
      [`${own("a")}"><script>`],
      [42],
      "bukan-larik",
    ];
    for (const photos of bad) assert.equal(parseUkmInput({ ...valid, photos }, ctx(), "create").ok, false, JSON.stringify(photos));
    const tooMany = Array.from({ length: UKM_LIMITS.maxPhotos + 1 }, (_, i) => own(`f${i}`));
    assert.equal(parseUkmInput({ ...valid, photos: tooMany }, ctx(), "create").ok, false);
  });
});

describe("parseUkmInput (update, sebagian)", () => {
  it("hanya bidang yang dikirim yang diperiksa dan dikembalikan", () => {
    const r = parseUkmInput({ price: 20000 }, ctx(), "update");
    assert.ok(r.ok);
    assert.deepEqual(r.value, { price: 20000 });
  });

  it("bidang yang dikirim tetap divalidasi (nama kosong ditolak)", () => {
    assert.equal(parseUkmInput({ name: "" }, ctx(), "update").ok, false);
  });

  it("foto lama (mis. diunggah admin lewat web) tetap boleh dipertahankan, URL luar baru tetap ditolak", () => {
    const web = "https://cdn.klandesa.test/villages/DESA001/ukm/produk-lama.jpg";
    assert.equal(parseUkmInput({ photos: [web, own("baru")] }, ctx([web]), "update").ok, true);
    assert.equal(parseUkmInput({ photos: [web] }, ctx(), "update").ok, false);
  });

  it("badan bukan objek dianggap kosong", () => {
    assert.deepEqual(parseUkmInput(null, ctx(), "update"), { ok: true, value: {} });
  });
});

describe("status", () => {
  it("nilai tak dikenal dianggap tidak tayang, bukan tayang", () => {
    assert.equal(normalizeUkmStatus("potential"), "inactive");
    assert.equal(normalizeUkmStatus(null), "inactive");
    assert.equal(normalizeUkmStatus("active"), "active");
  });

  it("pemilik hanya bisa bolak-balik tayang ⇄ sembunyi", () => {
    assert.deepEqual(ukmStatusForVisibility("active", false), { ok: true, status: "hidden" });
    assert.deepEqual(ukmStatusForVisibility("hidden", true), { ok: true, status: "active" });
    for (const s of ["pending", "inactive"] as const) {
      const r = ukmStatusForVisibility(s, true);
      assert.equal(r.ok, false, `${s} tidak boleh ditayangkan sendiri oleh pemilik`);
      assert.equal(canToggleUkmVisible(s), false);
    }
  });

  it("mengedit produk yang ditutup desa mengajukannya ulang; status lain tetap", () => {
    assert.equal(ukmStatusAfterEdit("inactive"), "pending");
    for (const s of ["active", "pending", "hidden"] as const) assert.equal(ukmStatusAfterEdit(s), s);
  });

  it("catatan status menjelaskan langkah berikutnya", () => {
    assert.equal(ukmStatusNote("active"), null);
    assert.match(ukmStatusNote("pending")!, /memeriksa/);
    assert.match(ukmStatusNote("inactive")!, /diajukan ulang/);
  });
});

const row = (over: Partial<UkmRow> = {}): UkmRow => ({
  id: 7, name: "Keripik", description: "Enak sekali dan renyah", subCategory: "Makanan", productionValue: "15000.00",
  productionUnit: "bungkus", stockQuantity: 12, images: [own("a"), own("b")], status: "active", residentId: 5,
  contactPhone: "081234567890", contactVisible: false,
  updatedAt: new Date("2026-11-01T03:00:00Z"), resident: { name: "SITI AMINAH PUTRI", hamlet: "Dusun Mawar" }, ...over,
});

describe("serialisasi", () => {

  it("item daftar: nama penjual disamarkan, harga angka, sampul = foto pertama", () => {
    const i = toUkmListItem(row(), 5);
    assert.deepEqual([i.seller, i.price, i.thumb, i.mine], ["Siti A.", 15000, own("a"), true]);
    assert.equal("status" in i, false, "katalog tidak membocorkan status");
    assert.equal(toUkmListItem(row(), 9).mine, false);
    assert.equal(toUkmListItem(row(), null).mine, false);
  });

  it("daftar 'milik saya' menyertakan status dan labelnya", () => {
    const i = toUkmListItem(row({ status: "pending" }), 5, true);
    assert.deepEqual([i.status, i.statusLabel], ["pending", "Menunggu persetujuan desa"]);
  });

  it("produk tanpa pemilik dikelola desa", () => {
    assert.equal(toUkmListItem(row({ resident: null, residentId: null }), 5).seller, "Pengelola desa");
  });

  it("harga 0/null menjadi null; foto bukan larik menjadi kosong", () => {
    assert.equal(toUkmListItem(row({ productionValue: null }), 1).price, null);
    assert.equal(toUkmListItem(row({ productionValue: "0.00" }), 1).price, null);
    assert.equal(toUkmListItem(row({ images: "x" as unknown }), 1).thumb, null);
  });

  it("detail: catatan status & hak ubah hanya untuk pemilik; tanpa NIK/RT/RW; hanya dusun", () => {
    const mine = toUkmDetail(row({ status: "inactive" }), 5);
    assert.deepEqual([mine.canEdit, mine.canToggleVisible, mine.sellerArea], [true, false, "Dusun Mawar"]);
    assert.match(mine.statusNote ?? "", /diajukan ulang/);
    const other = toUkmDetail(row(), 99);
    assert.deepEqual([other.canEdit, other.canToggleVisible, other.statusNote], [false, false, null]);
    const keys = Object.keys(other).join(",");
    assert.doesNotMatch(keys, /nik|rt|rw|resident|notes/i);
  });
});

describe("pengaturan desa (persetujuan opsional)", () => {
  it("bawaan: produk warga diperiksa dulu; data rusak/tidak ada memakai bawaan", () => {
    assert.equal(DEFAULT_UKM_SETTINGS.moderation, true);
    for (const raw of [null, undefined, "x", [], {}, { ukm: null }, { ukm: [] }, { ukm: { moderation: "no" } }]) {
      assert.equal(parseUkmSettings(raw).moderation, true, JSON.stringify(raw));
    }
    assert.equal(parseUkmSettings({ ukm: { moderation: false } }).moderation, false);
  });

  it("status produk baru mengikuti pengaturan", () => {
    assert.equal(ukmStatusForNew(true), "pending");
    assert.equal(ukmStatusForNew(false), "active");
  });

  it("produk yang ditutup desa tetap diajukan ulang walau persetujuan mati", () => {
    assert.equal(ukmStatusAfterEdit("inactive"), "pending");
  });

  it("menggabung pengaturan tidak menghapus kunci lain (mis. wilayah)", () => {
    const merged = mergeUkmSettings({ wilayah: { kode_provinsi: "33" }, ukm: { moderation: true } }, { moderation: false });
    assert.deepEqual(merged, { wilayah: { kode_provinsi: "33" }, ukm: { moderation: false } });
    assert.deepEqual(mergeUkmSettings(null, { moderation: false }), { ukm: { moderation: false } });
    assert.deepEqual(mergeUkmSettings([1], { moderation: true }), { ukm: { moderation: true } });
  });
});

describe("kontak penjual", () => {
  it("nomor dirapikan: spasi, titik, kurung, strip dibuang; '+' di depan boleh", () => {
    const p = (v: unknown) => parseContactPhone(v);
    assert.deepEqual(
      ["0812-3456-7890", "+62 812 3456 7890", " (0812) 345.6789 ", null, "", "  "].map((v) => { const r = p(v); return r.ok ? r.value : "ERR"; }),
      ["081234567890", "+6281234567890", "08123456789", null, null, null],
    );
  });

  it("nomor yang bukan angka atau terlalu pendek/panjang ditolak", () => {
    for (const bad of ["abc", "0812abc", "1234567", "1".repeat(16), "++62812345678", "62-8x", 81234567890, {}]) {
      assert.equal(parseContactPhone(bad).ok, false, String(bad));
    }
  });

  it("parseUkmInput: kontak opsional, hanya diperiksa bila dikirim", () => {
    assert.deepEqual(parseUkmInput(valid, ctx(), "create").ok && Object.keys((parseUkmInput(valid, ctx(), "create") as { value: object }).value).sort(), ["description", "name", "photos"]);
    const r = parseUkmInput({ ...valid, contactPhone: "0812 3456 7890", showContact: true }, ctx(), "create");
    assert.ok(r.ok);
    assert.deepEqual([r.value.contactPhone, r.value.showContact], ["081234567890", true]);
    assert.equal(parseUkmInput({ ...valid, contactPhone: "x" }, ctx(), "create").ok, false);
    for (const bad of ["true", 1, null]) assert.equal(parseUkmInput({ ...valid, showContact: bad }, ctx(), "create").ok, false, String(bad));
  });

  it("menampilkan kontak butuh nomor; menghapus nomor menyembunyikannya", () => {
    const none = { phone: null, visible: false };
    assert.equal(resolveUkmContact(none, { showContact: true }).ok, false);
    assert.equal(resolveUkmContact(none, { contactPhone: null, showContact: true }).ok, false);
    assert.deepEqual(resolveUkmContact(none, { contactPhone: "08123456789", showContact: true }), { ok: true, phone: "08123456789", visible: true, changed: true });
    // nomor tersimpan, pemilik hanya mengubah pilihan tampil
    const saved = { phone: "08123456789", visible: true };
    assert.deepEqual(resolveUkmContact(saved, { showContact: false }), { ok: true, phone: "08123456789", visible: false, changed: true });
    // menghapus nomor otomatis mematikan tampil
    assert.deepEqual(resolveUkmContact(saved, { contactPhone: null }), { ok: true, phone: null, visible: false, changed: true });
    // tidak mengirim apa pun = tidak berubah
    assert.deepEqual(resolveUkmContact(saved, {}), { ok: true, phone: "08123456789", visible: true, changed: false });
  });

  it("detail: nomor hanya keluar ke orang lain bila pemilik memilih tampil DAN produk tayang", () => {
    const hidden = toUkmDetail(row(), 99);
    assert.deepEqual([hidden.contactPhone, hidden.showContact], [null, false]);
    const shown = toUkmDetail(row({ contactVisible: true }), 99);
    assert.deepEqual([shown.contactPhone, shown.showContact], ["081234567890", false], "bukan pemilik: showContact tidak dibocorkan");
    for (const status of ["pending", "hidden", "inactive"]) {
      assert.equal(toUkmDetail(row({ contactVisible: true, status }), 99).contactPhone, null, status);
    }
    assert.equal(toUkmDetail(row({ contactVisible: true, contactPhone: null }), 99).contactPhone, null);
  });

  it("pemilik selalu melihat nomornya sendiri beserta pilihannya", () => {
    const off = toUkmDetail(row({ status: "pending" }), 5);
    assert.deepEqual([off.contactPhone, off.showContact], ["081234567890", false]);
    const on = toUkmDetail(row({ contactVisible: true }), 5);
    assert.deepEqual([on.contactPhone, on.showContact], ["081234567890", true]);
    assert.equal(toUkmDetail(row({ contactVisible: true, contactPhone: null }), 5).showContact, false);
  });

  it("daftar katalog tidak pernah memuat kontak", () => {
    const i = toUkmListItem(row({ contactVisible: true }), 99) as Record<string, unknown>;
    assert.equal("contactPhone" in i || "showContact" in i, false);
  });
});

describe("kursor & kategori", () => {
  it("kursor hanya bilangan bulat positif; sisanya diabaikan", () => {
    assert.equal(parseUkmCursor("123"), 123);
    for (const bad of [null, undefined, "", "0", "-5", "1e3", "abc", "12345678901", "1 OR 1=1"]) assert.equal(parseUkmCursor(bad), null, String(bad));
  });

  it("kategori unik, terurut, tanpa nilai kosong", () => {
    assert.deepEqual(uniqueCategories(["Makanan", null, "  ", "Kerajinan", "Makanan ", undefined]), ["Kerajinan", "Makanan"]);
  });
});
