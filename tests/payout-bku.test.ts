import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePayoutChoice } from "../lib/apbdes/payout";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

const ok = { activityCode: "1.1.04", accountCode: "5.2.1.01", channel: "BANK", voucherNo: "BKU-1" };

describe("Pencatatan pembayaran ke BKU: masukan", () => {
  it("pilihan sah diterima dan nomor bukti dipangkas", () => {
    const r = parsePayoutChoice({ ...ok, voucherNo: "  BKU-9  " });
    assert.ok(r.ok && r.value.voucherNo === "BKU-9" && r.value.channel === "BANK");
  });

  it("kegiatan tak dikenal, rekening bukan belanja, kas tak dikenal, dan nomor bukti kosong/terlalu panjang ditolak", () => {
    assert.equal(parsePayoutChoice({ ...ok, activityCode: "9.9.99" }).ok, false);
    assert.equal(parsePayoutChoice({ ...ok, activityCode: "" }).ok, false);
    for (const accountCode of ["4.2.1.01", "6.2.1.01", "5.2", "x", ""]) assert.equal(parsePayoutChoice({ ...ok, accountCode }).ok, false, accountCode);
    for (const channel of ["CEK", "", null, 1]) assert.equal(parsePayoutChoice({ ...ok, channel }).ok, false, String(channel));
    assert.equal(parsePayoutChoice({ ...ok, voucherNo: "  " }).ok, false);
    assert.equal(parsePayoutChoice({ ...ok, voucherNo: "x".repeat(61) }).ok, false);
    assert.equal(parsePayoutChoice(null).ok, false);
    assert.equal(parsePayoutChoice([]).ok, false);
  });

  it("kesalahan dilaporkan per kolom agar tampil di bawah isian yang bersangkutan", () => {
    const r = parsePayoutChoice({ activityCode: "x", accountCode: "x", channel: "x", voucherNo: "" });
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.fieldErrors).sort(), ["accountCode", "activityCode", "channel", "voucherNo"]);
  });
});

describe("Pencatatan pembayaran ke BKU: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    return roleCan(r.resource, r.action, role);
  };

  it("semua rute tautan terpetakan; Kepala Desa tidak dapat mencatat; hanya yang berhak hapus dapat membatalkan", () => {
    for (const p of ["/api/kdmp/angsuran/3/bku", "/api/pktd/3/bku", "/api/blt/3/bku"]) {
      assert.equal(gate(p, "POST", "village_head"), false, `POST ${p} village_head`);
      assert.equal(gate(p, "POST", "secretary"), true, `POST ${p} secretary`);
      assert.equal(gate(p, "DELETE", "village_head"), false, `DELETE ${p} village_head`);
      assert.equal(gate(p, "DELETE", "admin"), true, `DELETE ${p} admin`);
    }
  });

  it("pilihan belanja boleh dibaca semua peran; pencatatan butuh izin keuangan (apbdes) yang diperiksa lagi di dalam rute", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/apbdes/opsi-belanja", "GET", role), true, role);
    assert.equal(roleCan("apbdes", "create", "village_head"), false);
    assert.equal(roleCan("apbdes", "delete", "village_head"), false);
    assert.equal(roleCan("apbdes", "create", "staff"), true);
  });
});
