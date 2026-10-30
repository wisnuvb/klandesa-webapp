/**
 * Registry field impor warga: satu sumber kebenaran untuk template, pemetaan kolom, dan validasi.
 * `id` sengaja sama dengan nama field payload API lama (id_number, family_card_number, dst.).
 */

export const FIELD_IDS = [
  "name",
  "id_number",
  "family_card_number",
  "gender",
  "birthplace",
  "date_of_birth",
  "birth_place_date", // virtual: "Tempat, Tgl Lahir" digabung
  "religion_id",
  "blood_type_id",
  "education_id",
  "job_id",
  "marital_status",
  "status_family_id",
  "nationality",
  "address",
  "rt",
  "rw",
  "rt_rw", // virtual: "RT/RW" digabung
  "hamlet",
  "phone_number",
  "email",
  "father_nik",
  "father_name",
  "mother_nik",
  "mother_name",
  "is_alive",
  "death_date",
  "move_date",
  "is_illiterate",
  "is_disability",
  "disability_id",
  "other_disability",
  "is_pregnant",
  "date_pregnant",
  "is_breastfeeding",
  "is_stunting",
  "is_bpjs_kis",
  "contraception",
  "height",
  "weight",
  "income",
  "cover",
  "cover_thumb",
  "photo",
  "photo_thumb",
  "country_code",
  "temp_id_number",
  "temp_rt",
  "house_ownership",
  "desil",
] as const;

export type FieldId = (typeof FIELD_IDS)[number];
export type Values = Partial<Record<FieldId, string>>;

export type FieldKind =
  | "text"
  | "nik"
  | "kk"
  | "gender"
  | "date"
  | "enum"
  | "yesno"
  | "number"
  | "phone"
  | "email"
  | "composite";

export interface FieldDef {
  id: FieldId;
  /** Label yang tampil di UI dan di header template unduhan. */
  label: string;
  group: "Identitas" | "Pribadi" | "Alamat" | "Keluarga" | "Status" | "Kesehatan & Sosial" | "Lainnya";
  kind: FieldKind;
  /** Sinonim header (ditulis bebas; dinormalisasi oleh mapper). */
  synonyms: string[];
  example: string;
  /** Field inti selalu tampil di tabel review. */
  core?: boolean;
  /** Virtual: tidak ada di DB, dipecah ke field lain saat normalisasi. */
  virtual?: boolean;
}

