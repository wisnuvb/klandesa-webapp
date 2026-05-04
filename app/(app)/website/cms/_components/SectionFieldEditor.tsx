"use client";

import { memo, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { ImageAssetModal } from "@/components/ImageAssetModal";
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
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const variables = useMemo(
    () => [
      { key: "village.name", label: "Nama desa" },
      { key: "village.address", label: "Alamat desa" },
      { key: "village.phone", label: "Telepon desa" },
      { key: "village.email", label: "Email desa" },
      { key: "village.website", label: "Website desa" },
      { key: "news.count", label: "Jumlah berita" },
      { key: "today", label: "Tanggal hari ini" },
    ],
    [],
  );

  const insertVariable = (key: string) => {
    const cur = typeof val === "string" ? val : String(val ?? "");
    const next = `${cur}${cur ? " " : ""}{{${key}}}`;
    onPatch(idx, field.name, next);
  };

  if (field.type === "text") {
    return (
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">{field.label}</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={saving}>
                Variabel
                <ChevronDown className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="grid gap-1">
                {variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => insertVariable(v.key)}
                    disabled={saving}
                  >
                    <div className="font-medium">{v.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {`{{${v.key}}}`}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
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
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">{field.label}</div>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={saving}>
                Variabel
                <ChevronDown className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2">
              <div className="grid gap-1">
                {variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onClick={() => insertVariable(v.key)}
                    disabled={saving}
                  >
                    <div className="font-medium">{v.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {`{{${v.key}}}`}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
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
  if (field.type === "image") {
    const v = typeof val === "string" ? val : String(val ?? "");
    return (
      <div className="grid gap-2 md:col-span-2">
        <div className="text-xs text-muted-foreground">{field.label}</div>
        <div className="flex flex-wrap gap-2">
          <Input
            value={v}
            onChange={(e) => onPatch(idx, field.name, e.target.value)}
            disabled={saving}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setImageModalOpen(true)}
            disabled={saving}
          >
            Pilih gambar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onPatch(idx, field.name, "")}
            disabled={saving || !v}
          >
            Hapus
          </Button>
        </div>
        <ImageAssetModal
          isOpen={imageModalOpen}
          onClose={() => setImageModalOpen(false)}
          onSelectImage={(url) => onPatch(idx, field.name, url)}
        />
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
