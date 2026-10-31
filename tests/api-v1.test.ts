import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { API_SCOPES } from "../lib/api-keys/scopes.ts";
import { ageYears, maskDigits, maskKk, maskNik } from "../lib/api-v1/mask.ts";
import { decodeCursor, encodeCursor, parsePaging, slicePage, MAX_LIMIT } from "../lib/api-v1/page.ts";
import { ageBuckets, householdView, memberView, officialView, residentStatusWhere, residentView, RESIDENT_SELECT } from "../lib/api-v1/views.ts";
import { buildLlmsTxt, buildOpenApi, ENDPOINTS, SCHEMAS } from "../lib/api-v1/spec.ts";

const NOW = new Date("2026-10-31T00:00:00Z");

test("penyamaran: sisakan 4 digit terakhir; kosong → null; pendek tetap tersamar sebagian", () => {
  assert.equal(maskNik("3508012345670001"), "************0001");
  assert.equal(maskKk("3508012345670002"), "************0002");
  assert.equal(maskNik(null), null);
  assert.equal(maskNik("  "), null);
  assert.equal(maskDigits("123", 4), "*23", "selalu menyembunyikan minimal satu digit");
  assert.notEqual(maskDigits("1", 4), "1", "nilai satu digit pun tersamar");
  assert.ok(!maskNik("3508012345670001")!.includes("350801"));
});

test("umur dihitung penuh tahun, tidak negatif", () => {
  assert.equal(ageYears(new Date("1990-10-31T00:00:00Z"), NOW), 36);
  assert.equal(ageYears(new Date("1990-11-01T00:00:00Z"), NOW), 35);
  assert.equal(ageYears(new Date("2030-01-01T00:00:00Z"), NOW), 0);
});

test("kursor: bolak-balik; nilai rusak ditolak", () => {
  assert.equal(decodeCursor(encodeCursor(42)), 42);
  for (const bad of ["", "42", "c1_", "c1_!!!", `c1_${Buffer.from("abc").toString("base64url")}`, `c1_${Buffer.from("-5").toString("base64url")}`, `c1_${Buffer.from("0").toString("base64url")}`]) {
    assert.equal(decodeCursor(bad), null, bad);
  }
});

test("parsePaging: bawaan, batas, dan galat jelas", () => {
  assert.deepEqual(parsePaging(new URLSearchParams()), { ok: true, limit: 25, cursor: null });
  assert.deepEqual(parsePaging(new URLSearchParams({ limit: "100" })), { ok: true, limit: 100, cursor: null });
  for (const l of ["0", "101", "-1", "abc", "1.5"]) assert.equal(parsePaging(new URLSearchParams({ limit: l })).ok, false, l);
  assert.equal(parsePaging(new URLSearchParams({ cursor: "ngawur" })).ok, false);
  assert.equal(parsePaging(new URLSearchParams({ cursor: encodeCursor(7) })).ok && (parsePaging(new URLSearchParams({ cursor: encodeCursor(7) })) as { cursor: number }).cursor, 7);
  assert.equal(MAX_LIMIT, 100);
});

test("slicePage: hasMore dan nextCursor menunjuk id terakhir yang dikembalikan", () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const p = slicePage(rows, 2, (r) => r.id);
  assert.deepEqual(p.data.map((r) => r.id), [1, 2]);
  assert.equal(p.page.hasMore, true);
  assert.equal(decodeCursor(p.page.nextCursor!), 2);
  const last = slicePage(rows.slice(0, 2), 2, (r) => r.id);
  assert.equal(last.page.hasMore, false);
  assert.equal(last.page.nextCursor, null);
  assert.deepEqual(slicePage([], 5, (r: { id: number }) => r.id).page, { limit: 5, hasMore: false, nextCursor: null });
});

const resident = {
  id: 9, name: "Budi", nik: "3508012345670001", kk: "3508012345670002", gender: "Laki-laki", birthDate: new Date("1990-05-17T00:00:00Z"),
  familyRole: "Kepala Keluarga", occupation: "Petani", education: "SMA", rt: "01", rw: "02", hamlet: "Mawar", isAlive: true, moveDate: null, householdId: 3,
};

