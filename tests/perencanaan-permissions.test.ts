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

import { normalizeApiPath, resolveApiPermission as resolveEncoded } from "../lib/permissions/api-route-map";

it("alamat ter-encode atau berbelit tidak melewati aturan khusus (approve tetap approve)", () => {
  const normal = resolveEncoded("/api/kerja-sama/12/penandatanganan", "POST");
  assert.equal(normal?.action, "approve");
  for (const p of ["/api/kerja-sama/%31%32/penandatanganan", "/api/kerja-sama//12/penandatanganan", "/api/kerja-sama/12/penandatanganan/"]) {
    assert.deepEqual(resolveEncoded(p, "POST"), normal, p);
  }
  assert.equal(normalizeApiPath("/api/%E0%A4%A"), "/api/%E0%A4%A", "encoding rusak dibiarkan");
});

it("garis miring ter-encode tidak bisa memindahkan alamat keluar dari awalan yang dijaga (tidak jadi 'dikecualikan')", () => {
  // Kepala Desa tak punya delete pada residents; handler lama memakai parseInt("5/../../public/x") = 5.
  const direct = resolveEncoded("/api/residents/5", "DELETE");
  assert.equal(direct?.action, "delete");
  for (const p of ["/api/residents/5%2F..%2F..%2Fpublic%2Fx", "/api/residents/5%2f..%2f..%2fauth%2fx", "/api/residents/5%5C..%5Cadmin", "/api/residents/5%2F%2e%2e%2Fadmin"]) {
    const r = resolveEncoded(p, "DELETE");
    assert.notEqual(r, null, p);
    assert.equal(r?.resource, "residents", p);
    assert.equal(r?.action, "delete", p);
  }
  assert.equal(normalizeApiPath("/api/x/%2e%2e/b"), "/api/x/../b", "'..' tidak pernah diselesaikan");
  assert.equal(normalizeApiPath("/api/a%2Fb"), "/api/a%2Fb", "garis miring hasil dekode tetap satu segmen");
});
