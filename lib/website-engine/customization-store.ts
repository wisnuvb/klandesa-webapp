import { parseCustomization } from "@/lib/website-engine/normalize";
import {
  applyEngineConfigPatch,
  type EngineConfigPatch,
} from "@/lib/website-engine/config-patch";
import {
  customizationToJsonObject,
  snapshotOf,
} from "@/lib/website-engine/customization-json";
import type {
  WebsiteCustomization,
  WebsiteCustomizationSnapshot,
} from "@/lib/website-engine/types";

export const MAX_HISTORY = 10;

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

function sameSnapshot(
  a: WebsiteCustomizationSnapshot,
  b: WebsiteCustomizationSnapshot,
): boolean {
  return stableStringify(a) === stableStringify(b);
}

/** Draf yang identik dengan live dibuang supaya UI tidak menampilkan "belum diterbitkan" tanpa alasan. */
function withDraft(
  parsed: WebsiteCustomization,
  draft: WebsiteCustomizationSnapshot,
): WebsiteCustomization {
  const { draft: _old, ...rest } = parsed;
  void _old;
  return sameSnapshot(draft, snapshotOf(parsed)) ? rest : { ...rest, draft };
}

/** Versi yang sedang diedit di CMS: draf bila ada, kalau tidak versi live. */
export function editingSnapshot(c: WebsiteCustomization): WebsiteCustomizationSnapshot {
  return c.draft ?? snapshotOf(c);
}

/**
 * Bentuk `customization` mentah yang berisi versi editing di field utama, untuk dilewatkan ke
 * `resolveEffective*` agar CMS dan pratinjau menampilkan draf.
 */
export function editingCustomizationRaw(raw: unknown): Record<string, unknown> {
  const parsed = parseCustomization(raw);
  return customizationToJsonObject({
    savedPresets: parsed.savedPresets,
    savedTemplates: parsed.savedTemplates,
    ...editingSnapshot(parsed),
  });
}

/** Terapkan PATCH CMS ke draf; versi live tidak berubah sampai diterbitkan. */
export function applyPatchToDraft(
  raw: unknown,
  patch: EngineConfigPatch,
): Record<string, unknown> {
  const parsed = parseCustomization(raw);
  const patched = parseCustomization(
    applyEngineConfigPatch(editingCustomizationRaw(raw), patch),
  );
  return customizationToJsonObject(withDraft(parsed, snapshotOf(patched)));
}

/** Jadikan snapshot tertentu (mis. template tersimpan atau versi riwayat) sebagai draf untuk ditinjau. */
export function setDraftFromSnapshot(
  raw: unknown,
  snapshot: WebsiteCustomizationSnapshot,
): Record<string, unknown> {
  const parsed = parseCustomization(raw);
  const clean = snapshotOf(parseCustomization(snapshot));
  return customizationToJsonObject(withDraft(parsed, clean));
}

export function hasDraft(raw: unknown): boolean {
  return parseCustomization(raw).draft !== undefined;
}

export function discardDraft(raw: unknown): Record<string, unknown> {
  const { draft: _d, ...rest } = parseCustomization(raw);
  void _d;
  return customizationToJsonObject(rest);
}

export function publishDraft(
  raw: unknown,
  opts: { now: Date; newId: () => string },
): { ok: true; next: Record<string, unknown> } | { ok: false; error: string } {
  const parsed = parseCustomization(raw);
  if (!parsed.draft) return { ok: false, error: "Tidak ada perubahan untuk diterbitkan" };
  const entry = {
    id: opts.newId(),
    publishedAt: opts.now.toISOString(),
    snapshot: snapshotOf(parsed),
  };
  const history = [entry, ...(parsed.history ?? [])].slice(0, MAX_HISTORY);
  const { draft, ...rest } = parsed;
  const next: WebsiteCustomization = {
    ...rest,
    // Field live diganti utuh oleh draf; field yang tidak ada di draf berarti "tidak diatur".
    presetKey: undefined,
    overrides: undefined,
    theme: undefined,
    layout: undefined,
    siteSeo: undefined,
    faviconUrl: undefined,
    ...draft,
    history,
  };
  return { ok: true, next: customizationToJsonObject(next) };
}

export function restoreHistoryAsDraft(
  raw: unknown,
  id: string,
): { ok: true; next: Record<string, unknown> } | { ok: false; error: string } {
  const parsed = parseCustomization(raw);
  const found = parsed.history?.find((h) => h.id === id);
  if (!found) return { ok: false, error: "Versi tidak ditemukan" };
  return { ok: true, next: setDraftFromSnapshot(raw, found.snapshot) };
}

/** True bila desa belum pernah menyiapkan tampilan sama sekali (masih bawaan template). */
export function isWebsiteSetupPending(raw: unknown): boolean {
  const c = parseCustomization(raw);
  return (
    c.overrides === undefined &&
    c.theme === undefined &&
    c.presetKey === undefined &&
    c.draft === undefined &&
    (c.history?.length ?? 0) === 0
  );
}
