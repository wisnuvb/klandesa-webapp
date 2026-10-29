"use client";

import { memo, useId, useState, type FormEvent, type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CustomField, Group, PersonRole } from "@/lib/letters/document/schema";
import { LIMITS } from "@/lib/letters/document/schema";
import type { EditorApi, OpResult, Usage } from "@/lib/letters/editor";
import type { FieldType } from "@/lib/letters/registry";
import { Button } from "@/components/ui/button";
import {
  FIELD_TYPE_LABELS, addGroupField, fieldPatchForType, groupRangePatch, optionsError, optionsToText, parseOptions,
  patchGroupField, removeGroupField, validateLabel,
} from "./helpers";
import {
  CheckField, ConfirmDialog, Disclosure, EmptyNote, FieldError, NumberField, SelectField, Section, TextField,
  controlClass, labelClass,
} from "./ui";


const TYPE_OPTIONS = (Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((value) => ({ value, label: FIELD_TYPE_LABELS[value] }));
const NEVER = 3_600_000; // simpan saat kolom ditinggalkan (untuk isian dengan banyak baris)

type Props = { editor: EditorApi; onReveal?: (blockId: string) => void };

// ---------------------------------------------------------------- bagian bersama

type RemoveTarget = { kind: "person" | "field" | "group"; id: string; name: string; usage: Usage };

function RemoveDialog({
  target, onClose, onRemove, onReveal, select,
}: {
  target: RemoveTarget | null;
  onClose: () => void;
  onRemove: (t: RemoveTarget) => void;
  onReveal?: (blockId: string) => void;
  select: (id: string | null) => void;
}) {
  const inUse = (target?.usage.count ?? 0) > 0;
  const first = target?.usage.blockIds[0];
  const what = target?.kind === "person" ? "orang" : target?.kind === "field" ? "isian" : "daftar";
  return (
    <ConfirmDialog
      open={!!target}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={inUse ? `“${target?.name}” belum bisa dihapus` : `Hapus ${what} “${target?.name}”?`}
      description={
        inUse
          ? `Masih dipakai di ${target?.usage.count} bagian pada kertas. Ubah atau hapus bagian itu dulu, lalu ${what} ini bisa dihapus.`
          : `${what[0].toUpperCase()}${what.slice(1)} ini belum dipakai di kertas. Penghapusan dapat dibatalkan dengan tombol Urungkan.`
      }
      hideConfirm={inUse}
      destructive
      confirmLabel="Ya, hapus"
      onConfirm={() => target && onRemove(target)}
      extra={
        inUse && first ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => { select(first); onReveal?.(first); onClose(); }}
          >
            Tunjukkan bagian yang memakai
          </Button>
        ) : null
      }
    />
  );
}

function AddRow({
  label, placeholder, buttonLabel, onAdd, disabled, disabledNote,
}: {
  label: string;
  placeholder: string;
  buttonLabel: string;
  onAdd: (name: string) => void;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateLabel(name);
    if (err) return setError(err);
    onAdd(name.trim());
    setName("");
    setError(null);
  };
  return (
    <form onSubmit={submit} className="space-y-1" noValidate>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          value={name}
          maxLength={80}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          className={controlClass}
        />
        <Button type="submit" disabled={disabled} className="min-h-11 shrink-0">
          <Plus aria-hidden /> {buttonLabel}
        </Button>
      </div>
      <FieldError id={`${id}-err`}>{error}</FieldError>
      {disabled && disabledNote && <p className="text-xs text-muted-foreground">{disabledNote}</p>}
    </form>
  );
}

function RowShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <li className="space-y-3 rounded-lg border border-input bg-background p-3">
      {children}
      {footer}
    </li>
  );
}

function UsageLine({ usage }: { usage: Usage }) {
  return (
    <p className="text-xs text-muted-foreground">
      {usage.count > 0 ? `Dipakai di ${usage.count} bagian` : "Belum dipakai di kertas"}
    </p>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="min-h-11 text-destructive hover:text-destructive" onClick={onClick}>
      <Trash2 aria-hidden /> {label}
    </Button>
  );
}

// ---------------------------------------------------------------------- orang

