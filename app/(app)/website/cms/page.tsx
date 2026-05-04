"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ResolvedEngineStructure,
  WebsiteCMSPage,
  WebsiteNavItem,
  WebsiteSection,
} from "@/lib/website-engine/types";
import type { SectionKind } from "@/lib/website-engine/site-sections";
import { WEBSITE_SECTION_REGISTRY } from "@/lib/website-engine/site-sections";
import {
  getWebsitePagesSlugConflictMessage,
  sanitizePageSlug,
} from "@/lib/website-engine/resolved-structure";
import type { EngineConfigResponse } from "./_lib/types";
import type { SectionSchemaEntry } from "./_lib/types";
import { mapEngineConfigResponseToLoadResult } from "./_lib/config-mapper";
import { serializeCmsWorkspaceState } from "./_lib/snapshot";
import { buildV2Overrides } from "./_lib/save-helpers";
import { CmsPageHeader } from "./_components/CmsPageHeader";
import { CmsContentShortcutsCard } from "./_components/CmsContentShortcutsCard";
import { CmsFaviconSection } from "./_components/CmsFaviconSection";
import { CmsThemeLayoutCard } from "./_components/CmsThemeLayoutCard";
import { CmsPresetCard } from "./_components/CmsPresetCard";
import { CmsMenuPagesCard } from "./_components/CmsMenuPagesCard";
import { CmsTemplateLibraryCard } from "./_components/CmsTemplateLibraryCard";
import { CmsLivePreviewCard } from "./_components/CmsLivePreviewCard";

