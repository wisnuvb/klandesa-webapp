"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronUp, Layers, Settings2, Users, ListChecks, X } from "lucide-react";
import type { EditorApi } from "@/lib/letters/editor";
import { cn } from "@/components/ui/utils";
import { BlockInspector } from "./BlockInspector";
import { CheckPanel } from "./CheckPanel";
import { InsertPanel } from "./InsertPanel";
import { NumberingPanel } from "./NumberingPanel";
import { PagePanel } from "./PagePanel";
import { PeoplePanel } from "./PeoplePanel";
import { checkSummary } from "./helpers";

type TabId = "bagian" | "orang" | "halaman" | "cek";

const TABS: Array<{ id: TabId; label: string; icon: typeof Layers }> = [
  { id: "bagian", label: "Bagian", icon: Layers },
  { id: "orang", label: "Orang & isian", icon: Users },
  { id: "halaman", label: "Halaman", icon: Settings2 },
  { id: "cek", label: "Cek surat", icon: ListChecks },
];

export type SidePanelProps = {
  editor: EditorApi;
  onReveal?: (blockId: string) => void;
  className?: string;
  /** Hanya untuk layar sempit (laci dari bawah). Tanpa prop ini, status buka/tutup dikelola sendiri. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Panel samping: tab Bagian / Orang & isian / Halaman / Cek surat. Di layar lebar menjadi kolom ±360 px;
 * di layar sempit menjadi laci dari bawah dengan tombol buka/tutup.
 */
export function SidePanel({ editor, onReveal, className, open: openProp, onOpenChange }: SidePanelProps) {
  const [tab, setTab] = useState<TabId>("bagian");
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => {
    if (openProp === undefined) setOpenState(v);
    onOpenChange?.(v);
  };
  const baseId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ bagian: null, orang: null, halaman: null, cek: null });

  // Bagian dipilih dari kertas → tampilkan pengaturannya.
  const [prevSelected, setPrevSelected] = useState(editor.selectedId);
  if (editor.selectedId !== prevSelected) {
    setPrevSelected(editor.selectedId);
    if (editor.selectedId) setTab("bagian");
  }

  // Escape menutup laci di layar sempit.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && window.matchMedia("(max-width: 1023px)").matches) {
        if (openProp === undefined) setOpenState(false);
        onOpenChange?.(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openProp, onOpenChange]);

  const summary = checkSummary(editor);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  };

  const badge =
    summary.errors > 0 ? (
      <span className="ml-1 rounded-full bg-destructive px-1.5 text-xs font-semibold text-white" aria-hidden>{summary.errors}</span>
    ) : summary.hints > 0 ? (
      <span className="ml-1 rounded-full bg-muted px-1.5 text-xs font-semibold text-foreground" aria-hidden>{summary.hints}</span>
    ) : null;

  return (
    <>
      {/* Tombol buka laci (layar sempit). */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${baseId}-panel`}
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-4 right-4 z-40 flex min-h-11 items-center gap-2 rounded-full border border-input bg-background px-4 text-sm font-medium shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden",
          open && "hidden",
        )}
      >
        <ChevronUp className="h-4 w-4" aria-hidden />
        Pengaturan
        {summary.errors > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs text-white">{summary.errors}</span>}
      </button>

      <aside
        id={`${baseId}-panel`}
        ref={panelRef}
        aria-label="Panel pengaturan surat"
        className={cn(
          "flex min-h-0 flex-col bg-card text-card-foreground",
          // layar lebar: kolom tetap
          "lg:static lg:z-auto lg:flex lg:h-full lg:w-[360px] lg:shrink-0 lg:rounded-none lg:border-l lg:shadow-none",
          // layar sempit: laci dari bawah
          "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-50 max-lg:max-h-[70dvh] max-lg:rounded-t-xl max-lg:border-t max-lg:shadow-2xl",
          !open && "max-lg:hidden",
          className,
        )}
      >
        <div className="flex items-center gap-1 border-b px-2 pt-2 lg:pt-0">
          <div role="tablist" aria-label="Bagian panel" className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-orientation="horizontal">
            {TABS.map((t, i) => {
              const selected = tab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  ref={(el) => { tabRefs.current[t.id] = el; }}
                  role="tab"
                  type="button"
                  id={`${baseId}-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${baseId}-tabpanel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(t.id)}
                  onKeyDown={(e) => onTabKey(e, i)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    selected ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {t.label}
                  {t.id === "cek" && badge}
                  {t.id === "cek" && summary.total > 0 && <span className="sr-only">, {summary.label}</span>}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup panel"
            className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* Hanya panel aktif yang dirender agar mengetik di kertas tidak ikut merender panel lain. */}
        <div
          role="tabpanel"
          id={`${baseId}-tabpanel-${tab}`}
          aria-labelledby={`${baseId}-tab-${tab}`}
          tabIndex={0}
          className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {tab === "bagian" && (
            <>
              <BlockInspector editor={editor} />
              <div className="space-y-2">
                <h2 className="text-sm font-semibold">Tambah bagian</h2>
                <InsertPanel editor={editor} />
              </div>
            </>
          )}
          {tab === "orang" && <PeoplePanel editor={editor} onReveal={onReveal} />}
          {tab === "halaman" && (
            <>
              <PagePanel editor={editor} />
              <hr className="border-input" />
              <NumberingPanel editor={editor} />
            </>
          )}
          {tab === "cek" && <CheckPanel editor={editor} onReveal={onReveal} />}
        </div>
      </aside>
    </>
  );
}
