import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ATTACHMENT_ENTITIES, ATTACHMENT_ENTITY_TYPES, ATTACHMENT_LIMITS, isAttachmentEntityType } from "../lib/attachments/catalog.ts";
import { COUNT_MAX_IDS, parseAttachInput, parseEntityId, parseIdList, parseRef } from "../lib/attachments/service.ts";
import { validateAttachmentFile } from "../lib/attachments/client.ts";
import { summarizeUsageBySource, usageSourceOf, USAGE_MAX_LINES } from "../lib/digitalArchive/usage.ts";
import { isPermissionResource } from "../lib/permissions/resources.ts";
import { roleCan } from "../lib/permissions/matrix.ts";

describe("katalog lampiran", () => {
  it("setiap jenis memakai sumber daya izin yang nyata dan subfolder unik", () => {
    const subs = new Set<string>();
    for (const t of ATTACHMENT_ENTITY_TYPES) {
      const e = ATTACHMENT_ENTITIES[t];
      assert.ok(isPermissionResource(e.resource), `${t} → ${e.resource}`);
      assert.ok(e.label && e.archiveSub, t);
      assert.ok(!subs.has(e.archiveSub), `subfolder ganda ${e.archiveSub}`);
      subs.add(e.archiveSub);
      assert.ok(e.archiveSub.length <= 60);
    }
    assert.equal(ATTACHMENT_ENTITY_TYPES.length, 20);
    for (const t of ATTACHMENT_ENTITY_TYPES) assert.ok(t.length <= 30, `${t} melebihi VARCHAR(30)`);
  });
  it("peran baca-saja boleh melihat tetapi tidak melampirkan; operator boleh keduanya", () => {
    // produk hukum: staf hanya membaca; sekretaris mengelola.
    assert.equal(roleCan(ATTACHMENT_ENTITIES.LEGAL_DOCUMENT.resource, "read", "staff"), true);
    assert.equal(roleCan(ATTACHMENT_ENTITIES.LEGAL_DOCUMENT.resource, "update", "staff"), false);
    assert.equal(roleCan(ATTACHMENT_ENTITIES.LEGAL_DOCUMENT.resource, "update", "secretary"), true);
    // perangkat desa: kepala desa hanya membaca.
    assert.equal(roleCan(ATTACHMENT_ENTITIES.OFFICIAL.resource, "update", "village_head"), false);
    // mutasi penduduk: staf boleh.
    assert.equal(roleCan(ATTACHMENT_ENTITIES.MUTATION.resource, "update", "staff"), true);
  });
  it("isAttachmentEntityType menolak yang bukan kunci katalog (termasuk sifat prototipe)", () => {
    assert.equal(isAttachmentEntityType("MAIL_REGISTER"), true);
    for (const v of ["toString", "__proto__", "constructor", "mail_register", "", null, 5]) assert.equal(isAttachmentEntityType(v), false);
  });
});

describe("parsing masukan lampiran", () => {
  it("parseEntityId hanya menerima bilangan bulat positif wajar", () => {
    assert.equal(parseEntityId("12"), 12n);
    assert.equal(parseEntityId(7), 7n);
    for (const v of ["0", "-1", "1.5", "abc", "", " 3", "1".repeat(16), null, undefined, {}]) assert.equal(parseEntityId(v), null, String(v));
  });
  it("parseIdList: membuang yang tak valid, menggabung duplikat, dan dibatasi", () => {
    assert.deepEqual(parseIdList("1,2, 3 ,x,-4,2"), [1n, 2n, 3n]);
    assert.deepEqual(parseIdList(""), []);
    assert.deepEqual(parseIdList(null), []);
    assert.equal(parseIdList(Array.from({ length: COUNT_MAX_IDS + 50 }, (_, i) => i + 1).join(",")).length, COUNT_MAX_IDS);
  });
  it("parseRef", () => {
    const ok = parseRef("OFFICIAL", "5");
    assert.ok(ok.ok && ok.data.type === "OFFICIAL" && ok.data.id === 5n);
    assert.ok(!parseRef("NOPE", "5").ok);
    assert.ok(!parseRef("OFFICIAL", "x").ok);
  });
  it("parseAttachInput: label dirapikan, id arsip wajib, label dibatasi", () => {
    const ok = parseAttachInput({ type: "MAIL_REGISTER", id: 3, archiveId: "9", label: "  Surat   asli " });
    assert.ok(ok.ok);
    assert.equal(ok.ok && ok.data.label, "Surat asli");
    assert.equal(ok.ok && ok.data.archiveId, 9n);
    const noLabel = parseAttachInput({ type: "MEETING", id: 1, archiveId: 2 });
    assert.ok(noLabel.ok && noLabel.data.label === null);
    const noArchive = parseAttachInput({ type: "MEETING", id: 1 });
    assert.ok(!noArchive.ok && noArchive.fieldErrors?.archiveId);
    const longLabel = parseAttachInput({ type: "MEETING", id: 1, archiveId: 2, label: "x".repeat(ATTACHMENT_LIMITS.label + 1) });
    assert.ok(!longLabel.ok && longLabel.fieldErrors?.label);
    assert.ok(!parseAttachInput("bukan objek").ok);
    assert.ok(!parseAttachInput({ type: "HACK", id: 1, archiveId: 2 }).ok);
  });
});

