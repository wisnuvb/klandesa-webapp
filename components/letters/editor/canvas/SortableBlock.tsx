"use client";

import { memo, type KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { BlockContent, BlockTab, IssueNote, type ContentProps } from "./BlockContent";
import { InsertMenuButton } from "./InsertMenu";
import { useScale } from "./scale";
import { blockLabel, blockSummary, isTextEditable } from "./helpers";

export type DropEdge = "before" | "after" | null;

type RowProps = Omit<ContentProps, "selectedId"> & {
  /** Bagian ini sendiri yang terpilih. */
  rowSelected: boolean;
  /** Id terpilih bila berada di dalam bagian ini (termasuk dirinya), selain itu null. */
  selectedId: string | null;
  dropEdge: DropEdge;
};

/** Tombol "+" di bawah bagian: muncul saat hover/fokus, dan selalu terlihat pada bagian terpilih. */
function AddAfter({ label, onPick, visible }: { label: string; onPick: Parameters<typeof InsertMenuButton>[0]["onPick"]; visible: boolean }) {
  const scale = useScale();
  return (
    <div
      className={[
        "pointer-events-none absolute inset-x-0 -bottom-4 z-10 flex h-8 items-center justify-center transition-opacity motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0 focus-within:opacity-100 group-focus-within/row:opacity-100 group-hover/row:opacity-100",
      ].join(" ")}
    >
      <div className="pointer-events-auto" style={{ transform: scale === 1 ? undefined : `scale(${1 / scale})` }}>
        <InsertMenuButton
          label={label}
          onPick={onPick}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-sky-700 bg-white text-sky-800 shadow-sm hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
        >
          {null}
        </InsertMenuButton>
      </div>
    </div>
  );
}

function areEqual(a: RowProps, b: RowProps): boolean {
  return (
    a.block === b.block &&
    a.values === b.values &&
    a.qrSrc === b.qrSrc &&
    a.rowSelected === b.rowSelected &&
    a.selectedId === b.selectedId &&
    a.focusPoint === b.focusPoint &&
    a.dropEdge === b.dropEdge &&
    a.issues === b.issues &&
    a.ops === b.ops &&
    a.doc.people === b.doc.people &&
    a.doc.fields === b.doc.fields &&
    a.doc.groups === b.doc.groups
  );
}

/** Satu bagian tingkat atas yang bisa diseret (pegangan) maupun dipindah lewat tombol/keyboard. */
export const SortableBlock = memo(function SortableBlock(props: RowProps) {
  const { block, doc, rowSelected, dropEdge, ops, issues } = props;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useSortable({
    id: block.id,
    transition: null,
    attributes: { roleDescription: "bagian surat yang dapat dipindah" },
  });
  const issue = issues?.get(block.id);
  const label = blockLabel(block);
  const summary = blockSummary(block, doc);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      ops.select(block.id);
    } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      ops.moveBy(block.id, e.key === "ArrowUp" ? -1 : 1);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-block-id="${block.id}"]`)?.focus());
    }
  };

  const grip = rowSelected ? (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      tabIndex={0}
      aria-label={`Pindahkan ${label}. Tekan spasi lalu panah atas atau bawah, atau pakai tombol Naik dan Turun.`}
      title="Seret untuk memindahkan"
      className="flex w-9 flex-none cursor-grab touch-none items-center justify-center bg-sky-800 hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  ) : null;

  return (
    <div
      ref={setNodeRef}
      data-block-id={block.id}
      role="group"
      aria-label={`${label}: ${summary}${rowSelected ? " (dipilih)" : ""}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        e.stopPropagation();
        // Klik di popover (portal) ikut menggelembung lewat pohon React; abaikan yang bukan dari baris ini.
        if (!rowSelected && e.currentTarget.contains(e.target as Node)) ops.clickBlock(block.id, e.clientX, e.clientY);
      }}
      style={{
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 30 : undefined,
        opacity: isDragging ? 0.85 : undefined,
        boxShadow: isDragging ? "0 6px 18px rgba(0,0,0,.25)" : undefined,
        background: isDragging ? "#fff" : undefined,
      }}
      className={[
        "group/row relative rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2",
        rowSelected
          ? "outline outline-2 outline-offset-2 outline-sky-600"
          : issue
            ? "outline-dashed outline-2 outline-offset-2 outline-red-600"
            : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-sky-300",
      ].join(" ")}
    >
      {dropEdge ? (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 z-20 h-1 rounded bg-sky-600 ${dropEdge === "before" ? "-top-2" : "-bottom-2"}`}
        />
      ) : null}
      {rowSelected ? <BlockTab block={block} grip={grip} hint={!isTextEditable(block) && block.type !== "columns" && block.type !== "conditional"} /> : null}
      <BlockContent {...props} selectedId={props.selectedId} />
      {issue ? <IssueNote message={issue} /> : null}
      <AddAfter
        label={`Tambah bagian setelah ${label}`}
        visible={rowSelected}
        onPick={(preset) => ops.addBlock(preset, { after: block.id })}
      />
    </div>
  );
}, areEqual);

