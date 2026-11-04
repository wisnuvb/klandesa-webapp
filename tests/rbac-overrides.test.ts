import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  diffToOverrides,
  getAllowedActions,
  getRoleBaselineActions,
  parsePermissionOverrides,
  roleCan,
} from "../lib/permissions/client";
import { resolveApiPermission } from "../lib/permissions/api-route-map";

describe("penyesuaian izin per akun (RBAC fleksibel)", () => {
  it("tanpa penyesuaian = bawaan role (kompatibel dengan kode lama yang memberi role saja)", () => {
    assert.deepEqual(getAllowedActions("finance", "staff"), ["read"]);
    assert.equal(roleCan("finance", "create", "staff"), false);
    assert.equal(roleCan("finance", "create", { role: "staff" }), false);
    assert.equal(roleCan("finance", "create", { role: "staff", permissionOverrides: null }), false);
  });

  it("dua staf ber-role sama bisa berbeda: satu diberi tambah keuangan, satu dicabut hapus warga", () => {
    const bendahara = { role: "staff", permissionOverrides: { grant: { finance: ["create", "update"] } } };
    const operator = { role: "staff", permissionOverrides: { deny: { residents: ["delete"] } } };
    assert.equal(roleCan("finance", "create", bendahara), true);
    assert.equal(roleCan("finance", "delete", bendahara), false);
    assert.equal(roleCan("finance", "create", operator), false);
    assert.equal(roleCan("residents", "delete", bendahara), true);
    assert.equal(roleCan("residents", "delete", operator), false);
    assert.equal(roleCan("residents", "update", operator), true);
  });

  it("admin selalu penuh: penyesuaian diabaikan, tidak bisa mengunci diri", () => {
    const a = { role: "admin", permissionOverrides: { deny: { residents: ["read", "delete"], rbac: ["read"] } } };
    assert.equal(roleCan("residents", "delete", a), true);
    assert.equal(roleCan("rbac", "read", a), true);
  });

  it("rbac tidak bisa didelegasikan ke role lain lewat grant", () => {
    const sneaky = { role: "staff", permissionOverrides: { grant: { rbac: ["read", "create", "update", "delete"] } } };
    assert.equal(roleCan("rbac", "read", sneaky), false);
    assert.deepEqual(getRoleBaselineActions("rbac", "village_head"), []);
  });

  it("mencabut baca = tanpa akses sama sekali pada resource itu", () => {
    const x = { role: "staff", permissionOverrides: { deny: { residents: ["read"] } } };
    assert.deepEqual(getAllowedActions("residents", x), []);
    assert.equal(roleCan("residents", "update", x), false);
  });

  it("deny menang bila aksi sama ada di grant dan deny", () => {
    const p = parsePermissionOverrides({ grant: { finance: ["create"] }, deny: { finance: ["create"] } });
    assert.equal(p.grant, undefined);
    assert.deepEqual(p.deny, { finance: ["create"] });
  });

  it("input sampah dari DB/klien dibersihkan, tidak melempar", () => {
    assert.deepEqual(parsePermissionOverrides(null), {});
    assert.deepEqual(parsePermissionOverrides("x"), {});
    assert.deepEqual(parsePermissionOverrides([1]), {});
    const p = parsePermissionOverrides({ grant: { nonsense: ["read"], finance: ["fly", "create", "create", 5] }, deny: "no" });
    assert.deepEqual(p, { grant: { finance: ["create"] } });
  });

  it("diffToOverrides menghasilkan penyesuaian minimal relatif ke bawaan role", () => {
    const baseline = (r: Parameters<typeof getRoleBaselineActions>[0]) => getRoleBaselineActions(r, "staff");
    const o = diffToOverrides(baseline, {
      finance: ["read", "create"], // staff bawaan: read saja -> tambah create
      residents: ["read", "create", "update"], // bawaan crud -> cabut delete
      statistics: ["read"], // sama dengan bawaan -> tidak ada perubahan
    });
    assert.deepEqual(o, { grant: { finance: ["create"] }, deny: { residents: ["delete"] } });
    // Round trip: hasilnya, bila diterapkan, sama dengan yang diinginkan.
    const actor = { role: "staff", permissionOverrides: o };
    assert.deepEqual(getAllowedActions("finance", actor), ["read", "create"]);
    assert.deepEqual(getAllowedActions("residents", actor), ["read", "create", "update"]);
  });

  it("diffToOverrides: tanpa read = cabut seluruh akses; hasil kosong bila tidak ada perubahan", () => {
    const baseline = (r: Parameters<typeof getRoleBaselineActions>[0]) => getRoleBaselineActions(r, "staff");
    const o = diffToOverrides(baseline, { mail: ["create"] });
    assert.deepEqual(o.deny?.mail, ["read", "create", "update", "delete", "export"].filter((a) => getRoleBaselineActions("mail", "staff").includes(a as never)));
    assert.deepEqual(getAllowedActions("mail", { role: "staff", permissionOverrides: o }), []);
    assert.deepEqual(diffToOverrides(baseline, {}), {});
  });

  it("rute /api/rbac dipetakan ke resource rbac (admin saja)", () => {
    assert.deepEqual(resolveApiPermission("/api/rbac/users", "GET"), { resource: "rbac", action: "read" });
    assert.deepEqual(resolveApiPermission("/api/rbac/users/5", "PATCH"), { resource: "rbac", action: "update" });
    for (const role of ["village_head", "secretary", "staff"] as const) assert.equal(roleCan("rbac", "read", role), false);
  });
});

