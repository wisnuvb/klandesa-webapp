"use client";

import { memo } from "react";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { Button } from "@/components/ui/button";
import type { SectionCmsField } from "@/lib/website-engine/site-sections";
import type { WebsiteSection } from "@/lib/website-engine/types";
import { SectionFieldEditor } from "./SectionFieldEditor";

const DND_TYPE = "CMS_SECTION";

type Props = {
  idx: number;
  section: WebsiteSection;
  label: string;
  fields: SectionCmsField[];
  saving: boolean;
  sectionCount: number;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
  onPatchField: (
    idx: number,
    fieldName: string,
    value: string | number | boolean,
  ) => void;
};

export const CmsSectionBlockCard = memo(function CmsSectionBlockCard({
  idx,
  section,
  label,
  fields,
  saving,
  sectionCount,
  onMoveUp,
  onMoveDown,
  onReorder,
  onRemove,
  onPatchField,
}: Props) {
  const [{ isDragging }, dragRef, previewRef] = useDrag(
    () => ({
      type: DND_TYPE,
      item: { index: idx },
      canDrag: !saving,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [idx, saving],
  );

  const [, dropRef] = useDrop(
    () => ({
      accept: DND_TYPE,
      hover: (item: { index: number }) => {
        if (saving) return;
        if (!item) return;
        const from = item.index;
        const to = idx;
        if (from === to) return;
        onReorder(from, to);
        item.index = to;
      },
    }),
    [idx, saving, onReorder],
  );

  const style = section.style ?? {};

  return (
    <div
      ref={(el) => {
        previewRef(el);
        dropRef(el);
      }}
      className="rounded-xl border p-4"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-medium">
          <button
            type="button"
            ref={(el) => {
              dragRef(el);
            }}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md border bg-background p-1.5 text-muted-foreground disabled:opacity-50"
            aria-label="Geser urutan blok"
          >
            <GripVertical className="size-4" />
          </button>
          <span>
            {label}{" "}
            <span className="text-xs text-muted-foreground">
              ({section.kind})
            </span>
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => onMoveUp(idx)}
            disabled={saving || idx === 0}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => onMoveDown(idx)}
            disabled={saving || idx === sectionCount - 1}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            type="button"
            onClick={() => onRemove(idx)}
            disabled={saving}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {fields.map((field) => (
          <SectionFieldEditor
            key={field.name}
            idx={idx}
            field={field}
            section={section}
            saving={saving}
            onPatch={onPatchField}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-2">
        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Background</div>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={style.background ?? "none"}
            onChange={(e) =>
              onPatchField(idx, "style.background", e.target.value)
            }
            disabled={saving}
          >
            <option value="none">Tidak ada</option>
            <option value="surface">Surface</option>
            <option value="muted">Muted</option>
            <option value="primaryGradient">Gradient</option>
          </select>
        </div>

        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Padding vertikal</div>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={style.paddingY ?? "md"}
            onChange={(e) =>
              onPatchField(idx, "style.paddingY", e.target.value)
            }
            disabled={saving}
          >
            <option value="none">0</option>
            <option value="sm">Kecil</option>
            <option value="md">Sedang</option>
            <option value="lg">Besar</option>
          </select>
        </div>

        <div className="grid gap-2">
          <div className="text-xs text-muted-foreground">Perataan</div>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={style.align ?? "left"}
            onChange={(e) => onPatchField(idx, "style.align", e.target.value)}
            disabled={saving}
          >
            <option value="left">Kiri</option>
            <option value="center">Tengah</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">Dekorasi</div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(style.rounded)}
              onChange={(e) =>
                onPatchField(idx, "style.rounded", e.target.checked)
              }
              disabled={saving}
            />
            Sudut rounded
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(style.bordered)}
              onChange={(e) =>
                onPatchField(idx, "style.bordered", e.target.checked)
              }
              disabled={saving}
            />
            Border
          </label>
        </div>
      </div>
    </div>
  );
});
