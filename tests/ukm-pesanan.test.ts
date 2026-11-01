/** Pesanan sederhana produk UKM: aturan status, tautan WhatsApp/kontak, validasi isian. Tanpa DB. */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowedActions, activeKeyOf, orderMessage, stockProblem, totalRupiah, transition, waDigits, whatsappUrl } from "../lib/ukm-order/calc";
import { ACTIONS, OPEN_STATUSES, STATUS_KEYS, isOpen, type ActorKind, type OrderAction } from "../lib/ukm-order/catalog";
import { parseActionInput, parseOrderInput } from "../lib/ukm-order/schema";
import { statusNotice } from "../lib/ukm-order/notify";

const ACTORS: ActorKind[] = ["PEMBELI", "PENJUAL", "ADMIN"];
const ACTS = Object.keys(ACTIONS) as OrderAction[];

describe("Pesanan UKM: mesin status", () => {
  it("tabel transisi lengkap (aktor x status x aksi)", () => {
    const to = (a: ActorKind, from: string, act: OrderAction) => {
      const t = transition(a, from, act);
      return "error" in t ? null : t.to;
    };
    // pembeli
    assert.equal(to("PEMBELI", "DIMINTA", "batal"), "DIBATALKAN");
    assert.equal(to("PEMBELI", "DIKONFIRMASI", "batal"), null, "sesudah dikonfirmasi, pembeli tak bisa batal sendiri");
    assert.equal(to("PEMBELI", "DIMINTA", "konfirmasi"), null);
    assert.equal(to("PEMBELI", "DIKONFIRMASI", "selesai"), null);
    // penjual dan admin
    for (const a of ["PENJUAL", "ADMIN"] as const) {
      assert.equal(to(a, "DIMINTA", "konfirmasi"), "DIKONFIRMASI");
      assert.equal(to(a, "DIMINTA", "selesai"), null, "tak boleh melompat ke selesai");
      assert.equal(to(a, "DIKONFIRMASI", "selesai"), "SELESAI");
      assert.equal(to(a, "DIKONFIRMASI", "konfirmasi"), null);
      assert.equal(to(a, "DIMINTA", "batal"), "DIBATALKAN");
      assert.equal(to(a, "DIKONFIRMASI", "batal"), "DIBATALKAN");
    }
  });
  it("status tertutup tidak dapat diubah oleh siapa pun", () => {
    for (const a of ACTORS) for (const from of ["SELESAI", "DIBATALKAN", "ASAL", ""]) for (const act of ACTS) assert.ok("error" in transition(a, from, act), `${a} ${from} ${act}`);
    for (const a of ACTORS) assert.deepEqual(allowedActions(a, "SELESAI"), []);
  });
  it("pembatalan oleh penjual/admin wajib beralasan; oleh pembeli tidak", () => {
    const t = (a: ActorKind) => transition(a, "DIMINTA", "batal");
    assert.deepEqual(t("PEMBELI"), { to: "DIBATALKAN", noteRequired: false });
    assert.deepEqual(t("PENJUAL"), { to: "DIBATALKAN", noteRequired: true });
    assert.deepEqual(t("ADMIN"), { to: "DIBATALKAN", noteRequired: true });
  });
  it("aksi yang tampil sebagai tombol sesuai peran dan status", () => {
    assert.deepEqual(allowedActions("PEMBELI", "DIMINTA"), ["batal"]);
    assert.deepEqual(allowedActions("PEMBELI", "DIKONFIRMASI"), []);
    assert.deepEqual(allowedActions("PENJUAL", "DIMINTA"), ["konfirmasi", "batal"]);
    assert.deepEqual(allowedActions("ADMIN", "DIKONFIRMASI"), ["selesai", "batal"]);
  });
  it("kunci satu-pesanan-terbuka hanya untuk status terbuka", () => {
    assert.deepEqual([...OPEN_STATUSES], ["DIMINTA", "DIKONFIRMASI"]);
    assert.equal(activeKeyOf("DIMINTA", 5, 9), "5:9");
    assert.equal(activeKeyOf("DIKONFIRMASI", 5, 9), "5:9");
    assert.equal(activeKeyOf("SELESAI", 5, 9), null);
    assert.equal(activeKeyOf("DIBATALKAN", 5, 9), null);
    assert.equal(activeKeyOf("DIMINTA", null, 9), null);
    assert.ok(STATUS_KEYS.every((s) => isOpen(s) === OPEN_STATUSES.includes(s)));
  });
});

