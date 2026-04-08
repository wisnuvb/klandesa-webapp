import type {
  HeaderConfig,
  FooterConfig,
  ContentBlock,
  TemplatePage,
  LetterNumberConfig,
  TemplateData,
  VariableGroup,
} from "@/components/template-builder/types";

export type { TemplateData };

export interface DesaSettings {
  logo_url: string;
  kabupaten: string;
  kecamatan: string;
  nama_desa: string;
  alamat_desa: string;
  email_desa: string;
  kode_pos: string;
  kepala_desa_nama: string;
  /** NIP kepala desa (ASN); dipakai variabel {KEPALA_DESA_NIP} */
  kepala_desa_nip: string;
  kepala_desa_jabatan: string;
  sekretaris_nama: string;
  sekretaris_jabatan: string;
  camat_nama: string;
  camat_jabatan: string;
}

export interface TemplateHeader {
  id: number;
  name: string;
  template: string;
  fields: string[];
}

export interface TemplateFooter {
  id: number;
  name: string;
  template: string;
  signer_role: "kepala_desa" | "sekretaris" | "camat";
}

export interface TemplateBody {
  id: number;
  name: string;
  description: string;
  category: string;
  content_template: string;
  variables: string[];
  header: HeaderConfig;
  footer: FooterConfig;
  /** Kop surat global untuk mode multi-halaman (builder) */
  shared_header?: HeaderConfig;
  /** Footer global untuk mode multi-halaman (builder) */
  shared_footer?: FooterConfig;
  blocks: ContentBlock[];
  pages: TemplatePage[];
  is_multi_page: boolean;
  letterNumber?: LetterNumberConfig;
  /** Master: tampilkan kop (single-page) */
  show_header?: boolean;
  show_footer?: boolean;
  /** Default tampil header/footer untuk halaman baru (multi-page) */
  show_header_default?: boolean;
  show_footer_default?: boolean;
  variable_groups?: VariableGroup[];
  is_active: boolean;
  created_at: string;
  usage_count: number;
}

export interface LetterHistory {
  id: number;
  letter_number: string;
  template_id: number;
  template_name: string;
  template_category: string;
  applicant_name: string;
  applicant_nik: string;
  signer_role: "kepala_desa" | "sekretaris" | "camat";
  status: "draft" | "completed" | "archived";
  created_at: string;
  created_by: string;
  completed_at: string | null;
  content_html: string;
  form_data: Record<string, string>;
  /** Template dengan format blocks untuk rendering modern */
  templateData?: TemplateData;
}
