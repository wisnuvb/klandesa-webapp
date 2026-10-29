"use client";

import { useId, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import type { LetterDocument } from "@/lib/letters/document/schema";
import type { FieldType } from "@/lib/letters/registry";
import { FIELD_TYPE_LABELS, buildFieldOptions, filterFieldOptions } from "./helpers";

export type NewFieldInput = { label: string; type: FieldType; options?: string[] };

export type FieldPickerProps = {
  doc: Pick<LetterDocument, "people" | "fields">;
  /** Dipanggil saat operator memilih isian yang sudah ada. */
  onPick: (ref: string, label: string) => void;
  /** Membuat isian tambahan baru lalu mengembalikan rujukannya; chip langsung disisipkan oleh pemanggil. */
  onCreate: (input: NewFieldInput) => { ref: string; label: string };
  onCancel?: () => void;
  /** Teks awal kolom pencarian (mis. dari ketikan setelah `/`). */
  initialQuery?: string;
};

const CREATE_VALUE = "__buat_isian_baru__";
const CREATABLE_TYPES: FieldType[] = ["text", "longtext", "number", "money", "date", "choice"];

/**
 * Pemilih isian: kolom cari + daftar bergrup (combobox ARIA lewat cmdk, navigasi panah/Enter/Esc)
 * dan formulir kecil "Buat isian baru" di dasarnya.
 */
export function FieldPicker({ doc, onPick, onCreate, onCancel, initialQuery = "" }: FieldPickerProps) {
  const [mode, setMode] = useState<"pick" | "create">("pick");
  const [query, setQuery] = useState(initialQuery);
  const groups = useMemo(() => filterFieldOptions(buildFieldOptions(doc), query), [doc, query]);

  if (mode === "create") {
    return (
      <CreateForm
        initialLabel={query.trim()}
        onBack={() => setMode("pick")}
        onSubmit={(input) => {
          const made = onCreate(input);
          onPick(made.ref, made.label);
        }}
      />
    );
  }

  return (
    <Command
      shouldFilter={false}
      label="Pilih isian"
      className="bg-transparent"
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancel) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder="Cari isian, mis. nama, alamat, tanggal…" />
      <CommandList className="max-h-72">
        <CommandEmpty>
          Tidak ada isian “{query.trim()}”. Pilih “Buat isian baru” di bawah.
        </CommandEmpty>
        {groups.map((g) => (
          <CommandGroup key={g.id} heading={g.title}>
            {g.options.map((o) => (
              <CommandItem key={o.ref} value={o.ref} onSelect={() => onPick(o.ref, o.label)} className="min-h-11 items-start gap-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{o.label}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {o.example ? `Contoh: ${o.example}` : o.hint}
                  </span>
                </span>
                {o.sensitive && <span className="mt-0.5 shrink-0 rounded border px-1 text-[11px] text-muted-foreground">Sensitif</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        <CommandGroup>
          <CommandItem value={CREATE_VALUE} onSelect={() => setMode("create")} className="min-h-11 gap-2 font-medium">
            <Plus className="h-4 w-4" aria-hidden />
            Buat isian baru{query.trim() ? `: “${query.trim()}”` : "…"}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

function CreateForm({
  initialLabel,
  onBack,
  onSubmit,
}: {
  initialLabel: string;
  onBack: () => void;
  onSubmit: (input: NewFieldInput) => void;
}) {
  const uid = useId();
  const [label, setLabel] = useState(initialLabel);
  const [type, setType] = useState<FieldType>("text");
  const [options, setOptions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const name = label.trim();
    if (!name) return setError("Beri nama isian, mis. “Luas tanah”.");
    if (name.length > 80) return setError("Nama isian maksimal 80 huruf.");
    const list = options.split(",").map((s) => s.trim()).filter(Boolean);
    if (type === "choice" && list.length === 0) return setError("Tulis minimal satu pilihan, pisahkan dengan koma.");
    setError(null);
    onSubmit({ label: name, type, ...(type === "choice" ? { options: list.slice(0, 30) } : {}) });
  };

  const field = "h-11 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form
      className="space-y-3 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onBack();
        }
      }}
    >
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" className="min-h-11 gap-1 px-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali
        </Button>
        <p className="text-sm font-medium">Buat isian baru</p>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${uid}-nama`} className="text-sm font-medium">Nama isian</label>
        <input
          id={`${uid}-nama`}
          autoFocus
          className={field}
          value={label}
          maxLength={80}
          placeholder="mis. Luas tanah"
          aria-describedby={error ? `${uid}-err` : undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor={`${uid}-jenis`} className="text-sm font-medium">Jenis isian</label>
        <select id={`${uid}-jenis`} className={field} value={type} onChange={(e) => setType(e.target.value as FieldType)}>
          {CREATABLE_TYPES.map((t) => (
            <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      {type === "choice" && (
        <div className="space-y-1">
          <label htmlFor={`${uid}-opsi`} className="text-sm font-medium">Pilihan (pisahkan dengan koma)</label>
          <input id={`${uid}-opsi`} className={field} value={options} placeholder="mis. Hak milik, Hak guna" onChange={(e) => setOptions(e.target.value)} />
        </div>
      )}
      {error && (
        <p id={`${uid}-err`} role="alert" className="text-sm text-destructive">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">Isian ini akan muncul sebagai kolom yang diisi saat surat dibuat.</p>
      <Button type="submit" className="min-h-11 w-full">Buat dan sisipkan</Button>
    </form>
  );
}
