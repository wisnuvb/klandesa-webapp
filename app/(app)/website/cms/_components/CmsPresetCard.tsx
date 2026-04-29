"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  loading: boolean;
  saving: boolean;
  presetKey: string;
  presets: Array<{ key: string; name: string }>;
  onPresetSelect: (key: string) => void;
  onResetStructure: () => void;
};

export const CmsPresetCard = memo(function CmsPresetCard({
  loading,
  saving,
  presetKey,
  presets,
  onPresetSelect,
  onResetStructure,
}: Props) {
  const disabled = loading || saving;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Preset</CardTitle>
        <CardDescription>Struktur bawaan (template + global)</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={presetKey}
          onChange={(e) => onPresetSelect(e.target.value)}
          disabled={disabled}
        >
          <option value="">Tanpa preset</option>
          {presets.map((p) => (
            <option key={p.key} value={p.key}>
              {p.name}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          type="button"
          onClick={onResetStructure}
          disabled={disabled}
        >
          Reset struktur (CMS)
        </Button>
        <div className="text-xs text-muted-foreground">
          Preset khusus template mendahului preset global jika kunci sama.
        </div>
      </CardContent>
    </Card>
  );
});