export const FIELDS: FieldDef[] = [
  { id: "name", label: "Nama Lengkap", group: "Identitas", kind: "text", core: true, example: "BUDI SANTOSO",
    synonyms: ["nama lengkap", "nama", "nama penduduk", "nama warga", "nama sesuai ktp", "nm lengkap"] },
  { id: "id_number", label: "NIK", group: "Identitas", kind: "nik", core: true, example: "3508073101900001",
    synonyms: ["nik", "nomor nik", "no nik", "nomor induk kependudukan", "no induk kependudukan", "no ktp", "nomor ktp", "nik penduduk", "nomor identitas", "no identitas"] },
  { id: "family_card_number", label: "No. KK", group: "Identitas", kind: "kk", example: "3508070101100001",
    synonyms: ["no kk", "nomor kk", "nomor kartu keluarga", "no kartu keluarga", "kk", "no kk penduduk", "nomor kk keluarga"] },
  { id: "gender", label: "Jenis Kelamin", group: "Pribadi", kind: "gender", core: true, example: "Laki-laki",
    synonyms: ["jenis kelamin", "jk", "l p", "jenis kelamin l p", "kelamin", "sex", "gender", "jenis kelamin laki laki perempuan", "laki laki perempuan"] },
  { id: "birthplace", label: "Tempat Lahir", group: "Pribadi", kind: "text", example: "Lumajang",
    synonyms: ["tempat lahir", "tempat kelahiran", "kota lahir", "tempat"] },
  { id: "date_of_birth", label: "Tanggal Lahir", group: "Pribadi", kind: "date", core: true, example: "1990-01-31",
    synonyms: ["tanggal lahir", "tanggal kelahiran", "lahir", "dob", "tgl lahir"] },
  { id: "birth_place_date", label: "Tempat/Tgl Lahir (gabungan)", group: "Pribadi", kind: "composite", virtual: true, example: "Lumajang, 31-01-1990",
    synonyms: ["tempat tanggal lahir", "tempat dan tanggal lahir", "ttl", "tempat tgl lahir"] },
  { id: "religion_id", label: "Agama", group: "Pribadi", kind: "enum", example: "Islam",
    synonyms: ["agama", "agama kepercayaan"] },
  { id: "blood_type_id", label: "Golongan Darah", group: "Pribadi", kind: "enum", example: "O",
    synonyms: ["golongan darah", "goldar", "gd", "gol darah"] },
  { id: "education_id", label: "Pendidikan", group: "Pribadi", kind: "enum", example: "SLTA",
    synonyms: ["pendidikan", "pendidikan terakhir", "pendidikan dalam kk", "pendidikan kk", "tingkat pendidikan", "ijazah terakhir", "pend"] },
  { id: "job_id", label: "Pekerjaan", group: "Pribadi", kind: "enum", example: "Petani/Pekebun",
    synonyms: ["pekerjaan", "pekerjaan utama", "jenis pekerjaan", "mata pencaharian", "profesi", "kerja"] },
  { id: "marital_status", label: "Status Perkawinan", group: "Pribadi", kind: "enum", example: "Menikah",
    synonyms: ["status perkawinan", "status kawin", "kawin", "perkawinan", "status pernikahan"] },
  { id: "status_family_id", label: "Status Hubungan KK", group: "Keluarga", kind: "enum", example: "Kepala Keluarga",
    synonyms: ["status hubungan kk", "status hubungan dalam keluarga", "hubungan keluarga", "hubungan dalam keluarga", "shdk", "status hubungan keluarga", "hubungan kk", "status keluarga", "hubungan dengan kepala keluarga", "hubungan"] },
  { id: "nationality", label: "Kewarganegaraan", group: "Pribadi", kind: "enum", example: "WNI",
    synonyms: ["kewarganegaraan", "warga negara", "wn", "kebangsaan", "wni wna", "kewarganegaraan wni wna"] },
  { id: "address", label: "Alamat", group: "Alamat", kind: "text", example: "Jl. Mawar No. 1",
    synonyms: ["alamat", "alamat lengkap", "alamat tinggal", "alamat domisili", "alamat ktp"] },
  { id: "rt", label: "RT", group: "Alamat", kind: "text", example: "01",
    synonyms: ["rt", "rukun tetangga"] },
  { id: "rw", label: "RW", group: "Alamat", kind: "text", example: "02",
    synonyms: ["rw", "rukun warga"] },
  { id: "rt_rw", label: "RT/RW (gabungan)", group: "Alamat", kind: "composite", virtual: true, example: "001/002",
    synonyms: ["rt rw"] },
  { id: "hamlet", label: "Dusun", group: "Alamat", kind: "text", example: "Karangsari",
    synonyms: ["dusun", "dukuh", "padukuhan", "lingkungan", "banjar", "kampung", "dsn", "dusun dukuh"] },
  { id: "phone_number", label: "No. Telepon", group: "Pribadi", kind: "phone", example: "081234567890",
    synonyms: ["no telepon", "nomor telepon", "no hp", "nomor hp", "telepon", "no handphone", "nomor whatsapp", "no wa", "wa", "kontak", "hp"] },
  { id: "email", label: "Email", group: "Pribadi", kind: "email", example: "budi@contoh.id",
    synonyms: ["email", "e mail", "surel", "alamat email"] },
  { id: "father_nik", label: "NIK Ayah", group: "Keluarga", kind: "nik", example: "",
    synonyms: ["nik ayah", "nik bapak", "no nik ayah"] },
  { id: "father_name", label: "Nama Ayah", group: "Keluarga", kind: "text", example: "SUPARDI",
    synonyms: ["nama ayah", "nama bapak", "nama ayah kandung", "ayah", "bapak"] },
  { id: "mother_nik", label: "NIK Ibu", group: "Keluarga", kind: "nik", example: "",
    synonyms: ["nik ibu", "no nik ibu"] },
  { id: "mother_name", label: "Nama Ibu", group: "Keluarga", kind: "text", example: "SUMINI",
    synonyms: ["nama ibu", "nama ibu kandung", "ibu"] },
  { id: "is_alive", label: "Status Hidup", group: "Status", kind: "yesno", example: "Y",
    synonyms: ["status hidup", "hidup", "status penduduk", "status dasar", "is live"] },
  { id: "death_date", label: "Tanggal Meninggal", group: "Status", kind: "date", example: "",
    synonyms: ["tanggal meninggal", "tanggal kematian", "tanggal wafat", "tgl mati"] },
  { id: "move_date", label: "Tanggal Pindah", group: "Status", kind: "date", example: "",
    synonyms: ["tanggal pindah", "tanggal mutasi", "tanggal keluar", "tanggal pindah keluar"] },
  { id: "is_illiterate", label: "Buta Huruf", group: "Kesehatan & Sosial", kind: "yesno", example: "N",
    synonyms: ["buta huruf", "buta aksara", "status buta huruf"] },
  { id: "is_disability", label: "Disabilitas", group: "Kesehatan & Sosial", kind: "yesno", example: "N",
    synonyms: ["disabilitas", "cacat", "difabel", "penyandang disabilitas", "ada disabilitas"] },
  { id: "disability_id", label: "ID Disabilitas", group: "Kesehatan & Sosial", kind: "number", example: "",
    synonyms: ["id disabilitas", "jenis disabilitas", "jenis cacat", "kode disabilitas"] },
  { id: "other_disability", label: "Disabilitas Lainnya", group: "Kesehatan & Sosial", kind: "text", example: "",
    synonyms: ["disabilitas lainnya", "disabilitas lain", "keterangan disabilitas"] },
  { id: "is_pregnant", label: "Hamil", group: "Kesehatan & Sosial", kind: "yesno", example: "N",
    synonyms: ["hamil", "ibu hamil", "status hamil"] },
  { id: "date_pregnant", label: "Tanggal Hamil", group: "Kesehatan & Sosial", kind: "date", example: "",
    synonyms: ["tanggal hamil", "hpht"] },
  { id: "is_breastfeeding", label: "Menyusui", group: "Kesehatan & Sosial", kind: "yesno", example: "N",
    synonyms: ["menyusui", "ibu menyusui"] },
  { id: "is_stunting", label: "Stunting", group: "Kesehatan & Sosial", kind: "yesno", example: "N",
    synonyms: ["stunting", "status stunting"] },
  { id: "is_bpjs_kis", label: "BPJS KIS", group: "Kesehatan & Sosial", kind: "yesno", example: "Y",
    synonyms: ["bpjs kis", "bpjs", "kis", "bpjs kesehatan", "kartu indonesia sehat", "jkn"] },
  { id: "contraception", label: "Kontrasepsi", group: "Kesehatan & Sosial", kind: "text", example: "",
    synonyms: ["kontrasepsi", "alat kontrasepsi", "akseptor kb", "kb"] },
  { id: "height", label: "Tinggi Badan", group: "Kesehatan & Sosial", kind: "number", example: "170",
    synonyms: ["tinggi badan", "tb", "tinggi"] },
  { id: "weight", label: "Berat Badan", group: "Kesehatan & Sosial", kind: "number", example: "60",
    synonyms: ["berat badan", "bb", "berat"] },
  { id: "income", label: "Pendapatan", group: "Kesehatan & Sosial", kind: "number", example: "",
    synonyms: ["pendapatan", "penghasilan", "gaji", "pendapatan per bulan"] },
  { id: "cover", label: "Cover URL", group: "Lainnya", kind: "text", example: "", synonyms: ["cover url", "url cover"] },
  { id: "cover_thumb", label: "Cover Thumb URL", group: "Lainnya", kind: "text", example: "", synonyms: ["cover thumb url"] },
  { id: "photo", label: "Foto URL", group: "Lainnya", kind: "text", example: "", synonyms: ["foto url", "url foto", "foto"] },
  { id: "photo_thumb", label: "Foto Thumb URL", group: "Lainnya", kind: "text", example: "", synonyms: ["foto thumb url"] },
  { id: "country_code", label: "Kode Negara", group: "Lainnya", kind: "text", example: "", synonyms: ["kode negara"] },
  { id: "temp_id_number", label: "NIK Sementara", group: "Lainnya", kind: "text", example: "",
    synonyms: ["nik sementara", "no sementara", "nomor sementara"] },
  { id: "temp_rt", label: "RT Sementara", group: "Lainnya", kind: "text", example: "", synonyms: ["rt sementara"] },
  { id: "house_ownership", label: "Kepemilikan Rumah", group: "Lainnya", kind: "text", example: "",
    synonyms: ["kepemilikan rumah", "status rumah", "status kepemilikan rumah"] },
  { id: "desil", label: "Desil", group: "Lainnya", kind: "text", example: "",
    synonyms: ["desil", "desil dtks", "desil kesejahteraan"] },
];

export const FIELD_BY_ID: Record<FieldId, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.id, f]),
) as Record<FieldId, FieldDef>;

/** Field yang tidak butuh dipetakan (nomor urut, umur turunan, catatan). */
export const IGNORED_HEADERS = [
  "no", "nomor", "no urut", "nomor urut", "urut", "urutan", "keterangan", "ket", "paraf",
  "tanda tangan", "umur", "usia", "jumlah", "catatan", "tgl input", "tanggal input",
];

/** Header pendidikan yang BUKAN pendidikan terakhir/dalam KK. */
export const EDUCATION_IGNORE = /\b(sedang|sdg|ditempuh)\b/;

/** Nilai yang ditampilkan pada tabel review: field inti + field yang terpetakan. */
export const FIELD_GROUP_ORDER: FieldDef["group"][] = [
  "Identitas",
  "Pribadi",
  "Keluarga",
  "Alamat",
  "Status",
  "Kesehatan & Sosial",
  "Lainnya",
];