import { PERMISSION_RESOURCES } from "../lib/permissions/resources";
import { PERMISSION_CATALOG, permissionCatalogByGroup, applicableActions } from "../lib/permissions/catalog";
import { baselineDraft, cellState, countCustomized, draftFromAccount, overridesFromDraft, setAction } from "../lib/rbac/editor-model";

describe("katalog & model editor izin", () => {
  it("setiap resource (kecuali rbac) punya label di katalog dan tampil di tepat satu grup", () => {
    const expected = PERMISSION_RESOURCES.filter((r) => r !== "rbac").sort();
    assert.deepEqual(Object.keys(PERMISSION_CATALOG).sort(), expected);
    const shown = permissionCatalogByGroup().flatMap((g) => g.entries.map((e) => e.resource)).sort();
    assert.deepEqual(shown, expected);
  });

  it("aksi yang ditawarkan hanya yang dipakai matriks (tidak ada tombol palsu)", () => {
    assert.deepEqual(applicableActions("sdgs"), ["read"]);
    assert.ok(applicableActions("finance").includes("approve"));
    assert.ok(!applicableActions("website").includes("approve"));
  });

  it("mencabut Lihat mencabut semua; menambah aksi menyalakan Lihat", () => {
    let d = baselineDraft("staff");
    d = setAction(d, "residents", "read", false);
    assert.deepEqual(d.residents, []);
    d = setAction(d, "residents", "delete", true);
    assert.deepEqual(d.residents, ["read", "delete"]);
  });

  it("draf -> penyesuaian -> draf (bolak-balik) konsisten, dan penanda ditambah/dicabut benar", () => {
    let d = baselineDraft("staff");
    d = setAction(d, "finance", "create", true);
    d = setAction(d, "residents", "delete", false);
    assert.equal(cellState("staff", d, "finance", "create"), "added");
    assert.equal(cellState("staff", d, "residents", "delete"), "removed");
    assert.equal(cellState("staff", d, "residents", "read"), "on");
    assert.equal(cellState("staff", d, "billing", "create"), "off");
    const o = overridesFromDraft("staff", d);
    assert.equal(countCustomized(o), 2);
    assert.deepEqual(draftFromAccount("staff", o), d);
  });

  it("tanpa perubahan = tidak ada penyesuaian; admin tidak pernah menyimpan penyesuaian", () => {
    assert.deepEqual(overridesFromDraft("staff", baselineDraft("staff")), {});
    assert.deepEqual(overridesFromDraft("admin", setAction(baselineDraft("admin"), "residents", "read", false)), {});
  });
});
