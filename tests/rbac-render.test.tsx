import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PermissionMatrix } from "../app/(app)/akses-pengguna/_components/PermissionMatrix.tsx";
import { AccountList } from "../app/(app)/akses-pengguna/_components/AccountList.tsx";
import { baselineDraft, setAction } from "../lib/rbac/editor-model.ts";

const h = React.createElement;

describe("editor izin (render server)", () => {
  it("tanpa penyesuaian semua grup tertutup (daftar ringkas); mencari membuka grup yang cocok", () => {
    const html = renderToStaticMarkup(h(PermissionMatrix, { role: "staff", draft: baselineDraft("staff"), onToggle: () => {} }));
    assert.ok(!html.includes('id="perm-'), "isi grup belum dirender saat tertutup");
    assert.match(html, /aria-expanded="false"/);
  });

  it("grup yang berbeda dari bawaan terbuka; penanda ditambah/dicabut punya teks untuk pembaca layar, bukan warna saja", () => {
    let d = baselineDraft("staff");
    d = setAction(d, "finance", "create", true);
    d = setAction(d, "residents", "delete", false);
    const html = renderToStaticMarkup(h(PermissionMatrix, { role: "staff", draft: d, onToggle: () => {} }));
    assert.match(html, /tambahan dari bawaan peran/);
    assert.match(html, /dicabut dari bawaan peran/);
    assert.match(html, /Keuangan \(transaksi\)/);
    assert.match(html, /Data warga &amp; KK/);
    assert.match(html, /2 disesuaikan|1 disesuaikan/);
    // Setiap kotak punya label yang terhubung (id <-> for).
    const ids = [...html.matchAll(/id="(perm-[a-z_]+-[a-z]+)"/g)].map((m) => m[1]);
    assert.ok(ids.length > 10);
    for (const id of ids) assert.ok(html.includes(`for="${id}"`), id);
    assert.equal(new Set(ids).size, ids.length, "id kotak harus unik");
  });

  it("mode terkunci menonaktifkan semua kotak (akun sendiri)", () => {
    const d = setAction(baselineDraft("staff"), "finance", "create", true); // membuka grup keuangan
    const html = renderToStaticMarkup(h(PermissionMatrix, { role: "staff", draft: d, disabled: true, onToggle: () => {} }));
    assert.match(html, /<fieldset[^>]*disabled/);
    assert.ok(!/<fieldset(?![^>]*disabled)/.test(html), "semua fieldset harus disabled");
  });

  it("daftar akun: status memakai ikon+teks, tombol punya nama aksesibel, kosong ditangani", () => {
    const u = { id: 1, name: "Budi", email: "b@a.id", phone: null, role: "staff", roleKnown: true, roleLabel: "Staf Desa", isActive: false, lastLogin: null, createdAt: "2026-11-01T00:00:00Z", overrides: { grant: { finance: ["create"] } }, official: { id: 3, name: "Budi", status: "active", positionName: "Kaur Keuangan" }, isSelf: false };
    const html = renderToStaticMarkup(h(AccountList, { users: [u as never], onEdit: () => {} }));
    assert.match(html, /Nonaktif/);
    assert.match(html, /1 modul disesuaikan/);
    assert.match(html, /aria-label="Atur akses Budi"/);
    assert.match(html, /Belum pernah masuk/);
    assert.match(renderToStaticMarkup(h(AccountList, { users: [], onEdit: () => {} })), /Belum ada akun/);
  });
});
