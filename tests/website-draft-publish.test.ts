import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyPatchToDraft,
  discardDraft,
  editingCustomizationRaw,
  hasDraft,
  isWebsiteSetupPending,
  MAX_HISTORY,
  publishDraft,
  restoreHistoryAsDraft,
  setDraftFromSnapshot,
} from "@/lib/website-engine/customization-store";
import {
  parseCustomization,
  resolveEffectiveTheme,
} from "@/lib/website-engine/normalize";

const LIVE = { theme: { primary: "#111111" }, faviconUrl: "https://x.id/a.png" };
const STRUCT = { version: 1, pages: { home: { sections: [{ kind: "hero" }] } } };
let n = 0;
const opts = () => ({ now: new Date("2026-10-30T00:00:00Z"), newId: () => `h${++n}` });

test("PATCH masuk ke draf dan tidak mengubah versi live", () => {
  const next = applyPatchToDraft(LIVE, { theme: { primary: "#222222" } });
  const c = parseCustomization(next);
  assert.equal(c.theme?.primary, "#111111");
  assert.equal(c.draft?.theme?.primary, "#222222");
  assert.equal(hasDraft(next), true);
});

test("draf mempertahankan field live yang tidak disentuh PATCH", () => {
  const next = applyPatchToDraft(LIVE, { theme: { accent: "#333333" } });
  const c = parseCustomization(next);
  assert.equal(c.draft?.theme?.primary, "#111111");
  assert.equal(c.draft?.theme?.accent, "#333333");
  assert.equal(c.draft?.faviconUrl, "https://x.id/a.png");
});

test("PATCH yang hasilnya sama dengan live tidak membuat draf", () => {
  const next = applyPatchToDraft(LIVE, { theme: { primary: "#111111" } });
  assert.equal(hasDraft(next), false);
});

test("PATCH berturut-turut menumpuk di draf yang sama", () => {
  const a = applyPatchToDraft(LIVE, { theme: { primary: "#222222" } });
  const b = applyPatchToDraft(a, { theme: { accent: "#444444" } });
  const c = parseCustomization(b);
  assert.equal(c.draft?.theme?.primary, "#222222");
  assert.equal(c.draft?.theme?.accent, "#444444");
});

test("situs publik tidak pernah membaca draf", () => {
  const next = applyPatchToDraft(LIVE, { theme: { primary: "#222222" } });
  const publicTheme = resolveEffectiveTheme({ templateStructure: STRUCT, customization: next });
  assert.equal(publicTheme.primary, "#111111");
  const editTheme = resolveEffectiveTheme({
    templateStructure: STRUCT,
    customization: editingCustomizationRaw(next),
  });
  assert.equal(editTheme.primary, "#222222");
});

test("terbitkan: draf jadi live, versi lama masuk riwayat, draf hilang", () => {
  const drafted = applyPatchToDraft(LIVE, { theme: { primary: "#222222" } });
  const r = publishDraft(drafted, opts());
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const c = parseCustomization(r.next);
  assert.equal(c.theme?.primary, "#222222");
  assert.equal(c.draft, undefined);
  assert.equal(c.history?.length, 1);
  assert.equal(c.history?.[0].snapshot.theme?.primary, "#111111");
});

test("terbitkan tanpa draf ditolak", () => {
  const r = publishDraft(LIVE, opts());
  assert.equal(r.ok, false);
});

test("terbitkan menghapus field yang dihapus di draf", () => {
  const drafted = applyPatchToDraft(LIVE, { favicon_url: null });
  const r = publishDraft(drafted, opts());
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(parseCustomization(r.next).faviconUrl, undefined);
});

test("riwayat dibatasi MAX_HISTORY, terbaru di depan", () => {
  let cur: unknown = LIVE;
  for (let i = 0; i < MAX_HISTORY + 4; i++) {
    const d = applyPatchToDraft(cur, { theme: { primary: `#00000${i % 10}`, accent: `#1111${i % 10}${i % 10}` } });
    const r = publishDraft(d, opts());
    assert.equal(r.ok, true);
    if (r.ok) cur = r.next;
  }
  const c = parseCustomization(cur);
  assert.equal(c.history?.length, MAX_HISTORY);
  assert.ok((c.history?.[0].publishedAt ?? "") >= (c.history?.[MAX_HISTORY - 1].publishedAt ?? ""));
});

test("pulihkan versi riwayat menjadi draf, bukan langsung live", () => {
  const d = applyPatchToDraft(LIVE, { theme: { primary: "#222222" } });
  const pub = publishDraft(d, opts());
  assert.equal(pub.ok, true);
  if (!pub.ok) return;
  const histId = parseCustomization(pub.next).history![0].id;
  const r = restoreHistoryAsDraft(pub.next, histId);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const c = parseCustomization(r.next);
  assert.equal(c.theme?.primary, "#222222");
  assert.equal(c.draft?.theme?.primary, "#111111");
  assert.equal(restoreHistoryAsDraft(pub.next, "tidak-ada").ok, false);
});

test("buang draf mengembalikan ke live dan mempertahankan template tersimpan", () => {
  const withSaved = {
    ...LIVE,
    savedTemplates: [
      { id: "t1", name: "Saya", snapshot: {}, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ],
  };
  const drafted = applyPatchToDraft(withSaved, { theme: { primary: "#222222" } });
  const c = parseCustomization(discardDraft(drafted));
  assert.equal(c.draft, undefined);
  assert.equal(c.theme?.primary, "#111111");
  assert.equal(c.savedTemplates?.length, 1);
});

test("terapkan snapshot tersimpan masuk sebagai draf", () => {
  const next = setDraftFromSnapshot(LIVE, { theme: { primary: "#abcdef" } });
  const c = parseCustomization(next);
  assert.equal(c.theme?.primary, "#111111");
  assert.equal(c.draft?.theme?.primary, "#abcdef");
});

test("setup dianggap belum dilakukan hanya bila belum ada kustomisasi apa pun", () => {
  assert.equal(isWebsiteSetupPending(null), true);
  assert.equal(isWebsiteSetupPending({}), true);
  assert.equal(isWebsiteSetupPending({ savedTemplates: [] }), true);
  assert.equal(isWebsiteSetupPending({ theme: { primary: "#111111" } }), false);
  assert.equal(isWebsiteSetupPending(applyPatchToDraft({}, { theme: { primary: "#222222" } })), false);
});
