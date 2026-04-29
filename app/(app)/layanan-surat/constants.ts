import {
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
} from "@/components/template-builder/types";
import { MOCK_LETTER_WITH_TEMPLATE } from "@/data/mockLetterWithTemplate";
import type {
  DesaSettings,
  TemplateHeader,
  TemplateFooter,
  TemplateBody,
  LetterHistory,
} from "./types";

// ---------------------------------------------------------------------------
// Desa settings – idealnya diambil dari API/DB, ini placeholder statis
// ---------------------------------------------------------------------------
export const desaSettings: DesaSettings = {
  logo_url: "/vercel.svg",
  kabupaten: "PASURUAN",
  kecamatan: "GONDANGWETAN",
  nama_desa: "BRAMBANG",
  alamat_desa: "Jl. Desa Brambang No. 1",
  email_desa: "pemdesbrambang02@gmail.com",
  kode_pos: "67174",
  kepala_desa_nama: "MOH. SOFWAN HADI",
  kepala_desa_nip: "",
  kepala_desa_jabatan: "KEPALA DESA",
  sekretaris_nama: "RENI MANGGASARI",
  sekretaris_jabatan: "SEKRETARIS DESA",
  camat_nama: "Camat Gondangwetan",
  camat_jabatan: "a.n Kepala Desa",
};

// ---------------------------------------------------------------------------
// Template meta-data (modular headers/footers)
// ---------------------------------------------------------------------------
export const templateHeaders: TemplateHeader[] = [
  {
    id: 1,
    name: "Header Standard",
    template: "standard",
    fields: ["logo", "kabupaten", "kecamatan", "desa", "alamat", "email", "kode_pos"],
  },
];

export const templateFooters: TemplateFooter[] = [
  { id: 1, name: "TTD Kepala Desa", template: "kepala_desa", signer_role: "kepala_desa" },
  { id: 2, name: "TTD Sekretaris Desa", template: "sekretaris", signer_role: "sekretaris" },
  { id: 3, name: "TTD a.n. Kepala Desa (Camat)", template: "camat", signer_role: "camat" },
];

