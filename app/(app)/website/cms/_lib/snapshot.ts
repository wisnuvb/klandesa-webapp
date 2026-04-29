import type { CmsWorkspaceSnapshotInput } from "./types";

/** Satu sumber kebenaran string untuk dirty-check (urutan key stabil via objek tetap). */
export function serializeCmsWorkspaceState(input: CmsWorkspaceSnapshotInput): string {
  return JSON.stringify({
    presetKey: input.presetKey,
    engine: input.engine,
    pageIndex: input.pageIndex,
    themePrimary: input.themePrimary,
    themeAccent: input.themeAccent,
    themeFont: input.themeFont,
    themeFontHeading: input.themeFontHeading,
    themeSurface: input.themeSurface,
    themeSurfaceMuted: input.themeSurfaceMuted,
    themeBorder: input.themeBorder,
    themeMutedFg: input.themeMutedFg,
    themeRadiusMd: input.themeRadiusMd,
    hideSiteHeader: input.hideSiteHeader,
    faviconUrl: input.faviconUrl,
  });
}
