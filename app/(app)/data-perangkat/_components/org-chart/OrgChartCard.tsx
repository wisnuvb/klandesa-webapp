"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, Minus, Plus, Printer, Search, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORG_UNIT_LABELS, buildOrgTree, type OrgNode, type OrgSettings, type OrgUnit } from "@/lib/officials/org";
import type { OfficialRow } from "../../_lib/types";
import { OrgIssuesPanel } from "./OrgIssuesPanel";
import { OrgLinks } from "./OrgLinks";
import { OrgListView } from "./OrgListView";
import { OrgSettingsDialog } from "./OrgSettingsDialog";
import { OrgTreeView, type TreeContext } from "./OrgTreeView";
import { UNIT_SWATCH } from "./styles";

type Props = {
  isLoading: boolean;
  /** Daftar lengkap (tidak ikut filter tabel). */
  directory: OfficialRow[];
  settings: OrgSettings;
  canEdit: boolean;
  onDetail: (o: OfficialRow) => void;
  onEdit: (o: OfficialRow) => void;
  onSettingsSaved: (s: OrgSettings) => void;
};

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.5;
const PRINT_WIDTH_PX = 1000; // lebar isi A4 lanskap (~265 mm) pada 96 dpi, dengan margin

// Aturan cetak: hanya bagan yang tercetak, tanpa zoom layar. Skala cetak diatur lewat variabel CSS saat tombol ditekan.
const PRINT_CSS = `
@page { size: A4 landscape; margin: 10mm; }
@media print {
  body * { visibility: hidden !important; }
  #org-chart-print, #org-chart-print * { visibility: visible !important; }
  #org-chart-print { position: absolute !important; left: 0; top: 0; width: 100% !important; max-height: none !important; overflow: visible !important; border: 0 !important; }
  #org-chart-print [data-org-sizer] { width: var(--org-print-w) !important; height: var(--org-print-h) !important; }
  #org-chart-print [data-org-content] { transform: scale(var(--org-print-scale, 1)) !important; }
  .org-no-print { display: none !important; }
}`;

function norm(s: string) {
  return s.toLowerCase();
}

