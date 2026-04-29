import type { CSSProperties } from "react";
import type {
  WebsiteLayoutCustomization,
  WebsiteLayoutDefaults,
  WebsiteThemeDefaults,
  WebsiteThemeTokens,
} from "@/lib/website-engine/types";

export function mergeThemeLayers(
  ...layers: Array<WebsiteThemeDefaults | WebsiteThemeTokens | undefined>
): WebsiteThemeTokens {
  const out: WebsiteThemeTokens = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.primary !== undefined) out.primary = layer.primary;
    if (layer.accent !== undefined) out.accent = layer.accent;
    if (layer.fontBody !== undefined) out.fontBody = layer.fontBody;
    if (layer.fontHeading !== undefined) out.fontHeading = layer.fontHeading;
    if (layer.surface !== undefined) out.surface = layer.surface;
    if (layer.surfaceMuted !== undefined) out.surfaceMuted = layer.surfaceMuted;
    if (layer.border !== undefined) out.border = layer.border;
    if (layer.mutedForeground !== undefined) out.mutedForeground = layer.mutedForeground;
    if (layer.radiusMd !== undefined) out.radiusMd = layer.radiusMd;
  }
  return out;
}

export function mergeLayoutLayers(
  ...layers: Array<WebsiteLayoutDefaults | WebsiteLayoutCustomization | undefined>
): WebsiteLayoutCustomization {
  const out: WebsiteLayoutCustomization = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.hideSiteHeader !== undefined)
      out.hideSiteHeader = layer.hideSiteHeader;
  }
  return out;
}

export function themeToCssVars(
  theme: WebsiteThemeTokens,
): CSSProperties {
  const style: Record<string, string> = {};
  if (theme.primary) style["--site-primary"] = theme.primary;
  if (theme.accent) style["--site-accent"] = theme.accent;
  if (theme.fontBody) style["--site-font-body"] = theme.fontBody;
  if (theme.fontHeading) style["--site-font-heading"] = theme.fontHeading;
  if (theme.surface) style["--site-surface"] = theme.surface;
  if (theme.surfaceMuted) style["--site-surface-muted"] = theme.surfaceMuted;
  if (theme.border) style["--site-border"] = theme.border;
  if (theme.mutedForeground) style["--site-muted-foreground"] = theme.mutedForeground;
  if (theme.radiusMd) style["--site-radius-md"] = theme.radiusMd;
  return style as CSSProperties;
}
