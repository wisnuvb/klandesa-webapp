import type {
  WebsiteCustomization,
  WebsiteCustomizationSnapshot,
} from "@/lib/website-engine/types";

/** Field yang membentuk satu "versi" tampilan situs (live maupun draf). */
export function snapshotOf(c: WebsiteCustomization): WebsiteCustomizationSnapshot {
  return {
    ...(c.presetKey !== undefined ? { presetKey: c.presetKey } : {}),
    ...(c.overrides !== undefined ? { overrides: c.overrides } : {}),
    ...(c.theme !== undefined ? { theme: c.theme } : {}),
    ...(c.layout !== undefined ? { layout: c.layout } : {}),
    ...(c.siteSeo !== undefined ? { siteSeo: c.siteSeo } : {}),
    ...(c.faviconUrl !== undefined ? { faviconUrl: c.faviconUrl } : {}),
  };
}

/** Satu-satunya serializer ke kolom JSON `customization`; wajib dipakai semua penulis agar draf/riwayat tidak hilang. */
export function customizationToJsonObject(
  c: WebsiteCustomization,
): Record<string, unknown> {
  const o: Record<string, unknown> = { ...snapshotOf(c) };
  if (c.savedPresets !== undefined) o.savedPresets = c.savedPresets;
  if (c.savedTemplates !== undefined) o.savedTemplates = c.savedTemplates;
  if (c.draft !== undefined) o.draft = c.draft;
  if (c.history !== undefined && c.history.length > 0) o.history = c.history;
  return o;
}
