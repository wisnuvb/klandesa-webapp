"use client";

import { useState } from "react";
import { Search, Variable } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AVAILABLE_VARIABLES } from "./types";

export function VariablePickerContent({
  onSelect,
}: {
  onSelect: (key: string) => void;
}) {
  const [search, setSearch] = useState("");

  const groupedVariables = AVAILABLE_VARIABLES.reduce(
    (acc, variable) => {
      const category = variable.category || "Lainnya";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(variable);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_VARIABLES>,
  );

  const filteredGroups = Object.entries(groupedVariables)
    .map(([category, variables]) => ({
      category,
      variables: variables.filter(
        (v) =>
          v.label.toLowerCase().includes(search.toLowerCase()) ||
          v.key.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((group) => group.variables.length > 0);

  return (
    <div className="flex flex-col">
      <div className="p-3 border-b bg-muted/30">
        <h4 className="font-semibold text-sm mb-2">Pilih Variabel</h4>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari variabel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-87.5 overflow-y-auto p-2">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground">
            Variabel tidak ditemukan
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.category} className="mb-4 last:mb-0">
              <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2">
                {group.category}
              </h5>
              <div className="grid grid-cols-2 gap-1">
                {group.variables.map((v) => (
                  <Button
                    key={v.key}
                    variant="ghost"
                    size="sm"
                    className="justify-start h-auto py-2 px-2 gap-2 text-left"
                    onClick={() => onSelect(v.key)}
                  >
                    <div className="p-1 rounded bg-primary/10">
                      <Variable className="h-3 w-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium truncate">
                        {v.label}
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground truncate">
                        {`{${v.key}}`}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
