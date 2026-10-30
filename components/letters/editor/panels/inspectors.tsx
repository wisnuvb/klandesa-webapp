"use client";

/** Formulir "Atur bagian ini" per jenis bagian. Hanya memetakan isian → patch lewat helper murni. */
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { LIMITS, type Block, type LetterDocument } from "@/lib/letters/document/schema";
import type { EditorApi } from "@/lib/letters/editor";
import { PERSON_FIELDS, personFieldLabel } from "@/lib/letters/registry";
import { Button } from "@/components/ui/button";
import { signaturePlace } from "@/components/letters/LetterPaper";
import * as H from "./helpers";
import { CheckField, Disclosure, EmptyNote, FieldError, NumberField, RadioCards, SelectField, Section, TextField, hintClass, labelClass } from "./ui";

type B<T extends Block["type"]> = Extract<Block, { type: T }>;
type InspectorProps<T extends Block["type"]> = { block: B<T>; doc: LetterDocument; editor: EditorApi };

const ALIGN_OPTIONS = [
  { value: "left" as const, label: "Rata kiri" },
  { value: "center" as const, label: "Tengah" },
  { value: "right" as const, label: "Rata kanan" },
  { value: "justify" as const, label: "Rata kiri-kanan" },
];
const ALIGN3_OPTIONS = ALIGN_OPTIONS.filter((o) => o.value !== "justify") as Array<{ value: "left" | "center" | "right"; label: string }>;
const SPREAD_OPTIONS = [
  { value: "fill" as const, label: "Kolom sama lebar" },
  { value: "evenly" as const, label: "Sama rata (jarak sama)" },
  { value: "around" as const, label: "Jarak di sekeliling" },
  { value: "between" as const, label: "Rapat ke tepi kiri & kanan" },
  { value: "start" as const, label: "Rapat kiri" },
  { value: "center" as const, label: "Tengah" },
  { value: "end" as const, label: "Rapat kanan" },
];
const ALIGN3_PLACE = [
  { value: "left" as const, label: "Kiri" },
  { value: "center" as const, label: "Tengah" },
  { value: "right" as const, label: "Kanan" },
];

/** Pembuat fungsi ubah bagian bertipe tetap (jenis tidak pernah berganti). */
function useUpdate<T extends Block["type"]>(editor: EditorApi, block: B<T>) {
  const { updateBlock } = editor;
  const id = block.id;
  const type = block.type;
  return useCallback(
    (fn: (b: B<T>) => B<T>) => updateBlock(id, (b) => (b.type === type ? fn(b as B<T>) : b)),
    [updateBlock, id, type],
  );
}

function MoveButtons({ onUp, onDown, upLabel, downLabel }: { onUp?: () => void; onDown?: () => void; upLabel: string; downLabel: string }) {
  return (
    <div className="flex gap-1">
      <Button type="button" variant="outline" size="icon" className="size-11" onClick={onUp} disabled={!onUp} aria-label={upLabel}>
        <ArrowUp aria-hidden />
      </Button>
      <Button type="button" variant="outline" size="icon" className="size-11" onClick={onDown} disabled={!onDown} aria-label={downLabel}>
        <ArrowDown aria-hidden />
      </Button>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{children}</p>;
}

// ------------------------------------------------------------------- teks

export function ParagraphInspector({ block, editor }: InspectorProps<"paragraph">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <Hint>Ketik isi paragraf langsung di kertas. Tombol + pada kertas menyisipkan isian data.</Hint>
      <SelectField label="Perataan teks" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => up((b) => H.patchBlock(b, { align }))} />
      <CheckField label="Baris pertama menjorok ke dalam" checked={block.indentFirst} onChange={(indentFirst) => up((b) => H.patchBlock(b, { indentFirst }))} />
      <NumberField label="Jarak ke bagian berikutnya" unit="mm" min={0} max={20} value={block.spaceAfterMm} onCommit={(spaceAfterMm) => up((b) => H.patchBlock(b, { spaceAfterMm }))} />
    </div>
  );
}

