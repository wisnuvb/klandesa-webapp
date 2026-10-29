"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Editor } from "@tiptap/core";
import { Undo2 } from "lucide-react";
import { LetterPaperFrame } from "@/components/letters/LetterPaper";
import type { Block } from "@/lib/letters/document/schema";
import type { EditorApi, PresetId } from "@/lib/letters/editor";
import { sampleLetterValues, type LetterValues } from "@/lib/letters/values";
import type { CanvasOps } from "./BlockContent";
import type { FocusPoint } from "./BlockEditSurface";
import { InsertMenuButton } from "./InsertMenu";
import { prefetchInlineEditor } from "./InlineEditorLazy";
import { ScaleContext, Unscaled } from "./scale";
import { SortableBlock, type DropEdge } from "./SortableBlock";
import { Toolbar } from "./Toolbar";
import {
  ZOOM_STEP,
  blockLabel,
  clampZoom,
  issuesByBlock,
  locateBlock,
  mmToPx,
  pageGuides,
  paperPx,
  paperScale,
  minFitFor,
} from "./helpers";

export type CanvasProps = {
  editor: EditorApi;
  /** Nilai contoh yang mengisi kertas; bila kosong dipakai data contoh dari registry. */
  values?: LetterValues;
  /** Gambar QR contoh untuk bagian Kode QR. */
  qrSrc?: string;
  className?: string;
};

const CANVAS_CSS = `
.lc-inline .ProseMirror{outline:none;white-space:pre-wrap;word-break:break-word}
.lc-inline .ProseMirror p{margin:0}
.lc-inline:focus-within{border-radius:2px;background:rgba(224,242,254,.5);box-shadow:0 0 0 2px #0284c7}
.lc-inline .ProseMirror-selectednode{outline:2px solid #0284c7;outline-offset:1px;border-radius:3px}
@media (prefers-reduced-motion:reduce){.lc-root *{scroll-behavior:auto!important;transition:none!important}}
`;

/**
 * Kanvas editor surat: kertas yang bisa disunting langsung. Bagian yang tidak dipilih dirender
 * sebagai pratinjau (memo per bagian); bagian terpilih berubah menjadi penyunting teks di tempat.
 * Komponen ini mengisi tinggi induknya (induk harus punya tinggi: `flex-1 min-h-0` atau tinggi tetap).
 */
