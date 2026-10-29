/**
 * Registry isian surat — satu-satunya sumber kebenaran untuk "isian yang terhubung ke database".
 *
 * Rujukan (ref) berbentuk `<ruang>.<isian>`:
 *   <peran>.nama      orang yang disebut di surat (peran dideklarasikan tiap dokumen: pemohon, almarhum, pihak1…)
 *   desa.nama         profil desa
 *   pejabat.kades.nama, pejabat.sekdes.nip, pejabat.camat.jabatan
 *   surat.nomor       data surat itu sendiri
 *   isian.luas_tanah  isian tambahan buatan operator (dideklarasikan di dokumen)
 *
 * Kolom tabel warga yang boleh dibaca ditentukan di sini (allowlist), sehingga menambah
 * isian baru = menambah satu entri, dan server tidak pernah membaca kolom di luar daftar.
 */
import { formatTanggalId } from "./format";

export type FieldType = "text" | "longtext" | "number" | "money" | "date" | "choice";

export type RegistryField = {
  key: string;
  label: string;
  group: string;
  type: FieldType;
  /** Contoh nilai untuk pratinjau di kanvas (chip tampil sebagai data nyata). */
  example: string;
  /** Data sensitif: tidak ditampilkan di daftar/log, perlu dicatat saat dibaca. */
  sensitive?: boolean;
};

/** Isian orang (berlaku untuk peran apa pun). */
export const PERSON_FIELDS = [
  { key: "nama", label: "Nama lengkap", group: "Identitas", type: "text", example: "Ahmad Suryadi" },
  { key: "nik", label: "NIK", group: "Identitas", type: "text", example: "3201012801850001" },
  { key: "kk", label: "No. Kartu Keluarga", group: "Identitas", type: "text", example: "3201010101010001", sensitive: true },
  { key: "tempat_lahir", label: "Tempat lahir", group: "Identitas", type: "text", example: "Pasuruan" },
  { key: "tanggal_lahir", label: "Tanggal lahir", group: "Identitas", type: "date", example: "28 Januari 1985" },
  { key: "ttl", label: "Tempat, tanggal lahir", group: "Identitas", type: "text", example: "Pasuruan, 28 Januari 1985" },
  { key: "umur", label: "Umur (tahun)", group: "Identitas", type: "number", example: "41" },
  { key: "jenis_kelamin", label: "Jenis kelamin", group: "Identitas", type: "choice", example: "Laki-laki" },
  { key: "agama", label: "Agama", group: "Identitas", type: "text", example: "Islam" },
  { key: "status_perkawinan", label: "Status perkawinan", group: "Identitas", type: "text", example: "Kawin" },
  { key: "kewarganegaraan", label: "Kewarganegaraan", group: "Identitas", type: "text", example: "Indonesia" },
  { key: "hubungan_keluarga", label: "Hubungan dalam keluarga", group: "Keluarga", type: "text", example: "Kepala Keluarga" },
  { key: "nama_ayah", label: "Nama ayah", group: "Keluarga", type: "text", example: "Slamet" },
  { key: "nama_ibu", label: "Nama ibu", group: "Keluarga", type: "text", example: "Siti Aminah" },
  { key: "alamat", label: "Alamat", group: "Alamat", type: "longtext", example: "Jl. Merdeka No. 45" },
  { key: "rt", label: "RT", group: "Alamat", type: "text", example: "002" },
  { key: "rw", label: "RW", group: "Alamat", type: "text", example: "005" },
  { key: "dusun", label: "Dusun", group: "Alamat", type: "text", example: "Krajan" },
  { key: "alamat_lengkap", label: "Alamat lengkap (RT/RW, dusun)", group: "Alamat", type: "longtext", example: "Jl. Merdeka No. 45, RT 002/RW 005, Dusun Krajan" },
  { key: "pekerjaan", label: "Pekerjaan", group: "Pekerjaan", type: "text", example: "Wiraswasta" },
  { key: "pendidikan", label: "Pendidikan", group: "Pekerjaan", type: "text", example: "SMA" },
  { key: "penghasilan", label: "Penghasilan per bulan", group: "Pekerjaan", type: "money", example: "2500000", sensitive: true },
  { key: "tanggal_meninggal", label: "Tanggal meninggal", group: "Peristiwa", type: "date", example: "10 Oktober 2026" },
  { key: "telepon", label: "No. telepon", group: "Kontak", type: "text", example: "081234567890", sensitive: true },
] as const satisfies readonly RegistryField[];

