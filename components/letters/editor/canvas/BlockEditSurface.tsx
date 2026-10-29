"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Editor } from "@tiptap/core";
import { LetterBlockView, diktumOrdinal } from "@/components/letters/LetterPaper";
import type { Block, LetterDocument } from "@/lib/letters/document/schema";
import type { PresetId } from "@/lib/letters/editor";
import type { LetterValues } from "@/lib/letters/values";
import type { NewFieldInput } from "./FieldPicker";
import { InlineEditor } from "./InlineEditorLazy";
import { StaticInlines } from "./StaticInlines";
import { Unscaled } from "./scale";
import { appendItem, getTextSlots, insertItemAfter, removeItem, setTextSlot, type TextSlot } from "./helpers";

export type FocusPoint = { id: string; x: number; y: number };

type Props = {
  block: Block;
  doc: LetterDocument;
  values: LetterValues;
  qrSrc?: string;
  focusPoint?: FocusPoint | null;
  onFocusConsumed?: () => void;
  updateBlock: (id: string, patch: (b: Block) => Block) => void;
  onEditor: (editor: Editor | null) => void;
  createField: (input: NewFieldInput) => string;
  /** `/` di paragraf kosong: pilih jenis bagian yang menggantikannya. */
  replaceWithPreset: (blockId: string, preset: PresetId) => void;
};

const alignOf = (a: string | undefined): CSSProperties["textAlign"] =>
  a === "center" || a === "right" || a === "justify" ? a : "left";

const PLACEHOLDERS: Partial<Record<string, string>> = {
  content: "Ketik teks di sini — ketik / untuk menyisipkan isian",
  title: "Judul surat",
  dateline: "Tempat, tanggal",
  addressee: "Tujuan surat",
};

/**
 * Tampilan sunting di tempat untuk bagian bernuansa teks. Tata letaknya meniru `LetterPaper`
 * supaya kertas tidak "melompat" saat sebuah bagian dipilih. Hanya SATU kolom teks yang memasang
 * Tiptap pada satu waktu; kolom lain tampil diam (StaticInlines) dan aktif saat diklik.
 */
