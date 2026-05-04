"use client";

import { memo, useMemo } from "react";
import { Plus, Save } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ResolvedEngineStructure,
  WebsiteCMSPage,
  WebsiteNavItem,
  WebsiteSection,
} from "@/lib/website-engine/types";
import type { SectionKind } from "@/lib/website-engine/site-sections";
import {
  getSectionDefinition,
  WEBSITE_SECTION_REGISTRY,
} from "@/lib/website-engine/site-sections";
import type { SectionSchemaEntry } from "../_lib/types";
import { CmsActivePageFields } from "./CmsActivePageFields";
import { CmsNavEditor } from "./CmsNavEditor";
import { CmsSectionBlockCard } from "./CmsSectionBlockCard";

type Props = {
  engine: ResolvedEngineStructure | null;
  loading: boolean;
  saving: boolean;
  pageIndex: number;
  slugConflictMessage: string | null;
  activePage: WebsiteCMSPage | undefined;
  sections: WebsiteSection[];
  sectionSchema: SectionSchemaEntry[];
  allowedKinds: SectionKind[];
  newKind: SectionKind;
  isDirty: boolean;
  onPageIndexChange: (index: number) => void;
  onAddPage: () => void;
  onRemoveCurrentPage: () => void;
  canRemoveCurrentPage: boolean;
  onPatchPage: (fn: (p: WebsiteCMSPage) => WebsiteCMSPage) => void;
  onUpdateNav: (idx: number, patch: Partial<WebsiteNavItem>) => void;
  onAddNavRow: () => void;
  onRemoveNavRow: (idx: number) => void;
  onMoveSection: (from: number, direction: -1 | 1) => void;
  onReorderSection: (from: number, to: number) => void;
  onRemoveSection: (idx: number) => void;
  onPatchSectionField: (
    idx: number,
    fieldName: string,
    value: string | number | boolean,
  ) => void;
  onNewKindChange: (k: SectionKind) => void;
  onAddSection: (kind: SectionKind) => void;
  onSaveAll: () => void;
};

export const CmsMenuPagesCard = memo(function CmsMenuPagesCard({
  engine,
  loading,
  saving,
  pageIndex,
  slugConflictMessage,
  activePage,
  sections,
  sectionSchema,
  allowedKinds,
  newKind,
  isDirty,
  onPageIndexChange,
  onAddPage,
  onRemoveCurrentPage,
  canRemoveCurrentPage,
  onPatchPage,
  onUpdateNav,
  onAddNavRow,
  onRemoveNavRow,
  onMoveSection,
  onReorderSection,
  onRemoveSection,
  onPatchSectionField,
  onNewKindChange,
  onAddSection,
  onSaveAll,
}: Props) {
  const schemaByKind = useMemo(() => {
    const m = new Map(sectionSchema.map((e) => [e.kind, e] as const));
    return m;
  }, [sectionSchema]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu & halaman</CardTitle>
        <CardDescription>
          Alur: pilih halaman → isi identitas & SEO → susun menu → atur blok
          konten. Gunakan{" "}
          <span className="font-medium text-foreground">Simpan perubahan</span>{" "}
          agar data tersimpan di database (tetap persisten setelah reload).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Halaman aktif:</span>
          <select
            className="h-9 min-w-[200px] rounded-md border bg-background px-3 text-sm"
            value={pageIndex}
            onChange={(e) => onPageIndexChange(Number(e.target.value))}
            disabled={saving || loading || !engine}
          >
            {(engine?.pages ?? []).map((p, i) => (
              <option key={`${p.id}-${i}`} value={i}>
                {p.title || p.slug || "Beranda"}{" "}
                {p.slug === "" ? "(beranda)" : `(/${p.slug})`}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddPage}
            disabled={saving || loading || !engine}
          >
            <Plus className="size-4" />
            Halaman baru
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onRemoveCurrentPage}
            disabled={saving || loading || !engine || !canRemoveCurrentPage}
          >
            Hapus halaman
          </Button>
        </div>

        {activePage ? (
          <CmsActivePageFields
            activePage={activePage}
            saving={saving}
            slugConflictMessage={slugConflictMessage}
            onPatchPage={onPatchPage}
          />
        ) : null}

        {engine ? (
          <CmsNavEditor
            nav={engine.nav}
            saving={saving}
            onUpdateNav={onUpdateNav}
            onAddNavRow={onAddNavRow}
            onRemoveNavRow={onRemoveNavRow}
          />
        ) : null}

        <div className="space-y-3 border-border border-t pt-6">
          <div>
            <div className="text-sm font-medium">Blok halaman</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Urutan bagian konten untuk halaman yang sedang dipilih di atas.
            </p>
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat...</div>
          ) : (
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-3">
                {sections.map((s, idx) => {
                  const fromSchema = schemaByKind.get(s.kind);
                  const def = getSectionDefinition(s.kind);
                  const label = fromSchema?.label ?? def.label;
                  const fields = fromSchema?.cmsFields ?? def.cmsFields;
                  return (
                    <CmsSectionBlockCard
                      key={`${s.kind}-${idx}`}
                      idx={idx}
                      section={s}
                      label={label}
                      fields={fields}
                      saving={saving}
                      sectionCount={sections.length}
                      onMoveUp={(i) => onMoveSection(i, -1)}
                      onMoveDown={(i) => onMoveSection(i, 1)}
                      onReorder={onReorderSection}
                      onRemove={onRemoveSection}
                      onPatchField={onPatchSectionField}
                    />
                  );
                })}
              </div>
            </DndProvider>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={newKind}
                onChange={(e) =>
                  onNewKindChange(e.target.value as SectionKind)
                }
                disabled={saving}
              >
                {allowedKinds.map((k) => (
                  <option key={k} value={k}>
                    {WEBSITE_SECTION_REGISTRY[k].label}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                type="button"
                onClick={() => onAddSection(newKind)}
                disabled={
                  saving || loading || allowedKinds.length === 0 || !engine
                }
              >
                Tambah bagian
              </Button>
            </div>

            <Button
              type="button"
              onClick={onSaveAll}
              disabled={
                saving ||
                loading ||
                !isDirty ||
                !engine ||
                Boolean(slugConflictMessage)
              }
            >
              <Save className="size-4" />
              Simpan perubahan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
