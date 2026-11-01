import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";

const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
  const r = resolveApiPermission(path, method)!;
  return roleCan(r.resource, r.action, role);
};

describe("izin rute Perencanaan: Kepala Desa menyetujui, bukan hanya membaca", () => {
  it("persetujuan rancangan RKP Desa: hanya admin dan Kepala Desa (regresi: Kepala Desa dulu ditolak 403 karena POST dipetakan 'create')", () => {
    const p = "/api/perencanaan/rkpdes/12/persetujuan";
    assert.equal(gate(p, "POST", "village_head"), true);
    assert.equal(gate(p, "POST", "admin"), true);
    assert.equal(gate(p, "POST", "secretary"), false);
    assert.equal(gate(p, "POST", "staff"), false);
  });

  it("aksi musyawarah: gerbang kasar boleh bagi semua pembaca; pembedaan update/approve dilakukan di dalam rute", () => {
    const p = "/api/musdes/7/aksi";
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) assert.equal(gate(p, "POST", role), true, role);
  });

  it("rute lain tetap mengikuti metode HTTP: Kepala Desa tidak bisa membuat atau mengubah dokumen", () => {
    assert.equal(gate("/api/perencanaan/rkpdes", "POST", "village_head"), false);
    assert.equal(gate("/api/perencanaan/rkpdes/12", "PATCH", "village_head"), false);
    assert.equal(gate("/api/musdes/7/peserta", "POST", "village_head"), false);
    assert.equal(gate("/api/perencanaan/rkpdes/12", "GET", "village_head"), true);
  });

  it("pengecualian larangan Dana Desa: approve saja (Kepala Desa dan admin)", () => {
    for (const m of ["POST", "DELETE"]) {
      assert.equal(gate("/api/dana-desa/pengecualian", m, "village_head"), true);
      assert.equal(gate("/api/dana-desa/pengecualian", m, "secretary"), false);
      assert.equal(gate("/api/dana-desa/pengecualian", m, "staff"), false);
    }
  });
});