export function HeadingInspector({ block, editor }: InspectorProps<"heading">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <SelectField
        label="Ukuran judul"
        value={block.level}
        options={[{ value: 1, label: "Besar" }, { value: 2, label: "Sedang" }, { value: 3, label: "Kecil" }]}
        onChange={(level) => up((b) => ({ ...b, level: level as 1 | 2 | 3 }))}
      />
      <SelectField label="Perataan teks" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => up((b) => H.patchBlock(b, { align }))} />
      <CheckField label="Garis bawah" checked={block.underline} onChange={(underline) => up((b) => H.patchBlock(b, { underline }))} />
    </div>
  );
}

export function TitleInspector({ block, editor }: InspectorProps<"title">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <Hint>Ketik judul langsung di kertas.</Hint>
      <CheckField label="Tampilkan nomor surat di bawah judul" checked={block.showNumber} onChange={(showNumber) => up((b) => H.patchBlock(b, { showNumber }))} />
      {block.showNumber && (
        <TextField label="Tulisan sebelum nomor" value={block.numberPrefix} maxLength={30} onCommit={(numberPrefix) => up((b) => H.patchBlock(b, { numberPrefix }))} />
      )}
      <SelectField label="Perataan" value={block.align} options={ALIGN_OPTIONS} onChange={(align) => up((b) => H.patchBlock(b, { align }))} />
    </div>
  );
}