const PersonRow = memo(function PersonRow({
  person, usage, locked, onUpdate, onAskRemove,
}: {
  person: PersonRole;
  usage: Usage;
  locked: boolean;
  onUpdate: (id: string, patch: Partial<Omit<PersonRole, "id">>) => void;
  onAskRemove: (p: PersonRole, usage: Usage) => void;
}) {
  return (
    <RowShell
      footer={
        <div className="flex items-center justify-between gap-2">
          <UsageLine usage={usage} />
          {locked ? (
            <span className="text-xs text-muted-foreground">Wajib untuk surat warga</span>
          ) : (
            <RemoveButton label="Hapus" onClick={() => onAskRemove(person, usage)} />
          )}
        </div>
      }
    >
      <TextField
        label="Nama orang"
        value={person.label}
        validate={validateLabel}
        onCommit={(label) => onUpdate(person.id, { label })}
      />
      <Disclosure>
        <CheckField
          label="Wajib dipilih saat membuat surat"
          checked={person.required}
          onChange={(required) => onUpdate(person.id, { required })}
        />
        <CheckField
          label="Boleh diketik manual"
          hint="Untuk orang yang bukan warga desa."
          checked={person.allowManual}
          onChange={(allowManual) => onUpdate(person.id, { allowManual })}
        />
        <p className="text-xs text-muted-foreground">Kode internal: <code className="font-mono">{person.id}</code></p>
      </Disclosure>
    </RowShell>
  );
});

function PeopleSection({ editor, onReveal }: Props) {
  const { doc } = editor;
  const [target, setTarget] = useState<RemoveTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const remove = (t: RemoveTarget) => {
    const r: OpResult = editor.removePerson(t.id);
    setNotice(r.ok ? null : r.error);
  };
  return (
    <Section
      title="Orang yang disebut di surat"
      description="Mis. pemohon, almarhum, pihak kedua. Datanya bisa diambil dari data warga."
    >
      {doc.people.length === 0 ? (
        <EmptyNote>Belum ada orang. Tambahkan bila surat menyebut data seseorang.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {doc.people.map((p) => (
            <PersonRow
              key={p.id}
              person={p}
              usage={editor.personUsage(p.id)}
              locked={p.id === "pemohon" && doc.audience === "warga"}
              onUpdate={editor.updatePerson}
              onAskRemove={(person, usage) => setTarget({ kind: "person", id: person.id, name: person.label, usage })}
            />
          ))}
        </ul>
      )}
      <FieldError>{notice}</FieldError>
      <AddRow
        label="Tambah orang"
        placeholder="mis. Almarhum"
        buttonLabel="Tambah"
        disabled={doc.people.length >= LIMITS.people}
        disabledNote="Sudah mencapai jumlah maksimum."
        onAdd={(name) => editor.addPerson(name)}
      />
      <RemoveDialog target={target} onClose={() => setTarget(null)} onRemove={remove} onReveal={onReveal} select={editor.select} />
    </Section>
  );
}

// --------------------------------------------------------------------- isian

const FieldRow = memo(function FieldRow({
  field, usage, onUpdate, onAskRemove,
}: {
  field: CustomField;
  usage: Usage;
  onUpdate: (id: string, patch: Partial<Omit<CustomField, "id">>) => void;
  onAskRemove: (f: CustomField, usage: Usage) => void;
}) {
  const optErr = optionsError(field);
  return (
    <RowShell
      footer={
        <div className="flex items-center justify-between gap-2">
          <UsageLine usage={usage} />
          <RemoveButton label="Hapus" onClick={() => onAskRemove(field, usage)} />
        </div>
      }
    >
      <TextField label="Nama isian" value={field.label} validate={validateLabel} onCommit={(label) => onUpdate(field.id, { label })} />
      <SelectField
        label="Jenis isian"
        value={field.type}
        options={TYPE_OPTIONS}
        onChange={(type) => onUpdate(field.id, fieldPatchForType(field, type))}
      />
      {field.type === "choice" && (
        <TextField
          label="Pilihan jawaban"
          multiline
          rows={4}
          delay={NEVER}
          value={optionsToText(field.options)}
          error={optErr}
          hint="Tulis satu pilihan per baris."
          onCommit={(text) => onUpdate(field.id, { options: parseOptions(text) })}
        />
      )}
      <CheckField label="Wajib diisi" checked={field.required} onChange={(required) => onUpdate(field.id, { required })} />
      <CheckField
        label="Data sensitif"
        hint="Disembunyikan dari daftar dan dicatat saat dibuka."
        checked={field.sensitive}
        onChange={(sensitive) => onUpdate(field.id, { sensitive })}
      />
      <Disclosure>
        <TextField
          label="Contoh isian (placeholder)"
          value={field.placeholder ?? ""}
          maxLength={120}
          onCommit={(v) => onUpdate(field.id, { placeholder: v || undefined })}
        />
        <TextField
          label="Petunjuk untuk pengisi"
          value={field.help ?? ""}
          maxLength={200}
          onCommit={(v) => onUpdate(field.id, { help: v || undefined })}
        />
        <p className="text-xs text-muted-foreground">Kode internal: <code className="font-mono">isian.{field.id}</code></p>
      </Disclosure>
    </RowShell>
  );
});

