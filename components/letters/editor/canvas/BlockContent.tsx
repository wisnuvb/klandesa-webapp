"use client";

import { memo } from "react";
import { AlertTriangle } from "lucide-react";
import type { Editor } from "@tiptap/core";
import { LetterBlockView } from "@/components/letters/LetterPaper";
import type { Block, LetterDocument } from "@/lib/letters/document/schema";
import type { InsertTarget, PresetId } from "@/lib/letters/editor";
import type { LetterValues } from "@/lib/letters/values";
import { BlockEditSurface, type FocusPoint } from "./BlockEditSurface";
import type { NewFieldInput } from "./FieldPicker";
import { InsertMenuButton } from "./InsertMenu";
import { Unscaled, useScale } from "./scale";
import { blockLabel, describeCondition, isTextEditable } from "./helpers";

/** Fungsi-fungsi tetap (tidak berganti tiap ketikan) yang dipakai semua baris; menjaga `memo` tetap efektif. */
export type CanvasOps = {
  select: (id: string | null) => void;
  /** Klik di kertas: pilih bagian dan ingat titik kliknya untuk meletakkan kursor. */
  clickBlock: (id: string, x: number, y: number) => void;
  updateBlock: (id: string, patch: (b: Block) => Block) => void;
  addBlock: (preset: PresetId, at?: InsertTarget) => void;
  moveBy: (id: string, delta: -1 | 1) => void;
  setTextEditor: (editor: Editor | null) => void;
  createField: (input: NewFieldInput) => string;
  replaceWithPreset: (blockId: string, preset: PresetId) => void;
  consumeFocus: () => void;
};

export type ContentProps = {
  block: Block;
  doc: LetterDocument;
  values: LetterValues;
  qrSrc?: string;
  /** Id terpilih, hanya diteruskan ke bagian yang memuatnya (menjaga baris lain tidak dirender ulang). */
  selectedId: string | null;
  focusPoint: FocusPoint | null;
  issues: ReadonlyMap<string, string> | null;
  ops: CanvasOps;
};

type PreviewProps = { doc: LetterDocument; values: LetterValues; block: Block; qrSrc?: string };

/** Tampilan bagian "diam": persis seperti di kertas. Hanya dirender ulang bila bagian/nilai/daftar isian berubah. */
export const PreviewBlock = memo(
  function PreviewBlock({ doc, values, block, qrSrc }: PreviewProps) {
    return <LetterBlockView doc={doc} values={values} block={block} mode="preview" qrSrc={qrSrc} />;
  },
  (a, b) =>
    a.block === b.block &&
    a.values === b.values &&
    a.qrSrc === b.qrSrc &&
    a.doc.people === b.doc.people &&
    a.doc.fields === b.doc.fields &&
    a.doc.groups === b.doc.groups,
);

/**
 * Label jenis bagian terpilih. Bagian tingkat atas: di margin kiri di bawah pegangan seret (tidak menutupi teks);
 * anak di dalam kolom/bagian bersyarat: di atas bagian. Diberi skala balik agar tetap terbaca.
 */
export function BlockTab({ block, hint, margin }: { block: Block; hint?: boolean; margin?: boolean }) {
  const scale = useScale();
  const inv = scale === 1 ? undefined : `scale(${1 / scale})`;
  if (margin) {
    return (
      <div
        className="pointer-events-none absolute right-full top-10 z-20 mr-1 flex max-w-[6rem] flex-col items-end gap-1 font-sans text-xs font-medium"
        style={{ transform: inv, transformOrigin: "top right" }}
      >
        <span className="max-w-full truncate rounded bg-sky-700 px-2 py-1 text-white shadow" title={blockLabel(block)}>
          {blockLabel(block)}
        </span>
        {hint ? <span className="rounded bg-sky-50 px-1.5 py-1 text-right font-normal text-sky-950 shadow ring-1 ring-sky-200">Atur di panel samping</span> : null}
      </div>
    );
  }
  return (
    <div
      className="pointer-events-none absolute bottom-full left-0 z-20 mb-0.5 flex h-8 items-stretch overflow-hidden rounded-md bg-sky-700 font-sans text-xs font-medium text-white shadow"
      style={{ transform: inv, transformOrigin: "bottom left" }}
    >
      <span className="flex items-center whitespace-nowrap px-2.5">
        {blockLabel(block)}
        {hint ? <span className="ml-1.5 font-normal opacity-90">· atur di panel samping</span> : null}
      </span>
    </div>
  );
}

export function IssueNote({ message }: { message: string }) {
  return (
    <Unscaled flow>
      <div role="note" className="mt-1 flex items-start gap-1.5 rounded border border-red-300 bg-red-50 px-2 py-1 font-sans text-xs text-red-800">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
        <span>Perlu diperbaiki: {message}</span>
      </div>
    </Unscaled>
  );
}

