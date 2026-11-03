/** Draf OCR → isian wizard "Tambah Keluarga" (murni). */
import { emptyMember, type FamilyHeader, type FamilyMemberInput } from "../family";
import type { DraftField, KkDraft, KkDraftMember } from "./parse";

const FIELD_LABEL: Record<DraftField, string> = {
  kk: "Nomor KK",
  name: "Nama",
  nik: "NIK",
  gender: "Jenis kelamin",
  birthplace: "Tempat lahir",
  birthDate: "Tanggal lahir",
  religion: "Agama",
  education: "Pendidikan",
  occupation: "Pekerjaan",
  maritalStatus: "Status perkawinan",
  familyRole: "Hubungan dalam KK",
  fatherName: "Nama ayah",
  motherName: "Nama ibu",
};

/** Catatan "periksa" per anggota, siap ditampilkan (kosong bila tak ada yang meragukan). */
export function memberNotes(m: KkDraftMember): string[] {
  return (Object.entries(m.flags) as Array<[DraftField, string]>).map(([k, msg]) => `${FIELD_LABEL[k]}: ${msg}`);
}

export interface AppliedDraft {
  header: Pick<FamilyHeader, "kk" | "address" | "rt" | "rw" | "hamlet">;
  members: FamilyMemberInput[];
  /** Sejajar dengan `members`. */
  notes: string[][];
}

export function draftToFamily(draft: KkDraft, opts: { arrival: boolean }): AppliedDraft {
  const members = draft.members.map((m) =>
    emptyMember({
      familyRole: m.familyRole,
      name: m.name,
      nik: m.nik,
      gender: m.gender,
      birthplace: m.birthplace,
      birthDate: m.birthDate,
      religion: m.religion,
      maritalStatus: m.maritalStatus,
      education: m.education,
      occupation: m.occupation,
      bloodType: m.bloodType,
      nationality: m.nationality || "WNI",
      fatherName: m.fatherName,
      motherName: m.motherName,
      event: opts.arrival ? "MOVE_IN" : "NONE",
    }),
  );
  return { header: { kk: draft.kk, address: draft.address, rt: draft.rt, rw: draft.rw, hamlet: draft.hamlet }, members, notes: draft.members.map(memberNotes) };
}
