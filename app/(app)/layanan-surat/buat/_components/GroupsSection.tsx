"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResidentOption } from "@/components/AutocompleteResidentInput";
import type { FormSpec } from "@/lib/letters/document/form-spec";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import type { ComposerState } from "../_utils/composer";
import { CustomFieldInput } from "./CustomFieldInput";
import { ResidentSearch } from "./ResidentSearch";

type Actions = {
  addRow: (gid: string) => void;
  removeRow: (gid: string, index: number) => void;
  setRowValue: (gid: string, index: number, fid: string, value: string) => void;
  setRowQuery: (gid: string, index: number, q: string) => void;
  selectRowResident: (gid: string, index: number, r: ResidentOption) => void;
  clearRowResident: (gid: string, index: number) => void;
};

export function GroupsSection({
  spec,
  state,
  loadingKeys,
  actions,
}: {
  spec: FormSpec;
  state: ComposerState;
  loadingKeys: ReadonlySet<string>;
  actions: Actions;
}) {
  const { appConfirm } = useAppDialogs();
  if (spec.groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {spec.groups.map((g) => {
        const rows = state.groups[g.id] ?? [];
        const canAdd = rows.length < g.max;
        const canRemove = rows.length > g.min;
        return (
          <fieldset key={g.id} className="space-y-3 rounded-lg border p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
              <Users className="h-4 w-4" aria-hidden="true" />
              {g.label}
              <span className="text-xs font-normal text-muted-foreground">
                ({rows.length} dari maksimal {g.max}{g.min > 0 ? `, minimal ${g.min}` : ""})
              </span>
            </legend>

            {rows.map((row, i) => {
              const filled = row.residentId != null || Object.values(row.values).some((v) => v.trim() !== "");
              return (
                <div key={row.key} role="group" aria-label={`${g.label} baris ${i + 1}`} className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{g.label} {i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-9 gap-1 pointer-coarse:min-h-11"
                      disabled={!canRemove}
                      aria-label={`Hapus ${g.label} baris ${i + 1}`}
                      title={canRemove ? undefined : `Minimal ${g.min} baris`}
                      onClick={async () => {
                        if (filled) {
                          const ok = await appConfirm({
                            title: "Hapus baris ini?",
                            description: `Isian pada ${g.label} baris ${i + 1} akan dihapus.`,
                            confirmLabel: "Hapus",
                            tone: "destructive",
                          });
                          if (!ok) return;
                        }
                        actions.removeRow(g.id, i);
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Hapus
                    </Button>
                  </div>

                  {g.personRows ? (
                    <ResidentSearch
                      id={`group-${g.id}-${i}-cari`}
                      label="Cari warga (opsional)"
                      value={row.query}
                      help={loadingKeys.has(`group-${g.id}-${i}`) ? "Mengambil data warga…" : "Memilih warga mengisi isian di bawah; bisa diperbaiki."}
                      onChange={(v) => actions.setRowQuery(g.id, i, v)}
                      onSelect={(r) => actions.selectRowResident(g.id, i, r)}
                      onClear={() => actions.clearRowResident(g.id, i)}
                    />
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {g.fields.map((f) => (
                      <div key={f.id} className={f.type === "longtext" ? "sm:col-span-2" : undefined}>
                        <CustomFieldInput
                          id={`group-${g.id}-${i}-${f.id}`}
                          field={f}
                          value={row.values[f.id] ?? ""}
                          onChange={(v) => actions.setRowValue(g.id, i, f.id, v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className="min-h-10 gap-2 pointer-coarse:min-h-11"
              disabled={!canAdd}
              onClick={() => actions.addRow(g.id)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tambah {g.label.toLowerCase()}
            </Button>
            {!canAdd ? <p className="text-xs text-muted-foreground">Sudah mencapai jumlah maksimal ({g.max}).</p> : null}
          </fieldset>
        );
      })}
    </div>
  );
}