describe("validasi berkas di klien", () => {
  it("menolak ekstensi tak didukung, berkas kosong, dan terlalu besar", () => {
    assert.equal(validateAttachmentFile({ name: "scan.pdf", size: 1000 }), null);
    assert.equal(validateAttachmentFile({ name: "foto.JPG", size: 1000 }), null);
    assert.ok(validateAttachmentFile({ name: "malware.exe", size: 1000 }));
    assert.ok(validateAttachmentFile({ name: "tanpa-ekstensi", size: 1000 }));
    assert.ok(validateAttachmentFile({ name: "kosong.pdf", size: 0 }));
    assert.ok(validateAttachmentFile({ name: "besar.pdf", size: 201 * 1024 * 1024 }));
  });
});

// ---- Tes statis rute: izin ditentukan rekaman induk, bukan rute "archive"
const read = (p: string) => readFileSync(p, "utf8");
describe("rute /api/lampiran (statis)", () => {
  const files = ["app/api/lampiran/route.ts", "app/api/lampiran/[attId]/route.ts", "app/api/lampiran/[attId]/file/route.ts"];
  it("setiap rute memanggil guard desa dan memeriksa izin sumber daya rekaman induk", () => {
    for (const f of files) {
      const src = read(f);
      assert.match(src, /await requireVillageApiContext\(/, f);
      assert.match(src, /canVillageUser\(ctx\.session, /, f);
      assert.match(src, /ATTACHMENT_ENTITIES\[/, f);
    }
  });
  it("menulis (POST/DELETE) tercatat di audit tanpa nama atau jalur berkas", () => {
    for (const f of [files[0], files[1]]) {
      const src = read(f);
      assert.match(src, /await auditWeb\(/, f);
      assert.doesNotMatch(src, /fileName|filePath|storageKey/, f);
    }
  });
  it("berkas dialirkan lewat pembantu bersama dan tidak pernah lewat URL publik", () => {
    const src = read(files[2]);
    assert.match(src, /archiveObjectResponse\(/);
    assert.doesNotMatch(src, /buildSpacesPublicUrl|redirect\(/);
  });
  it("hapus arsip diblokir selagi terlampir", () => {
    const src = read("app/api/digital-archives/[id]/route.ts");
    assert.match(src, /attachmentUsageCount\(/);
    assert.match(src, /status: 409/);
  });
  it("klien mengunggah sebagai privat dan bukan publik", () => {
    const src = read("lib/attachments/client.ts");
    assert.match(src, /isPublic: false/);
    assert.doesNotMatch(src, /isPublic: true/);
  });
});

// ---- Setiap form yang memakai lampiran memakai jenis yang ada di katalog
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules" || n === ".next") return [];
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}
describe("pemakaian komponen Lampiran", () => {
  it("semua jenis literal pada useAttachments/LiveAttachments ada di katalog, dan tiap jenis terpasang minimal sekali", () => {
    const used = new Set<string>();
    for (const f of [...walk("app"), ...walk("components")]) {
      const src = read(f);
      for (const m of src.matchAll(/useAttachments\("([A-Z_]+)"/g)) used.add(m[1]);
      for (const m of src.matchAll(/(?:LiveAttachments|AttachmentDisclosure) type="([A-Z_]+)"/g)) used.add(m[1]);
    }
    for (const t of used) assert.ok(isAttachmentEntityType(t), `jenis tak dikenal: ${t}`);
    for (const t of ATTACHMENT_ENTITY_TYPES) assert.ok(used.has(t), `jenis ${t} belum dipasang di UI mana pun`);
  });
});

describe("pemakaian storage per sumber", () => {
  const e = (category: string, subCategory: string | null, fileSize: number) => ({ category, subCategory, fileSize });
  it("lampiran dirinci per modul, kategori lain apa adanya", () => {
    assert.equal(usageSourceOf(e("Lampiran", "Register Surat", 1)), "Lampiran · Register Surat");
    assert.equal(usageSourceOf(e("Lampiran", null, 1)), "Lampiran");
    assert.equal(usageSourceOf(e("Surat", "Masuk", 1)), "Surat");
    assert.equal(usageSourceOf(e("  ", null, 1)), "Tanpa kategori");
  });
  it("menjumlah, mengurutkan dari terbesar, dan mengabaikan ukuran tak wajar", () => {
    const r = summarizeUsageBySource([e("Lampiran", "Produk Hukum", 300), e("Umum", null, 100), e("Lampiran", "Produk Hukum", 200), e("Umum", null, -5), e("Umum", null, Number.NaN)]);
    assert.deepEqual(r, [
      { label: "Lampiran · Produk Hukum", bytes: 500, count: 2 },
      { label: "Umum", bytes: 100, count: 3 },
    ]);
  });
  it("sumber di luar batas digabung ke 'Lainnya' tanpa mengubah total", () => {
    const entries = Array.from({ length: 12 }, (_, i) => e(`K${i}`, null, (i + 1) * 10));
    const total = entries.reduce((a, x) => a + x.fileSize, 0);
    const r = summarizeUsageBySource(entries);
    assert.equal(r.length, USAGE_MAX_LINES);
    assert.equal(r.at(-1)?.label, "Lainnya");
    assert.equal(r.reduce((a, x) => a + x.bytes, 0), total);
    assert.equal(r.reduce((a, x) => a + x.count, 0), 12);
    assert.deepEqual(summarizeUsageBySource([]), []);
  });
});