function FieldsSection({ editor, onReveal }: Props) {
  const { doc } = editor;
  const [target, setTarget] = useState<RemoveTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const remove = (t: RemoveTarget) => {
    const r = editor.removeField(t.id);
    setNotice(r.ok ? null : r.error);
  };
  return (
    <Section
      title="Isian tambahan"
      description="Hal yang diisi operator saat membuat surat, mis. keperluan atau luas tanah."
    >
      {doc.fields.length === 0 ? (
        <EmptyNote>Belum ada isian tambahan.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {doc.fields.map((f) => (
            <FieldRow
              key={f.id}
              field={f}
              usage={editor.fieldUsage(f.id)}
              onUpdate={editor.updateField}
              onAskRemove={(field, usage) => setTarget({ kind: "field", id: field.id, name: field.label, usage })}
            />
          ))}
        </ul>
      )}
      <FieldError>{notice}</FieldError>
      <AddRow
        label="Tambah isian"
        placeholder="mis. Keperluan"
        buttonLabel="Tambah"
        disabled={doc.fields.length >= LIMITS.fields}
        disabledNote="Sudah mencapai jumlah maksimum."
        onAdd={(name) => editor.addField(name)}
      />
      <RemoveDialog target={target} onClose={() => setTarget(null)} onRemove={remove} onReveal={onReveal} select={editor.select} />
    </Section>
  );
}

// -------------------------------------------------------------------- daftar