// ---------------------------------------------------------------------------
// Mock templates – dipakai sebagai fallback sebelum data dari API tersedia
// ---------------------------------------------------------------------------
export const mockTemplates: TemplateBody[] = [
  {
    id: 1,
    name: "Surat Keterangan Usaha",
    description: "Template surat keterangan untuk pelaku usaha",
    category: "Keterangan",
    content_template: `Yang bertanda tangan di bawah ini {PENANDA_TANGAN}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:\n\n    Nama                    : {NAMA}\n    NIK                     : {NIK}\n    Tempat/Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}\n    Jenis Kelamin           : {JENIS_KELAMIN}\n    Pekerjaan               : {PEKERJAAN}\n    Alamat                  : {ALAMAT}\n\nAdalah benar warga Desa {DESA} yang memiliki usaha {JENIS_USAHA} yang berlokasi di {LOKASI_USAHA}.\n\nSurat Keterangan ini dibuat untuk {KEPERLUAN}.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`,
    variables: ["NAMA", "NIK", "TEMPAT_LAHIR", "TANGGAL_LAHIR", "JENIS_KELAMIN", "PEKERJAAN", "ALAMAT", "JENIS_USAHA", "LOKASI_USAHA", "KEPERLUAN"],
    header: DEFAULT_HEADER_CONFIG,
    footer: DEFAULT_FOOTER_CONFIG,
    blocks: [],
    pages: [],
    is_multi_page: false,
    is_active: true,
    created_at: "2024-01-15",
    usage_count: 45,
    is_catalog: false,
    catalog_key: null,
    inherits_catalog_key: null,
  },
  {
    id: 2,
    name: "Surat Keterangan Domisili",
    description: "Template surat keterangan domisili penduduk",
    category: "Keterangan",
    content_template: `Yang bertanda tangan di bawah ini {PENANDA_TANGAN}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:\n\n    Nama                    : {NAMA}\n    NIK                     : {NIK}\n    Tempat/Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}\n    Jenis Kelamin           : {JENIS_KELAMIN}\n    Pekerjaan               : {PEKERJAAN}\n    Alamat                  : {ALAMAT}\n\nAdalah benar berdomisili di alamat tersebut di atas sejak tahun {TAHUN_MULAI_TINGGAL}.\n\nSurat Keterangan ini dibuat untuk {KEPERLUAN}.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`,
    variables: ["NAMA", "NIK", "TEMPAT_LAHIR", "TANGGAL_LAHIR", "JENIS_KELAMIN", "PEKERJAAN", "ALAMAT", "TAHUN_MULAI_TINGGAL", "KEPERLUAN"],
    header: DEFAULT_HEADER_CONFIG,
    footer: DEFAULT_FOOTER_CONFIG,
    blocks: [],
    pages: [],
    is_multi_page: false,
    is_active: true,
    created_at: "2024-01-15",
    usage_count: 78,
    is_catalog: false,
    catalog_key: null,
    inherits_catalog_key: null,
  },
  {
    id: 3,
    name: "Surat Pengantar Catatan Kepolisian",
    description: "Template surat pengantar untuk melamar pekerjaan",
    category: "Pengantar",
    content_template: `Yang bertanda tangan dibawah ini, {PENANDA_TANGAN} Kecamatan {KECAMATAN} Kabupaten {KABUPATEN}, dengan menerangkan bahwa :\n\n    Nama Lengkap            : {NAMA}\n    Jenis Kelamin           : {JENIS_KELAMIN}\n    Tempat Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}\n    Status Perkawinan       : {STATUS_PERKAWINAN}\n    Kewarganegaraan         : {KEWARGANEGARAAN}\n    Agama                   : {AGAMA}\n    Pekerjaan               : {PEKERJAAN}\n    Nomor Indul. Kependudukan : {NIK}\n    Alamat                  : {ALAMAT}\n\nOrang tersebut diatas adalah benar penduduk Desa Kami yang berdomisili di alamat diatas serta kami menerangkan bahwa orang tersebut benar {KETERANGAN_KELAKUAN} dan {KETERANGAN_TERSANGKUT}. Surat keterangan ini kami berikan untuk memenuhi salah satu persyaratan {KEPERLUAN}.\n\nDemikian surat keterangan ini dibuat, kepada yang bersangkutan harap maklum serta menjadikan bahan seperlunya.`,
    variables: ["NAMA", "NIK", "TEMPAT_LAHIR", "TANGGAL_LAHIR", "JENIS_KELAMIN", "STATUS_PERKAWINAN", "KEWARGANEGARAAN", "AGAMA", "PEKERJAAN", "ALAMAT", "KETERANGAN_KELAKUAN", "KETERANGAN_TERSANGKUT", "KEPERLUAN"],
    header: DEFAULT_HEADER_CONFIG,
    footer: DEFAULT_FOOTER_CONFIG,
    blocks: [],
    pages: [],
    is_multi_page: false,
    is_active: true,
    created_at: "2024-02-01",
    usage_count: 25,
    is_catalog: false,
    catalog_key: null,
    inherits_catalog_key: null,
  },
  {
    id: 4,
    name: "Surat Keterangan Tidak Mampu",
    description: "Template SKTM untuk keperluan beasiswa atau bantuan",
    category: "Keterangan",
    content_template: `Yang bertanda tangan di bawah ini {PENANDA_TANGAN}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:\n\n    Nama                    : {NAMA}\n    NIK                     : {NIK}\n    Tempat/Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}\n    Jenis Kelamin           : {JENIS_KELAMIN}\n    Pekerjaan               : {PEKERJAAN}\n    Alamat                  : {ALAMAT}\n\nAdalah benar termasuk keluarga kurang mampu dengan penghasilan rata-rata per bulan sebesar Rp. {PENGHASILAN}.\n\nSurat Keterangan ini dibuat untuk {KEPERLUAN}.\n\nDemikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`,
    variables: ["NAMA", "NIK", "TEMPAT_LAHIR", "TANGGAL_LAHIR", "JENIS_KELAMIN", "PEKERJAAN", "ALAMAT", "PENGHASILAN", "KEPERLUAN"],
    header: DEFAULT_HEADER_CONFIG,
    footer: DEFAULT_FOOTER_CONFIG,
    blocks: [],
    pages: [],
    is_multi_page: false,
    is_active: true,
    created_at: "2024-01-20",
    usage_count: 32,
    is_catalog: false,
    catalog_key: null,
    inherits_catalog_key: null,
  },
  {
    id: 5,
    name: "Surat Pengantar Nikah (N1-N6)",
    description: "Template lengkap surat pengantar nikah multi-halaman (Model N1 sampai N6)",
    category: "Kependudukan",
    content_template: "Multi-page template - See template builder",
    variables: ["SUAMI_NAMA", "SUAMI_NIK", "ISTRI_NAMA", "ISTRI_NIK", "WALI_NAMA"],
    header: DEFAULT_HEADER_CONFIG,
    footer: DEFAULT_FOOTER_CONFIG,
    blocks: [],
    pages: [],
    is_multi_page: false,
    is_active: true,
    created_at: "2024-12-20",
    usage_count: 8,
    is_catalog: false,
    catalog_key: null,
    inherits_catalog_key: null,
  },
];

