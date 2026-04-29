"use client";

import { memo } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionCmsField } from "@/lib/website-engine/site-sections";
import type { WebsiteSection } from "@/lib/website-engine/types";
import { SectionFieldEditor } from "./SectionFieldEditor";

type Props = {
  idx: number;
  section: WebsiteSection;
  label: string;
  fields: SectionCmsField[];
  saving: boolean;
  sectionCount: number;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
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
  onRemove,
  onPatchField,
}: Props) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-medium">
          {label}{" "}
          <span className="text-xs text-muted-foreground">({section.kind})</span>
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
      <div className="mt-3 grid gap-3 md:grid-cols-2">
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
    </div>
  );
});
