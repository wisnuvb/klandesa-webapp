"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search, ShieldAlert } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ACTION_HINTS, ACTION_LABELS, permissionCatalogByGroup, type CatalogEntry } from "@/lib/permissions/catalog";
import type { PermissionAction, VillageRole } from "@/lib/permissions/client";
import { cellState, isResourceCustomized, type Draft } from "@/lib/rbac/editor-model";

type Props = {
  role: VillageRole;
  draft: Draft;
  disabled?: boolean;
  onToggle: (resource: CatalogEntry["resource"], action: PermissionAction, on: boolean) => void;
};

const GROUPS = permissionCatalogByGroup();

export function PermissionMatrix({ role, draft, disabled, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        entries: q ? g.entries.filter((e) => `${e.label} ${e.hint}`.toLowerCase().includes(q)) : g.entries,
      })).filter((g) => g.entries.length > 0),
    [q],
  );

  const customizedGroups = useMemo(
    () => GROUPS.filter((g) => g.entries.some((e) => isResourceCustomized(role, draft, e.resource))).map((g) => g.id),
    [role, draft],
  );
  // Saat mencari, buka semua grup yang cocok; selain itu mulai dengan grup yang berbeda dari bawaan.
  const openByDefault = q ? groups.map((g) => g.id) : customizedGroups;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari modul, mis. keuangan, surat, warga…"
          aria-label="Cari modul"
          className="h-11 pl-9"
        />
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Keterangan penanda">
        <li className="inline-flex items-center gap-1">
          <Plus className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" /> Ditambahkan dari bawaan peran
        </li>
        <li className="inline-flex items-center gap-1">
          <Minus className="h-3.5 w-3.5 text-red-700 dark:text-red-400" aria-hidden="true" /> Dicabut dari bawaan peran
        </li>
        <li className="inline-flex items-center gap-1">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" aria-hidden="true" /> Data sensitif
        </li>
      </ul>

      {groups.length === 0 ? (
        <p role="status" className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Tidak ada modul yang cocok dengan “{query}”.
        </p>
      ) : (
        // key memaksa Accordion membaca ulang nilai awal ketika mode cari berubah.
        <Accordion key={q ? "search" : "browse"} type="multiple" defaultValue={openByDefault} className="rounded-lg border">
          {groups.map((g) => {
            const customized = g.entries.filter((e) => isResourceCustomized(role, draft, e.resource)).length;
            return (
              <AccordionItem key={g.id} value={g.id} className="px-3 last:border-b-0">
                <AccordionTrigger className="min-h-11 py-3 text-sm font-medium hover:no-underline">
                  <span className="flex flex-wrap items-center gap-2 text-left">
                    {g.label}
                    <span className="text-xs font-normal text-muted-foreground">{g.entries.length} modul</span>
                    {customized > 0 && <Badge variant="outline">{customized} disesuaikan</Badge>}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <ul className="divide-y">
                    {g.entries.map((e) => (
                      <li key={e.resource} className="py-3">
                        <fieldset disabled={disabled} className="min-w-0">
                          <legend className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-medium">
                            {e.label}
                            {e.sensitive && (
                              <span className="inline-flex items-center gap-1 text-xs font-normal text-amber-800 dark:text-amber-300">
                                <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                                Sensitif
                              </span>
                            )}
                          </legend>
                          <p className="mt-0.5 text-xs text-muted-foreground">{e.hint}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {e.actions.map((action) => {
                              const state = cellState(role, draft, e.resource, action);
                              const checked = draft[e.resource].includes(action);
                              const id = `perm-${e.resource}-${action}`;
                              return (
                                <label
                                  key={action}
                                  htmlFor={id}
                                  title={ACTION_HINTS[action]}
                                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                                    state === "added"
                                      ? "border-emerald-600 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
                                      : state === "removed"
                                        ? "border-red-600 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100"
                                        : checked
                                          ? "border-primary/40 bg-primary/5"
                                          : "bg-background text-muted-foreground"
                                  } ${disabled ? "cursor-not-allowed opacity-60" : "hover:bg-accent"}`}
                                >
                                  <Checkbox
                                    id={id}
                                    checked={checked}
                                    disabled={disabled}
                                    onCheckedChange={(v) => onToggle(e.resource, action, v === true)}
                                  />
                                  {ACTION_LABELS[action]}
                                  {state === "added" && (
                                    <>
                                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">(tambahan dari bawaan peran)</span>
                                    </>
                                  )}
                                  {state === "removed" && (
                                    <>
                                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                                      <span className="sr-only">(dicabut dari bawaan peran)</span>
                                    </>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
