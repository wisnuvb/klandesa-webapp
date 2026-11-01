import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFundingRequest } from "../lib/apbdes/funding";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

const base = { activityCode: "2.3.01", accountCode: "5.2.1.01", amount: "600000" };

describe("Pengajuan SPP dari modul: masukan", () => {
  it("BLT dan PKTD (swakelola) wajib menyebut Kaur/Kasi penerima panjar; KDMP (penyedia) wajib menyebut penerima pembayaran", () => {
    for (const kind of ["BLT", "PKTD"] as const) {
      assert.equal(parseFundingRequest(kind, base).ok, false, kind);
      const ok = parseFundingRequest(kind, { ...base, executorName: " Kaur Pembangunan " });
      assert.ok(ok.ok && ok.value.executorName === "Kaur Pembangunan" && ok.value.amountCents === 60_000_000n, kind);
    }
    assert.equal(parseFundingRequest("KDMP", base).ok, false);
    const k = parseFundingRequest("KDMP", { ...base, payee: "PT Pembangun", hasReceipt: true });
    assert.ok(k.ok && k.value.payee === "PT Pembangun" && k.value.hasReceipt === true);
  });

  it("kegiatan, rekening belanja, dan jumlah divalidasi; kesalahan dilaporkan per kolom", () => {
    const e = (o: Record<string, unknown>) => parseFundingRequest("BLT", { ...base, executorName: "K", ...o });
    for (const activityCode of ["9.9.99", "", null]) assert.equal(e({ activityCode }).ok, false, String(activityCode));
    for (const accountCode of ["4.2.1.01", "6.2.1.01", "5.2", "x"]) assert.equal(e({ accountCode }).ok, false, accountCode);
    for (const amount of ["0", "-5", "abc", "", null, "100000000000000"]) assert.equal(e({ amount }).ok, false, String(amount));
    const r = parseFundingRequest("BLT", { activityCode: "x", accountCode: "x", amount: "x" });
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.fieldErrors).sort(), ["accountCode", "activityCode", "amount", "executorName"]);
    assert.equal(parseFundingRequest("BLT", null).ok, false);
    assert.equal(parseFundingRequest("BLT", { ...base, executorName: "x".repeat(151) }).ok, false);
  });

  it("KDMP (penyedia) wajib melampirkan bukti penerimaan: hasReceipt harus persis true, ditegakkan server (Pasal 55)", () => {
    for (const hasReceipt of ["true", 1, "ya", false, undefined, null]) {
      const r = parseFundingRequest("KDMP", { ...base, payee: "PT", hasReceipt });
      assert.ok(!r.ok && r.fieldErrors.hasReceipt, String(hasReceipt));
    }
    assert.ok(parseFundingRequest("KDMP", { ...base, payee: "PT", hasReceipt: true }).ok);
    assert.ok(parseFundingRequest("BLT", { ...base, executorName: "K" }).ok, "swakelola tidak memakai bukti penyedia");
  });
});

describe("Pengajuan SPP dari modul: izin rute", () => {
  const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
    const r = resolveApiPermission(path, method);
    assert.ok(r, `${method} ${path} harus terpetakan`);
    return roleCan(r.resource, r.action, role);
  };

  it("rute pengajuan terpetakan; Kepala Desa tidak dapat mengajukan (ia menyetujui di modul APBDes)", () => {
    for (const p of ["/api/blt/3/spp", "/api/pktd/3/spp", "/api/kdmp/spp"]) {
      assert.equal(gate(p, "POST", "village_head"), false, p);
      assert.equal(gate(p, "POST", "secretary"), true, p);
    }
    assert.equal(roleCan("apbdes", "create", "village_head"), false);
    assert.equal(roleCan("apbdes", "create", "staff"), true);
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate("/api/apbdes/opsi-belanja", "GET", role), true, role);
  });
});