export function OrgChartCard({ isLoading, directory, settings, canEdit, onDetail, onEdit, onSettingsSaved }: Props) {
  const [showInactive, setShowInactive] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());
  const [mode, setMode] = useState<"fit" | number>("fit");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const tree = useMemo(() => buildOrgTree(directory, { showInactive, settings }), [directory, showInactive, settings]);
  const names = useMemo(() => new Map(directory.map((o) => [o.id, o.name])), [directory]);
  const rowById = useMemo(() => new Map(directory.map((o) => [o.id, o])), [directory]);

  const q = norm(query.trim());
  const matches = useMemo(() => {
    if (!q) return null;
    const ids = new Set<number>();
    for (const o of directory) {
      if (norm(o.name).includes(q) || norm(o.position?.name ?? "").includes(q)) ids.add(o.id);
    }
    return ids;
  }, [directory, q]);

  const links = useMemo(() => (showLinks ? tree.links : []), [showLinks, tree.links]);
  const coordinatorByTarget = useMemo(() => {
    const m = new Map<number, { name: string; derived: boolean }>();
    for (const l of tree.links) {
      const name = names.get(l.from);
      if (name) m.set(l.to, { name, derived: l.derived });
    }
    return m;
  }, [tree.links, names]);
  const coordinatorName = useCallback((id: number) => coordinatorByTarget.get(id)?.name ?? null, [coordinatorByTarget]);

  const toggle = useCallback((id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ctx: TreeContext = useMemo(
    () => ({
      // Saat mencari, semua cabang dibuka supaya hasil tidak tersembunyi.
      isCollapsed: (id) => !matches && collapsed.has(id),
      toggle,
      highlight: (node: OrgNode<OfficialRow>) => (matches ? (matches.has(node.person.id) ? "match" : "dim") : null),
      coordinatorOf: (id) => coordinatorByTarget.get(id) ?? null,
      canEdit,
      onDetail,
      onEdit,
    }),
    [matches, collapsed, toggle, coordinatorByTarget, canEdit, onDetail, onEdit],
  );

  // --- Ukuran & zoom -------------------------------------------------------
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewportW, setViewportW] = useState(0);

  useLayoutEffect(() => {
    const content = contentRef.current;
    const viewport = viewportRef.current;
    if (!content || !viewport) return;
    const measure = () => {
      setSize({ w: content.offsetWidth, h: content.offsetHeight });
      setViewportW(viewport.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [isLoading, tree]);

  const fit = size.w > 0 && viewportW > 0 ? Math.min(1, Math.max(MIN_ZOOM, (viewportW - 32) / size.w)) : 1;
  const zoom = mode === "fit" ? fit : mode;
  const stepZoom = (delta: number) => setMode(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((zoom + delta) * 10) / 10)));

  const layoutVersion = useMemo(() => `${[...collapsed].join(",")}|${showInactive}|${matches ? "q" : ""}|${size.w}x${size.h}`, [collapsed, showInactive, matches, size]);

  function print() {
    const el = printRef.current;
    if (el && size.w > 0) {
      const scale = Math.min(1, PRINT_WIDTH_PX / size.w);
      el.style.setProperty("--org-print-scale", String(scale));
      el.style.setProperty("--org-print-w", `${Math.ceil(size.w * scale)}px`);
      el.style.setProperty("--org-print-h", `${Math.ceil(size.h * scale)}px`);
    }
    window.print();
  }

  const unitsPresent = useMemo(() => {
    const set = new Set<OrgUnit>();
    const walk = (n: OrgNode<OfficialRow>) => {
      set.add(n.unit);
      n.children.forEach(walk);
    };
    [...tree.roots, ...tree.orphans].forEach(walk);
    return (["LEADER", "SECRETARIAT", "TECHNICAL", "REGIONAL", "OTHER"] as const).filter((u) => set.has(u));
  }, [tree]);

  const onFix = (id: number) => {
    const row = rowById.get(id);
    if (row) onEdit(row);
  };

  const empty = !isLoading && tree.count === 0;
  const shownRoots = tree.roots;

  return (
    <Card>
      <style>{PRINT_CSS}</style>
      <CardHeader className="org-no-print space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Bagan Hirarki Perangkat Desa</CardTitle>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Mengikuti atasan yang diisi di data perangkat dan susunan Permendagri 84/2015: Kepala Desa membawahi Sekretariat (Sekdes dan Kaur), Pelaksana Teknis (Kasi), dan Pelaksana Kewilayahan (Kepala Dusun).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button type="button" variant="outline" className="h-11 gap-2" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                Pengaturan bagan
              </Button>
            )}
            <Button type="button" variant="outline" className="hidden h-11 gap-2 md:inline-flex" onClick={print} disabled={empty || isLoading}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Cetak / PDF
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Sorot nama atau jabatan…"
              aria-label="Sorot nama atau jabatan di bagan"
              className="h-11 pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="org-inactive" checked={showInactive} onCheckedChange={(c) => setShowInactive(c === true)} />
            <Label htmlFor="org-inactive" className="min-h-8 font-normal">
              Tampilkan yang nonaktif
            </Label>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <Checkbox id="org-links" checked={showLinks} onCheckedChange={(c) => setShowLinks(c === true)} />
            <Label htmlFor="org-links" className="min-h-8 font-normal">
              Garis koordinasi
            </Label>
          </div>
          {matches && (
            <p role="status" className="text-sm text-muted-foreground">
              {matches.size} cocok
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="org-no-print space-y-4">
          <OrgIssuesPanel anomalies={tree.anomalies} canEdit={canEdit} onFix={onFix} />

          {!empty && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-700" aria-label="Keterangan bagan">
              {unitsPresent.map((u) => (
                <span key={u} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className={`h-3 w-1 rounded-sm ${UNIT_SWATCH[u]}`} />
                  {ORG_UNIT_LABELS[u]}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-0 w-6 border-t-2 border-foreground/60" />
                Melapor ke (komando)
              </span>
              {tree.links.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-orange-800">
                  <span aria-hidden="true" className="h-0 w-6 border-t-2 border-dashed border-current" />
                  Koordinasi
                </span>
              )}
            </div>
          )}
        </div>

        {isLoading && directory.length === 0 ? (
          <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Memuat bagan…
          </p>
        ) : empty ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada perangkat aktif untuk ditampilkan. Tambahkan perangkat lewat tombol Tambah Perangkat{showInactive ? "" : ", atau centang “Tampilkan yang nonaktif”"}.
          </p>
        ) : (
          <>
            {/* Layar lebar: bagan dengan zoom */}
            <div className="hidden md:block">
              <div className="org-no-print mb-2 flex items-center justify-end gap-1">
                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => stepZoom(-0.1)} disabled={zoom <= MIN_ZOOM} aria-label="Perkecil">
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <span className="w-12 text-center text-sm tabular-nums" role="status" aria-label="Tingkat zoom">
                  {Math.round(zoom * 100)}%
                </span>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => stepZoom(0.1)} disabled={zoom >= MAX_ZOOM} aria-label="Perbesar">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button type="button" variant={mode === "fit" ? "secondary" : "outline"} className="h-9" onClick={() => setMode("fit")} aria-pressed={mode === "fit"}>
                  Pas layar
                </Button>
                <Button type="button" variant="outline" className="h-9" onClick={() => setMode(1)}>
                  100%
                </Button>
              </div>

              <div
                id="org-chart-print"
                ref={(el) => {
                  printRef.current = el;
                  viewportRef.current = el;
                }}
                role="region"
                tabIndex={0}
                aria-label="Bagan hirarki perangkat desa, dapat digeser dengan tombol panah"
                className="max-h-[75dvh] overflow-auto rounded-lg border bg-muted/20 p-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <h2 className="mb-3 hidden text-lg font-semibold print:block">Bagan Struktur Pemerintah Desa</h2>
                <div data-org-sizer className="relative mx-auto" style={{ width: size.w * zoom, height: size.h * zoom }}>
                  <div
                    ref={contentRef}
                    data-org-content
                    className="absolute top-0 left-0 w-max origin-top-left pb-1"
                    style={{ transform: `scale(${zoom})` }}
                  >
                    <OrgTreeView roots={shownRoots} ctx={ctx} />
                    {tree.orphans.length > 0 && (
                      <section aria-label="Belum terhubung ke bagan" className="mt-12 border-t-2 border-dashed pt-4">
                        <h3 className="mb-3 text-sm font-semibold">Belum terhubung ke bagan ({tree.orphans.length})</h3>
                        <OrgTreeView roots={tree.orphans} ctx={ctx} />
                      </section>
                    )}
                    <OrgLinks contentRef={contentRef} links={links} zoom={zoom} names={names} version={layoutVersion} />
                  </div>
                </div>
              </div>
            </div>

            {/* Layar sempit: daftar bertingkat */}
            <div className="space-y-4 md:hidden">
              <OrgListView roots={shownRoots} canEdit={canEdit} coordinatorOf={coordinatorName} onDetail={onDetail} onEdit={onEdit} />
              {tree.orphans.length > 0 && (
                <section aria-label="Belum terhubung ke bagan" className="space-y-2 border-t-2 border-dashed pt-3">
                  <h3 className="text-sm font-semibold">Belum terhubung ke bagan ({tree.orphans.length})</h3>
                  <OrgListView roots={tree.orphans} canEdit={canEdit} coordinatorOf={coordinatorName} onDetail={onDetail} onEdit={onEdit} />
                </section>
              )}
            </div>
          </>
        )}

        {directory.length >= 100 && (
          <p className="org-no-print text-xs text-muted-foreground">Bagan memuat 100 perangkat pertama.</p>
        )}
      </CardContent>

      <OrgSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onSaved={onSettingsSaved} />
    </Card>
  );
}