/** Isi sebuah bagian: sunting di tempat bila terpilih dan bernuansa teks, wadah (kolom/bersyarat), atau tampilan diam. */
export function BlockContent(props: ContentProps) {
  const { block, doc, values, qrSrc, selectedId, focusPoint, ops } = props;
  if (block.type === "columns" || block.type === "conditional") return <ContainerSurface {...props} />;
  if (selectedId === block.id && isTextEditable(block)) {
    return (
      <BlockEditSurface
        block={block}
        doc={doc}
        values={values}
        qrSrc={qrSrc}
        focusPoint={focusPoint?.id === block.id ? focusPoint : null}
        onFocusConsumed={ops.consumeFocus}
        updateBlock={ops.updateBlock}
        onEditor={ops.setTextEditor}
        createField={ops.createField}
        replaceWithPreset={ops.replaceWithPreset}
      />
    );
  }
  return <PreviewBlock doc={doc} values={values} block={block} qrSrc={qrSrc} />;
}

function ContainerSurface(props: ContentProps) {
  const { block, doc, selectedId, ops } = props;
  if (block.type !== "columns" && block.type !== "conditional") return null;
  const containsSelected =
    block.type === "columns"
      ? block.children.some((c) => c.some((x) => x.id === selectedId))
      : block.children.some((x) => x.id === selectedId);
  const active = containsSelected || selectedId === block.id;

  const renderChild = (child: Block) => <ChildRow key={child.id} {...props} block={child} />;

  const addHere = (column?: number, length = 0) => (
    <div className="mt-1">
      <Unscaled flow>
        <InsertMenuButton
          label={block.type === "columns" ? `Tambah bagian di kolom ${(column ?? 0) + 1}` : "Tambah bagian di dalam bagian bersyarat"}
          onPick={(preset) => ops.addBlock(preset, { container: block.id, column, index: length })}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-slate-400 bg-white px-2 font-sans text-xs text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
        >
          <span>Tambah di sini</span>
        </InsertMenuButton>
      </Unscaled>
    </div>
  );

  const frame = active ? "rounded-sm outline-dashed outline-1 outline-offset-2 outline-sky-500" : "";

  if (block.type === "columns") {
    return (
      <div className={frame} style={{ display: "flex", gap: "4mm", margin: "0 0 3mm" }}>
        {block.children.map((col, i) => (
          <div key={i} style={{ flex: `${block.ratios[i] ?? 1} 1 0`, minWidth: 0 }}>
            {col.map(renderChild)}
            {col.length === 0 ? (
              <Unscaled flow>
                <p className="rounded border border-dashed border-slate-300 p-2 font-sans text-xs text-slate-600">Kolom {i + 1} masih kosong.</p>
              </Unscaled>
            ) : null}
            {active ? addHere(i, col.length) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={frame}>
      <Unscaled flow>
        <p className="mb-1 inline-flex items-center rounded bg-amber-100 px-2 py-1 font-sans text-xs font-medium text-amber-950">
          {describeCondition(block.when, doc)}
        </p>
      </Unscaled>
      <div className="border-l-2 border-amber-400 pl-2">
        {block.children.map(renderChild)}
        {block.children.length === 0 ? (
          <Unscaled flow>
            <p className="rounded border border-dashed border-slate-300 p-2 font-sans text-xs text-slate-600">Belum ada isi. Tambahkan bagian di bawah.</p>
          </Unscaled>
        ) : null}
        {active ? addHere(undefined, block.children.length) : null}
      </div>
    </div>
  );
}

/** Anak di dalam kolom/bagian bersyarat: bisa dipilih, disunting, dipindah dan dihapus lewat bilah alat. */
function ChildRow(props: ContentProps) {
  const { block, selectedId, issues, ops } = props;
  const selected = selectedId === block.id;
  const issue = issues?.get(block.id);
  return (
    <div
      data-block-id={block.id}
      className={[
        "relative rounded-sm",
        selected
          ? "outline outline-2 outline-offset-2 outline-sky-600"
          : issue
            ? "outline-dashed outline-2 outline-offset-2 outline-red-600"
            : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-sky-300",
      ].join(" ")}
      onClick={(e) => {
        e.stopPropagation();
        if (!selected && e.currentTarget.contains(e.target as Node)) ops.clickBlock(block.id, e.clientX, e.clientY);
      }}
    >
      {selected ? <BlockTab block={block} hint={!isTextEditable(block)} /> : null}
      <BlockContent {...props} />
      {issue ? <IssueNote message={issue} /> : null}
    </div>
  );
}
