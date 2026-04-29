"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SectionCmsField } from "@/lib/website-engine/site-sections";
import type { WebsiteSection } from "@/lib/website-engine/types";
import { getSectionFieldValue } from "../_lib/save-helpers";

type Props = {
  idx: number;
  field: SectionCmsField;
  section: WebsiteSection;
  saving: boolean;
  onPatch: (
    idx: number,
    fieldName: string,
    value: string | number | boolean,
  ) => void;
};

export const SectionFieldEditor = memo(function SectionFieldEditor({
  idx,
  field,
  section,
  saving,
  onPatch,
}: Props) {
  const val = getSectionFieldValue(section, field.name);
  if (field.type === "text") {
    return (
      <div className="grid gap-2">
        <div className="text-xs text-muted-foreground">{field.label}</div>
        <Input
          value={typeof val === "string" ? val : String(val)}
          onChange={(e) => onPatch(idx, field.name, e.target.value)}
          disabled={saving}
        />
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="grid gap-2 md:col-span-2">
        <div className="text-xs text-muted-foreground">{field.label}</div>
        <Textarea
          rows={6}
          value={typeof val === "string" ? val : String(val)}
          onChange={(e) => onPatch(idx, field.name, e.target.value)}
          disabled={saving}
        />
      </div>
    );
  }
  if (field.type === "number") {
    return (
      <div className="grid gap-2">
        <div className="text-xs text-muted-foreground">{field.label}</div>
        <Input
          type="number"
          min={field.min ?? 1}
          max={field.max ?? 30}
          value={typeof val === "number" ? val : Number(val) || 6}
          onChange={(e) =>
            onPatch(idx, field.name, Number(e.target.value))
          }
          disabled={saving}
        />
      </div>
    );
  }
  if (field.type === "select") {
    const defaultOpt = field.options[0]?.value ?? "";
    const v =
      typeof val === "string" && val !== "" ? val : String(defaultOpt);
    return (
      <div className="grid gap-2">
        <div className="text-xs text-muted-foreground">{field.label}</div>
        <select
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          value={v}
          onChange={(e) => onPatch(idx, field.name, e.target.value)}
          disabled={saving}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={Boolean(val)}
        onChange={(e) => onPatch(idx, field.name, e.target.checked)}
        disabled={saving}
      />
      {field.label}
    </label>
  );
});
