"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EthnicitySelect } from "@/components/app/data-warga/EthnicityField";
import { Field, SelectField, TextField, entries } from "./fields";
import { inferFromNik, MEMBER_EVENT_LABEL, type FamilyMemberInput, type MemberEvent } from "@/lib/kependudukan/family";
import { KTP_STATUS_LABEL } from "@/lib/residents/extra-fields";
import { BLOOD_TYPE_OPTIONS, EDUCATION_OPTIONS, JOB_OPTIONS, KK_RELATIONSHIP_STATUS, MARITAL_STATUS_OPTIONS, NATIONALITY_OPTIONS, RELIGION_OPTIONS } from "@/utils/constants/user";

const GENDER_OPTIONS = [["Laki-laki", "Laki-laki"], ["Perempuan", "Perempuan"]] as const;
const EXTRA_KEYS = ["education", "occupation", "bloodType", "nationality", "ethnicity", "fatherName", "fatherNik", "motherName", "motherNik", "birthCertNo", "ktpStatus", "event"];

export const memberFieldId = (index: number, key: string) => `m${index}-${key}`;

export function MemberCard({ index, member, errors, canRemove, arrivalEnabled, onChange, onRemove }: {
  index: number;
  member: FamilyMemberInput;
  errors: Record<string, string>;
  canRemove: boolean;
  arrivalEnabled: boolean;
  onChange: (patch: Partial<FamilyMemberInput>) => void;
  onRemove: () => void;
}) {
  const hasExtraError = EXTRA_KEYS.some((k) => errors[k]);
  const [openExtra, setOpenExtra] = useState(false);
  const extraOpen = openExtra || hasExtraError;
  const [inferred, setInferred] = useState(false);
  const id = (k: string) => memberFieldId(index, k);
  const title = member.name.trim() || `Anggota ${index + 1}`;

  function onNik(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    const patch: Partial<FamilyMemberInput> = { nik: digits };
    if (digits.length === 16) {
      const info = inferFromNik(digits);
      if (info) {
        let filled = false;
        if (!member.gender) { patch.gender = info.gender; filled = true; }
        if (!member.birthDate) { patch.birthDate = info.birthDate; filled = true; }
        setInferred(filled);
      }
    } else setInferred(false);
    onChange(patch);
  }

  const eventOptions = (Object.keys(MEMBER_EVENT_LABEL) as MemberEvent[])
    .filter((e) => e !== "MOVE_IN" || arrivalEnabled)
    .map((e) => [e, MEMBER_EVENT_LABEL[e]] as const);

  return (
    <fieldset className="min-w-0 space-y-4 rounded-lg border bg-card p-4">
      <legend className="sr-only">Anggota {index + 1}: {title}</legend>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Anggota {index + 1}</p>
          <p className="break-words font-semibold">{title}{member.familyRole ? <span className="font-normal text-muted-foreground"> · {member.familyRole}</span> : null}</p>
        </div>
        {canRemove ? (
          <Button type="button" variant="ghost" className="min-h-11 shrink-0 text-destructive" onClick={onRemove} aria-label={`Hapus anggota ${index + 1}${member.name.trim() ? `, ${member.name.trim()}` : ""}`}>
            <Trash2 aria-hidden="true" />
            Hapus
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField id={id("familyRole")} label="Hubungan dalam KK" required value={member.familyRole} onChange={(v) => onChange({ familyRole: v })} options={entries(KK_RELATIONSHIP_STATUS)} error={errors.familyRole} placeholder="Pilih hubungan" />
        <TextField id={id("name")} label="Nama lengkap" required value={member.name} onChange={(v) => onChange({ name: v })} error={errors.name} maxLength={255} placeholder="Sesuai KK" />
        <TextField id={id("nik")} label="NIK" required value={member.nik} onChange={onNik} error={errors.nik} inputMode="numeric" maxLength={16} className="font-mono" hint={`${member.nik.replace(/\D/g, "").length}/16 digit${inferred ? ". Jenis kelamin dan tanggal lahir diisi dari NIK, mohon periksa." : ""}`} />
        <SelectField id={id("gender")} label="Jenis kelamin" required value={member.gender} onChange={(v) => onChange({ gender: v })} options={GENDER_OPTIONS} error={errors.gender} />
        <TextField id={id("birthplace")} label="Tempat lahir" required value={member.birthplace} onChange={(v) => onChange({ birthplace: v })} error={errors.birthplace} maxLength={255} />
        <TextField id={id("birthDate")} label="Tanggal lahir" required type="date" value={member.birthDate} onChange={(v) => onChange({ birthDate: v })} error={errors.birthDate} />
        <SelectField id={id("religion")} label="Agama" required value={member.religion} onChange={(v) => onChange({ religion: v })} options={entries(RELIGION_OPTIONS)} error={errors.religion} />
        <SelectField id={id("maritalStatus")} label="Status perkawinan" required value={member.maritalStatus} onChange={(v) => onChange({ maritalStatus: v })} options={entries(MARITAL_STATUS_OPTIONS)} error={errors.maritalStatus} />
      </div>

      <div>
        <button
          type="button"
          aria-expanded={extraOpen}
          aria-controls={id("extra")}
          onClick={() => setOpenExtra((v) => !v)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Data tambahan (opsional)
          <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${extraOpen ? "rotate-180" : ""}`} />
        </button>
        {extraOpen ? (
          <div id={id("extra")} className="grid gap-4 pt-3 sm:grid-cols-2">
            <SelectField id={id("education")} label="Pendidikan terakhir" value={member.education} onChange={(v) => onChange({ education: v })} options={entries(EDUCATION_OPTIONS)} error={errors.education} />
            <SelectField id={id("occupation")} label="Pekerjaan" value={member.occupation} onChange={(v) => onChange({ occupation: v })} options={entries(JOB_OPTIONS)} error={errors.occupation} />
            <SelectField id={id("bloodType")} label="Golongan darah" value={member.bloodType} onChange={(v) => onChange({ bloodType: v })} options={entries(BLOOD_TYPE_OPTIONS)} error={errors.bloodType} />
            <SelectField id={id("nationality")} label="Kewarganegaraan" value={member.nationality} onChange={(v) => onChange({ nationality: v })} options={entries(NATIONALITY_OPTIONS)} error={errors.nationality} placeholder="WNI" />
            <Field id={id("ethnicity")} label="Suku" error={errors.ethnicity}>
              <EthnicitySelect id={id("ethnicity")} value={member.ethnicity} onChange={(v) => onChange({ ethnicity: v })} />
            </Field>
            <SelectField id={id("ktpStatus")} label="Status KTP-el" value={member.ktpStatus} onChange={(v) => onChange({ ktpStatus: v })} options={entries(KTP_STATUS_LABEL)} error={errors.ktpStatus} />
            <TextField id={id("fatherName")} label="Nama ayah" value={member.fatherName} onChange={(v) => onChange({ fatherName: v })} error={errors.fatherName} maxLength={255} hint="Untuk anak, terisi otomatis dari hubungan keluarga bila kosong." />
            <TextField id={id("fatherNik")} label="NIK ayah" value={member.fatherNik} onChange={(v) => onChange({ fatherNik: v.replace(/\D/g, "").slice(0, 16) })} error={errors.fatherNik} inputMode="numeric" maxLength={16} className="font-mono" />
            <TextField id={id("motherName")} label="Nama ibu" value={member.motherName} onChange={(v) => onChange({ motherName: v })} error={errors.motherName} maxLength={255} />
            <TextField id={id("motherNik")} label="NIK ibu" value={member.motherNik} onChange={(v) => onChange({ motherNik: v.replace(/\D/g, "").slice(0, 16) })} error={errors.motherNik} inputMode="numeric" maxLength={16} className="font-mono" />
            <TextField id={id("birthCertNo")} label="No. akta kelahiran" value={member.birthCertNo} onChange={(v) => onChange({ birthCertNo: v })} error={errors.birthCertNo} maxLength={50} />
            <SelectField id={id("event")} label="Dicatat sebagai" value={member.event} onChange={(v) => onChange({ event: (v || "NONE") as MemberEvent })} options={eventOptions} error={errors.event} placeholder="Data awal" hint="Kelahiran dan kedatangan tercatat di laporan LAMPID." />
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