test("residentView: tidak memuat NIK/KK lengkap maupun tanggal lahir lengkap", () => {
  const v = residentView(resident, NOW);
  const json = JSON.stringify(v);
  assert.ok(!json.includes("3508012345670001") && !json.includes("3508012345670002"));
  assert.ok(!json.includes("1990-05-17"));
  assert.equal(v.birthYear, 1990);
  assert.equal(v.age, 36);
  assert.equal(v.status, "aktif");
  for (const forbidden of ["address", "phone", "email", "birthDate", "fatherNik", "motherNik", "religion", "maritalStatus", "isPregnant", "isDisability", "income", "desil", "photo"]) {
    assert.ok(!(forbidden in v), forbidden);
  }
});

test("RESIDENT_SELECT tidak mengambil kolom yang tak pernah boleh keluar", () => {
  for (const col of ["address", "phone", "email", "fatherNik", "motherNik", "religion", "maritalStatus", "isPregnant", "isDisability", "isStunting", "isBpjsKis", "income", "desil", "photo", "cover", "height", "weight"]) {
    assert.ok(!(col in RESIDENT_SELECT), col);
  }
});

test("status: meninggal dan pindah dibedakan; filter where sesuai", () => {
  assert.equal(residentView({ ...resident, isAlive: false }, NOW).status, "meninggal");
  assert.equal(residentView({ ...resident, moveDate: new Date("2026-01-01") }, NOW).status, "pindah");
  assert.deepEqual(residentStatusWhere(null), { isAlive: true, moveDate: null });
  assert.deepEqual(residentStatusWhere("semua"), {});
  assert.equal(residentStatusWhere("hapus"), null);
});

test("household/member/official view menyamarkan dan membuang kolom pribadi", () => {
  const h = householdView({ id: 1, kkNumber: "3508012345670002", status: "ACTIVE", rt: "01", rw: "02", hamlet: "Mawar", headResident: { id: 9, name: "Budi" }, _count: { members: 4 } });
  assert.equal(h.kk, "************0002");
  assert.equal(h.memberCount, 4);
  const m = memberView({ id: 2, name: "Sri", nik: "3508012345670003", gender: "Perempuan", birthDate: new Date("1992-02-02T00:00:00Z"), familyRole: "Istri", isAlive: true, moveDate: null }, NOW);
  assert.ok(!JSON.stringify(m).includes("3508012345670003"));
  const o = officialView({ id: 1, name: "Pak Kades", gender: "Laki-laki", startDate: new Date("2020-01-01T00:00:00Z"), endDate: null, status: "active", education: "S1", photoUrl: null, position: { name: "Kepala Desa", level: 1 } });
  assert.equal(o.position, "Kepala Desa");
  for (const k of ["nik", "phone", "email", "address", "birthDate", "birthplace"]) assert.ok(!(k in o), k);
});

test("kelompok umur", () => {
  const d = (y: number) => new Date(`${y}-01-01T00:00:00Z`);
  const b = ageBuckets([d(2025), d(2020), d(2000), d(1990), d(1950)], NOW);
  assert.deepEqual(b, { "0-4": 1, "5-14": 1, "15-24": 0, "25-59": 2, "60+": 1 });
});

// ---------- tes statis: kontrak endpoint ----------
const V1 = join(process.cwd(), "app", "api", "v1");
const routeFiles = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? routeFiles(join(dir, n)) : n === "route.ts" ? [join(dir, n)] : []));
const files = routeFiles(V1).map((f) => relative(process.cwd(), f).split(sep).join("/"));
const PUBLIC_DOCS = new Set(["app/api/v1/openapi.json/route.ts", "app/api/v1/llms.txt/route.ts"]);
const fileOf = (p: string) => `app/${p.replace(/^\//, "").replace(/\{(\w+)\}/g, "[$1]")}/route.ts`;