export default function WebsiteCmsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [templateName, setTemplateName] = useState<string>("-");
  const [templateKey, setTemplateKey] = useState<string>("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [presets, setPresets] = useState<Array<{ key: string; name: string }>>(
    [],
  );
  const [presetKey, setPresetKey] = useState<string>("");
  const [engine, setEngine] = useState<ResolvedEngineStructure | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [allowedKinds, setAllowedKinds] = useState<SectionKind[]>([]);
  const [sectionSchema, setSectionSchema] = useState<SectionSchemaEntry[]>([]);
  const [heroVariants, setHeroVariants] = useState<Array<"center" | "split">>([
    "center",
  ]);

  const [themePrimary, setThemePrimary] = useState("");
  const [themeAccent, setThemeAccent] = useState("");
  const [themeFont, setThemeFont] = useState("");
  const [themeFontHeading, setThemeFontHeading] = useState("");
  const [themeSurface, setThemeSurface] = useState("");
  const [themeSurfaceMuted, setThemeSurfaceMuted] = useState("");
  const [themeBorder, setThemeBorder] = useState("");
  const [themeMutedFg, setThemeMutedFg] = useState("");
  const [themeRadiusMd, setThemeRadiusMd] = useState("");
  const [hideSiteHeader, setHideSiteHeader] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [villageProfile, setVillageProfile] = useState<{
    name: string;
    address: string;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
  } | null>(null);

  const activePage = engine?.pages[pageIndex];
  const sections = activePage?.sections ?? [];

  const slugConflictMessage = useMemo(
    () => (engine ? getWebsitePagesSlugConflictMessage(engine.pages) : null),
    [engine],
  );

  const snapshot = useMemo(
    () =>
      serializeCmsWorkspaceState({
        presetKey,
        engine,
        pageIndex,
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
        faviconUrl,
      }),
    [
      presetKey,
      engine,
      pageIndex,
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
      faviconUrl,
    ],
  );
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const isDirty = initialSnapshot !== "" && snapshot !== initialSnapshot;

  const applyLoadResult = useCallback(
    (data: ReturnType<typeof mapEngineConfigResponseToLoadResult>) => {
      setTemplateName(data.templateName);
      setTemplateKey(data.templateKey);
      setCapabilities(data.capabilities);
      setPresets(data.presets);
      setPresetKey(data.presetKey);
      setEngine(data.engine);
      setPageIndex(data.pageIndex);
      setAllowedKinds(data.allowedKinds);
      setSectionSchema(data.sectionSchema);
      setHeroVariants(data.heroVariants);
      setThemePrimary(data.themePrimary);
      setThemeAccent(data.themeAccent);
      setThemeFont(data.themeFont);
      setThemeFontHeading(data.themeFontHeading);
      setThemeSurface(data.themeSurface);
      setThemeSurfaceMuted(data.themeSurfaceMuted);
      setThemeBorder(data.themeBorder);
      setThemeMutedFg(data.themeMutedFg);
      setThemeRadiusMd(data.themeRadiusMd);
      setHideSiteHeader(data.hideSiteHeader);
      setFaviconUrl(data.faviconUrl);
      setInitialSnapshot(data.initialSnapshot);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/website/engine/config", {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as
        | EngineConfigResponse
        | { error?: string }
        | null;
      if (!res.ok) {
        const msg =
          json && "error" in json && typeof json.error === "string"
            ? json.error
            : "Gagal memuat CMS";
        throw new Error(msg);
      }
      if (!json || !("effective_structure" in json)) {
        throw new Error("Response CMS tidak valid");
      }
      applyLoadResult(mapEngineConfigResponseToLoadResult(json));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, [applyLoadResult]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/village/profile", { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) return;
        const name = typeof j?.name === "string" ? j.name : "";
        const address = typeof j?.address === "string" ? j.address : "";
        if (!name || !address) return;
        setVillageProfile({
          name,
          address,
          phone: typeof j?.phone === "string" ? j.phone : null,
          email: typeof j?.email === "string" ? j.email : null,
          website: typeof j?.website === "string" ? j.website : null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePreset = useCallback(
    async (nextKey: string) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/website/engine/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preset_key: nextKey ? nextKey : null,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) throw new Error(json?.error || "Gagal menerapkan preset");
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal menerapkan preset");
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  const saveAll = useCallback(async () => {
    if (!engine) return;
    const slugErr = getWebsitePagesSlugConflictMessage(engine.pages);
    if (slugErr) {
      setError(slugErr);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const themePayload: Record<string, string> = {};
      const setIf = (key: string, v: string) => {
        const t = v.trim();
        if (t) themePayload[key] = t;
      };
      setIf("primary", themePrimary);
      setIf("accent", themeAccent);
      setIf("fontBody", themeFont);
      setIf("fontHeading", themeFontHeading);
      setIf("surface", themeSurface);
      setIf("surfaceMuted", themeSurfaceMuted);
      setIf("border", themeBorder);
      setIf("mutedForeground", themeMutedFg);
      setIf("radiusMd", themeRadiusMd);

      const res = await fetch("/api/website/engine/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrides: buildV2Overrides(engine, heroVariants),
          theme: Object.keys(themePayload).length ? themePayload : undefined,
          layout: { hideSiteHeader },
          site_seo: null,
          favicon_url: faviconUrl.trim() ? faviconUrl.trim() : null,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }, [
    engine,
    heroVariants,
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
    faviconUrl,
    load,
  ]);

  const resetStructure = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/website/engine/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: null }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "Gagal reset struktur");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal reset struktur");
    } finally {
      setSaving(false);
    }
  }, [load]);

  const resetThemeLayout = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/website/engine/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: null, layout: null, site_seo: null }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) throw new Error(json?.error || "Gagal reset tampilan");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal reset tampilan");
    } finally {
      setSaving(false);
    }
  }, [load]);

  const patchCurrentPage = useCallback(
    (fn: (p: WebsiteCMSPage) => WebsiteCMSPage) => {
      setEngine((e) => {
        if (!e) return e;
        const pages = [...e.pages];
        const p = pages[pageIndex];
        if (!p) return e;
        pages[pageIndex] = fn(p);
        return { ...e, pages };
      });
    },
    [pageIndex],
  );

  const updateNav = useCallback(
    (idx: number, patch: Partial<WebsiteNavItem>) => {
      setEngine((e) => {
        if (!e) return e;
        const nav = [...e.nav];
        const cur = nav[idx];
        if (!cur) return e;
        nav[idx] = { ...cur, ...patch };
        return { ...e, nav };
      });
    },
    [],
  );

  const addNavRow = useCallback(() => {
    setEngine((e) => {
      if (!e) return e;
      return {
        ...e,
        nav: [...e.nav, { label: "Menu", href: "/", external: false }],
      };
    });
  }, []);

  const removeNavRow = useCallback((idx: number) => {
    setEngine((e) => {
      if (!e) return e;
      return { ...e, nav: e.nav.filter((_, i) => i !== idx) };
    });
  }, []);

  const addPage = useCallback(() => {
    const base = `halaman-${(engine?.pages.length ?? 0) + 1}`;
    const slug = sanitizePageSlug(base);
    const pg: WebsiteCMSPage = {
      id: `p-${slug}-${Date.now()}`,
      slug,
      title: "Halaman baru",
      sections: [],
    };
    const nextIndex = engine?.pages.length ?? 0;
    setEngine((e) => {
      if (!e) return e;
      return { ...e, pages: [...e.pages, pg] };
    });
    setPageIndex(nextIndex);
  }, [engine?.pages.length]);

  const removeCurrentPage = useCallback(() => {
    if (!engine || !activePage) return;
    if (activePage.slug === "") {
      setError("Halaman beranda tidak boleh dihapus.");
      return;
    }
    setEngine((e) => {
      if (!e) return e;
      const pages = e.pages.filter((_, i) => i !== pageIndex);
      return { ...e, pages };
    });
    setPageIndex((i) => Math.max(0, i - 1));
  }, [engine, activePage, pageIndex]);

  const moveSection = useCallback(
    (from: number, direction: -1 | 1) => {
      patchCurrentPage((p) => {
        const to = from + direction;
        if (to < 0 || to >= p.sections.length) return p;
        const next = [...p.sections];
        const tmp = next[from];
        next[from] = next[to];
        next[to] = tmp;
        return { ...p, sections: next };
      });
    },
    [patchCurrentPage],
  );

  const removeSectionAt = useCallback(
    (idx: number) => {
      patchCurrentPage((p) => ({
        ...p,
        sections: p.sections.filter((_, i) => i !== idx),
      }));
    },
    [patchCurrentPage],
  );

  const [newKind, setNewKind] = useState<SectionKind>("news");

  const addSection = useCallback(
    (kind: SectionKind) => {
      const def = WEBSITE_SECTION_REGISTRY[kind];
      patchCurrentPage((p) => ({
        ...p,
        sections: [...p.sections, def.createDefault()],
      }));
    },
    [patchCurrentPage],
  );

  const patchSectionField = useCallback(
    (idx: number, fieldName: string, value: string | number | boolean) => {
      patchCurrentPage((p) => ({
        ...p,
        sections: p.sections.map((sec, i) => {
          if (i !== idx) return sec;
          const next = { ...(sec as unknown as Record<string, unknown>) };
          const parts = fieldName
            .split(".")
            .map((s) => s.trim())
            .filter(Boolean);
          if (parts.length <= 1) {
            next[fieldName] = value;
            return next as WebsiteSection;
          }
          let cur: Record<string, unknown> = next;
          for (let pi = 0; pi < parts.length - 1; pi++) {
            const k = parts[pi]!;
            const existing = cur[k];
            const obj =
              existing &&
              typeof existing === "object" &&
              !Array.isArray(existing)
                ? { ...(existing as Record<string, unknown>) }
                : {};
            cur[k] = obj;
            cur = obj;
          }
          cur[parts[parts.length - 1]!] = value;
          return next as WebsiteSection;
        }),
      }));
    },
    [patchCurrentPage],
  );

  const reorderSections = useCallback(
    (from: number, to: number) => {
      patchCurrentPage((p) => {
        if (from === to) return p;
        if (from < 0 || to < 0) return p;
        if (from >= p.sections.length || to >= p.sections.length) return p;
        const next = [...p.sections];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return { ...p, sections: next };
      });
    },
    [patchCurrentPage],
  );

  const capSet = useMemo(() => new Set(capabilities), [capabilities]);
  const showNewsShortcut = capSet.has("content_news");
  const showProfileShortcut = capSet.has("content_profile");

  const handlePresetSelect = useCallback(
    (v: string) => {
      setPresetKey(v);
      void updatePreset(v);
    },
    [updatePreset],
  );

  const canRemoveCurrentPage = Boolean(
    engine && engine.pages[pageIndex] && engine.pages[pageIndex].slug !== "",
  );

  const previewTheme = useMemo(() => {
    const setIf = (v: string) => (v.trim() ? v.trim() : undefined);
    return {
      primary: setIf(themePrimary),
      accent: setIf(themeAccent),
      fontBody: setIf(themeFont),
      fontHeading: setIf(themeFontHeading),
      surface: setIf(themeSurface),
      surfaceMuted: setIf(themeSurfaceMuted),
      border: setIf(themeBorder),
      mutedForeground: setIf(themeMutedFg),
      radiusMd: setIf(themeRadiusMd),
    };
  }, [
    themePrimary,
    themeAccent,
    themeFont,
    themeFontHeading,
    themeSurface,
    themeSurfaceMuted,
    themeBorder,
    themeMutedFg,
    themeRadiusMd,
  ]);

  return (
    <div className="space-y-6">
      <CmsPageHeader
        templateName={templateName}
        templateKey={templateKey}
        capabilities={capabilities}
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <CmsContentShortcutsCard
        showNewsShortcut={showNewsShortcut}
        showProfileShortcut={showProfileShortcut}
      />

      <CmsFaviconSection
        faviconUrl={faviconUrl}
        onFaviconUrlChange={setFaviconUrl}
        disabled={saving || loading}
      />

      <CmsThemeLayoutCard
        loading={loading}
        saving={saving}
        themePrimary={themePrimary}
        themeAccent={themeAccent}
        themeFont={themeFont}
        themeFontHeading={themeFontHeading}
        themeSurface={themeSurface}
        themeSurfaceMuted={themeSurfaceMuted}
        themeBorder={themeBorder}
        themeMutedFg={themeMutedFg}
        themeRadiusMd={themeRadiusMd}
        hideSiteHeader={hideSiteHeader}
        onThemePrimaryChange={setThemePrimary}
        onThemeAccentChange={setThemeAccent}
        onThemeFontChange={setThemeFont}
        onThemeFontHeadingChange={setThemeFontHeading}
        onThemeSurfaceChange={setThemeSurface}
        onThemeSurfaceMutedChange={setThemeSurfaceMuted}
        onThemeBorderChange={setThemeBorder}
        onThemeMutedFgChange={setThemeMutedFg}
        onThemeRadiusMdChange={setThemeRadiusMd}
        onHideSiteHeaderChange={setHideSiteHeader}
        onResetThemeLayout={resetThemeLayout}
      />

      <CmsPresetCard
        loading={loading}
        saving={saving}
        presetKey={presetKey}
        presets={presets}
        onPresetSelect={handlePresetSelect}
        onResetStructure={resetStructure}
      />

      <CmsMenuPagesCard
        engine={engine}
        loading={loading}
        saving={saving}
        pageIndex={pageIndex}
        slugConflictMessage={slugConflictMessage}
        activePage={activePage}
        sections={sections}
        sectionSchema={sectionSchema}
        allowedKinds={allowedKinds}
        newKind={newKind}
        isDirty={isDirty}
        onPageIndexChange={setPageIndex}
        onAddPage={addPage}
        onRemoveCurrentPage={removeCurrentPage}
        canRemoveCurrentPage={canRemoveCurrentPage}
        onPatchPage={patchCurrentPage}
        onUpdateNav={updateNav}
        onAddNavRow={addNavRow}
        onRemoveNavRow={removeNavRow}
        onMoveSection={moveSection}
        onReorderSection={reorderSections}
        onRemoveSection={removeSectionAt}
        onPatchSectionField={patchSectionField}
        onNewKindChange={setNewKind}
        onAddSection={addSection}
        onSaveAll={saveAll}
      />

      <CmsTemplateLibraryCard
        disabled={saving || loading}
        onReloadEngine={load}
      />

      <CmsLivePreviewCard
        templateKey={templateKey}
        theme={previewTheme}
        hideSiteHeader={hideSiteHeader}
        navItems={engine?.nav ?? []}
        page={activePage}
        village={villageProfile}
      />
    </div>
  );
}
