import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Tes statis: mencegah rute API baru (atau handler baru di rute lama) lolos tanpa guard.
 * Bug asalnya: `residents/[id]` hanya memeriksa sesi + villageId, sehingga peran baca-saja bisa menghapus warga.
 */
const API_DIR = join(process.cwd(), "app", "api");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return name === "route.ts" ? [p] : [];
  });
}

const rel = (p: string) => relative(process.cwd(), p).split(sep).join("/");

// Guard yang dikenal per lane (lihat docs/api-lanes.md). Mobile punya lane bearer sendiri dan dites terpisah.
const GUARDS = [
  "requireVillageApiContext",
  "resolveFinanceWriteVillage",
  "requirePlatformSession",
  "requireRegionalApi",
  "loadCoopApiContext",
  "requireBumdesManage",
  "loadBumdesApiContext",
  "isValidCronAuth",
  "CRON_SECRET",
  "x-kiosk-key",
];

// Rute tanpa guard di atas, dengan alasan. Menambah entri di sini harus lewat tinjauan.
const UNGUARDED_ALLOWLIST: Record<string, string> = {
  "app/api/auth/[...nextauth]/route.ts": "NextAuth",
  "app/api/auth/login/route.ts": "login publik",
  "app/api/auth/register/route.ts": "pendaftaran publik",
  "app/api/partner-applications/route.ts": "formulir mitra publik",
  "app/api/referrals/track/route.ts": "pelacakan referral publik",
  "app/api/beasiswa/lpdp/route.ts": "proksi informasi publik",
  "app/api/pangan/provinsi/route.ts": "proksi harga pangan publik",
  "app/api/pangan/harga/route.ts": "proksi harga pangan publik",
  "app/api/pangan/het/route.ts": "proksi harga pangan publik",
  "app/api/pangan/kab-kota/[kode_provinsi]/route.ts": "proksi harga pangan publik",
  "app/api/wilayah/kecamatan/[kode_kab_kota]/route.ts": "referensi wilayah publik",
  "app/api/public/partner/[slug]/route.ts": "halaman mitra publik",
  "app/api/public/social-benefits/check/route.ts": "cek bantuan publik (dibatasi laju)",
  "app/api/attendance/scan/route.ts": "pindai QR absensi (tanda tangan sendiri)",
  "app/api/billing/linkqu/callback/route.ts": "callback LinkQu bertanda tangan",
  "app/api/test-session/route.ts": "alat uji sesi",
  "app/api/contacts/route.ts": "POST formulir kontak publik; GET dijaga requirePlatformSession",
  // Lane sendiri dengan pemeriksaan di dalam handler:
  "app/api/ai/credit/route.ts": "hanya membaca kredit milik sesi sendiri",
  "app/api/coop/access/route.ts": "navigasi koperasi milik sesi sendiri",
  "app/api/regional/summary/route.ts": "lane regional (getApiSession + isRegionalAccount)",
  "app/api/partner/commissions/route.ts": "lane mitra",
  "app/api/partner/commissions/summary/route.ts": "lane mitra",
  "app/api/partner/referral/route.ts": "lane mitra",
  "app/api/partner/prospects/route.ts": "lane mitra",
  "app/api/partner/disbursements/route.ts": "lane mitra",
  "app/api/partner/me/route.ts": "lane mitra",
  "app/api/partner/bank-account/route.ts": "lane mitra",
  "app/api/partner/villages/route.ts": "lane mitra",
};

const EXCLUDED = (f: string) => f.startsWith("app/api/mobile/");

const files = routeFiles(API_DIR).map(rel).filter((f) => !EXCLUDED(f));

test("setiap rute app/api memakai guard yang dikenal atau ada di daftar pengecualian", () => {
  const offenders = files.filter((f) => {
    const src = readFileSync(f, "utf8");
    return !GUARDS.some((g) => src.includes(g)) && !(f in UNGUARDED_ALLOWLIST);
  });
  assert.deepEqual(offenders, [], `Rute tanpa guard (tambahkan guard atau daftarkan alasannya):\n${offenders.join("\n")}`);
});

test("daftar pengecualian tidak berisi rute yang sudah dihapus atau sudah berguard", () => {
  const stale = Object.keys(UNGUARDED_ALLOWLIST).filter((f) => {
    if (!files.includes(f)) return true;
    const src = readFileSync(f, "utf8");
    // contacts sengaja memakai guard platform untuk GET/PATCH namun POST publik.
    return f !== "app/api/contacts/route.ts" && GUARDS.some((g) => src.includes(g));
  });
  assert.deepEqual(stale, []);
});

// Handler yang tidak memanggil guard secara langsung tetapi aman: delegasi ke handler berguard / fungsi pembungkus.
const DELEGATING_HANDLERS: Record<string, string> = {
  "app/api/ukm-products/[id]/route.ts": "PUT mendelegasikan ke PATCH yang berguard",
  "app/api/website/engine/publish/route.ts": "guard lewat loadContext() di tiap handler",
};

