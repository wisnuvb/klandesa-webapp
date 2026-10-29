import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  AUTOSAVE_DEBOUNCE_MS,
  MAX_AUTO_RETRIES,
  backoffMs,
  buildCreatePayload,
  buildPatchPayload,
  classifyResponse,
  failureMessage,
  initialPersistState,
  isSettled,
  needsSave,
  persistReducer,
  planNext,
  statusOf,
  summarizeDocument,
  type PersistEvent,
  type PersistState,
} from "../app/(app)/layanan-surat/editor/_utils/persist.ts";
import { buildStarter, listBlankStarters, listStarters, parseStartId, START_KINDS } from "../app/(app)/layanan-surat/editor/_utils/starters.ts";
import { validateDocument } from "../lib/letters/document/validate.ts";

const run = (events: PersistEvent[], from: PersistState = initialPersistState()) => events.reduce(persistReducer, from);
const ready = (templateId: number | null = 5, updatedAt: string | null = "2026-10-29T10:00:00.000Z") =>
  run([{ type: "ready", templateId, updatedAt }]);
const ok = (id = 5, at = "2026-10-29T10:00:05.000Z") => ({ type: "saveSucceeded", templateId: id, updatedAt: at, at: 1000 }) as const;

describe("persist: jadwal & antrean", () => {
  it("sebelum dimuat dan tanpa perubahan: tidak menyimpan apa-apa", () => {
    assert.equal(planNext(initialPersistState()), null);
    assert.equal(planNext(ready()), null);
    assert.equal(statusOf(ready()), "ready");
    assert.equal(statusOf(initialPersistState()), "loading");
  });

  it("perubahan dokumen → simpan setelah debounce", () => {
    const s = run([{ type: "docChanged", revision: 1, invalidCount: 0 }], ready());
    assert.deepEqual(planNext(s), { delayMs: AUTOSAVE_DEBOUNCE_MS });
    assert.equal(needsSave(s), true);
  });

  it("dokumen tidak valid: tidak dikirim, status 'invalid' membawa jumlah masalah", () => {
    const s = run([{ type: "docChanged", revision: 1, invalidCount: 3 }], ready());
    assert.equal(planNext(s), null);
    assert.equal(statusOf(s), "invalid");
    assert.equal(s.invalidCount, 3);
    const fixed = run([{ type: "docChanged", revision: 2, invalidCount: 0 }], s);
    assert.deepEqual(planNext(fixed), { delayMs: AUTOSAVE_DEBOUNCE_MS });
  });

  it("template baru (belum tersimpan) tidak disimpan sebelum perubahan pertama atau Simpan eksplisit", () => {
    const fresh = ready(null, null);
    assert.equal(planNext(fresh), null);
    assert.deepEqual(planNext(run([{ type: "saveRequested" }], fresh)), { delayMs: 0 });
    assert.deepEqual(planNext(run([{ type: "docChanged", revision: 1, invalidCount: 0 }], fresh)), { delayMs: AUTOSAVE_DEBOUNCE_MS });
    assert.deepEqual(planNext(run([{ type: "metaChanged", patch: { name: "Baru" } }], fresh)), { delayMs: AUTOSAVE_DEBOUNCE_MS });
  });

  it("hanya satu simpan berjalan sekaligus", () => {
    const s = run([{ type: "docChanged", revision: 1, invalidCount: 0 }, { type: "saveStarted" }], ready());
    assert.equal(statusOf(s), "saving");
    assert.equal(planNext(s), null);
    assert.equal(run([{ type: "saveStarted" }], s).inFlight, s.inFlight);
  });

  it("perubahan saat menyimpan tidak hilang: simpan lagi setelah sukses", () => {
    const s = run([
      { type: "docChanged", revision: 1, invalidCount: 0 },
      { type: "saveStarted" },
      { type: "docChanged", revision: 2, invalidCount: 0 },
      ok(),
    ], ready());
    assert.equal(s.savedRevision, 1);
    assert.equal(needsSave(s), true);
    assert.equal(statusOf(s), "ready");
    assert.deepEqual(planNext(s), { delayMs: AUTOSAVE_DEBOUNCE_MS });
    const done = run([{ type: "saveStarted" }, ok(5, "2026-10-29T10:00:09.000Z")], s);
    assert.equal(statusOf(done), "saved");
    assert.equal(planNext(done), null);
    assert.equal(done.updatedAt, "2026-10-29T10:00:09.000Z");
  });

  it("sukses menyimpan template baru menyimpan id & updatedAt dari server", () => {
    const s = run([{ type: "saveRequested" }, { type: "saveStarted" }, ok(42, "2026-10-29T11:00:00.000Z")], ready(null, null));
    assert.equal(s.templateId, 42);
    assert.equal(s.updatedAt, "2026-10-29T11:00:00.000Z");
    assert.equal(statusOf(s), "saved");
  });

  it("nama diubah lagi saat menyimpan tetap kotor; bila sama dibersihkan", () => {
    const same = run([{ type: "metaChanged", patch: { name: "A" } }, { type: "saveStarted" }, ok()], ready());
    assert.deepEqual(same.metaDirty, {});
    const changed = run([{ type: "metaChanged", patch: { name: "A" } }, { type: "saveStarted" }, { type: "metaChanged", patch: { name: "AB" } }, ok()], ready());
    assert.deepEqual(changed.metaDirty, { name: "AB" });
  });
});