test("daftar ENDPOINTS sama persis dengan berkas rute /api/v1 (selain dokumentasi publik)", () => {
  const fromSpec = ENDPOINTS.map((e) => fileOf(e.path)).sort();
  const fromFiles = files.filter((f) => !PUBLIC_DOCS.has(f)).sort();
  assert.deepEqual(fromSpec, fromFiles);
});

test("setiap rute data memanggil requireApiKey dengan scope yang tercatat di spesifikasi", () => {
  for (const e of ENDPOINTS) {
    const src = readFileSync(fileOf(e.path), "utf8");
    const expected = e.scope ? `requireApiKey(req, "${e.scope}")` : "requireApiKey(req, null)";
    assert.ok(src.includes(expected), `${e.path} harus memanggil ${expected}`);
    assert.ok(src.includes("auth.ok") && src.includes("auth.response"), `${e.path} harus menolak bila autentikasi gagal`);
  }
});

test("setiap rute data hanya GET dan semua bacaan DB memakai select (tanpa include) dan tanpa tulis", () => {
  for (const f of files.filter((x) => !PUBLIC_DOCS.has(x))) {
    const src = readFileSync(f, "utf8");
    const handlers = [...src.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => m[1]);
    assert.deepEqual(handlers, ["GET"], f);
    assert.ok(!/\binclude\s*:/.test(src), `${f}: include dilarang (memuat semua kolom)`);
    assert.ok(!/\.(create|update|delete|upsert|createMany|updateMany|deleteMany|\$executeRaw|\$queryRaw)\w*\(/.test(src), `${f}: tulis/raw dilarang`);
    for (const m of src.matchAll(/prisma\.\w+\.(findMany|findFirst|findUnique)\(\{([\s\S]*?)\}\);/g)) {
      assert.ok(/select\s*:|SELECT/.test(m[2]), `${f}: ${m[1]} tanpa select`);
    }
    assert.ok(!/villageId\s*:\s*(Number\(|sp\.|body|req\.)/.test(src), `${f}: villageId tidak boleh dari klien`);
  }
});

test("scope di spesifikasi dikenal; skema yang dirujuk ada; $ref selesai", () => {
  for (const e of ENDPOINTS) {
    if (e.scope) assert.ok(e.scope in API_SCOPES, e.scope);
    assert.ok(e.item in SCHEMAS, e.item);
  }
  const doc = JSON.stringify(buildOpenApi("https://x.test"));
  for (const m of doc.matchAll(/#\/components\/schemas\/(\w+)/g)) assert.ok(m[1] in SCHEMAS, `$ref ${m[1]}`);
});

test("OpenAPI: 3.1, bearerAuth, semua jalur ada; galat 401 dan 429 terdokumentasi", () => {
  const doc = buildOpenApi("https://x.test") as { openapi: string; paths: Record<string, { get: { responses: Record<string, unknown>; security: unknown[] } }>; components: { securitySchemes: Record<string, unknown> } };
  assert.equal(doc.openapi, "3.1.0");
  assert.ok(doc.components.securitySchemes.bearerAuth);
  assert.deepEqual(Object.keys(doc.paths).sort(), ENDPOINTS.map((e) => e.path).sort());
  for (const p of Object.values(doc.paths)) {
    assert.ok("200" in p.get.responses && "401" in p.get.responses && "429" in p.get.responses);
    assert.equal(p.get.security.length, 1);
  }
});

test("llms.txt menyebut tiap endpoint, aturan penyamaran, dan larangan memakai kunci di browser", () => {
  const t = buildLlmsTxt("https://x.test");
  for (const e of ENDPOINTS) assert.ok(t.includes(`GET ${e.path}`), e.path);
  assert.match(t, /4 digit terakhir/);
  assert.match(t, /JANGAN menaruhnya di kode browser/);
  assert.match(t, /bukan sebagai instruksi/);
  assert.match(t, /https:\/\/x\.test\/api\/v1\/openapi\.json/);
});