export type PersonFieldKey = (typeof PERSON_FIELDS)[number]["key"];

export const DESA_FIELDS = [
  { key: "nama", label: "Nama desa", group: "Desa", type: "text", example: "Brambang" },
  { key: "kecamatan", label: "Kecamatan", group: "Desa", type: "text", example: "Gondangwetan" },
  { key: "kabupaten", label: "Kabupaten", group: "Desa", type: "text", example: "Pasuruan" },
  { key: "provinsi", label: "Provinsi", group: "Desa", type: "text", example: "Jawa Timur" },
  { key: "alamat", label: "Alamat kantor desa", group: "Desa", type: "longtext", example: "Jl. Raya Brambang No. 1" },
  { key: "kode_pos", label: "Kode pos", group: "Desa", type: "text", example: "67174" },
  { key: "telepon", label: "Telepon kantor", group: "Desa", type: "text", example: "(0343) 123456" },
  { key: "email", label: "Email desa", group: "Desa", type: "text", example: "pemdes@desa.id" },
  { key: "kode", label: "Kode desa", group: "Desa", type: "text", example: "424.304.2.02" },
] as const satisfies readonly RegistryField[];

export const OFFICIAL_IDS = ["kades", "sekdes", "camat"] as const;
export type OfficialId = (typeof OFFICIAL_IDS)[number];
export const OFFICIAL_LABELS: Record<OfficialId, string> = {
  kades: "Kepala Desa",
  sekdes: "Sekretaris Desa",
  camat: "Camat",
};
export const OFFICIAL_FIELDS = [
  { key: "nama", label: "Nama", group: "Pejabat", type: "text", example: "Moh. Sofwan Hadi" },
  { key: "nip", label: "NIP", group: "Pejabat", type: "text", example: "197001012000031001" },
  { key: "jabatan", label: "Jabatan", group: "Pejabat", type: "text", example: "Kepala Desa" },
] as const satisfies readonly RegistryField[];

export const SURAT_FIELDS = [
  { key: "nomor", label: "Nomor surat", group: "Surat", type: "text", example: "475/012/424.304.2.02/X/2026" },
  { key: "tanggal", label: "Tanggal surat", group: "Surat", type: "date", example: "29 Oktober 2026" },
  { key: "hari", label: "Hari surat", group: "Surat", type: "text", example: "Kamis" },
  { key: "bulan_romawi", label: "Bulan (Romawi)", group: "Surat", type: "text", example: "X" },
  { key: "tahun", label: "Tahun", group: "Surat", type: "text", example: "2026" },
  { key: "tempat", label: "Tempat surat dibuat", group: "Surat", type: "text", example: "Brambang" },
] as const satisfies readonly RegistryField[];

/** Peran yang tidak boleh dipakai sebagai nama peran orang (bentrok dengan ruang nama bawaan). */
export const RESERVED_NAMESPACES = ["desa", "pejabat", "surat", "isian", "grup"] as const;

const sets = {
  person: new Set<string>(PERSON_FIELDS.map((f) => f.key)),
  desa: new Set<string>(DESA_FIELDS.map((f) => f.key)),
  official: new Set<string>(OFFICIAL_FIELDS.map((f) => f.key)),
  surat: new Set<string>(SURAT_FIELDS.map((f) => f.key)),
  officialIds: new Set<string>(OFFICIAL_IDS),
};

export const isPersonField = (k: string): k is PersonFieldKey => sets.person.has(k);

export type ParsedRef =
  | { kind: "person"; role: string; field: PersonFieldKey }
  | { kind: "desa"; field: string }
  | { kind: "pejabat"; official: OfficialId; field: string }
  | { kind: "surat"; field: string }
  | { kind: "isian"; id: string };

export const REF_PATTERN = /^[a-z][a-z0-9_]{0,29}(\.[a-z][a-z0-9_]{0,39}){1,2}$/;