describe("persist: konflik 409", () => {
  const conflicted = run([{ type: "docChanged", revision: 1, invalidCount: 0 }, { type: "saveStarted" }, { type: "saveConflict" }], ready());

  it("berhenti menyimpan otomatis", () => {
    assert.equal(statusOf(conflicted), "conflict");
    assert.equal(planNext(conflicted), null);
    assert.equal(needsSave(conflicted), true);
    assert.equal(planNext(run([{ type: "docChanged", revision: 2, invalidCount: 0 }], conflicted)), null);
  });

  it("'timpa' memakai updatedAt terbaru dan menyimpan segera", () => {
    const s = run([{ type: "overwriteRequested", updatedAt: "2026-10-29T12:00:00.000Z" }], conflicted);
    assert.equal(s.updatedAt, "2026-10-29T12:00:00.000Z");
    assert.equal(statusOf(s), "ready");
    assert.deepEqual(planNext(s), { delayMs: 0 });
  });
});

describe("persist: gagal & backoff", () => {
  const dirty = run([{ type: "docChanged", revision: 1, invalidCount: 0 }], ready());
  const fail = (s: PersistState, httpStatus: number | null) => run([{ type: "saveStarted" }, { type: "saveFailed", httpStatus, message: "x" }], s);

  it("gangguan jaringan/5xx diulang dengan jeda bertambah, lalu berhenti setelah batas", () => {
    let s = dirty;
    const delays: number[] = [];
    for (let i = 0; i < MAX_AUTO_RETRIES; i++) {
      s = fail(s, i % 2 ? 503 : null);
      assert.equal(statusOf(s), "error");
      const p = planNext(s);
      if (p) delays.push(p.delayMs);
    }
    assert.deepEqual(delays, [2000, 4000, 8000, 16000]);
    assert.equal(planNext(s), null, "setelah batas, menunggu 'Coba lagi'");
  });

  it("kegagalan permanen (4xx) tidak diulang otomatis", () => {
    for (const code of [400, 401, 403, 404, 413, 422]) assert.equal(planNext(fail(dirty, code)), null, String(code));
    for (const code of [408, 429, 500, 502, 503]) assert.notEqual(planNext(fail(dirty, code)), null, String(code));
  });

  it("'Coba lagi' mengulang dari awal", () => {
    const stuck = fail(fail(fail(fail(fail(dirty, 500), 500), 500), 500), 500);
    assert.equal(planNext(stuck), null);
    const s = run([{ type: "retryRequested" }], stuck);
    assert.equal(s.attempt, 0);
    assert.deepEqual(planNext(s), { delayMs: 0 });
  });

  it("simpan paksa yang gagal tetap dicoba lagi (tidak hilang saat tak ada perubahan)", () => {
    const forced = run([{ type: "saveRequested" }, { type: "saveStarted" }, { type: "saveFailed", httpStatus: 500, message: "x" }], ready());
    assert.equal(needsSave(forced), true);
    assert.notEqual(planNext(forced), null);
  });

  it("backoff dibatasi 30 detik", () => {
    assert.equal(backoffMs(1), 2000);
    assert.equal(backoffMs(20), 30_000);
  });

  it("pemetaan respons & pesan ramah", () => {
    assert.equal(classifyResponse(200), "ok");
    assert.equal(classifyResponse(201), "ok");
    assert.equal(classifyResponse(409), "conflict");
    assert.equal(classifyResponse(503), "retry");
    assert.equal(classifyResponse(429), "retry");
    assert.equal(classifyResponse(422), "fatal");
    assert.match(failureMessage(null), /Tidak tersambung/);
    assert.match(failureMessage(403), /tidak berhak/);
    assert.equal(failureMessage(400, "Nama wajib diisi"), "Nama wajib diisi");
  });

  it("isSettled menunggu simpan selesai (dipakai saveNow)", () => {
    assert.equal(isSettled(initialPersistState()), false);
    assert.equal(isSettled(ready()), true);
    assert.equal(isSettled(dirty), false);
    assert.equal(isSettled(run([{ type: "saveStarted" }], dirty)), false);
    assert.equal(isSettled(fail(dirty, 500)), true);
    assert.equal(isSettled(run([{ type: "docChanged", revision: 1, invalidCount: 2 }], ready())), true);
  });

  it("memuat ulang mengembalikan ke awal bersih", () => {
    assert.deepEqual(run([{ type: "loading" }], dirty), initialPersistState());
  });
});

