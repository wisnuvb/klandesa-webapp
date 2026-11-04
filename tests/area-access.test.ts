import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Session } from "next-auth";
import { resolveAreaRedirect, signInUrl } from "../lib/auth/area-redirect.ts";
import { decideVillagePageAccess } from "../lib/permissions/page-access.ts";
import { REGIONAL_ROLE_KABUPATEN } from "../lib/regional-policy.ts";

const sess = (user: Record<string, unknown>) => ({ user, expires: "2099-01-01" }) as unknown as Session;
const village = sess({ id: "12", accountType: "village", role: "admin" });
const villageWithPartner = sess({ id: "12", accountType: "village", role: "admin", partnerId: 5 });
const regional = sess({ id: "rg:3", accountType: "regional", role: REGIONAL_ROLE_KABUPATEN, regionalScope: { level: "REGENCY", regency: "Kab. Uji" } });
const partner = sess({ id: "pt:4", accountType: "partner" });
const platform = sess({ id: "pl:1", accountType: "platform" });

describe("resolveAreaRedirect (aturan area per jenis akun, dulu di layout server)", () => {
  it("akun desa: boleh di aplikasi desa, dilempar dari /wilayah dan /admin", () => {
    assert.equal(resolveAreaRedirect(village, "/dashboard"), null);
    assert.equal(resolveAreaRedirect(village, "/data-warga"), null);
    assert.equal(resolveAreaRedirect(village, "/wilayah"), "/dashboard");
    assert.equal(resolveAreaRedirect(village, "/wilayah/desa/1"), "/dashboard");
    assert.equal(resolveAreaRedirect(village, "/admin"), "/dashboard");
    assert.equal(resolveAreaRedirect(village, "/admin/blog"), "/dashboard");
  });

  it("/mitra hanya untuk akun desa yang punya mitra tertaut", () => {
    assert.equal(resolveAreaRedirect(village, "/mitra"), "/dashboard");
    assert.equal(resolveAreaRedirect(villageWithPartner, "/mitra/komisi"), null);
  });

  it("akun regional hanya di /wilayah", () => {
    assert.equal(resolveAreaRedirect(regional, "/wilayah"), null);
    assert.equal(resolveAreaRedirect(regional, "/wilayah/statistik"), null);
    assert.equal(resolveAreaRedirect(regional, "/dashboard"), "/wilayah");
    assert.equal(resolveAreaRedirect(regional, "/admin"), "/wilayah");
    assert.equal(resolveAreaRedirect(regional, "/mitra"), "/wilayah");
  });

  it("akun mitra hanya di /mitra", () => {
    assert.equal(resolveAreaRedirect(partner, "/mitra"), null);
    assert.equal(resolveAreaRedirect(partner, "/dashboard"), "/mitra");
    assert.equal(resolveAreaRedirect(partner, "/admin"), "/mitra");
    assert.equal(resolveAreaRedirect(partner, "/wilayah"), "/mitra");
  });

  it("akun platform hanya di /admin", () => {
    assert.equal(resolveAreaRedirect(platform, "/admin"), null);
    assert.equal(resolveAreaRedirect(platform, "/admin/blog/3"), null);
    assert.equal(resolveAreaRedirect(platform, "/dashboard"), "/admin");
    assert.equal(resolveAreaRedirect(platform, "/wilayah"), "/admin");
  });

  it("signInUrl: callbackUrl selalu path internal (tidak bisa jadi open redirect)", () => {
    assert.equal(signInUrl("/keuangan"), "/auth/signin?callbackUrl=%2Fkeuangan");
    assert.equal(signInUrl("//evil.com"), "/auth/signin?callbackUrl=%2Fevil.com");
    assert.equal(signInUrl("keuangan"), "/auth/signin?callbackUrl=%2Fkeuangan");
  });
});

describe("decideVillagePageAccess (penjaga halaman server yang membaca DB langsung)", () => {
  const admin = { role: "admin", permissionOverrides: null, isActive: true };

  it("tanpa sesi -> halaman masuk dengan callbackUrl", () => {
    const d = decideVillagePageAccess({ session: null, actor: null, segment: "arsip" });
    assert.deepEqual(d, { ok: false, redirectTo: "/auth/signin?callbackUrl=%2Farsip" });
  });

  it("akun non-desa tidak pernah membuka halaman desa (dialihkan ke areanya)", () => {
    assert.deepEqual(decideVillagePageAccess({ session: regional, actor: null, segment: "arsip" }), { ok: false, redirectTo: "/wilayah" });
    assert.deepEqual(decideVillagePageAccess({ session: platform, actor: null, segment: "ukm" }), { ok: false, redirectTo: "/admin" });
    assert.deepEqual(decideVillagePageAccess({ session: partner, actor: null, segment: "galeri-desa" }), { ok: false, redirectTo: "/mitra" });
  });

  it("JWT masih berlaku tetapi akun hilang/nonaktif di DB -> ditolak (tidak membaca data)", () => {
    assert.equal(decideVillagePageAccess({ session: village, actor: null, segment: "arsip" }).ok, false);
    assert.equal(decideVillagePageAccess({ session: village, actor: { ...admin, isActive: false }, segment: "arsip" }).ok, false);
  });

  it("admin boleh membuka ketiga halaman data", () => {
    for (const seg of ["arsip", "galeri-desa", "ukm"]) {
      assert.deepEqual(decideVillagePageAccess({ session: village, actor: admin, segment: seg }), { ok: true });
    }
  });

  it("izin dicabut lewat penyesuaian per akun (deny) -> dialihkan ke beranda dengan penanda akses ditolak", () => {
    // Catatan: role admin selalu memakai matriks penuh (penyesuaian diabaikan), jadi uji dengan staf.
    const denied = { role: "staff", permissionOverrides: { deny: { ukm: ["read"] } }, isActive: true };
    assert.deepEqual(decideVillagePageAccess({ session: village, actor: denied, segment: "ukm" }), { ok: false, redirectTo: "/dashboard?akses=ditolak" });
    // modul lain tidak ikut tertutup
    assert.deepEqual(decideVillagePageAccess({ session: village, actor: denied, segment: "arsip" }), { ok: true });
  });

  it("admin tidak bisa dikunci lewat penyesuaian (selaras matriks izin)", () => {
    const adminDenied = { role: "admin", permissionOverrides: { deny: { ukm: ["read"] } }, isActive: true };
    assert.deepEqual(decideVillagePageAccess({ session: village, actor: adminDenied, segment: "ukm" }), { ok: true });
  });

  it("peran tanpa izin lihat modul -> ditolak, walau sesinya sah (staf tidak boleh membuka Akses Pengguna)", () => {
    const staff = { role: "staff", permissionOverrides: null, isActive: true };
    assert.deepEqual(decideVillagePageAccess({ session: village, actor: staff, segment: "akses-pengguna" }), { ok: false, redirectTo: "/dashboard?akses=ditolak" });
  });
});
