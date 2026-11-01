import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { resolveApiPermission } from "../lib/permissions/api-route-map";
import { roleCan } from "../lib/permissions";
import { StatusPill, VerificationTag, daysText, statusView } from "../components/app/kepatuhan/shared.tsx";

const h = React.createElement;
const gate = (path: string, method: string, role: "admin" | "village_head" | "secretary" | "staff") => {
  const r = resolveApiPermission(path, method)!;
  return roleCan(r.resource, r.action, role);
};

describe("izin rute Kalender Kepatuhan", () => {
  it("semua peran desa membaca; hanya yang berwenang mencatat dan menghapus catatan; Kepala Desa hanya membaca", () => {
    for (const role of ["admin", "village_head", "secretary", "staff"] as const) {
      assert.equal(gate("/api/kepatuhan", "GET", role), true, role);
      assert.equal(gate("/api/kepatuhan/bundel", "GET", role), true, role);
    }
    for (const m of ["POST", "DELETE"]) {
      assert.equal(gate("/api/kepatuhan/catatan", m, "village_head"), false, m);
      for (const role of ["admin", "secretary", "staff"] as const) assert.equal(gate("/api/kepatuhan/catatan", m, role), true, `${m} ${role}`);
    }
  });
});

describe("cron pengingat kepatuhan", () => {
  it("menolak tanpa rahasia (503), salah (401), dan tanpa header (401) sebelum menyentuh data", async () => {
    const { POST } = await import("../app/api/cron/kepatuhan-reminders/route.ts");
    const mk = (auth?: string) => new NextRequest("http://localhost/api/cron/kepatuhan-reminders", { method: "POST", headers: auth ? { authorization: auth } : {} });
    const prev = process.env.CRON_SECRET;
    try {
      delete process.env.CRON_SECRET;
      assert.equal((await POST(mk("Bearer apa-saja"))).status, 503);
      process.env.CRON_SECRET = "rahasia-uji-123";
      assert.equal((await POST(mk())).status, 401);
      assert.equal((await POST(mk("Bearer salah"))).status, 401);
      assert.equal((await POST(mk("rahasia-uji-123"))).status, 401, "wajib awalan Bearer");
    } finally {
      if (prev === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = prev;
    }
  });
  it("rute memakai isValidCronAuth (perbandingan waktu-konstan), bukan perbandingan string langsung", () => {
    const src = readFileSync("app/api/cron/kepatuhan-reminders/route.ts", "utf8");
    assert.match(src, /isValidCronAuth\(/);
    assert.doesNotMatch(src, /===\s*`Bearer/);
  });
});

describe("rute regional kepatuhan", () => {
  it("memakai requireRegionalApi dan hanya membaca desa dari lingkup akun", () => {
    for (const f of ["app/api/regional/kepatuhan/route.ts", "app/api/regional/kepatuhan/katalog/route.ts"]) {
      const src = readFileSync(f, "utf8");
      assert.match(src, /requireRegionalApi\(/, f);
      assert.doesNotMatch(src, /searchParams\.get\("(regency|province|villageId|district)"\)/, `${f}: wilayah tak boleh dari query`);
    }
    const recap = readFileSync("app/api/regional/kepatuhan/route.ts", "utf8");
    assert.match(recap, /villageIds/);
    const cat = readFileSync("app/api/regional/kepatuhan/katalog/route.ts", "utf8");
    assert.equal([...cat.matchAll(/writableScope\(/g)].length >= 1, true);
    // PUT dan DELETE harus memeriksa lingkup tulis sebelum menyimpan/menghapus
    assert.equal([...cat.matchAll(/if \(!w\.ok\) return NextResponse\.json/g)].length, 2);
  });
  it("rute admin platform memakai requirePlatformSession di setiap handler", () => {
    const src = readFileSync("app/api/admin/kepatuhan/katalog/route.ts", "utf8");
    assert.equal([...src.matchAll(/await requirePlatformSession\(/g)].length, 3);
  });
});

describe("lencana status (render server)", () => {
  it("selalu berteks dan berikon dekoratif tersembunyi dari pembaca layar", () => {
    const html = renderToStaticMarkup(h(StatusPill, { status: "TERLAMBAT" }));
    assert.match(html, />Terlambat</);
    assert.match(html, /aria-hidden="true"/);
  });
  it("label menyesuaikan jenis penyelesaian dan keterlambatan pengiriman", () => {
    assert.equal(statusView("TERKIRIM", { doneLabel: "Ditetapkan" }).label, "Ditetapkan");
    assert.equal(statusView("TERKIRIM", { late: true }).label, "Terkirim, lewat tenggat");
    assert.equal(statusView("BELUM", { soon: true }).label, "Belum, segera jatuh tempo");
    assert.equal(statusView("DRAF", {}).label, "Draf");
  });
  it("label verifikasi dan teks sisa hari", () => {
    assert.match(renderToStaticMarkup(h(VerificationTag, { v: "R" })), /belum diverifikasi/);
    assert.match(renderToStaticMarkup(h(VerificationTag, { v: "V" })), /teks resmi/);
    assert.equal(daysText(-3), "lewat 3 hari");
    assert.equal(daysText(0), "hari ini");
    assert.equal(daysText(5), "5 hari lagi");
    assert.equal(daysText(null), "");
  });
});
