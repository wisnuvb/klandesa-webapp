"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  WEBSITE_GOOGLE_FONT_BODY_OPTIONS,
  WEBSITE_GOOGLE_FONT_HEADING_OPTIONS,
} from "@/lib/website-engine/google-fonts";
import { THEME_PALETTE_SWATCHES } from "../_lib/constants";
import { colorPickerFallbackHex } from "../_lib/theme-utils";

export type CmsThemeLayoutCardProps = {
  loading: boolean;
  saving: boolean;
  themePrimary: string;
  themeAccent: string;
  themeFont: string;
  themeFontHeading: string;
  themeSurface: string;
  themeSurfaceMuted: string;
  themeBorder: string;
  themeMutedFg: string;
  themeRadiusMd: string;
  hideSiteHeader: boolean;
  onThemePrimaryChange: (v: string) => void;
  onThemeAccentChange: (v: string) => void;
  onThemeFontChange: (v: string) => void;
  onThemeFontHeadingChange: (v: string) => void;
  onThemeSurfaceChange: (v: string) => void;
  onThemeSurfaceMutedChange: (v: string) => void;
  onThemeBorderChange: (v: string) => void;
  onThemeMutedFgChange: (v: string) => void;
  onThemeRadiusMdChange: (v: string) => void;
  onHideSiteHeaderChange: (v: boolean) => void;
  onResetThemeLayout: () => void;
};

export const CmsThemeLayoutCard = memo(function CmsThemeLayoutCard({
  loading,
  saving,
  themePrimary,
  themeAccent,
  themeFont,
  themeFontHeading,
  themeSurface,
  themeSurfaceMuted,
  themeBorder,
  themeMutedFg,
  themeRadiusMd,
  hideSiteHeader,
  onThemePrimaryChange,
  onThemeAccentChange,
  onThemeFontChange,
  onThemeFontHeadingChange,
  onThemeSurfaceChange,
  onThemeSurfaceMutedChange,
  onThemeBorderChange,
  onThemeMutedFgChange,
  onThemeRadiusMdChange,
  onHideSiteHeaderChange,
  onResetThemeLayout,
}: CmsThemeLayoutCardProps) {
  const disabled = loading || saving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tema & tata letak</CardTitle>
        <CardDescription>
          Warna (palet + input), font Google, dan tampilan header situs publik
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Warna utama</div>
            <div className="flex flex-wrap items-center gap-2">
              {THEME_PALETTE_SWATCHES.map((c) => (
                <button
                  key={`pri-${c}`}
                  type="button"
                  title={c}
                  className="size-8 rounded-md border-2 border-transparent shadow-sm ring-offset-background hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  style={{ backgroundColor: c }}
                  onClick={() => onThemePrimaryChange(c)}
                  disabled={disabled}
                  aria-label={`Warna utama ${c}`}
                />
              ))}
              <input
                type="color"
                aria-label="Pilih warna utama"
                className="h-9 w-14 cursor-pointer rounded-md border bg-background p-0.5"
                value={colorPickerFallbackHex(themePrimary)}
                onChange={(e) => onThemePrimaryChange(e.target.value)}
                disabled={disabled}
              />
              <Input
                className="min-w-32 flex-1"
                value={themePrimary}
                onChange={(e) => onThemePrimaryChange(e.target.value)}
                placeholder="#0f766e atau hsl(…)"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Warna aksen</div>
            <div className="flex flex-wrap items-center gap-2">
              {THEME_PALETTE_SWATCHES.map((c) => (
                <button
                  key={`acc-${c}`}
                  type="button"
                  title={c}
                  className="size-8 rounded-md border-2 border-transparent shadow-sm hover:ring-2 hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  style={{ backgroundColor: c }}
                  onClick={() => onThemeAccentChange(c)}
                  disabled={disabled}
                  aria-label={`Warna aksen ${c}`}
                />
              ))}
              <input
                type="color"
                aria-label="Pilih warna aksen"
                className="h-9 w-14 cursor-pointer rounded-md border bg-background p-0.5"
                value={colorPickerFallbackHex(themeAccent)}
                onChange={(e) => onThemeAccentChange(e.target.value)}
                disabled={disabled}
              />
              <Input
                className="min-w-32 flex-1"
                value={themeAccent}
                onChange={(e) => onThemeAccentChange(e.target.value)}
                placeholder="#0f172a"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">
              Font isi (Google Font)
            </div>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) onThemeFontChange(v);
              }}
              disabled={disabled}
            >
              <option value="">Terapkan preset…</option>
              {WEBSITE_GOOGLE_FONT_BODY_OPTIONS.filter((o) => o.value).map(
                (o) => (
                  <option key={`fb-${o.label}`} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
            <Input
              value={themeFont}
              onChange={(e) => onThemeFontChange(e.target.value)}
              placeholder="Kosongkan untuk default template, atau ketik stack CSS"
              disabled={disabled}
            />
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Font judul</div>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v) onThemeFontHeadingChange(v);
              }}
              disabled={disabled}
            >
              <option value="">Terapkan preset…</option>
              {WEBSITE_GOOGLE_FONT_HEADING_OPTIONS.filter((o) => o.value).map(
                (o) => (
                  <option key={`fh-${o.label}`} value={o.value}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
            <Input
              value={themeFontHeading}
              onChange={(e) => onThemeFontHeadingChange(e.target.value)}
              placeholder="Kosongkan untuk mengikuti font isi"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">
              Surface / latar blok
            </div>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Surface"
                className="h-9 w-14 shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
                value={colorPickerFallbackHex(themeSurface)}
                onChange={(e) => onThemeSurfaceChange(e.target.value)}
                disabled={disabled}
              />
              <Input
                value={themeSurface}
                onChange={(e) => onThemeSurfaceChange(e.target.value)}
                placeholder="#f8fafc"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Surface redup</div>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Surface redup"
                className="h-9 w-14 shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
                value={colorPickerFallbackHex(themeSurfaceMuted)}
                onChange={(e) => onThemeSurfaceMutedChange(e.target.value)}
                disabled={disabled}
              />
              <Input
                value={themeSurfaceMuted}
                onChange={(e) => onThemeSurfaceMutedChange(e.target.value)}
                placeholder="#f1f5f9"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Border</div>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Border"
                className="h-9 w-14 shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
                value={colorPickerFallbackHex(themeBorder)}
                onChange={(e) => onThemeBorderChange(e.target.value)}
                disabled={disabled}
              />
              <Input
                value={themeBorder}
                onChange={(e) => onThemeBorderChange(e.target.value)}
                placeholder="#e2e8f0"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">Teks redup</div>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Teks redup"
                className="h-9 w-14 shrink-0 cursor-pointer rounded-md border bg-background p-0.5"
                value={colorPickerFallbackHex(themeMutedFg)}
                onChange={(e) => onThemeMutedFgChange(e.target.value)}
                disabled={disabled}
              />
              <Input
                value={themeMutedFg}
                onChange={(e) => onThemeMutedFgChange(e.target.value)}
                placeholder="#64748b"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Radius MD</div>
            <Input
              value={themeRadiusMd}
              onChange={(e) => onThemeRadiusMdChange(e.target.value)}
              placeholder="0.75rem"
              disabled={disabled}
            />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideSiteHeader}
            onChange={(e) => onHideSiteHeaderChange(e.target.checked)}
            disabled={disabled}
          />
          Sembunyikan header situs (hanya konten)
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={onResetThemeLayout}
            disabled={disabled}
          >
            Reset tema & header
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
