import { TemplateData } from "../components/template-builder/types";

interface LetterHistory {
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
  templateData?: TemplateData;
}

// Mock letter history dengan templateData untuk testing modern rendering
export const MOCK_LETTER_WITH_TEMPLATE: LetterHistory = {
  id: 1,
  letter_number: "475/039/424.304.2.02/2024",
  template_id: 1,
  template_name: "Surat Keterangan Usaha",
  template_category: "Keterangan",
  applicant_name: "Ahmad Suryadi",
  applicant_nik: "3201012801850001",
  signer_role: "kepala_desa",
  status: "completed",
  created_at: "2024-12-15 09:30:00",
  created_by: "Admin Desa",
  completed_at: "2024-12-15 10:00:00",
  content_html: "",
  form_data: {
    NOMOR_SURAT: "475/039/424.304.2.02/2024",
    NOMOR_URUT: "039",
    BULAN_ROMAWI: "XII",
    TAHUN: "2024",
    TANGGAL_SURAT: "15 Desember 2024",
    NAMA_DESA: "BRAMBANG",
    KABUPATEN: "PASURUAN",
    KECAMATAN: "GONDANGWETAN",
    ALAMAT_DESA: "Jl. Desa Brambang No. 1",
    KODE_POS: "67174",
    KEPALA_DESA_NAMA: "MOH. SOFWAN HADI",
    KEPALA_DESA_NIP: "19800101 200801 1 001",
    NAMA: "Ahmad Suryadi",
    NIK: "3201012801850001",
    TEMPAT_LAHIR: "Bandung",
    TANGGAL_LAHIR: "28 Januari 1985",
    JENIS_KELAMIN: "Laki-laki",
    AGAMA: "Islam",
    PEKERJAAN: "Wiraswasta",
    ALAMAT: "Jl. Merdeka No. 45, RT 002/RW 005, Desa Brambang",
    JENIS_USAHA: "Toko Kelontong",
    LOKASI_USAHA: "Jl. Raya Brambang No. 12",
    KEPERLUAN: "Pengajuan Izin Usaha",
  },
  templateData: {
    id: "0",
    name: "Surat Keterangan Usaha",
    description: "Template dengan format blocks modern",
    category: "Keterangan",
    is_multi_page: false,
    header: {
      font_size: {
        government_label: 14,
        village_name: 16,
        address: 12,
      },
      spacing: "normal",
      border_style: "double",
    },
    letterNumber: {
      enabled: true,
      heading: {
        text: "SURAT KETERANGAN USAHA",
        font: "Inter",
        size: 16,
        bold: true,
        underline: true,
        align: "center",
      },
      number: {
        format: "{NOMOR_URUT}/SK-USAHA/{BULAN_ROMAWI}/{TAHUN}",
        prefix: "Nomor: ",
        font: "Inter",
        size: 13,
        bold: false,
        underline: false,
        align: "center",
      },
    },
    blocks: [
      {
        id: "b1",
        type: "text",
        content:
          "Yang bertanda tangan di bawah ini, Kepala Desa {NAMA_DESA}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:",
        style: { align: "justify", font: "Literata" },
      },
      {
        id: "b2",
        type: "table",
        content: [
          { label: "Nama", value: "{NAMA}" },
          { label: "NIK", value: "{NIK}" },
          {
            label: "Tempat, Tanggal Lahir",
            value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
          },
          { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
          { label: "Agama", value: "{AGAMA}" },
          { label: "Pekerjaan", value: "{PEKERJAAN}" },
          { label: "Alamat", value: "{ALAMAT}" },
        ],
        style: { border: false },
      },
      {
        id: "b3",
        type: "text",
        content:
          "Adalah benar warga Desa {NAMA_DESA} yang memiliki usaha {JENIS_USAHA} yang berlokasi di {LOKASI_USAHA}.",
        style: { align: "justify", font: "Literata" },
      },
      {
        id: "b4",
        type: "text",
        content: "Surat keterangan ini dibuat untuk {KEPERLUAN}.",
        style: { align: "justify", font: "Literata" },
      },
      {
        id: "b5",
        type: "text",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        style: { align: "justify", font: "Literata" },
      },
    ],
    footer: {
      footer_type: "single",
      signers: [
        {
          role: "Kepala Desa {NAMA_DESA}",
          name: "{KEPALA_DESA_NAMA}",
          nip: "{KEPALA_DESA_NIP}",
        },
      ],
      location: "{NAMA_DESA}",
      date_format: "auto",
      custom_note: null,
    },
    variables: [
      "NAMA",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "AGAMA",
      "PEKERJAAN",
      "ALAMAT",
      "JENIS_USAHA",
      "LOKASI_USAHA",
      "KEPERLUAN",
    ],
    is_active: true,
  },
};