// ---------------------------------------------------------------------------
// Mock letter history – dipakai sebelum data dari API tersedia
// ---------------------------------------------------------------------------
export const mockLetterHistory: LetterHistory[] = [
  MOCK_LETTER_WITH_TEMPLATE,
  {
    id: 2,
    letter_number: "475/040/424.304.2.02/2024",
    template_id: 2,
    template_name: "Surat Keterangan Domisili",
    template_category: "Keterangan",
    applicant_name: "Siti Aminah",
    applicant_nik: "3201014505900002",
    signer_role: "sekretaris",
    status: "completed",
    created_at: "2024-12-16 11:15:00",
    created_by: "Admin Desa",
    completed_at: "2024-12-16 11:45:00",
    content_html: "",
    form_data: { NOMOR_SURAT: "475/040/424.304.2.02/2024", TANGGAL_SURAT: "16 Desember 2024", NAMA: "Siti Aminah", NIK: "3201014505900002", TEMPAT_LAHIR: "Pasuruan", TANGGAL_LAHIR: "05 Mei 1990", JENIS_KELAMIN: "Perempuan", PEKERJAAN: "Ibu Rumah Tangga", ALAMAT: "Jl. Raya Desa No. 78, RT 003/RW 002, Desa Brambang", TAHUN_MULAI_TINGGAL: "2015", KEPERLUAN: "Pendaftaran BPJS Kesehatan" },
  },
  {
    id: 3,
    letter_number: "475/041/424.304.2.02/2024",
    template_id: 4,
    template_name: "Surat Keterangan Tidak Mampu",
    template_category: "Keterangan",
    applicant_name: "Budi Santoso",
    applicant_nik: "3201011212880003",
    signer_role: "kepala_desa",
    status: "completed",
    created_at: "2024-12-17 13:20:00",
    created_by: "Staff Pelayanan",
    completed_at: "2024-12-17 14:00:00",
    content_html: "",
    form_data: { NOMOR_SURAT: "475/041/424.304.2.02/2024", TANGGAL_SURAT: "17 Desember 2024", NAMA: "Budi Santoso", NIK: "3201011212880003", TEMPAT_LAHIR: "Surabaya", TANGGAL_LAHIR: "12 Desember 1988", JENIS_KELAMIN: "Laki-laki", PEKERJAAN: "Buruh Harian", ALAMAT: "Jl. Kenanga No. 23, RT 001/RW 003, Desa Brambang", PENGHASILAN: "1.500.000", KEPERLUAN: "Beasiswa Anak" },
  },
  {
    id: 4,
    letter_number: "DRAFT-001",
    template_id: 3,
    template_name: "Surat Pengantar Catatan Kepolisian",
    template_category: "Pengantar",
    applicant_name: "Rina Wulandari",
    applicant_nik: "3201012203920004",
    signer_role: "sekretaris",
    status: "draft",
    created_at: "2024-12-18 15:00:00",
    created_by: "Admin Desa",
    completed_at: null,
    content_html: "",
    form_data: { NAMA: "Rina Wulandari", NIK: "3201012203920004", TEMPAT_LAHIR: "Malang", TANGGAL_LAHIR: "22 Maret 1992", JENIS_KELAMIN: "Perempuan", PEKERJAAN: "Karyawan Swasta", ALAMAT: "Jl. Melati No. 56, RT 004/RW 001, Desa Brambang" },
  },
];