describe("persist: payload", () => {
  const starterDoc = async () => (await buildStarter("kosong:keterangan"))!.doc;

  it("POST: nama dirapikan, dokumen apa adanya, ringkasan teks polos", async () => {
    const doc = await starterDoc();
    const p = buildCreatePayload({ name: "  SK Baru  ", description: "d", category: "Keterangan" }, doc);
    assert.equal(p.name, "SK Baru");
    assert.equal(p.templateStructure, doc);
    assert.equal(p.category, "Keterangan");
    assert.ok(p.contentTemplate.includes("SURAT KETERANGAN"));
    assert.ok(p.contentTemplate.includes("{desa.nama}"));
  });

  it("PATCH: hanya meta yang berubah, tanpa dokumen bila dokumen tak berubah; expectedUpdatedAt selalu ada", async () => {
    const doc = await starterDoc();
    const p = buildPatchPayload({ id: 7, expectedUpdatedAt: "T1", doc, docDirty: false, forced: false, metaDirty: { name: " Baru " } });
    assert.deepEqual(p, { id: 7, expectedUpdatedAt: "T1", name: "Baru" });
  });

  it("PATCH: dokumen dikirim bila berubah (atau dipaksa), nama kosong diabaikan", async () => {
    const doc = await starterDoc();
    const a = buildPatchPayload({ id: 7, expectedUpdatedAt: "T1", doc, docDirty: true, forced: false, metaDirty: { name: "  " } });
    assert.equal(a.templateStructure, doc);
    assert.equal(typeof a.contentTemplate, "string");
    assert.equal("name" in a, false);
    const b = buildPatchPayload({ id: 7, expectedUpdatedAt: "T1", doc, docDirty: false, forced: true, metaDirty: {} });
    assert.equal(b.templateStructure, doc);
  });

  it("ringkasan tidak memuat tag HTML", async () => {
    for (const kind of START_KINDS) {
      const s = (await buildStarter(`kosong:${kind}`))!;
      assert.ok(!/<[a-z!/]/i.test(summarizeDocument(s.doc)), kind);
    }
  });
});

describe("starters", () => {
  it("semua pilihan 'kosong' menghasilkan dokumen valid yang lolos validateDocument", async () => {
    for (const info of listBlankStarters()) {
      const s = await buildStarter(info.id);
      assert.ok(s, info.id);
      const r = validateDocument(s.doc);
      assert.equal(r.ok, true, `${info.id}: ${r.ok ? "" : JSON.stringify(r.issues)}`);
      assert.ok(s.name.length > 0 && s.name.length <= 255);
    }
  });

  it("jenis dokumen sesuai: surat biasa & keputusan & berita acara internal; keterangan untuk warga", async () => {
    const d = async (k: string) => (await buildStarter(`kosong:${k}`))!.doc;
    assert.equal((await d("keterangan")).audience, "warga");
    assert.ok((await d("keterangan")).people.some((p) => p.id === "pemohon"));
    for (const k of ["surat_biasa", "keputusan", "berita_acara"]) assert.equal((await d(k)).audience, "internal", k);
    assert.equal((await d("keputusan")).letterhead, "garuda");
    assert.equal((await d("surat_biasa")).body[0].type, "memo");
    assert.ok((await d("berita_acara")).groups.length > 0);
  });

  it("contoh dari katalog: semua 19 valid, diberi nama '(salinan)'", async () => {
    const { examples, blank } = await listStarters();
    assert.equal(blank.length, 4);
    assert.equal(examples.length, 19);
    for (const e of examples) {
      const s = await buildStarter(e.id);
      assert.ok(s, e.id);
      assert.ok(s.name.endsWith("(salinan)"));
      assert.equal(validateDocument(s.doc).ok, true, e.id);
    }
  });

  it("id tak dikenal ditolak", async () => {
    assert.equal(parseStartId("kosong:apa_saja"), null);
    assert.equal(parseStartId("contoh:../etc"), null);
    assert.equal(parseStartId("ngawur"), null);
    assert.equal(await buildStarter("contoh:tidak_ada"), null);
    assert.equal(await buildStarter("kosong:x"), null);
    assert.deepEqual(parseStartId("contoh:cat_sk_domisili"), { type: "contoh", key: "cat_sk_domisili" });
  });

  it("jalur 'kosong' tidak mengimpor katalog secara sinkron; katalog hanya lewat import() dinamis", () => {
    const src = readFileSync(new URL("../app/(app)/layanan-surat/editor/_utils/starters.ts", import.meta.url), "utf8");
    assert.ok(!/^import[^;]*letters\/catalog/m.test(src), "tidak ada import statis katalog");
    assert.ok(/await import\("@\/lib\/letters\/catalog"\)/.test(src));
  });

  it("hook hanya mengimpor tipe dari lib/letters/editor (tidak bergantung implementasi editor)", () => {
    const src = readFileSync(new URL("../app/(app)/layanan-surat/editor/_hooks/useTemplateDocument.ts", import.meta.url), "utf8");
    assert.ok(!/lib\/letters\/editor/.test(src));
  });
});