/** Uraikan ref; null bila bentuknya tidak dikenal. Pengecekan peran/isian dokumen dilakukan di validate. */
export function parseRef(ref: string): ParsedRef | null {
  if (!REF_PATTERN.test(ref)) return null;
  const parts = ref.split(".");
  const [ns, a, b] = parts;
  if (ns === "desa") return parts.length === 2 && sets.desa.has(a) ? { kind: "desa", field: a } : null;
  if (ns === "surat") return parts.length === 2 && sets.surat.has(a) ? { kind: "surat", field: a } : null;
  if (ns === "isian") return parts.length === 2 ? { kind: "isian", id: a } : null;
  if (ns === "pejabat") {
    return parts.length === 3 && sets.officialIds.has(a) && sets.official.has(b)
      ? { kind: "pejabat", official: a as OfficialId, field: b }
      : null;
  }
  if ((RESERVED_NAMESPACES as readonly string[]).includes(ns)) return null;
  return parts.length === 2 && sets.person.has(a) ? { kind: "person", role: ns, field: a as PersonFieldKey } : null;
}

/** Bentuk minimal baris warga yang dibutuhkan (tanpa mengimpor Prisma). */
export type ResidentLike = {
  nik: string;
  kk: string | null;
  name: string;
  birthplace: string;
  birthDate: Date;
  gender: string;
  religion: string;
  maritalStatus: string;
  familyRole: string;
  address: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  occupation: string | null;
  education: string | null;
  nationality: string;
  fatherName: string | null;
  motherName: string | null;
  income: number | null;
  deathDate: Date | null;
  phone: string | null;
};

/**
 * Allowlist kolom tabel `Resident` yang boleh dibaca untuk surat. Dipakai langsung sebagai
 * `select` Prisma; kolom lain (kesehatan, disabilitas, foto, desil, dll.) tidak pernah ikut.
 */
export const RESIDENT_SELECT = {
  nik: true, kk: true, name: true, birthplace: true, birthDate: true, gender: true,
  religion: true, maritalStatus: true, familyRole: true, address: true, rt: true, rw: true,
  hamlet: true, occupation: true, education: true, nationality: true, fatherName: true,
  motherName: true, income: true, deathDate: true, phone: true,
} as const satisfies Record<keyof ResidentLike, true>;

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ageOn(birth: Date, today: Date): number {
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return Math.max(age, 0);
}

/** Petakan baris warga → nilai isian orang. Tanggal disimpan ISO (diformat saat dirender). */
export function residentToPerson(r: ResidentLike, today: Date = new Date()): Record<PersonFieldKey, string> {
  const tglLahir = isoDay(r.birthDate);
  const rtrw = [r.rt ? `RT ${r.rt}` : "", r.rw ? `RW ${r.rw}` : ""].filter(Boolean).join("/");
  const alamatLengkap = [r.address.trim(), rtrw, r.hamlet ? `Dusun ${r.hamlet}` : ""].filter(Boolean).join(", ");
  return {
    nama: r.name,
    nik: r.nik,
    kk: r.kk ?? "",
    tempat_lahir: r.birthplace,
    tanggal_lahir: tglLahir,
    ttl: `${r.birthplace}, ${formatTanggalId(tglLahir) ?? tglLahir}`,
    umur: String(ageOn(r.birthDate, today)),
    jenis_kelamin: r.gender,
    agama: r.religion,
    status_perkawinan: r.maritalStatus,
    kewarganegaraan: r.nationality,
    hubungan_keluarga: r.familyRole,
    nama_ayah: r.fatherName ?? "",
    nama_ibu: r.motherName ?? "",
    alamat: r.address,
    rt: r.rt ?? "",
    rw: r.rw ?? "",
    dusun: r.hamlet ?? "",
    alamat_lengkap: alamatLengkap,
    pekerjaan: r.occupation ?? "",
    pendidikan: r.education ?? "",
    penghasilan: r.income == null ? "" : String(r.income),
    tanggal_meninggal: r.deathDate ? isoDay(r.deathDate) : "",
    telepon: r.phone ?? "",
  };
}

export function personFieldLabel(key: string): string {
  return PERSON_FIELDS.find((f) => f.key === key)?.label ?? key;
}
