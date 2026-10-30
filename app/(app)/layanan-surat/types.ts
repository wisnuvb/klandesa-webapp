/** Pengaturan desa untuk kop & penandatangan (snapshot dari Pengaturan Desa). */
export interface DesaSettings {
  logo_url: string;
  kabupaten: string;
  kecamatan: string;
  nama_desa: string;
  alamat_desa: string;
  email_desa: string;
  kode_pos: string;
  kepala_desa_nama: string;
  /** NIP kepala desa (ASN) */
  kepala_desa_nip: string;
  kepala_desa_jabatan: string;
  sekretaris_nama: string;
  sekretaris_jabatan: string;
  camat_nama: string;
  camat_jabatan: string;
}

/** Jenis surat (dokumen v2) untuk daftar "Atur Jenis Surat". */
export interface TemplateBody {
  id: number;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  created_at: string;
  usage_count: number;
  /** Katalog bawaan (hanya-baca sampai disalin ke desa). */
  is_catalog: boolean;
  /** Kunci katalog; null untuk jenis surat buatan desa. */
  catalog_key: string | null;
  /** Bila ada, jenis surat ini menggantikan entri katalog dengan `catalog_key` yang sama untuk desa ini. */
  inherits_catalog_key: string | null;
}

export interface LetterHistory {
  id: number;
  letter_number: string;
  template_id: number;
  template_name: string;
  template_category: string;
  applicant_name: string;
  applicant_nik: string;
  signer_role: string;
  status: "draft" | "completed" | "archived";
  created_at: string;
  created_by: string;
  completed_at: string | null;
  content_html: string;
  form_data: Record<string, string>;
  /** 2 = surat dokumen v2 (detail diambil dari /api/letters/[id]). */
  schema_version?: 1 | 2;
  /** Surat format lama: pratinjau tidak tersedia, hanya isian tersimpan. */
  legacy_unavailable?: boolean;
}