describe("Pesanan UKM: kontak dan WhatsApp", () => {
  const base = { contactPhone: "0812-3456-7890", contactVisible: true, productStatus: "active", text: "Halo & pesan #1" };
  it("normalisasi nomor: 08 menjadi 62, 62 dipertahankan, tanda baca dibuang", () => {
    assert.equal(waDigits("081234567890"), "6281234567890");
    assert.equal(waDigits("+62 812-3456-7890"), "6281234567890");
    assert.equal(waDigits("(0812) 3456.7890"), "6281234567890");
  });
  it("nomor tak masuk akal ditolak", () => {
    for (const bad of [null, undefined, "", "abc", "1234567", "1234567890123456"]) assert.equal(waDigits(bad as never), null, String(bad));
  });
  it("tautan keluar hanya bila kontak diizinkan DAN produk tayang", () => {
    const url = whatsappUrl(base);
    assert.ok(url?.startsWith("https://wa.me/6281234567890?text="));
    assert.ok(url?.includes(encodeURIComponent("Halo & pesan #1")));
    assert.equal(whatsappUrl({ ...base, contactVisible: false }), null);
    for (const productStatus of ["hidden", "pending", "inactive", "potential", ""]) assert.equal(whatsappUrl({ ...base, productStatus }), null, productStatus);
    assert.equal(whatsappUrl({ ...base, contactPhone: null }), null);
    assert.equal(whatsappUrl({ ...base, contactPhone: "xx" }), null);
  });
  it("isi pesan memuat kode pesanan, produk, jumlah, dan catatan; panjangnya dibatasi", () => {
    const m = orderMessage({ orderId: 42, buyerName: "Budi S.", productName: "Keripik", quantity: 3, unit: "bungkus", village: "Desa Bedahan", note: "Pedas" });
    assert.ok(m.includes("#42") && m.includes("3 bungkus Keripik") && m.includes("Pedas") && m.includes("Desa Bedahan"));
    assert.ok(orderMessage({ orderId: 1, buyerName: "x", productName: "p".repeat(5000), quantity: 1, unit: null, village: "d", note: null }).length <= 900);
  });
});

describe("Pesanan UKM: stok, harga, validasi", () => {
  it("stok tidak dilacak (null) selalu cukup; nol = habis; melebihi stok ditolak", () => {
    assert.equal(stockProblem(null, 500), null);
    assert.ok(stockProblem(0, 1));
    assert.ok(stockProblem(3, 4));
    assert.equal(stockProblem(3, 3), null);
  });
  it("perkiraan total dihitung dalam sen lalu ke rupiah", () => {
    assert.equal(totalRupiah(1_500_000n, 3), "45000");
    assert.equal(totalRupiah(null, 3), null);
  });
  it("jumlah: bulat 1-999; bawaan 1; angka aneh ditolak", () => {
    const q = (v: unknown) => parseOrderInput({ quantity: v });
    assert.ok(q(1).ok && q("5").ok && q(999).ok && q(undefined).ok && q("").ok);
    for (const bad of [0, -1, 1000, 1.5, "abc", "1e2", "0x10", NaN, Infinity, [], {}, true, "99999"]) assert.ok(!q(bad).ok, String(bad));
    const r = parseOrderInput({});
    assert.ok(r.ok && r.value.quantity === 1);
  });
  it("catatan: dirapikan dan dibatasi 300 karakter; bukan teks ditolak", () => {
    const ok = parseOrderInput({ quantity: 1, note: "  Pedas   sekali  " });
    assert.ok(ok.ok && ok.value.note === "Pedas sekali");
    assert.ok(!parseOrderInput({ quantity: 1, note: "x".repeat(301) }).ok);
    assert.ok(!parseOrderInput({ quantity: 1, note: 123 }).ok);
    assert.ok(!parseOrderInput(null).ok);
    assert.ok(!parseOrderInput("x").ok);
    assert.ok(!parseOrderInput([]).ok);
  });
  it("aksi: hanya tiga aksi sah", () => {
    assert.ok(parseActionInput({ action: "konfirmasi" }).ok);
    for (const action of ["hapus", "", null, 1, "KONFIRMASI", "__proto__"]) assert.ok(!parseActionInput({ action }).ok, String(action));
    assert.ok(!parseActionInput({ action: "batal", note: "x".repeat(301) }).ok);
    assert.ok(!parseActionInput(null).ok);
  });
  it("pemberitahuan status memuat nama produk dan catatan", () => {
    assert.ok(statusNotice("DIKONFIRMASI", "Keripik", null).body.includes("Keripik"));
    assert.ok(statusNotice("DIBATALKAN", "Keripik", "stok habis").body.includes("stok habis"));
    assert.equal(statusNotice("SELESAI", "Keripik", null).title, "Pesanan selesai");
  });
});
