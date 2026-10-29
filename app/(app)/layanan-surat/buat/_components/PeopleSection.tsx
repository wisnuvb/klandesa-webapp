"use client";

import { Loader2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ResidentOption } from "@/components/AutocompleteResidentInput";
import type { FormSpec } from "@/lib/letters/document/form-spec";
import { PERSON_FIELDS, personFieldLabel, type PersonFieldKey } from "@/lib/letters/registry";
import type { ComposerState } from "../_utils/composer";
import { ResidentSearch } from "./ResidentSearch";

const LONG: ReadonlySet<string> = new Set(["alamat", "alamat_lengkap"]);

type Actions = {
  selectPerson: (role: string, r: ResidentOption) => void;
  clearPerson: (role: string) => void;
  setPersonQuery: (role: string, q: string) => void;
  setPersonManual: (role: string, manual: boolean) => void;
  setPersonValue: (role: string, key: string, value: string) => void;
};

export function PeopleSection({
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
  if (spec.people.length === 0) return null;
  return (
    <div className="space-y-4">
      {spec.people.map((role) => {
        const p = state.people[role.id];
        const manual = p?.mode === "manual";
        const loading = loadingKeys.has(`person-${role.id}`);
        const selected = p && p.mode !== "unset";
        // Mode manual selalu menanyakan nama, walau kertas tidak memakainya.
        const keys: PersonFieldKey[] = manual
          ? (["nama", ...role.fields.filter((f) => f !== "nama")] as PersonFieldKey[])
          : role.fields;
        const switchId = `person-${role.id}-manual`;
        return (
          <fieldset key={role.id} className="space-y-3 rounded-lg border p-4">
            <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
              <UserRound className="h-4 w-4" aria-hidden="true" />
              {role.label}
              {role.required ? <span className="text-xs font-normal text-muted-foreground">(wajib)</span> : null}
            </legend>

            {!manual ? (
              <ResidentSearch
                id={`person-${role.id}-cari`}
                label="Cari warga (nama atau NIK)"
                value={p?.query ?? ""}
                required={role.required}
                onChange={(v) => actions.setPersonQuery(role.id, v)}
                onSelect={(r) => actions.selectPerson(role.id, r)}
                onClear={() => actions.clearPerson(role.id)}
              />
            ) : null}

            {role.allowManual ? (
              <div className="flex min-h-11 items-center gap-3">
                <Switch id={switchId} checked={manual} onCheckedChange={(on) => actions.setPersonManual(role.id, on)} />
                <Label htmlFor={switchId} className="cursor-pointer font-normal">Bukan warga desa — isi manual</Label>
              </div>
            ) : null}

            {loading ? (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Mengambil data warga…
              </p>
            ) : null}

            {selected && !loading ? (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs text-muted-foreground">
                  {manual ? "Isi data orang ini. Hanya yang tampil di surat yang ditanyakan." : "Terisi dari data warga, bisa diperbaiki."}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {keys.map((k) => {
                    const id = `person-${role.id}-${k}`;
                    const def = PERSON_FIELDS.find((f) => f.key === k);
                    const value = p.values[k] ?? "";
                    const full = LONG.has(k);
                    return (
                      <div key={k} data-lc-field="" className={`space-y-1.5 rounded-md transition-shadow motion-reduce:transition-none data-[lc-flash=1]:ring-2 data-[lc-flash=1]:ring-ring data-[lc-flash=1]:ring-offset-2 ${full ? "sm:col-span-2" : ""}`}>
                        <Label htmlFor={id}>
                          {personFieldLabel(k)}
                          {manual && k === "nama" ? (
                            <>
                              <span aria-hidden="true" className="text-destructive"> *</span>
                              <span className="sr-only"> (wajib diisi)</span>
                            </>
                          ) : null}
                          {def && "sensitive" in def && def.sensitive ? <span className="ml-2 text-xs text-muted-foreground">(data sensitif)</span> : null}
                        </Label>
                        {full ? (
                          <Textarea id={id} rows={2} value={value} onChange={(e) => actions.setPersonValue(role.id, k, e.target.value)} />
                        ) : (
                          <Input
                            id={id}
                            className="pointer-coarse:h-11"
                            type={def?.type === "date" ? "date" : "text"}
                            inputMode={k === "umur" ? "numeric" : undefined}
                            value={value}
                            onChange={(e) => actions.setPersonValue(role.id, k, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </fieldset>
        );
      })}
    </div>
  );
}
