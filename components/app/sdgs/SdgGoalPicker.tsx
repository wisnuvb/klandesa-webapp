"use client";

import { SDG_GOALS } from "@/lib/sdgs/goals";
import { Checkbox } from "@/components/ui/checkbox";

type SdgGoalPickerProps = {
  value: number[];
  onChange: (ids: number[]) => void;
  max?: number;
};

export function SdgGoalPicker({ value, onChange, max = 5 }: SdgGoalPickerProps) {
  function toggle(id: number) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, id].sort((a, b) => a - b));
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
      {SDG_GOALS.map((g) => (
        <label key={g.id} className="flex items-start gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={value.includes(g.id)}
            onCheckedChange={() => toggle(g.id)}
            disabled={!value.includes(g.id) && value.length >= max}
          />
          <span>
            <span className="font-medium">Goal {g.id}</span> — {g.shortTitle}
          </span>
        </label>
      ))}
      <p className="col-span-full text-xs text-muted-foreground">
        Pilih hingga {max} goal SDGs Desa.
      </p>
    </div>
  );
}

export function SdgGoalBadges({ ids }: { ids: number[] }) {
  if (ids.length === 0) return <span className="text-muted-foreground text-sm">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {ids.map((id) => {
        const g = SDG_GOALS.find((x) => x.id === id);
        return (
          <span
            key={id}
            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
          >
            {g ? `G${id}` : id}
          </span>
        );
      })}
    </div>
  );
}