test("rute lane desa menjaga SETIAP handler yang diekspor (bukan hanya sebagian)", () => {
  const offenders: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (!src.includes("requireVillageApiContext") && !src.includes("resolveFinanceWriteVillage")) continue;
    const handlers = [...src.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
    const guardCalls = [...src.matchAll(/(?:await\s+)(requireVillageApiContext|resolveFinanceWriteVillage|assertBudgetVillageAccess)\(/g)].length;
    if (f in DELEGATING_HANDLERS) continue;
    if (guardCalls < handlers.length) offenders.push(`${f}: ${handlers.length} handler, ${guardCalls} panggilan guard`);
  }
  assert.deepEqual(offenders, [], offenders.join("\n"));
});

test("residents/[id] menjaga keempat metode (regresi bug hapus warga tanpa izin)", () => {
  const src = readFileSync("app/api/residents/[id]/route.ts", "utf8");
  assert.equal([...src.matchAll(/await requireVillageApiContext\(/g)].length, 4);
  assert.ok(!src.includes("getApiSession"));
});

// ---------------------------------------------------------------------------------------------
// Jejak audit: setiap handler tulis (POST/PUT/PATCH/DELETE) di lane desa harus memanggil `auditWeb`,
// kecuali ada alasan tertulis di bawah. Tanpa ini, perubahan data desa tak bisa ditelusuri.
// ---------------------------------------------------------------------------------------------
const AUDIT_EXEMPT: Record<string, string> = {
  "app/api/ai/actions/confirm/route.ts": "Laras (AI) dikerjakan terpisah",
  "app/api/ai/threads/[id]/route.ts": "Laras (AI): percakapan milik sendiri",
  "app/api/ai/village-assistant/route.ts": "Laras (AI) dikerjakan terpisah",
  "app/api/attendance/check-in/route.ts": "volume tinggi per pengguna; tabel Attendance sudah menjadi catatannya",
  "app/api/billing/checkout/route.ts": "tercatat di BillingInvoice/BillingPaymentEvent",
  "app/api/citizen-reports/route.ts": "isi laporan warga adalah datanya sendiri",
  "app/api/digital-archives/presign/route.ts": "hanya menerbitkan URL unggah; pencatatan di POST arsip",
  "app/api/forum-threads/route.ts": "konten pengguna",
  "app/api/forum-threads/[id]/like/route.ts": "konten pengguna",
  "app/api/forum-threads/[id]/replies/route.ts": "konten pengguna",
  "app/api/forum-threads/[id]/view/route.ts": "penghitung tayang",
  "app/api/notifications/read/route.ts": "status baca milik sendiri",
  "app/api/residents/bulk/check/route.ts": "validasi baca-saja",
  "app/api/statistics/route.ts": "DELETE hanya membersihkan cache",
};
const AUDIT_EXEMPT_PREFIX: Record<string, string> = {
  "app/api/website/": "mesin website lama dihentikan 2026-10-30 (jasa kustom); kode dibiarkan",
};
// Handler yang berbagi satu pemanggilan audit (delegasi / fungsi bantu): jumlah pemanggilan minimum yang diharapkan.
const AUDIT_SHARED: Record<string, number> = {
  "app/api/residents/[id]/route.ts": 2, // PUT & PATCH lewat auditResidentUpdate + DELETE
  "app/api/ukm-products/[id]/route.ts": 2, // PUT mendelegasikan ke PATCH
};

const VILLAGE_LANE = (f: string) => {
  const src = readFileSync(f, "utf8");
  return src.includes("requireVillageApiContext") || src.includes("resolveFinanceWriteVillage");
};

test("setiap handler tulis lane desa memanggil auditWeb atau punya pengecualian bertulis", () => {
  const offenders: string[] = [];
  for (const f of files) {
    if (!VILLAGE_LANE(f) || f in AUDIT_EXEMPT) continue;
    if (Object.keys(AUDIT_EXEMPT_PREFIX).some((p) => f.startsWith(p))) continue;
    const src = readFileSync(f, "utf8");
    const writes = [...src.matchAll(/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/g)].length;
    if (writes === 0) continue;
    const calls = [...src.matchAll(/await\s+(?:auditWeb|auditResidentUpdate)\(/g)].length;
    const needed = AUDIT_SHARED[f] ?? writes;
    if (calls < needed) offenders.push(`${f}: ${writes} handler tulis, ${calls} pemanggilan audit (butuh ${needed})`);
  }
  assert.deepEqual(offenders, [], `Handler tulis tanpa audit:\n${offenders.join("\n")}`);
});

test("pengecualian audit tidak basi (berkas masih ada dan memang tanpa audit)", () => {
  const stale = Object.keys(AUDIT_EXEMPT).filter((f) => !files.includes(f) || /await\s+auditWeb\(/.test(readFileSync(f, "utf8")));
  assert.deepEqual(stale, []);
});

test("auditWeb tidak pernah menerima isi bebas: tak ada penyebaran `body` mentah ke changes", () => {
  const offenders = files.filter((f) => /auditWeb\([^)]*(,\s*body\s*\)|,\s*\{\s*\.\.\.body\b)/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});
