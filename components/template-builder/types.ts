// Types untuk Template Builder System

export type BlockType =
  | "heading"
  | "text"
  | "table"
  | "list"
  | "separator"
  | "spacer"
  | "variable"
  | "image";

export type HeaderLayout = "logo_top" | "logo_left";
export type Alignment = "left" | "center" | "right" | "justify";
export type Size = "small" | "medium" | "large";
export type BorderStyle = "none" | "single" | "double";
export type FontFamily = "Inter" | "Literata" | "Times New Roman";

export type FooterType =
  | "single_right"
  | "single"
  | "an_kepala_desa"
  | "with_camat"
  | "camat_only"
  | "no_signature"
  | "multi_officials";

export interface LetterNumberConfig {
  enabled?: boolean;
  heading?: {
    text: string;
    font: FontFamily;
    size: number;
    bold: boolean;
    underline: boolean;
    align: Alignment;
  };
  number?: {
    format?: string; // e.g., "{NOMOR_SURAT}/SK-DS/{BULAN_ROMAWI}/{TAHUN}" atau "{NOMOR_URUT}/SK-DS/{BULAN_ROMAWI}/{TAHUN}"
    prefix?: string; // e.g., "Nomor: "
    font?: FontFamily;
    size?: number;
    bold?: boolean;
    underline?: boolean;
    align?: Alignment;
  };
  // Auto-numbering configuration
  auto_numbering?: {
    enabled?: boolean; // Jika true, gunakan NOMOR_URUT otomatis, jika false user input manual
    number_format?: string; // Format angka: "001", "0001", "1" (padding)
    current_number?: number; // Nomor terakhir yang digunakan
    reset_period?: "never" | "yearly" | "monthly"; // Kapan counter direset
    last_reset_date?: string; // Tanggal terakhir reset (untuk tracking)
  };
  // show?: boolean; // Tampilkan nomor surat di header
  format?: string; // Format nomor surat kustom jika diperlukan
  padding?: number; // Jumlah digit padding untuk nomor urut
  resetPeriod?: "never" | "yearly" | "monthly"; // Periode reset nomor urut
}

export interface HeaderConfig {
  layout?: HeaderLayout;
  alignment?: Alignment;
  logo_size?: Size;
  /** Lebar/tinggi logo dalam px (kotak); jika diisi, dipakai di preview/cetak menggantikan preset `logo_size`. */
  logo_width_px?: number;
  logo_position?: Alignment;
  font_family?: FontFamily;
  font_size?: {
    village_name?: number;
    government_label?: number;
    subdistrict_label?: number;
    district_label?: number;
    custom_title?: number;
    address?: number;
  };
  border_style?: BorderStyle;
  border_color?: string;
  text_color?: string;
  spacing?: "compact" | "normal" | "relaxed";
  show_letterhead?: boolean;
  show_title?: boolean;
}

export interface FooterSigner {
  role?: string;
  name?: string;
  on_behalf_of?: string | null;
  position?: "left" | "center" | "right";
  show_stamp?: boolean;
  prefix_text?: string | null;
  nip?: string | null;
  show_nip?: boolean;
}

export interface FooterConfig {
  footer_type?: FooterType;
  signers?: FooterSigner[];
  location?: string;
  date_format?: "auto" | "custom";
  custom_note?: string | null;
  show_date?: boolean;
  date_position?: "left" | "center" | "right";
  show_qr_code?: boolean;
  custom_text?: string;
  show_signatures?: boolean;
}

export interface ContentBlock {
  id: string;
  type: BlockType;
  content: string | TableRow[] | ListItem[];
  style?: {
    align?: Alignment;
    size?: Size;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean; // Untuk underline text
    color?: string;
    font?: FontFamily;
    border?: boolean; // Untuk table border
  };
}

export interface TableRow {
  label: string;
  value: string;
}

export interface ListItem {
  text: string;
  level?: number;
}

// Variable Group untuk organize form input
export interface VariableGroup {
  id: string;
  title: string;
  description?: string;
  variables: string[];
  icon?: string;
}

// Template Page untuk multi-page support
export interface TemplatePage {
  id: string;
  page_number: number;
  title: string;
  layout_type?: "standard" | "form" | "table" | "split-column";

  // Header visibility control
  show_header?: boolean; // Default: true

  // Header config per page (optional, bisa inherit dari template)
  header?: {
    show_letterhead: boolean;
    show_title: boolean;
    custom_title?: string;
  };

  // Letter number config per page
  letterNumber?: LetterNumberConfig;

  // Content blocks untuk page ini
  blocks: ContentBlock[];

  // Footer visibility control
  show_footer?: boolean; // Default: true

  // Footer config per page (optional, bisa inherit dari template)
  footer?: {
    show_signatures: boolean;
    footer_config?: FooterConfig;
  };

  // Variables yang digunakan di halaman ini (untuk tracking)
  variables_used?: string[];
}

export interface TemplateData {
  id?: string;
  name: string;
  description: string;
  category: string;

  // Multi-page support
  is_multi_page?: boolean;

