/** Kolom yang bisa dikoreksi warga. Harus sejalan dengan CHANGE_FIELDS di server (lib/mobile/data-change-logic.ts). */
export type ChangeFieldKey =
  | 'address' | 'phone' | 'occupation' | 'education' | 'religion' | 'maritalStatus'
  | 'name' | 'birthplace' | 'birthDate' | 'gender' | 'motherName' | 'fatherName' | 'nik' | 'kk';

export const CHANGE_FIELD_OPTIONS: { key: ChangeFieldKey; label: string; hint?: string; numeric?: boolean; phone?: boolean; multiline?: boolean; needsCheck: boolean }[] = [
  { key: 'address', label: 'Alamat', multiline: true, needsCheck: false },
  { key: 'phone', label: 'Nomor telepon', phone: true, needsCheck: false },
  { key: 'occupation', label: 'Pekerjaan', needsCheck: false },
  { key: 'education', label: 'Pendidikan', needsCheck: false },
  { key: 'religion', label: 'Agama', needsCheck: false },
  { key: 'maritalStatus', label: 'Status perkawinan', needsCheck: false },
  { key: 'name', label: 'Nama', hint: 'Sesuai KTP/KK.', needsCheck: true },
  { key: 'birthplace', label: 'Tempat lahir', needsCheck: true },
  { key: 'birthDate', label: 'Tanggal lahir', hint: 'Format TTTT-BB-HH, contoh 1990-02-28.', needsCheck: true },
  { key: 'gender', label: 'Jenis kelamin', hint: 'Laki-laki atau Perempuan.', needsCheck: true },
  { key: 'motherName', label: 'Nama ibu kandung', needsCheck: true },
  { key: 'fatherName', label: 'Nama ayah', needsCheck: true },
  { key: 'nik', label: 'NIK', numeric: true, hint: '16 angka.', needsCheck: true },
  { key: 'kk', label: 'Nomor KK', numeric: true, hint: '16 angka.', needsCheck: true },
];