function GroupFieldRow({
  field, onPatch, onRemove,
}: {
  field: CustomField;
  onPatch: (id: string, patch: Partial<Omit<CustomField, "id">>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="space-y-2 rounded-md border border-dashed border-input p-2">
      <TextField label="Nama kolom" value={field.label} validate={validateLabel} onCommit={(label) => onPatch(field.id, { label })} />
      <SelectField
        label="Jenis"
        value={field.type}
        options={TYPE_OPTIONS}
        onChange={(type) => onPatch(field.id, fieldPatchForType(field, type))}
      />
      {field.type === "choice" && (
        <TextField
          label="Pilihan jawaban"
          multiline
          rows={3}
          delay={NEVER}
          value={optionsToText(field.options)}
          error={optionsError(field)}
          hint="Satu pilihan per baris."
          onCommit={(text) => onPatch(field.id, { options: parseOptions(text) })}
        />
      )}
      <CheckField label="Wajib diisi" checked={field.required} onChange={(required) => onPatch(field.id, { required })} />
      <RemoveButton label="Hapus kolom" onClick={() => onRemove(field.id)} />
    </li>
  );
}

const GroupRow = memo(function GroupRow({
  doc, group, usage, onUpdate, onAskRemove,
}: {
  doc: EditorApi["doc"];
  group: Group;
  usage: Usage;
  onUpdate: (id: string, patch: Partial<Omit<Group, "id">>) => void;
  onAskRemove: (g: Group, usage: Usage) => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const removeColumn = (fieldId: string) => {
    const r = removeGroupField(doc, group, fieldId);
    if (r.ok) {
      setNotice(null);
      onUpdate(group.id, { fields: r.group.fields });
    } else setNotice(r.error);
  };
  return (
    <RowShell
      footer={
        <div className="flex items-center justify-between gap-2">
          <UsageLine usage={usage} />
          <RemoveButton label="Hapus daftar" onClick={() => onAskRemove(group, usage)} />
        </div>
      }
    >
      <TextField label="Nama daftar" value={group.label} validate={validateLabel} onCommit={(label) => onUpdate(group.id, { label })} />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Paling sedikit"
          unit="baris"
          min={0}
          max={LIMITS.groupRows}
          value={group.min}
          onCommit={(min) => onUpdate(group.id, groupRangePatch(group, { min }))}
        />
        <NumberField
          label="Paling banyak"
          unit="baris"
          min={1}
          max={LIMITS.groupRows}
          value={group.max}
          onCommit={(max) => onUpdate(group.id, groupRangePatch(group, { max }))}
        />
      </div>
      <CheckField
        label="Tiap baris bisa diisi dari data warga"
        hint="Operator cukup mencari warga, datanya terisi sendiri."
        checked={group.personRows}
        onChange={(personRows) => onUpdate(group.id, { personRows })}
      />
      <fieldset className="space-y-2">
        <legend className={labelClass}>Kolom dalam daftar ({group.fields.length})</legend>
        <ul className="space-y-2">
          {group.fields.map((f) => (
            <GroupFieldRow
              key={f.id}
              field={f}
              onPatch={(id, patch) => onUpdate(group.id, { fields: patchGroupField(group, id, patch).fields })}
              onRemove={removeColumn}
            />
          ))}
        </ul>
        <FieldError>{notice}</FieldError>
        <AddRow
          label="Tambah kolom"
          placeholder="mis. Hubungan"
          buttonLabel="Tambah"
          disabled={group.fields.length >= LIMITS.groupFields}
          disabledNote="Sudah mencapai jumlah kolom maksimum."
          onAdd={(name) => onUpdate(group.id, { fields: addGroupField(group, name).fields })}
        />
      </fieldset>
      <Disclosure>
        <p className="text-xs text-muted-foreground">Kode internal: <code className="font-mono">{group.id}</code></p>
      </Disclosure>
    </RowShell>
  );
});

function GroupsSection({ editor, onReveal }: Props) {
  const { doc } = editor;
  const [target, setTarget] = useState<RemoveTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const remove = (t: RemoveTarget) => {
    const r = editor.removeGroup(t.id);
    setNotice(r.ok ? null : r.error);
  };
  return (
    <Section
      title="Daftar berulang"
      description="Untuk data yang jumlahnya berubah-ubah, mis. ahli waris, saksi, anggota keluarga."
    >
      {doc.groups.length === 0 ? (
        <EmptyNote>Belum ada daftar berulang.</EmptyNote>
      ) : (
        <ul className="space-y-3">
          {doc.groups.map((g) => (
            <GroupRow
              key={g.id}
              doc={doc}
              group={g}
              usage={editor.groupUsage(g.id)}
              onUpdate={editor.updateGroup}
              onAskRemove={(group, usage) => setTarget({ kind: "group", id: group.id, name: group.label, usage })}
            />
          ))}
        </ul>
      )}
      <FieldError>{notice}</FieldError>
      <AddRow
        label="Tambah daftar"
        placeholder="mis. Ahli waris"
        buttonLabel="Tambah"
        disabled={doc.groups.length >= LIMITS.groups}
        disabledNote="Sudah mencapai jumlah maksimum."
        onAdd={(name) => editor.addGroup(name)}
      />
      <RemoveDialog target={target} onClose={() => setTarget(null)} onRemove={remove} onReveal={onReveal} select={editor.select} />
    </Section>
  );
}

// ---------------------------------------------------------------------- gabungan

export const PeoplePanel = memo(function PeoplePanel({ editor, onReveal }: Props) {
  return (
    <div className="space-y-8">
      <PeopleSection editor={editor} onReveal={onReveal} />
      <FieldsSection editor={editor} onReveal={onReveal} />
      <GroupsSection editor={editor} onReveal={onReveal} />
    </div>
  );
});
