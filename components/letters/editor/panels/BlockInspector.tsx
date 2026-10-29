"use client";

import { memo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Copy, MousePointerClick, Trash2 } from "lucide-react";
import { findBlock, type EditorApi } from "@/lib/letters/editor";
import { Button } from "@/components/ui/button";
import { BLOCK_TYPE_LABELS } from "./helpers";
import {
  CcInspector, ColumnsInspector, ConditionalInspector, DictumInspector, DividerInspector, HeadingInspector,
  ImageInspector, ListInspector, MemoInspector, PageBreakInspector, ParagraphInspector, PersonDataInspector,
  QrInspector, RepeatTableInspector, SignatureInspector, SpacerInspector, TableInspector, TitleInspector,
} from "./inspectors";
import { FieldError } from "./ui";

export const InspectorEmpty = () => (
  <div className="flex items-start gap-3 rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground">
    <MousePointerClick className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
    <p>Klik sebuah bagian di kertas untuk mengaturnya.</p>
  </div>
);

export const BlockInspector = memo(function BlockInspector({ editor }: { editor: EditorApi }) {
  const { doc, selectedId } = editor;
  const [error, setError] = useState<string | null>(null);
  const loc = selectedId ? findBlock(doc, selectedId) : null;
  if (!loc) return <InspectorEmpty />;
  const block = loc.block;

  const move = (delta: -1 | 1) => {
    const r = editor.moveBlockBy(block.id, delta);
    setError(r.ok ? null : r.error);
  };

  let body: ReactNode = null;
  switch (block.type) {
    case "paragraph": body = <ParagraphInspector block={block} doc={doc} editor={editor} />; break;
    case "heading": body = <HeadingInspector block={block} doc={doc} editor={editor} />; break;
    case "title": body = <TitleInspector block={block} doc={doc} editor={editor} />; break;
    case "memo": body = <MemoInspector block={block} doc={doc} editor={editor} />; break;
    case "personData": body = <PersonDataInspector block={block} doc={doc} editor={editor} />; break;
    case "repeatTable": body = <RepeatTableInspector block={block} doc={doc} editor={editor} />; break;
    case "table": body = <TableInspector block={block} doc={doc} editor={editor} />; break;
    case "list": body = <ListInspector block={block} doc={doc} editor={editor} />; break;
    case "dictum": body = <DictumInspector block={block} doc={doc} editor={editor} />; break;
    case "signature": body = <SignatureInspector block={block} doc={doc} editor={editor} />; break;
    case "divider": body = <DividerInspector block={block} doc={doc} editor={editor} />; break;
    case "spacer": body = <SpacerInspector block={block} doc={doc} editor={editor} />; break;
    case "pageBreak": body = <PageBreakInspector />; break;
    case "image": body = <ImageInspector block={block} doc={doc} editor={editor} />; break;
    case "qr": body = <QrInspector block={block} doc={doc} editor={editor} />; break;
    case "cc": body = <CcInspector block={block} doc={doc} editor={editor} />; break;
    case "columns": body = <ColumnsInspector block={block} doc={doc} editor={editor} />; break;
    case "conditional": body = <ConditionalInspector block={block} doc={doc} editor={editor} />; break;
  }

  return (
    <section aria-labelledby="inspector-title" className="space-y-4 rounded-lg border border-primary/40 bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Atur bagian ini</p>
          <h3 id="inspector-title" className="text-base font-semibold">{BLOCK_TYPE_LABELS[block.type]}</h3>
        </div>
        <div className="flex flex-wrap justify-end gap-1" role="group" aria-label="Tindakan untuk bagian ini">
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Naikkan bagian" onClick={() => move(-1)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Turunkan bagian" onClick={() => move(1)}>
            <ArrowDown aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-11" aria-label="Gandakan bagian" onClick={() => editor.duplicateBlock(block.id)}>
            <Copy aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-11 text-destructive hover:text-destructive" aria-label="Hapus bagian (bisa diurungkan)" onClick={() => editor.removeBlock(block.id)}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>
      <FieldError>{error}</FieldError>
      <div key={block.id}>{body}</div>
    </section>
  );
});