export function MemoInspector({ block, editor }: InspectorProps<"memo">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <Hint>Tanggal dan alamat tujuan diubah langsung di kertas. Di sini Anda mengatur baris Nomor, Sifat, Lampiran, dan Perihal.</Hint>
      <ul className="space-y-3">
        {block.rows.map((row, i) => {
          const pt = H.plainText(row.value);
          return (
            <li key={i} className="space-y-2 rounded-lg border border-input p-3">
              <TextField label={`Nama baris ${i + 1}`} value={row.label} validate={H.validateLabel} onCommit={(label) => up((b) => H.setMemoRow(b, i, { label }))} />
              {pt.simple ? (
                <TextField label="Isi" value={pt.text} onCommit={(valueText) => up((b) => H.setMemoRow(b, i, { valueText }))} />
              ) : (
                <p className="text-xs text-muted-foreground">Isinya memuat isian data; ubah langsung di kertas.</p>
              )}
              <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" onClick={() => up((b) => H.removeMemoRow(b, i))}>
                <Trash2 aria-hidden /> Hapus baris
              </Button>
            </li>
          );
        })}
      </ul>
      <Button type="button" variant="outline" className="min-h-11" disabled={block.rows.length >= 6} onClick={() => up((b) => H.addMemoRow(b))}>
        <Plus aria-hidden /> Tambah baris
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------- data

export function PersonDataInspector({ block, doc, editor }: InspectorProps<"personData">) {
  const up = useUpdate(editor, block);
  const roleOptions = useMemo(() => {
    const list = doc.people.map((p) => ({ value: p.id, label: p.label }));
    return list.some((o) => o.value === block.role) ? list : [{ value: block.role, label: `${block.role} (tidak ada)` }, ...list];
  }, [doc.people, block.role]);
  const groups = useMemo(() => {
    const map = new Map<string, Array<(typeof PERSON_FIELDS)[number]>>();
    for (const f of PERSON_FIELDS) map.set(f.group, [...(map.get(f.group) ?? []), f]);
    return [...map.entries()];
  }, []);
  return (
    <div className="space-y-4">
      <SelectField label="Data milik siapa" value={block.role} options={roleOptions} onChange={(role) => up((b) => H.patchBlock(b, { role }))} />
      <fieldset>
        <legend className={labelClass}>Data yang ditampilkan ({block.fields.length})</legend>
        <p className={hintClass}>Centang data yang ingin muncul di surat. Minimal satu.</p>
        <div className="mt-2 space-y-3">
          {groups.map(([group, fields]) => (
            <div key={group}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
              {fields.map((f) => (
                <CheckField
                  key={f.key}
                  label={"sensitive" in f && f.sensitive ? `${f.label} (sensitif)` : f.label}
                  checked={block.fields.includes(f.key)}
                  onChange={(on) => up((b) => H.togglePersonField(b, f.key, on))}
                />
              ))}
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={labelClass}>Urutan tampil</legend>
        <ol className="space-y-1">
          {block.fields.map((key, i) => (
            <li key={key} className="flex items-center justify-between gap-2 rounded-md border border-input px-3 py-1">
              <span className="text-sm">{personFieldLabel(key)}</span>
              <MoveButtons
                upLabel={`Naikkan ${personFieldLabel(key)}`}
                downLabel={`Turunkan ${personFieldLabel(key)}`}
                onUp={i > 0 ? () => up((b) => H.movePersonField(b, key, -1)) : undefined}
                onDown={i < block.fields.length - 1 ? () => up((b) => H.movePersonField(b, key, 1)) : undefined}
              />
            </li>
          ))}
        </ol>
      </fieldset>
      <Disclosure>
        <NumberField label="Lebar kolom nama data" unit="mm" min={15} max={80} value={block.labelWidthMm} onCommit={(labelWidthMm) => up((b) => H.patchBlock(b, { labelWidthMm }))} />
        <TextField label="Tanda pemisah" value={block.separator} maxLength={3} onCommit={(separator) => up((b) => H.patchBlock(b, { separator }))} />
      </Disclosure>
    </div>
  );
}

export function RepeatTableInspector({ block, doc, editor }: InspectorProps<"repeatTable">) {
  const up = useUpdate(editor, block);
  const group = doc.groups.find((g) => g.id === block.group);
  const groupOptions = doc.groups.map((g) => ({ value: g.id, label: g.label }));
  if (!group) groupOptions.unshift({ value: block.group, label: `${block.group} (tidak ada)` });
  const fieldOptions = (group?.fields ?? []).map((f) => ({ value: f.id, label: f.label }));
  return (
    <div className="space-y-3">
      <Hint>Baris tabel mengikuti jumlah baris pada daftar yang dipilih saat surat dibuat.</Hint>
      <SelectField
        label="Ambil data dari daftar"
        value={block.group}
        options={groupOptions}
        onChange={(id) => {
          const g = doc.groups.find((x) => x.id === id);
          if (g) up((b) => H.setRepeatGroup(b, g));
        }}
      />
      <CheckField label="Beri nomor urut (1, 2, 3, …)" checked={block.showIndex} onChange={(showIndex) => up((b) => H.patchBlock(b, { showIndex }))} />
      <ul className="space-y-3">
        {block.columns.map((c, i) => (
          <li key={i} className="space-y-2 rounded-lg border border-input p-3">
            <TextField label={`Judul kolom ${i + 1}`} value={c.label} validate={H.validateLabel} onCommit={(label) => up((b) => H.setRepeatColumn(b, i, { label }, group))} />
            <SelectField
              label="Isinya"
              value={c.field}
              options={fieldOptions.some((o) => o.value === c.field) ? fieldOptions : [{ value: c.field, label: `${c.field} (tidak ada)` }, ...fieldOptions]}
              onChange={(field) => up((b) => H.setRepeatColumn(b, i, { field }, group))}
            />
            <Disclosure>
              <SelectField label="Perataan" value={c.align ?? "left"} options={ALIGN_OPTIONS} onChange={(align) => up((b) => H.setRepeatColumn(b, i, { align }, group))} />
            </Disclosure>
            <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" disabled={block.columns.length <= 1} onClick={() => up((b) => H.removeRepeatColumn(b, i))}>
              <Trash2 aria-hidden /> Hapus kolom
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        disabled={!group || block.columns.length >= LIMITS.tableColumns || group.fields.every((f) => block.columns.some((c) => c.field === f.id))}
        onClick={() => up((b) => H.addRepeatColumn(b, group))}
      >
        <Plus aria-hidden /> Tambah kolom
      </Button>
    </div>
  );
}

const MAX_TABLE_ROWS_SHOWN = 20;

export function TableInspector({ block, editor }: InspectorProps<"table">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-4">
      <CheckField label="Beri garis tabel" checked={block.bordered} onChange={(bordered) => up((b) => H.patchBlock(b, { bordered }))} />
      <Section title="Kolom">
        <ul className="space-y-2">
          {block.columns.map((c, i) => (
            <li key={i} className="flex items-end gap-2">
              <TextField className="flex-1" label={`Judul kolom ${i + 1}`} value={c.label} validate={H.validateLabel} onCommit={(label) => up((b) => H.setTableHeader(b, i, label))} />
              <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive hover:text-destructive" disabled={block.columns.length <= 1} aria-label={`Hapus kolom ${c.label}`} onClick={() => up((b) => H.removeTableColumn(b, i))}>
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" className="min-h-11" disabled={block.columns.length >= LIMITS.tableColumns} onClick={() => up((b) => H.addTableColumn(b))}>
          <Plus aria-hidden /> Tambah kolom
        </Button>
      </Section>
      <Section title="Baris" description="Isi sel juga bisa diketik langsung di kertas.">
        <ul className="space-y-3">
          {block.rows.slice(0, MAX_TABLE_ROWS_SHOWN).map((row, r) => (
            <li key={r} className="space-y-2 rounded-lg border border-input p-3">
              <p className="text-sm font-medium">Baris {r + 1}</p>
              {block.columns.map((c, ci) => {
                const pt = H.plainText(row[ci]);
                return pt.simple ? (
                  <TextField key={ci} label={c.label} multiline rows={2} value={pt.text} onCommit={(text) => up((b) => H.setTableCell(b, r, ci, text))} />
                ) : (
                  <p key={ci} className="text-xs text-muted-foreground">{c.label}: berisi isian data atau gaya; ubah langsung di kertas.</p>
                );
              })}
              <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" onClick={() => up((b) => H.removeTableRow(b, r))}>
                <Trash2 aria-hidden /> Hapus baris
              </Button>
            </li>
          ))}
        </ul>
        {block.rows.length > MAX_TABLE_ROWS_SHOWN && (
          <p className={hintClass}>Menampilkan {MAX_TABLE_ROWS_SHOWN} baris pertama. Baris lain diubah langsung di kertas.</p>
        )}
        <Button type="button" variant="outline" className="min-h-11" disabled={block.rows.length >= LIMITS.tableRows} onClick={() => up((b) => H.addTableRow(b))}>
          <Plus aria-hidden /> Tambah baris
        </Button>
      </Section>
    </div>
  );
}

export function ListInspector({ block, editor }: InspectorProps<"list">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <Hint>Ketik butir-butirnya langsung di kertas.</Hint>
      <SelectField
        label="Penanda butir"
        value={block.style}
        options={[{ value: "number" as const, label: "Angka (1, 2, 3)" }, { value: "alpha" as const, label: "Huruf (a, b, c)" }, { value: "bullet" as const, label: "Titik" }]}
        onChange={(style) => up((b) => H.patchBlock(b, { style }))}
      />
    </div>
  );
}

const DICTUM_OPTIONS = [
  { value: "menimbang" as const, label: "Menimbang" },
  { value: "mengingat" as const, label: "Mengingat" },
  { value: "menetapkan" as const, label: "Menetapkan" },
  { value: "diktum" as const, label: "Diktum (KESATU, KEDUA, …)" },
];

export function DictumInspector({ block, editor }: InspectorProps<"dictum">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <Hint>Penomoran (a, b, c atau KESATU, KEDUA) dibuat otomatis. Ketik isinya langsung di kertas.</Hint>
      <SelectField label="Jenis bagian" value={block.kind} options={DICTUM_OPTIONS} onChange={(kind) => up((b) => H.patchBlock(b, { kind }))} />
    </div>
  );
}

export function CcInspector({ block, editor }: InspectorProps<"cc">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <Hint>Ketik daftar pihak yang menerima tembusan langsung di kertas.</Hint>
      <TextField label="Judul daftar" value={block.label} maxLength={40} onCommit={(label) => up((b) => H.patchBlock(b, { label }))} />
    </div>
  );
}

// ------------------------------------------------------------- tanda tangan

export function SignatureInspector({ block, doc, editor }: InspectorProps<"signature">) {
  const up = useUpdate(editor, block);
  const whoOptions = useMemo(
    () => [
      ...H.OFFICIAL_CHOICES.map((o) => ({ value: `pejabat:${o.value}`, label: o.label })),
      ...doc.people.map((p) => ({ value: `peran:${p.id}`, label: `Orang: ${p.label}` })),
      ...doc.groups.map((g) => ({ value: `grup:${g.id}`, label: `Daftar: ${g.label} (satu kolom tiap baris)` })),
      { value: "teks", label: "Tulis sendiri" },
    ],
    [doc.people, doc.groups],
  );
  const [presetNote, setPresetNote] = useState<string | null>(null);
  const sideBySide = block.layout === "row" && (block.slots.length > 1 || block.slots.some((x) => x.who.kind === "grup"));
  const spread = block.spread ?? "fill";
  const applyPreset = (id: (typeof H.SIGNATURE_SLOT_PRESETS)[number]["id"]) => {
    const slots = H.slotsFromPreset(doc, id);
    if (!slots) return setPresetNote("Susunan ini membutuhkan orang atau daftar tambahan. Tambahkan lewat menu Tambah bagian.");
    setPresetNote(null);
    up((b) => H.applySignatureSlots(b, slots));
  };
  return (
    <div className="space-y-4">
      <Hint>Tempat dan tanggal di atas tanda tangan diubah langsung di kertas.</Hint>
      <RadioCards
        legend="Susunan penanda tangan"
        columns={2}
        value={block.layout}
        onChange={(layout) => up((b) => H.patchBlock(b, { layout }))}
        options={[{ value: "row", label: "Berdampingan" }, { value: "stack", label: "Bertumpuk" }]}
      />
      {block.dateline?.length ? (
        <SelectField
          label="Rata tempat & tanggal"
          hint="Baris di atas tanda tangan, mis. “Brambang, 29 Oktober 2026”."
          value={block.datelineAlign ?? "right"}
          options={ALIGN3_OPTIONS}
          onChange={(v) => up((b) => H.patchBlock(b, { datelineAlign: v === "right" ? undefined : v }))}
        />
      ) : null}
      {sideBySide && (
        <SelectField
          label="Sebaran penanda tangan"
          hint="Cara membagi ruang di antara penanda tangan yang berdampingan."
          value={spread}
          options={SPREAD_OPTIONS}
          onChange={(v) => up((b) => H.patchBlock(b, { spread: v === "fill" ? undefined : v }))}
        />
      )}
      <fieldset>
        <legend className={labelClass}>Ganti dengan susunan siap pakai</legend>
        <div className="grid gap-2">
          {H.SIGNATURE_SLOT_PRESETS.map((p) => (
            <Button key={p.id} type="button" variant="outline" className="min-h-11 justify-start whitespace-normal text-left" onClick={() => applyPreset(p.id)}>
              {p.label}
            </Button>
          ))}
        </div>
        <FieldError>{presetNote}</FieldError>
      </fieldset>
      <ul className="space-y-3">
        {block.slots.map((slot, i) => (
          <SlotEditor
            key={slot.id}
            slot={slot}
            layout={block.layout}
            sideBySide={sideBySide}
            spreadActive={sideBySide && spread !== "fill"}
            index={i}
            count={block.slots.length}
            whoOptions={whoOptions}
            onPatch={(patch) => up((b) => H.setSlot(b, slot.id, patch))}
            onMove={(d) => up((b) => H.moveSlot(b, slot.id, d))}
            onRemove={() => up((b) => H.removeSlot(b, slot.id))}
          />
        ))}
      </ul>
      <Button type="button" variant="outline" className="min-h-11" disabled={block.slots.length >= LIMITS.signatureSlots} onClick={() => up((b) => H.addSlot(b))}>
        <Plus aria-hidden /> Tambah penanda tangan
      </Button>
    </div>
  );
}

type Slot = B<"signature">["slots"][number];

function SlotEditor({
  slot, layout, sideBySide, spreadActive, index, count, whoOptions, onPatch, onMove, onRemove,
}: {
  slot: Slot;
  layout: "row" | "stack";
  /** Beberapa penanda tangan sejajar dalam satu baris: blok bisa selebar kolom. */
  sideBySide: boolean;
  /** "Sebaran penanda tangan" aktif: letak per blok tidak berlaku. */
  spreadActive: boolean;
  index: number;
  count: number;
  whoOptions: Array<{ value: string; label: string }>;
  onPatch: (p: Partial<Omit<Slot, "id">>) => void;
  onMove: (d: -1 | 1) => void;
  onRemove: () => void;
}) {
  const current = H.whoToValue(slot.who);
  const options = whoOptions.some((o) => o.value === current) ? whoOptions : [{ value: current, label: `${current} (tidak ada)` }, ...whoOptions];
  const caption = H.plainText(slot.caption);
  return (
    <li className="space-y-3 rounded-lg border border-input p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Penanda tangan {index + 1}</p>
        <MoveButtons
          upLabel={`Pindahkan penanda tangan ${index + 1} ke atas`}
          downLabel={`Pindahkan penanda tangan ${index + 1} ke bawah`}
          onUp={index > 0 ? () => onMove(-1) : undefined}
          onDown={index < count - 1 ? () => onMove(1) : undefined}
        />
      </div>
      <SelectField
        label="Siapa"
        value={current}
        options={options}
        onChange={(v) => {
          const who = H.valueToWho(v, slot.who.kind === "teks" ? slot.who.text : "");
          if (who) onPatch({ who });
        }}
      />
      {slot.who.kind === "teks" && (
        <TextField label="Tulisan di bawah tanda tangan" maxLength={120} value={slot.who.text} onCommit={(text) => onPatch({ who: { kind: "teks", text } })} />
      )}
      <SelectField label="Awalan jabatan" value={slot.prefix} options={Object.entries(H.PREFIX_LABELS).map(([value, label]) => ({ value: value as Slot["prefix"], label }))} onChange={(prefix) => onPatch({ prefix })} />
      {caption.simple ? (
        <TextField label="Tulisan di atas jabatan (opsional)" hint="Mis. “Mengetahui, Camat” atau “Yang menyatakan,”" value={caption.text.replace(/\n/g, " ")} onCommit={(t) => onPatch({ caption: t.trim() ? H.textToInlines(t) : undefined })} />
      ) : (
        <p className="text-xs text-muted-foreground">Tulisan di atas jabatan memuat isian data; ubah langsung di kertas.</p>
      )}
      <div className="grid grid-cols-2 gap-x-3">
        <CheckField label="Stempel" checked={slot.stamp} onChange={(stamp) => onPatch({ stamp })} />
        <CheckField label="Materai" checked={slot.materai} onChange={(materai) => onPatch({ materai })} />
      </div>
      <Disclosure>
        <CheckField label="Tampilkan nama" checked={slot.showName} onChange={(showName) => onPatch({ showName })} />
        <CheckField label="Tampilkan NIP" checked={slot.showNip} onChange={(showNip) => onPatch({ showNip })} />
        {!spreadActive && (
          <SelectField
            label="Letak di halaman"
            hint="Di sisi mana blok tanda tangan ditaruh."
            value={signaturePlace(layout, sideBySide, slot)}
            options={sideBySide ? [{ value: "fill" as const, label: "Selebar kolom" }, ...ALIGN3_PLACE] : ALIGN3_PLACE}
            onChange={(v) => onPatch({ place: v === "fill" ? undefined : v })}
          />
        )}
        <SelectField label="Rata tulisan" hint="Posisi jabatan dan nama di dalam blok." value={slot.align} options={ALIGN3_OPTIONS} onChange={(align) => onPatch({ align })} />
        <NumberField label="Ruang untuk tanda tangan" unit="mm" min={10} max={60} value={slot.gapMm} onCommit={(gapMm) => onPatch({ gapMm })} />
      </Disclosure>
      <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" disabled={count <= 1} onClick={onRemove}>
        <Trash2 aria-hidden /> Hapus penanda tangan
      </Button>
    </li>
  );
}

// ------------------------------------------------------------- tata letak

export function ColumnsInspector({ block, editor }: InspectorProps<"columns">) {
  const up = useUpdate(editor, block);
  const [error, setError] = useState<string | null>(null);
  const current = H.ratioKey(block.ratios);
  return (
    <div className="space-y-3">
      <Hint>Seret atau tambahkan bagian ke dalam kolom langsung di kertas.</Hint>
      <RadioCards
        legend="Lebar kolom"
        value={H.COLUMN_RATIO_PRESETS.some((p) => p.id === current) ? current : ""}
        onChange={(id) => {
          const preset = H.COLUMN_RATIO_PRESETS.find((p) => p.id === id);
          if (!preset) return;
          const err = H.canSetColumnRatios(block, preset.ratios);
          setError(err);
          if (!err) up((b) => H.setColumnRatios(b, preset.ratios));
        }}
        options={H.COLUMN_RATIO_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
      />
      <FieldError>{error}</FieldError>
      {block.children.length > 0 && (
        <p className={hintClass}>
          Bila jumlah kolom dikurangi, isi kolom yang dibuang digabung ke kolom terakhir.
        </p>
      )}
    </div>
  );
}

const OP_OPTIONS = Object.entries(H.CONDITION_OP_LABELS).map(([value, label]) => ({ value: value as keyof typeof H.CONDITION_OP_LABELS, label }));

export function ConditionalInspector({ block, doc, editor }: InspectorProps<"conditional">) {
  const up = useUpdate(editor, block);
  const refs = useMemo(() => H.conditionRefOptions(doc, block.when.ref), [doc, block.when.ref]);
  const selected = refs.find((r) => r.ref === block.when.ref);
  const choices = selected?.field?.type === "choice" ? selected.field.options ?? [] : null;
  return (
    <div className="space-y-3">
      <Hint>Isi bagian ini hanya tampil di surat bila syarat di bawah terpenuhi. Letakkan bagian di dalamnya langsung di kertas.</Hint>
      <SelectField label="Tampil bila" value={block.when.ref} options={refs.map((r) => ({ value: r.ref, label: r.label }))} onChange={(ref) => up((b) => H.setCondition(b, { ref, value: "" }))} />
      <SelectField label="Syarat" value={block.when.op} options={OP_OPTIONS} onChange={(op) => up((b) => H.setCondition(b, { op }))} />
      {H.conditionNeedsValue(block.when.op) &&
        (choices && choices.length > 0 ? (
          <SelectField
            label="Jawabannya"
            value={block.when.value ?? ""}
            placeholder="Pilih jawaban"
            options={choices.map((c) => ({ value: c, label: c }))}
            onChange={(value) => up((b) => H.setCondition(b, { value }))}
          />
        ) : (
          <TextField label="Nilainya" value={block.when.value ?? ""} maxLength={200} onCommit={(value) => up((b) => H.setCondition(b, { value }))} />
        ))}
      {refs.length === 0 && <EmptyNote>Buat isian tambahan dulu di tab Orang &amp; isian.</EmptyNote>}
    </div>
  );
}

// ---------------------------------------------------------- lain-lain

export function DividerInspector({ block, editor }: InspectorProps<"divider">) {
  const up = useUpdate(editor, block);
  return (
    <SelectField
      label="Gaya garis"
      value={block.style}
      options={[{ value: "single" as const, label: "Tipis" }, { value: "double" as const, label: "Ganda" }, { value: "dashed" as const, label: "Putus-putus" }]}
      onChange={(style) => up((b) => H.patchBlock(b, { style }))}
    />
  );
}

export function SpacerInspector({ block, editor }: InspectorProps<"spacer">) {
  const up = useUpdate(editor, block);
  return <NumberField label="Tinggi jarak kosong" unit="mm" min={1} max={100} value={block.heightMm} onCommit={(heightMm) => up((b) => H.patchBlock(b, { heightMm }))} />;
}

export function PageBreakInspector() {
  return <Hint>Teks setelah bagian ini dicetak di halaman berikutnya. Berguna untuk lampiran.</Hint>;
}

export function ImageInspector({ block, editor }: InspectorProps<"image">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <TextField
        label="Alamat gambar"
        value={block.src}
        mono
        maxLength={500}
        validate={H.validateImageSrc}
        hint="Alamat dari situs ini (diawali /) atau https://."
        onCommit={(src) => up((b) => H.patchBlock(b, { src }))}
      />
      <TextField
        label="Keterangan gambar"
        value={block.alt}
        maxLength={200}
        validate={H.validateAlt}
        commitInvalid
        onCommit={(alt) => up((b) => H.patchBlock(b, { alt }))}
        hint="Dibacakan oleh pembaca layar."
      />
      <NumberField label="Lebar gambar" unit="mm" min={5} max={180} value={block.widthMm} onCommit={(widthMm) => up((b) => H.patchBlock(b, { widthMm }))} />
      <SelectField label="Posisi" value={block.align} options={ALIGN3_OPTIONS} onChange={(align) => up((b) => H.patchBlock(b, { align }))} />
    </div>
  );
}

export function QrInspector({ block, editor }: InspectorProps<"qr">) {
  const up = useUpdate(editor, block);
  return (
    <div className="space-y-3">
      <Hint>Kode QR dibuat otomatis saat surat terbit dan mengarah ke halaman pengecekan keaslian surat.</Hint>
      <NumberField label="Ukuran kode" unit="mm" min={15} max={50} value={block.sizeMm} onCommit={(sizeMm) => up((b) => H.patchBlock(b, { sizeMm }))} />
      <SelectField label="Posisi" value={block.align} options={ALIGN3_OPTIONS} onChange={(align) => up((b) => H.patchBlock(b, { align }))} />
    </div>
  );
}