// ---------------------------------------------------------------------------
// Legacy HTML helpers – dipakai untuk rendering surat format lama
// ---------------------------------------------------------------------------
export function generateHeader(nomor_surat: string, jenis_surat: string): string {
  return `<div class="header-surat">
  <table width="100%" style="border-bottom: 3px solid #000; padding-bottom: 8px;">
    <tr>
      <td width="100" style="vertical-align: middle; text-align: center;">
        <img src="${desaSettings.logo_url}" alt="Logo" style="width: 80px; height: auto;" />
      </td>
      <td style="text-align: center; vertical-align: middle;">
        <div style="font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">PEMERINTAH KABUPATEN ${desaSettings.kabupaten}</div>
        <div style="font-weight: 700; font-size: 14px; margin-top: 2px;">KECAMATAN ${desaSettings.kecamatan}</div>
        <div style="font-weight: 800; font-size: 20px; margin-top: 4px; letter-spacing: 1px;">KANTOR DESA ${desaSettings.nama_desa}</div>
        <div style="font-size: 12px; margin-top: 4px;">
          ${desaSettings.alamat_desa} ${desaSettings.email_desa} Kode Pos ${desaSettings.kode_pos}
        </div>
      </td>
    </tr>
  </table>
  <div style="text-align: center; margin-top: 20px; margin-bottom: 20px;">
    <div style="text-decoration: underline; font-weight: 700; font-size: 16px; letter-spacing: 0.5px;">${jenis_surat}</div>
    <div style="font-size: 13px; margin-top: 4px;">Nomor : ${nomor_surat}</div>
  </div>
</div>`;
}

export function generateFooter(footer: TemplateFooter, tanggal_surat: string): string {
  let signerName = "";
  let signerTitle = "";
  let locationPrefix = "";

  if (footer.signer_role === "kepala_desa") {
    signerName = desaSettings.kepala_desa_nama;
    signerTitle = desaSettings.kepala_desa_jabatan;
    locationPrefix = desaSettings.nama_desa;
  } else if (footer.signer_role === "sekretaris") {
    signerName = desaSettings.sekretaris_nama;
    signerTitle = desaSettings.sekretaris_jabatan;
    locationPrefix = desaSettings.nama_desa;
  } else if (footer.signer_role === "camat") {
    signerName = desaSettings.camat_nama;
    signerTitle = desaSettings.camat_jabatan;
    locationPrefix = desaSettings.kecamatan;
  }

  return `<div class="footer-surat" style="margin-top: 40px;">
  <table width="100%">
    <tr>
      <td width="50%" style="text-align: center; vertical-align: top;">
        <div>${locationPrefix}</div>
      </td>
      <td width="50%" style="text-align: center; vertical-align: top;">
        <div>${locationPrefix}, ${tanggal_surat}</div>
        <div style="margin-bottom: 80px;">${signerTitle}</div>
        <div style="font-weight: 700; text-decoration: underline;">${signerName}</div>
      </td>
    </tr>
  </table>
</div>`;
}

// ---------------------------------------------------------------------------
// Dummy data untuk preview template (fallback ketika data real kosong)
// ---------------------------------------------------------------------------
export const TEMPLATE_DUMMY_DATA: Record<string, string> = {
  NOMOR_SURAT: "475/039/424.304.2.02/2024",
  TANGGAL_SURAT: "19 Desember 2024",
  NAMA: "Ahmad Suryadi",
  NIK: "3201012801850001",
  TEMPAT_LAHIR: "Bandung",
  TANGGAL_LAHIR: "28 Januari 1985",
  JENIS_KELAMIN: "Laki-laki",
  PEKERJAAN: "Wiraswasta",
  ALAMAT: "Jl. Merdeka No. 45, RT 002/RW 005, Desa Brambang",
  KEPERLUAN: "Pembuatan KTP Baru",
  STATUS_PERKAWINAN: "Kawin",
  KEWARGANEGARAAN: "Indonesia",
  AGAMA: "Islam",
  KETERANGAN_KELAKUAN: "berkelakuan baik",
  KETERANGAN_TERSANGKUT: "tidak pernah tersangkut masalah hukum",
  JENIS_USAHA: "Toko Kelontong",
  LOKASI_USAHA: "Jl. Raya Brambang No. 12",
  TAHUN_MULAI_TINGGAL: "2010",
  PENGHASILAN: "2.500.000",
};