export function Canvas({ editor, values, qrSrc, className }: CanvasProps) {
  const {
    doc, selectedId, select, updateBlock, addBlock, removeBlock, moveBlock, moveBlockBy, duplicateBlock,
    addField, undo, redo, issues,
  } = editor;

  // ---- nilai contoh
  const { people, fields, groups } = doc;
  const sample = useMemo(() => sampleLetterValues({ people, fields, groups }), [people, fields, groups]);
  const vals = values ?? sample;

  // ---- ukuran & skala kertas
  const scrollRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [paperH, setPaperH] = useState(0);
  const [zoom, setZoom] = useState(1);
  const px = paperPx(doc.page);
  const scale = paperScale(containerW, px.width, zoom, 32, minFitFor(containerW));
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const scroller = scrollRef.current;
    const paper = paperRef.current;
    if (!scroller || !paper || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setContainerW(scroller.clientWidth);
      setPaperH(paper.offsetHeight);
    });
    ro.observe(scroller);
    ro.observe(paper);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(prefetchInlineEditor, 600);
    return () => window.clearTimeout(id);
  }, []);

  // ---- status sementara
  const [textEditor, setTextEditor] = useState<Editor | null>(null);
  const [focus, setFocus] = useState<FocusPoint | null>(null);
  const [toast, setToast] = useState<{ text: string } | null>(null);
  const [live, setLive] = useState("");

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [toast]);

  // ---- fungsi tetap untuk baris
  const ops = useMemo<CanvasOps>(
    () => ({
      select: (id) => {
        setFocus(null);
        select(id);
      },
      clickBlock: (id, x, y) => {
        setFocus({ id, x, y });
        select(id);
      },
      updateBlock: (id, patch) => updateBlock(id, patch),
      addBlock: (preset, at) => {
        addBlock(preset, at);
      },
      moveBy: (id, delta) => {
        const r = moveBlockBy(id, delta);
        setLive(r.ok ? (delta < 0 ? "Bagian dinaikkan." : "Bagian diturunkan.") : r.error);
      },
      setTextEditor,
      createField: (input) => addField(input.label, input.type, input.options ? { options: input.options } : undefined),
      replaceWithPreset: (blockId, preset) => {
        addBlock(preset, { after: blockId });
        removeBlock(blockId);
      },
      consumeFocus: () => setFocus(null),
    }),
    [select, updateBlock, addBlock, moveBlockBy, addField, removeBlock],
  );

  // ---- galat per bagian (referensi dijaga stabil)
  // Kunci teks: Map baru hanya dibuat bila isi galat berubah, bukan tiap ketikan.
  const issueKey = JSON.stringify(Array.from(issuesByBlock(issues)));
  const issueMap = useMemo(() => new Map(JSON.parse(issueKey) as Array<[string, string]>) as ReadonlyMap<string, string>, [issueKey]);

  // ---- seret & lepas
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [drag, setDrag] = useState<{ activeId: string; overId: string | null } | null>(null);
  const ids = useMemo(() => doc.body.map((b) => b.id), [doc.body]);

  /** Gerak seret dalam koordinat kertas (bukan layar): bagi dengan skala dan kunci ke sumbu vertikal. */
  const scaleModifier = useCallback<Modifier>(({ transform }) => ({ ...transform, x: 0, y: transform.y / scaleRef.current }), []);

  const nameOf = (id: unknown): string => {
    const b = doc.body.find((x) => x.id === id);
    return b ? blockLabel(b) : "Bagian";
  };
  const positionOf = (id: unknown): string => `posisi ${ids.indexOf(String(id)) + 1} dari ${ids.length}`;

  const onDragStart = (e: DragStartEvent) => setDrag({ activeId: String(e.active.id), overId: String(e.active.id) });
  const onDragOver = (e: DragOverEvent) =>
    setDrag((d) => (d ? { ...d, overId: e.over ? String(e.over.id) : null } : d));
  const onDragEnd = (e: DragEndEvent) => {
    setDrag(null);
    const active = String(e.active.id);
    const over = e.over ? String(e.over.id) : null;
    if (!over || over === active) return;
    const to = ids.indexOf(over) > ids.indexOf(active) ? { after: over } : { before: over };
    const r = moveBlock(active, to);
    setLive(r.ok ? `${nameOf(active)} dipindahkan.` : r.error);
  };

  const dropEdgeFor = (id: string): DropEdge => {
    if (!drag || !drag.overId || drag.overId === drag.activeId || drag.overId !== id) return null;
    return ids.indexOf(drag.activeId) < ids.indexOf(id) ? "after" : "before";
  };

  // ---- bilah alat
  const place = locateBlock(doc, selectedId);
  const typeLabel = place ? blockLabel(place.block) : null;

  const removeSelected = () => {
    if (!selectedId || !place) return;
    const label = blockLabel(place.block);
    removeBlock(selectedId);
    setToast({ text: `${label} dihapus` });
  };

  const addFromToolbar = (preset: PresetId) => {
    if (place) addBlock(preset, { after: place.block.id });
    else addBlock(preset);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Peristiwa dari popover (portal) ikut menggelembung lewat pohon React; abaikan.
    if (!e.currentTarget.contains(e.target as Node)) return;
    const t = e.target as HTMLElement;
    const inInput = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT";
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !inInput) {
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (k === "y") {
        e.preventDefault();
        redo();
        return;
      }
    }
    if (e.key === "Escape" && !e.defaultPrevented && selectedId) {
      const top = place?.topId;
      ops.select(null);
      if (top) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-block-id="${top}"]`)?.focus());
    }
  };

  const guides = pageGuides(paperH - mmToPx(doc.page.margin.bottom), doc.page);

  return (
    <ScaleContext.Provider value={scale}>
      <div className={["lc-root flex h-full min-h-[24rem] flex-col", className].filter(Boolean).join(" ")}>
        <style>{CANVAS_CSS}</style>
        <Toolbar
          doc={doc}
          textEditor={textEditor}
          hasSelection={!!place}
          selectionLabel={typeLabel}
          canMoveUp={!!place && place.index > 0}
          canMoveDown={!!place && place.index < place.count - 1}
          onMoveUp={() => selectedId && ops.moveBy(selectedId, -1)}
          onMoveDown={() => selectedId && ops.moveBy(selectedId, 1)}
          onDuplicate={() => {
            if (!selectedId) return;
            if (duplicateBlock(selectedId) === null) setLive("Bagian ini tidak bisa digandakan.");
          }}
          onRemove={removeSelected}
          onAddBlock={addFromToolbar}
          onCreateField={ops.createField}
          zoom={zoom}
          scalePercent={Math.round(scale * 100)}
          onZoomOut={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
          onZoomIn={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
          onZoomReset={() => setZoom(1)}
        />

        <div
          ref={scrollRef}
          className="relative min-h-0 flex-1 scroll-pt-24 overflow-auto bg-muted/60 px-4 pb-28 pt-10"
          data-letter-canvas=""
          onKeyDown={onKeyDown}
          onClick={() => ops.select(null)}
        >
          <div style={{ width: px.width * scale, height: Math.max(paperH, px.height) * scale, margin: "0 auto", position: "relative" }}>
            <div
              ref={paperRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: px.width,
                transform: scale === 1 ? undefined : `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <LetterPaperFrame doc={doc} values={vals} mode="preview" qrSrc={qrSrc}>
                {doc.body.length === 0 ? (
                  <Unscaled flow>
                    <div
                      className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-8 text-center font-sans text-slate-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-base font-medium text-slate-900">Kertas masih kosong</p>
                      <p className="max-w-xs text-sm">Tambahkan bagian pertama: judul, paragraf, data orang, atau tanda tangan.</p>
                      <InsertMenuButton label="Mulai dengan menambah bagian" onPick={(p) => addBlock(p)}>
                        <span>Mulai dengan menambah bagian</span>
                      </InsertMenuButton>
                    </div>
                  </Unscaled>
                ) : (
                  <DndContext
                    id="letter-canvas-dnd"
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[scaleModifier]}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDragEnd={onDragEnd}
                    onDragCancel={() => setDrag(null)}
                    accessibility={{
                      screenReaderInstructions: {
                        draggable:
                          "Untuk memindahkan bagian: tekan spasi, lalu tombol panah atas atau bawah, dan tekan spasi lagi untuk menjatuhkan. Tekan Escape untuk membatalkan.",
                      },
                      announcements: {
                        onDragStart: ({ active }) =>
                          `${nameOf(active.id)} diangkat dari ${positionOf(active.id)}.`,
                        onDragOver: ({ active, over }) =>
                          over ? `${nameOf(active.id)} berada di atas ${nameOf(over.id)}, ${positionOf(over.id)}.` : undefined,
                        onDragEnd: ({ active, over }) =>
                          over
                            ? `${nameOf(active.id)} dijatuhkan di ${positionOf(over.id)}.`
                            : `${nameOf(active.id)} dikembalikan ke tempat semula.`,
                        onDragCancel: ({ active }) => `Pemindahan dibatalkan. ${nameOf(active.id)} kembali ke ${positionOf(active.id)}.`,
                      },
                    }}
                  >
                    <SortableContext items={ids} strategy={noShiftStrategy}>
                      {doc.body.map((block: Block) => (
                        <SortableBlock
                          key={block.id}
                          block={block}
                          doc={doc}
                          values={vals}
                          qrSrc={qrSrc}
                          rowSelected={selectedId === block.id}
                          selectedId={place?.topId === block.id ? selectedId : null}
                          focusPoint={focus && focus.id === selectedId ? focus : null}
                          issues={issueMap}
                          ops={ops}
                          dropEdge={dropEdgeFor(block.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </LetterPaperFrame>

              {guides.map((y, i) => (
                <div
                  key={y}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 z-0 border-t border-dashed border-slate-400"
                  style={{ top: y }}
                >
                  <span
                    className="absolute right-1 -translate-y-full rounded-sm bg-white/80 px-1 font-sans text-slate-600"
                    style={{ fontSize: Math.max(10, 11 / scale) }}
                  >
                    perkiraan batas halaman {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {toast ? (
          <div
            role="status"
            className="pointer-events-auto absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg"
          >
            <span>{toast.text}</span>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white/15 px-3 font-medium hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              onClick={() => {
                undo();
                setToast(null);
              }}
            >
              <Undo2 className="h-4 w-4" aria-hidden /> Urungkan
            </button>
          </div>
        ) : null}

        <div className="sr-only" role="status" aria-live="polite">
          {live}
        </div>
      </div>
    </ScaleContext.Provider>
  );
}

/** Saudara tidak bergeser saat menyeret (skala kertas membuat pergeseran bawaan meleset); penanda garis menunjukkan tujuan. */
const noShiftStrategy: typeof verticalListSortingStrategy = () => null;