  // Single page mode (backward compatible)
  header: HeaderConfig;
  letterNumber?: LetterNumberConfig;
  blocks: ContentBlock[];
  footer: FooterConfig;
  variables: string[];
  is_active: boolean;

  // Show/hide controls for single-page mode
  show_header?: boolean; // Default: true
  show_footer?: boolean; // Default: true

  // Multi-page mode
  pages?: TemplatePage[];
  variable_groups?: VariableGroup[];
  shared_header?: HeaderConfig; // Header template untuk semua halaman
  shared_footer?: FooterConfig; // Footer template untuk semua halaman

  // Show/hide controls for multi-page mode (global default)
  show_header_default?: boolean; // Default untuk halaman baru
  show_footer_default?: boolean; // Default untuk halaman baru

  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_LETTER_NUMBER_CONFIG: LetterNumberConfig = {
  enabled: false,
  heading: {
    text: "SURAT KETERANGAN",
    font: "Inter",
    size: 16,
    bold: true,
    underline: true,
    align: "center",
  },
  number: {
    format: "{NOMOR_SURAT}/SK-DS/{BULAN_ROMAWI}/{TAHUN}",
    prefix: "Nomor: ",
    font: "Inter",
    size: 12,
    bold: false,
    underline: false,
    align: "center",
  },
  // Auto-numbering configuration
  auto_numbering: {
    enabled: false, // Jika true, gunakan NOMOR_URUT otomatis, jika false user input manual
    number_format: "001", // Format angka: "001", "0001", "1" (padding)
    current_number: 0, // Nomor terakhir yang digunakan
    reset_period: "never", // Kapan counter direset
    last_reset_date: undefined, // Tanggal terakhir reset (untuk tracking)
  },
};

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  layout: "logo_left",
  alignment: "center",
  logo_size: "medium",
  logo_width_px: 110,
  logo_position: "left",
  font_family: "Inter",
  font_size: {
    village_name: 30,
    government_label: 22,
    address: 12,
  },
  border_style: "double",
  border_color: "#000000",
  text_color: "#000000",
  spacing: "normal",
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  footer_type: "single",
  signers: [
    {
      role: "{SIGNER_JABATAN_FOOTER}",
      name: "{KEPALA_DESA_NAMA}",
      on_behalf_of: null,
      position: "right",
      show_stamp: true,
      prefix_text: null,
      nip: "{KEPALA_DESA_NIP}",
    },
  ],
  location: "{NAMA_DESA}",
  date_format: "auto",
  custom_note: null,
};