export function BlockEditSurface({
  block, doc, values, qrSrc, focusPoint, onFocusConsumed, updateBlock, onEditor, createField, replaceWithPreset,
}: Props) {
  const slots = getTextSlots(block);
  const [activeKey, setActiveKey] = useState<string | null>(focusPoint ? null : (slots[0]?.key ?? null));
  const rootRef = useRef<HTMLDivElement>(null);
  const point = useRef(focusPoint ?? null);

  // Klik pertama di kertas menentukan kolom teks mana yang aktif (mis. butir ke-3) dan posisi kursor.
  useLayoutEffect(() => {
    if (!point.current) return;
    const { x, y } = point.current;
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-slot-key]");
    const key = el && rootRef.current?.contains(el) ? el.dataset.slotKey : undefined;
    setActiveKey(key ?? slots[0]?.key ?? null);
    // hanya sekali saat dipasang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consume = () => {
    if (point.current) {
      point.current = null;
      onFocusConsumed?.();
    }
  };

  const bySlot = new Map(slots.map((s) => [s.key, s]));
  const patchSlot = (key: string, inlines: TextSlot["inlines"]) =>
    updateBlock(block.id, (b) => setTextSlot(b, key, inlines));

  const renderSlot = (key: string, opts?: { placeholder?: string }): ReactNode => {
    const slot = bySlot.get(key);
    if (!slot) return null;
    const placeholder = opts?.placeholder ?? PLACEHOLDERS[key] ?? "Ketik di sini";
    if (activeKey === key) {
      const p = point.current;
      return (
        <InlineEditor
          key={key}
          value={slot.inlines}
          doc={doc}
          ariaLabel={slot.label}
          placeholder={placeholder}
          autoFocus={!p}
          focusPoint={p ? { x: p.x, y: p.y } : undefined}
          onFocusPlaced={consume}
          onChange={(inl) => patchSlot(key, inl)}
          onEditor={onEditor}
          onCreateField={createField}
          onEnterItem={
            slot.item
              ? () => {
                  const r = insertItemAfter(block, key);
                  if (!r) return false;
                  updateBlock(block.id, () => r.block);
                  setActiveKey(r.focusKey);
                  return true;
                }
              : undefined
          }
          onBackspaceEmpty={
            slot.item
              ? () => {
                  const r = removeItem(block, key);
                  if (!r) return false;
                  updateBlock(block.id, () => r.block);
                  setActiveKey(r.focusKey);
                  return true;
                }
              : undefined
          }
          onPickBlockFromSlash={
            block.type === "paragraph" && slot.inlines.length === 0
              ? (preset) => replaceWithPreset(block.id, preset)
              : undefined
          }
        />
      );
    }
    const activate = () => setActiveKey(key);
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        data-slot-key={key}
        aria-label={`Ubah teks: ${slot.label}`}
        className="min-h-[1.2em] cursor-text rounded-sm hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
        onClick={(e) => {
          e.stopPropagation();
          activate();
        }}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        }}
      >
        <StaticInlines inlines={slot.inlines} doc={doc} placeholder={placeholder} />
      </div>
    );
  };

  const itemControls =
    block.type === "list" || block.type === "dictum" || block.type === "cc" ? (
      <Unscaled flow>
        <div className="mt-1 flex flex-wrap gap-2 font-sans text-xs">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-white px-2.5 text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            onClick={() => {
              const r = appendItem(block);
              if (!r) return;
              updateBlock(block.id, () => r.block);
              setActiveKey(r.focusKey);
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Tambah butir
          </button>
          {activeKey?.startsWith("item.") && slots.length > 1 ? (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border bg-white px-2.5 text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
              onClick={() => {
                const r = removeItem(block, activeKey);
                if (!r) return;
                updateBlock(block.id, () => r.block);
                setActiveKey(r.focusKey);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Hapus butir ini
            </button>
          ) : null}
        </div>
      </Unscaled>
    ) : null;

  let body: ReactNode = null;
  switch (block.type) {
    case "paragraph":
      body = (
        <div
          style={{
            margin: `0 0 ${block.spaceAfterMm}mm`,
            textAlign: alignOf(block.align),
            textIndent: block.indentFirst ? "12mm" : undefined,
          }}
        >
          {renderSlot("content")}
        </div>
      );
      break;

    case "heading": {
      const size = block.level === 1 ? "1.3em" : block.level === 2 ? "1.15em" : "1em";
      body = (
        <div
          style={{
            margin: "0 0 3mm",
            fontSize: size,
            fontWeight: 700,
            textAlign: alignOf(block.align),
            textDecoration: block.underline ? "underline" : undefined,
          }}
        >
          {renderSlot("content", { placeholder: "Judul bagian" })}
        </div>
      );
      break;
    }

    case "title":
      body = (
        <div style={{ textAlign: alignOf(block.align), margin: "0 0 4mm" }}>
          <div style={{ fontWeight: 700 }}>{renderSlot("title")}</div>
          {block.showNumber ? (
            <div className="text-slate-600">
              {block.numberPrefix}
              <span className="italic">«Nomor surat»</span>
            </div>
          ) : null}
        </div>
      );
      break;

    case "memo":
      body = (
        <div style={{ display: "flex", justifyContent: "space-between", gap: "6mm", margin: "0 0 4mm" }}>
          <table style={{ borderCollapse: "collapse", flex: "1 1 auto" }}>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ verticalAlign: "top", paddingRight: "2mm", whiteSpace: "nowrap" }}>{r.label}</td>
                  <td style={{ verticalAlign: "top", paddingRight: "2mm" }}>:</td>
                  <td style={{ verticalAlign: "top", width: "100%" }}>{renderSlot(`row.${i}`, { placeholder: r.label })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ minWidth: "45%" }}>
            <div>{renderSlot("dateline")}</div>
            <div style={{ marginTop: "2mm" }}>{renderSlot("addressee")}</div>
          </div>
        </div>
      );
      break;

    case "list": {
      const Tag = block.style === "bullet" ? "ul" : "ol";
      body = (
        <>
          <Tag
            type={block.style === "alpha" ? "a" : block.style === "number" ? "1" : undefined}
            style={{ margin: "0 0 3mm", paddingLeft: "10mm" }}
          >
            {block.items.map((_, i) => (
              <li key={i}>{renderSlot(`item.${i}`, { placeholder: "Ketik butir…" })}</li>
            ))}
          </Tag>
          {itemControls}
        </>
      );
      break;
    }

    case "cc":
      body = (
        <div style={{ margin: "0 0 3mm" }}>
          <div>{block.label}</div>
          <ol style={{ margin: 0, paddingLeft: "7mm" }}>
            {block.items.map((_, i) => (
              <li key={i}>{renderSlot(`item.${i}`, { placeholder: "Pihak yang menerima tembusan" })}</li>
            ))}
          </ol>
          {itemControls}
        </div>
      );
      break;

    case "dictum": {
      const row = (key: string, label: ReactNode, content: ReactNode) => (
        <div key={key} style={{ display: "flex", margin: "0 0 2mm" }}>
          <div style={{ width: "30mm", flexShrink: 0 }}>{label}</div>
          <div style={{ width: "4mm", flexShrink: 0 }}>:</div>
          <div style={{ flex: 1, textAlign: "justify" }}>{content}</div>
        </div>
      );
      const caption = { menimbang: "Menimbang", mengingat: "Mengingat", menetapkan: "Menetapkan", diktum: "" }[block.kind];
      const items = block.items.map((_, i) => renderSlot(`item.${i}`, { placeholder: "Ketik butir…" }));
      body = (
        <div style={{ margin: "0 0 3mm" }}>
          {block.kind === "menetapkan" ? (
            <div style={{ textAlign: "center", fontWeight: 700, margin: "2mm 0" }}>MEMUTUSKAN:</div>
          ) : null}
          {block.kind === "diktum"
            ? block.items.map((_, i) => row(`d${i}`, diktumOrdinal(i + 1), items[i]))
            : row(
                "main",
                caption,
                block.kind === "menetapkan" ? (
                  <>{items.map((it, i) => <div key={i}>{it}</div>)}</>
                ) : (
                  <ol type={block.kind === "menimbang" ? "a" : "1"} style={{ margin: 0, paddingLeft: "6mm" }}>
                    {items.map((it, i) => <li key={i}>{it}</li>)}
                  </ol>
                ),
              )}
          {itemControls}
        </div>
      );
      break;
    }

    case "table":
      body = (
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 4mm" }}>
          <thead>
            <tr>
              {block.columns.map((c, i) => (
                <th key={i} style={cellStyle(true, block.bordered)}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, ri) => (
              <tr key={ri}>
                {block.columns.map((_, ci) => (
                  <td key={ci} style={cellStyle(false, block.bordered)}>
                    {renderSlot(`cell.${ri}.${ci}`, { placeholder: "…" })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      break;

    case "signature":
      body = (
        <div>
          <Unscaled flow>
            <div className="mb-2 rounded-md border border-dashed border-sky-400 bg-sky-50 p-2 font-sans text-sm text-slate-900">
              <p className="mb-1 text-xs font-medium text-slate-700">Tempat dan tanggal di atas tanda tangan</p>
              <div className="rounded bg-white px-2 py-1" style={{ fontFamily: "inherit" }}>
                {renderSlot("dateline", { placeholder: "mis. Brambang, 29 Oktober 2026 (ketik / untuk isian)" })}
              </div>
            </div>
          </Unscaled>
          <LetterBlockView doc={doc} values={values} block={{ ...block, dateline: undefined }} mode="preview" qrSrc={qrSrc} />
        </div>
      );
      break;

    default:
      body = null;
  }

  return <div ref={rootRef}>{body}</div>;
}

function cellStyle(head: boolean, bordered: boolean): CSSProperties {
  return {
    border: bordered ? "1px solid #000" : undefined,
    padding: "1mm 2mm",
    verticalAlign: "top",
    textAlign: "left",
    fontWeight: head ? 700 : 400,
  };
}