// Available variables untuk template
export const AVAILABLE_VARIABLES = [
  // Data Pemohon
  { key: "NAMA", label: "Nama Pemohon", category: "Pemohon" },
  { key: "NIK", label: "NIK", category: "Pemohon" },
  { key: "TEMPAT_LAHIR", label: "Tempat Lahir", category: "Pemohon" },
  { key: "TANGGAL_LAHIR", label: "Tanggal Lahir", category: "Pemohon" },
  { key: "JENIS_KELAMIN", label: "Jenis Kelamin", category: "Pemohon" },
  { key: "AGAMA", label: "Agama", category: "Pemohon" },
  { key: "PEKERJAAN", label: "Pekerjaan", category: "Pemohon" },
  { key: "ALAMAT", label: "Alamat", category: "Pemohon" },
  { key: "STATUS_PERKAWINAN", label: "Status Perkawinan", category: "Pemohon" },
  { key: "KEWARGANEGARAAN", label: "Kewarganegaraan", category: "Pemohon" },

  // Data Desa
  { key: "NAMA_DESA", label: "Nama Desa", category: "Desa" },
  { key: "KECAMATAN", label: "Kecamatan", category: "Desa" },
  { key: "KABUPATEN", label: "Kabupaten", category: "Desa" },
  { key: "ALAMAT_DESA", label: "Alamat Desa", category: "Desa" },
  { key: "KODE_POS", label: "Kode Pos", category: "Desa" },

  // Pejabat
  { key: "KEPALA_DESA_NAMA", label: "Nama Kepala Desa", category: "Pejabat" },
  { key: "KEPALA_DESA_NIP", label: "NIP Kepala Desa", category: "Pejabat" },
  {
    key: "SEKRETARIS_NAMA",
    label: "Nama Sekretaris Desa",
    category: "Pejabat",
  },
  { key: "SEKRETARIS_NIP", label: "NIP Sekretaris Desa", category: "Pejabat" },
  { key: "CAMAT_NAMA", label: "Nama Camat", category: "Pejabat" },
  { key: "CAMAT_NIP", label: "NIP Camat", category: "Pejabat" },
  {
    key: "PENANDA_TANGAN",
    label: "Penanda Tangan (Auto)",
    category: "Pejabat",
  },

  // Data Calon Suami (untuk surat nikah)
  { key: "SUAMI_NAMA", label: "Nama Calon Suami", category: "Pernikahan" },
  { key: "SUAMI_NIK", label: "NIK Calon Suami", category: "Pernikahan" },
  {
    key: "SUAMI_TTL",
    label: "Tempat, Tgl Lahir Calon Suami",
    category: "Pernikahan",
  },
  { key: "SUAMI_AGAMA", label: "Agama Calon Suami", category: "Pernikahan" },
  {
    key: "SUAMI_PEKERJAAN",
    label: "Pekerjaan Calon Suami",
    category: "Pernikahan",
  },
  { key: "SUAMI_ALAMAT", label: "Alamat Calon Suami", category: "Pernikahan" },
  {
    key: "SUAMI_STATUS_PERKAWINAN",
    label: "Status Kawin Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_KEWARGANEGARAAN",
    label: "Kewarganegaraan Calon Suami",
    category: "Pernikahan",
  },

  // Data Ayah Calon Suami
  {
    key: "SUAMI_AYAH_NAMA",
    label: "Nama Ayah Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_AYAH_NIK",
    label: "NIK Ayah Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_AYAH_TTL",
    label: "TTL Ayah Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_AYAH_AGAMA",
    label: "Agama Ayah Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_AYAH_PEKERJAAN",
    label: "Pekerjaan Ayah Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_AYAH_ALAMAT",
    label: "Alamat Ayah Calon Suami",
    category: "Pernikahan",
  },

  // Data Ibu Calon Suami
  {
    key: "SUAMI_IBU_NAMA",
    label: "Nama Ibu Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_IBU_NIK",
    label: "NIK Ibu Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_IBU_TTL",
    label: "TTL Ibu Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_IBU_AGAMA",
    label: "Agama Ibu Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_IBU_PEKERJAAN",
    label: "Pekerjaan Ibu Calon Suami",
    category: "Pernikahan",
  },
  {
    key: "SUAMI_IBU_ALAMAT",
    label: "Alamat Ibu Calon Suami",
    category: "Pernikahan",
  },

  // Data Calon Istri
  { key: "ISTRI_NAMA", label: "Nama Calon Istri", category: "Pernikahan" },
  { key: "ISTRI_NIK", label: "NIK Calon Istri", category: "Pernikahan" },
  {
    key: "ISTRI_TTL",
    label: "Tempat, Tgl Lahir Calon Istri",
    category: "Pernikahan",
  },
  { key: "ISTRI_AGAMA", label: "Agama Calon Istri", category: "Pernikahan" },
  {
    key: "ISTRI_PEKERJAAN",
    label: "Pekerjaan Calon Istri",
    category: "Pernikahan",
  },
  { key: "ISTRI_ALAMAT", label: "Alamat Calon Istri", category: "Pernikahan" },
  {
    key: "ISTRI_STATUS_PERKAWINAN",
    label: "Status Kawin Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_KEWARGANEGARAAN",
    label: "Kewarganegaraan Calon Istri",
    category: "Pernikahan",
  },

  // Data Ayah Calon Istri
  {
    key: "ISTRI_AYAH_NAMA",
    label: "Nama Ayah Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_AYAH_NIK",
    label: "NIK Ayah Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_AYAH_TTL",
    label: "TTL Ayah Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_AYAH_AGAMA",
    label: "Agama Ayah Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_AYAH_PEKERJAAN",
    label: "Pekerjaan Ayah Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_AYAH_ALAMAT",
    label: "Alamat Ayah Calon Istri",
    category: "Pernikahan",
  },

  // Data Ibu Calon Istri
  {
    key: "ISTRI_IBU_NAMA",
    label: "Nama Ibu Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_IBU_NIK",
    label: "NIK Ibu Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_IBU_TTL",
    label: "TTL Ibu Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_IBU_AGAMA",
    label: "Agama Ibu Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_IBU_PEKERJAAN",
    label: "Pekerjaan Ibu Calon Istri",
    category: "Pernikahan",
  },
  {
    key: "ISTRI_IBU_ALAMAT",
    label: "Alamat Ibu Calon Istri",
    category: "Pernikahan",
  },

  // Data Wali Nikah
  { key: "WALI_NAMA", label: "Nama Wali Nikah", category: "Pernikahan" },
  { key: "WALI_NIK", label: "NIK Wali Nikah", category: "Pernikahan" },
  { key: "WALI_ALAMAT", label: "Alamat Wali Nikah", category: "Pernikahan" },
  {
    key: "WALI_HUBUNGAN",
    label: "Hubungan Wali dengan Calon Istri",
    category: "Pernikahan",
  },

  // Keperluan & Custom
  { key: "KEPERLUAN", label: "Keperluan", category: "Custom" },
  { key: "TANGGAL_SURAT", label: "Tanggal Surat", category: "Custom" },
  {
    key: "NOMOR_SURAT",
    label: "Nomor Surat (Manual Input)",
    category: "Custom",
  },
  {
    key: "NOMOR_URUT",
    label: "Nomor Urut (Auto-Generated)",
    category: "Custom",
  },
  { key: "BULAN_ROMAWI", label: "Bulan Romawi", category: "Custom" },
  { key: "TAHUN", label: "Tahun", category: "Custom" },
];
