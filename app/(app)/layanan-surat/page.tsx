/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import {
  Search,
  Plus,
  Edit,
  Eye,
  FileText,
  Copy,
  Download,
  FileEdit,
  Clock,
  CheckCircle,
  FileArchive,
  Grid3x3,
  List,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MultiPageTemplateBuilder } from "@/components/template-builder/MultiPageTemplateBuilder";
import { TemplateData } from "@/components/template-builder/types";
import { MultiPageLetterForm } from "@/components/MultiPageLetterForm";
import { SURAT_PENGANTAR_NIKAH_TEMPLATE } from "@/data/mockMultiPageTemplate";
import * as TemplateRenderer from "@/utils/templateRenderer";
import { MOCK_LETTER_WITH_TEMPLATE } from "@/data/mockLetterWithTemplate";
import {
  AutocompleteResidentInput,
  mapResidentToFormData,
} from "@/components/AutocompleteResidentInput";

// Data desa yang biasanya diambil dari DB/settings
const desaSettings = {
  logo_url: "/vercel.svg", // Static placeholder logo
  kabupaten: "PASURUAN",
  kecamatan: "GONDANGWETAN",
  nama_desa: "BRAMBANG",
  alamat_desa: "Jl. Desa Brambang No. 1",
  email_desa: "pemdesbrambang02@gmail.com",
  kode_pos: "67174",
  kepala_desa_nama: "MOH. SOFWAN HADI",
  kepala_desa_jabatan: "KEPALA DESA",
  sekretaris_nama: "RENI MANGGASARI",
  sekretaris_jabatan: "SEKRETARIS DESA",
  camat_nama: "Camat Gondangwetan",
  camat_jabatan: "a.n Kepala Desa",
};

interface TemplateHeader {
  id: number;
  name: string;
  template: string;
  fields: string[]; // Fields yang otomatis dari DB
}

interface TemplateFooter {
  id: number;
  name: string;
  template: string;
  signer_role: "kepala_desa" | "sekretaris" | "camat";
}

interface TemplateBody {
  id: number;
  name: string;
  description: string;
  category: string;
  content_template: string;
  variables: string[]; // Variabel yang perlu diisi user
  header_id: number;
  footer_id: number;
  is_active: boolean;
  created_at: string;
  usage_count: number;
}

interface LetterHistory {
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
  templateData?: TemplateData; // Optional: Template dengan format blocks untuk rendering modern
}

// Template Headers (modular)
const templateHeaders: TemplateHeader[] = [
  {
    id: 1,
    name: "Header Standard",
    template: "standard",
    fields: [
      "logo",
      "kabupaten",
      "kecamatan",
      "desa",
      "alamat",
      "email",
      "kode_pos",
    ],
  },
];

// Template Footers (modular)
const templateFooters: TemplateFooter[] = [
  {
    id: 1,
    name: "TTD Kepala Desa",
    template: "kepala_desa",
    signer_role: "kepala_desa",
  },
  {
    id: 2,
    name: "TTD Sekretaris Desa",
    template: "sekretaris",
    signer_role: "sekretaris",
  },
  {
    id: 3,
    name: "TTD a.n. Kepala Desa (Camat)",
    template: "camat",
    signer_role: "camat",
  },
];

// Template Bodies (content surat)
const mockTemplates: TemplateBody[] = [
  {
    id: 1,
    name: "Surat Keterangan Usaha",
    description: "Template surat keterangan untuk pelaku usaha",
    category: "Keterangan",
    content_template: `Yang bertanda tangan di bawah ini {PENANDA_TANGAN}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:

    Nama                    : {NAMA}
    NIK                     : {NIK}
    Tempat/Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}
    Jenis Kelamin           : {JENIS_KELAMIN}
    Pekerjaan               : {PEKERJAAN}
    Alamat                  : {ALAMAT}

Adalah benar warga Desa {DESA} yang memiliki usaha {JENIS_USAHA} yang berlokasi di {LOKASI_USAHA}.

Surat Keterangan ini dibuat untuk {KEPERLUAN}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`,
    variables: [
      "NAMA",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "PEKERJAAN",
      "ALAMAT",
      "JENIS_USAHA",
      "LOKASI_USAHA",
      "KEPERLUAN",
    ],
    header_id: 1,
    footer_id: 1,
    is_active: true,
    created_at: "2024-01-15",
    usage_count: 45,
  },
  {
    id: 2,
    name: "Surat Keterangan Domisili",
    description: "Template surat keterangan domisili penduduk",
    category: "Keterangan",
    content_template: `Yang bertanda tangan di bawah ini {PENANDA_TANGAN}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:

    Nama                    : {NAMA}
    NIK                     : {NIK}
    Tempat/Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}
    Jenis Kelamin           : {JENIS_KELAMIN}
    Pekerjaan               : {PEKERJAAN}
    Alamat                  : {ALAMAT}

Adalah benar berdomisili di alamat tersebut di atas sejak tahun {TAHUN_MULAI_TINGGAL}.

Surat Keterangan ini dibuat untuk {KEPERLUAN}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`,
    variables: [
      "NAMA",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "PEKERJAAN",
      "ALAMAT",
      "TAHUN_MULAI_TINGGAL",
      "KEPERLUAN",
    ],
    header_id: 1,
    footer_id: 1,
    is_active: true,
    created_at: "2024-01-15",
    usage_count: 78,
  },
  {
    id: 3,
    name: "Surat Pengantar Catatan Kepolisian",
    description: "Template surat pengantar untuk melamar pekerjaan",
    category: "Pengantar",
    content_template: `Yang bertanda tangan dibawah ini, {PENANDA_TANGAN} Kecamatan {KECAMATAN} Kabupaten {KABUPATEN}, dengan menerangkan bahwa :

    Nama Lengkap            : {NAMA}
    Jenis Kelamin           : {JENIS_KELAMIN}
    Tempat Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}
    Status Perkawinan       : {STATUS_PERKAWINAN}
    Kewarganegaraan         : {KEWARGANEGARAAN}
    Agama                   : {AGAMA}
    Pekerjaan               : {PEKERJAAN}
    Nomor Indul. Kependudukan : {NIK}
    Alamat                  : {ALAMAT}

Orang tersebut diatas adalah benar penduduk Desa Kami yang berdomisili di alamat diatas serta kami menerangkan bahwa orang tersebut benar {KETERANGAN_KELAKUAN} dan {KETERANGAN_TERSANGKUT}. Surat keterangan ini kami berikan untuk memenuhi salah satu persyaratan {KEPERLUAN}.

Demikian surat keterangan ini dibuat, kepada yang bersangkutan harap maklum serta menjadikan bahan seperlunya.`,
    variables: [
      "NAMA",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "STATUS_PERKAWINAN",
      "KEWARGANEGARAAN",
      "AGAMA",
      "PEKERJAAN",
      "ALAMAT",
      "KETERANGAN_KELAKUAN",
      "KETERANGAN_TERSANGKUT",
      "KEPERLUAN",
    ],
    header_id: 1,
    footer_id: 2,
    is_active: true,
    created_at: "2024-02-01",
    usage_count: 25,
  },
  {
    id: 4,
    name: "Surat Keterangan Tidak Mampu",
    description: "Template SKTM untuk keperluan beasiswa atau bantuan",
    category: "Keterangan",
    content_template: `Yang bertanda tangan di bawah ini {PENANDA_TANGAN}, Kecamatan {KECAMATAN}, Kabupaten {KABUPATEN}, menerangkan bahwa:

    Nama                    : {NAMA}
    NIK                     : {NIK}
    Tempat/Tanggal Lahir    : {TEMPAT_LAHIR}, {TANGGAL_LAHIR}
    Jenis Kelamin           : {JENIS_KELAMIN}
    Pekerjaan               : {PEKERJAAN}
    Alamat                  : {ALAMAT}

Adalah benar termasuk keluarga kurang mampu dengan penghasilan rata-rata per bulan sebesar Rp. {PENGHASILAN}.

Surat Keterangan ini dibuat untuk {KEPERLUAN}.

Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.`,
    variables: [
      "NAMA",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "PEKERJAAN",
      "ALAMAT",
      "PENGHASILAN",
      "KEPERLUAN",
    ],
    header_id: 1,
    footer_id: 1,
    is_active: true,
    created_at: "2024-01-20",
    usage_count: 32,
  },
  {
    id: 5,
    name: "Surat Pengantar Nikah (N1-N6)",
    description:
      "Template lengkap surat pengantar nikah multi-halaman (Model N1 sampai N6)",
    category: "Kependudukan",
    content_template: "Multi-page template - See template builder",
    variables: [
      "SUAMI_NAMA",
      "SUAMI_NIK",
      "ISTRI_NAMA",
      "ISTRI_NIK",
      "WALI_NAMA",
    ],
    header_id: 1,
    footer_id: 1,
    is_active: true,
    created_at: "2024-12-20",
    usage_count: 8,
  },
];

// Mock Letter History
const mockLetterHistory: LetterHistory[] = [
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
    form_data: {
      NOMOR_SURAT: "475/040/424.304.2.02/2024",
      TANGGAL_SURAT: "16 Desember 2024",
      NAMA: "Siti Aminah",
      NIK: "3201014505900002",
      TEMPAT_LAHIR: "Pasuruan",
      TANGGAL_LAHIR: "05 Mei 1990",
      JENIS_KELAMIN: "Perempuan",
      PEKERJAAN: "Ibu Rumah Tangga",
      ALAMAT: "Jl. Raya Desa No. 78, RT 003/RW 002, Desa Brambang",
      TAHUN_MULAI_TINGGAL: "2015",
      KEPERLUAN: "Pendaftaran BPJS Kesehatan",
    },
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
    form_data: {
      NOMOR_SURAT: "475/041/424.304.2.02/2024",
      TANGGAL_SURAT: "17 Desember 2024",
      NAMA: "Budi Santoso",
      NIK: "3201011212880003",
      TEMPAT_LAHIR: "Surabaya",
      TANGGAL_LAHIR: "12 Desember 1988",
      JENIS_KELAMIN: "Laki-laki",
      PEKERJAAN: "Buruh Harian",
      ALAMAT: "Jl. Kenanga No. 23, RT 001/RW 003, Desa Brambang",
      PENGHASILAN: "1.500.000",
      KEPERLUAN: "Beasiswa Anak",
    },
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
    form_data: {
      NAMA: "Rina Wulandari",
      NIK: "3201012203920004",
      TEMPAT_LAHIR: "Malang",
      TANGGAL_LAHIR: "22 Maret 1992",
      JENIS_KELAMIN: "Perempuan",
      PEKERJAAN: "Karyawan Swasta",
      ALAMAT: "Jl. Melati No. 56, RT 004/RW 001, Desa Brambang",
    },
  },
  {
    id: 5,
    letter_number: "475/038/424.304.2.02/2024",
    template_id: 1,
    template_name: "Surat Keterangan Usaha",
    template_category: "Keterangan",
    applicant_name: "Joko Widodo",
    applicant_nik: "3201017808820005",
    signer_role: "kepala_desa",
    status: "completed",
    created_at: "2024-12-14 08:00:00",
    created_by: "Admin Desa",
    completed_at: "2024-12-14 08:30:00",
    content_html: "",
    form_data: {
      NOMOR_SURAT: "475/038/424.304.2.02/2024",
      TANGGAL_SURAT: "14 Desember 2024",
      NAMA: "Joko Widodo",
      NIK: "3201017808820005",
      TEMPAT_LAHIR: "Pasuruan",
      TANGGAL_LAHIR: "08 Agustus 1982",
      JENIS_KELAMIN: "Laki-laki",
      PEKERJAAN: "Wiraswasta",
      ALAMAT: "Jl. Mawar No. 34, RT 002/RW 004, Desa Brambang",
      JENIS_USAHA: "Bengkel Motor",
      LOKASI_USAHA: "Jl. Raya Brambang No. 89",
      KEPERLUAN: "Perpanjangan Izin Usaha",
    },
  },
  {
    id: 6,
    letter_number: "475/042/424.304.2.02/2024",
    template_id: 2,
    template_name: "Surat Keterangan Domisili",
    template_category: "Keterangan",
    applicant_name: "Dewi Kusuma",
    applicant_nik: "3201015509950006",
    signer_role: "kepala_desa",
    status: "completed",
    created_at: "2024-12-18 10:30:00",
    created_by: "Staff Pelayanan",
    completed_at: "2024-12-18 11:00:00",
    content_html: "",
    form_data: {
      NOMOR_SURAT: "475/042/424.304.2.02/2024",
      TANGGAL_SURAT: "18 Desember 2024",
      NAMA: "Dewi Kusuma",
      NIK: "3201015509950006",
      TEMPAT_LAHIR: "Sidoarjo",
      TANGGAL_LAHIR: "15 September 1995",
      JENIS_KELAMIN: "Perempuan",
      PEKERJAAN: "Guru",
      ALAMAT: "Jl. Anggrek No. 12, RT 001/RW 002, Desa Brambang",
      TAHUN_MULAI_TINGGAL: "2018",
      KEPERLUAN: "Pembuatan SIM",
    },
  },
  {
    id: 7,
    letter_number: "DRAFT-002",
    template_id: 4,
    template_name: "Surat Keterangan Tidak Mampu",
    template_category: "Keterangan",
    applicant_name: "Agus Salim",
    applicant_nik: "3201013101870007",
    signer_role: "kepala_desa",
    status: "draft",
    created_at: "2024-12-19 14:15:00",
    created_by: "Admin Desa",
    completed_at: null,
    content_html: "",
    form_data: {
      NAMA: "Agus Salim",
      NIK: "3201013101870007",
      TEMPAT_LAHIR: "Probolinggo",
      TANGGAL_LAHIR: "31 Januari 1987",
      JENIS_KELAMIN: "Laki-laki",
      PEKERJAAN: "Petani",
      ALAMAT: "Jl. Dahlia No. 67, RT 005/RW 003, Desa Brambang",
    },
  },
  {
    id: 8,
    letter_number: "475/037/424.304.2.02/2024",
    template_id: 3,
    template_name: "Surat Pengantar Catatan Kepolisian",
    template_category: "Pengantar",
    applicant_name: "Lisa Permata",
    applicant_nik: "3201016607930008",
    signer_role: "sekretaris",
    status: "archived",
    created_at: "2024-12-13 09:00:00",
    created_by: "Staff Pelayanan",
    completed_at: "2024-12-13 10:00:00",
    content_html: "",
    form_data: {
      NOMOR_SURAT: "475/037/424.304.2.02/2024",
      TANGGAL_SURAT: "13 Desember 2024",
      NAMA: "Lisa Permata",
      NIK: "3201016607930008",
      TEMPAT_LAHIR: "Jakarta",
      TANGGAL_LAHIR: "06 Juli 1993",
      JENIS_KELAMIN: "Perempuan",
      STATUS_PERKAWINAN: "Belum Kawin",
      KEWARGANEGARAAN: "Indonesia",
      AGAMA: "Islam",
      PEKERJAAN: "Pegawai Swasta",
      ALAMAT: "Jl. Sakura No. 45, RT 003/RW 001, Desa Brambang",
      KETERANGAN_KELAKUAN: "berkelakuan baik",
      KETERANGAN_TERSANGKUT: "tidak pernah tersangkut masalah pidana",
      KEPERLUAN: "Melamar Pekerjaan",
    },
  },
  {
    id: 9,
    letter_number: "475/043/424.304.2.02/2024",
    template_id: 1,
    template_name: "Surat Keterangan Usaha (Modern)",
    template_category: "Keterangan",
    applicant_name: "Rudi Hartono",
    applicant_nik: "3201011505890009",
    signer_role: "kepala_desa",
    status: "completed",
    created_at: "2024-12-20 10:00:00",
    created_by: "Admin Desa",
    completed_at: "2024-12-20 10:30:00",
    content_html: "",
    form_data: {
      NOMOR_SURAT: "043",
      NOMOR_URUT: "043",
      BULAN_ROMAWI: "XII",
      TAHUN: "2024",
      TANGGAL_SURAT: "20 Desember 2024",
      NAMA_DESA: "BRAMBANG",
      KABUPATEN: "PASURUAN",
      KECAMATAN: "GONDANGWETAN",
      ALAMAT_DESA: "Jl. Desa Brambang No. 1",
      KODE_POS: "67174",
      KEPALA_DESA_NAMA: "MOH. SOFWAN HADI",
      KEPALA_DESA_NIP: "19800101 200801 1 001",
      NAMA: "Rudi Hartono",
      NIK: "3201011505890009",
      TEMPAT_LAHIR: "Pasuruan",
      TANGGAL_LAHIR: "15 Mei 1989",
      JENIS_KELAMIN: "Laki-laki",
      AGAMA: "Islam",
      PEKERJAAN: "Wiraswasta",
      ALAMAT: "Jl. Mawar No. 88, RT 003/RW 004, Desa Brambang",
      JENIS_USAHA: "Warung Makan",
      LOKASI_USAHA: "Jl. Raya Brambang No. 99",
      KEPERLUAN: "Pengajuan Kredit Usaha Rakyat",
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
  },
];

// Helper untuk generate header
const generateHeader = (nomor_surat: string, jenis_surat: string) => {
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
};

// Helper untuk generate footer
const generateFooter = (footer: TemplateFooter, tanggal_surat: string) => {
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
};

export function LayananSurat() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateBody | null>(
    null
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateBody | null>(
    null
  );
  const [editingTemplate, setEditingTemplate] = useState<TemplateBody | null>(
    null
  );
  const [activeTab, setActiveTab] = useState("form");

  // State for page-level tabs (Template vs History)
  const [pageTab, setPageTab] = useState<"templates" | "history">("templates");

  // State for history tab
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyCategoryFilter, setHistoryCategoryFilter] =
    useState<string>("all");
  const [selectedLetter, setSelectedLetter] = useState<LetterHistory | null>(
    null
  );
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<"grid" | "table">(
    "grid"
  );

  // Ref untuk container preview surat (untuk download PDF)
  const letterPreviewRef = useRef<HTMLDivElement>(null);

  // Form state for creating surat
  const [formData, setFormData] = useState<Record<string, string>>({
    NOMOR_SURAT: "",
    TANGGAL_SURAT: new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  });

  // State for autocomplete resident selection
  const [selectedResident, setSelectedResident] = useState<any>(null);

  const handleSaveTemplate = (template: TemplateData) => {
    console.log("Template saved:", template);
    // TODO: Save to database/state
    // For now, just close the dialog
  };

  const filteredTemplates = mockTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleCreateSurat = (template: TemplateBody) => {
    // Initialize form with standard fields
    const initialForm: Record<string, string> = {
      NOMOR_SURAT: "",
      TANGGAL_SURAT: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      // Auto-fill from desa settings
      KABUPATEN: desaSettings.kabupaten,
      KECAMATAN: desaSettings.kecamatan,
      DESA: desaSettings.nama_desa,
      PENANDA_TANGAN: "Kepala Desa " + desaSettings.nama_desa,
    };

    // Add template-specific variables
    template.variables.forEach((variable) => {
      if (!initialForm[variable]) {
        initialForm[variable] = "";
      }
    });

    setFormData(initialForm);
    setSelectedTemplate(template);
    setSelectedResident(null); // Reset selected resident
    setActiveTab("form");
    setShowCreateDialog(true);
  };

  const handleFormChange = (variable: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [variable]: value,
    }));
  };

  const handleResidentSelect = (resident: any) => {
    setSelectedResident(resident);
    if (resident) {
      // Auto-fill form data from selected resident
      const residentData = mapResidentToFormData(resident);
      setFormData((prev) => ({
        ...prev,
        ...residentData,
      }));
    }
  };

  const generatePreview = () => {
    if (!selectedTemplate) return "";

    // Get footer template
    const footer = templateFooters.find(
      (f) => f.id === selectedTemplate.footer_id
    );
    if (!footer) return "";

    // Generate header
    const headerHTML = generateHeader(
      formData.NOMOR_SURAT || "[NOMOR SURAT]",
      selectedTemplate.name.toUpperCase()
    );

    // Generate body
    let bodyContent = selectedTemplate.content_template;
    Object.entries(formData).forEach(([key, value]) => {
      bodyContent = bodyContent.replaceAll(`{${key}}`, value || `[${key}]`);
    });

    // Generate footer
    const footerHTML = generateFooter(footer, formData.TANGGAL_SURAT);

    return `${headerHTML}<div class="body-surat" style="font-size: 14px; line-height: 1.8; text-align: justify; margin: 20px 0;">${bodyContent}</div>${footerHTML}`;
  };

  // Generate preview dengan data dummy untuk template preview
  const generateTemplatePreview = (template: TemplateBody) => {
    // Data dummy yang lengkap
    const dummyData: Record<string, string> = {
      NOMOR_SURAT: "475/039/424.304.2.02/2024",
      TANGGAL_SURAT: "19 Desember 2024",
      KABUPATEN: desaSettings.kabupaten,
      KECAMATAN: desaSettings.kecamatan,
      DESA: desaSettings.nama_desa,
      PENANDA_TANGAN: "Kepala Desa " + desaSettings.nama_desa,
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

    // Get footer template
    const footer = templateFooters.find((f) => f.id === template.footer_id);
    if (!footer) return "";

    // Generate header
    const headerHTML = generateHeader(
      dummyData.NOMOR_SURAT,
      template.name.toUpperCase()
    );

    // Generate body
    let bodyContent = template.content_template;
    Object.entries(dummyData).forEach(([key, value]) => {
      bodyContent = bodyContent.replaceAll(`{${key}}`, value);
    });

    // Generate footer
    const footerHTML = generateFooter(footer, dummyData.TANGGAL_SURAT);

    return `${headerHTML}<div class="body-surat" style="font-size: 14px; line-height: 1.8; text-align: justify; margin: 20px 0;">${bodyContent}</div>${footerHTML}`;
  };

  const handlePreviewTemplate = (template: TemplateBody) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  // Convert TemplateBody to TemplateData for editing
  const convertToTemplateData = (template: TemplateBody): TemplateData => {
    const footer = templateFooters.find((f) => f.id === template.footer_id);

    // Convert footer to FooterConfig
    let footerType:
      | "single"
      | "an_kepala_desa"
      | "with_camat"
      | "camat_only"
      | "no_signature"
      | "multi_officials" = "single";
    let signers: any[] = [];

    if (footer) {
      if (footer.signer_role === "kepala_desa") {
        footerType = "single";
        signers = [
          {
            role: desaSettings.kepala_desa_jabatan,
            name: desaSettings.kepala_desa_nama,
            on_behalf_of: null,
            position: "right" as const,
            show_stamp: true,
            prefix_text: desaSettings.nama_desa,
            nip: null,
          },
        ];
      } else if (footer.signer_role === "sekretaris") {
        footerType = "single";
        signers = [
          {
            role: desaSettings.sekretaris_jabatan,
            name: desaSettings.sekretaris_nama,
            on_behalf_of: null,
            position: "right" as const,
            show_stamp: true,
            prefix_text: desaSettings.nama_desa,
            nip: null,
          },
        ];
      } else if (footer.signer_role === "camat") {
        footerType = "an_kepala_desa";
        signers = [
          {
            role: desaSettings.camat_jabatan,
            name: desaSettings.camat_nama,
            on_behalf_of: "Kepala Desa",
            position: "right" as const,
            show_stamp: true,
            prefix_text: desaSettings.kecamatan,
            nip: null,
          },
        ];
      }
    }

    // Parse content template to blocks (simplified - create one text block)
    const blocks = [
      {
        id: `block-${template.id}`,
        type: "text" as const,
        content: template.content_template,
        style: {
          align: "justify" as const,
          size: "medium" as const,
          bold: false,
          font: "Literata" as const,
        },
      },
    ];

    return {
      name: template.name,
      description: template.description,
      category: template.category,
      header: {
        layout: "logo_top",
        alignment: "center",
        logo_size: "medium",
        logo_position: "center",
        font_family: "Inter",
        font_size: {
          village_name: 20,
          government_label: 14,
          address: 12,
        },
        border_style: "single",
        border_color: "#000000",
        text_color: "#000000",
        spacing: "normal",
      },
      letterNumber: {
        enabled: true,
        heading: {
          text: template.name.toUpperCase(),
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
          size: 13,
          bold: false,
          underline: false,
          align: "center",
        },
      },
      blocks,
      footer: {
        footer_type: footerType,
        signers,
        location: desaSettings.nama_desa,
        date_format: "auto",
        custom_note: null,
      },
      variables: template.variables,
      is_active: template.is_active,
    };
  };

  const handleEditTemplate = (template: TemplateBody) => {
    setEditingTemplate(template);
    setShowTemplateBuilder(true);
  };

  // History filters and handlers
  const filteredHistory = mockLetterHistory.filter((letter) => {
    const matchesSearch =
      letter.applicant_name
        .toLowerCase()
        .includes(historySearchQuery.toLowerCase()) ||
      letter.letter_number
        .toLowerCase()
        .includes(historySearchQuery.toLowerCase()) ||
      letter.template_name
        .toLowerCase()
        .includes(historySearchQuery.toLowerCase()) ||
      letter.applicant_nik.includes(historySearchQuery);

    const matchesStatus =
      historyStatusFilter === "all" || letter.status === historyStatusFilter;
    const matchesCategory =
      historyCategoryFilter === "all" ||
      letter.template_category === historyCategoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handlePreviewLetter = (letter: LetterHistory) => {
    setSelectedLetter(letter);
    setShowLetterPreview(true);
  };

  const handleDuplicateLetter = (letter: LetterHistory) => {
    const template = mockTemplates.find((t) => t.id === letter.template_id);
    if (template) {
      // Pre-fill form dengan data dari letter yang di-duplicate
      setFormData(letter.form_data);
      setSelectedTemplate(template);
      setActiveTab("form");
      setShowCreateDialog(true);
    }
  };

  const handleDownloadPDF = async () => {
    if (!letterPreviewRef.current || !selectedLetter) return;

    try {
      // Capture element as canvas
      const canvas = await html2canvas(letterPreviewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // Calculate PDF dimensions (A4 size in mm)
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const filename = `Surat_${selectedLetter.letter_number.replace(
        /\//g,
        "_"
      )}_${selectedLetter.applicant_name}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Gagal menggenerate PDF. Silakan coba lagi.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const generateLetterPreview = (letter: LetterHistory) => {
    const template = mockTemplates.find((t) => t.id === letter.template_id);
    if (!template) return "";

    const footer = templateFooters.find(
      (f) => f.signer_role === letter.signer_role
    );
    if (!footer) return "";

    // Generate header
    const headerHTML = generateHeader(
      letter.letter_number,
      letter.template_name.toUpperCase()
    );

    // Generate body
    let bodyContent = template.content_template;
    Object.entries(letter.form_data).forEach(([key, value]) => {
      bodyContent = bodyContent.replaceAll(`{${key}}`, value);
    });

    // Generate footer
    const footerHTML = generateFooter(
      footer,
      letter.form_data.TANGGAL_SURAT || ""
    );

    return `${headerHTML}<div class="body-surat" style="font-size: 14px; line-height: 1.8; text-align: justify; margin: 20px 0;">${bodyContent}</div>${footerHTML}`;
  };

  // Get unique categories from history for filter
  const historyCategories = Array.from(
    new Set(mockLetterHistory.map((l) => l.template_category))
  );

  // Statistics for history
  const totalLetters = mockLetterHistory.length;
  const completedLetters = mockLetterHistory.filter(
    (l) => l.status === "completed"
  ).length;
  const draftLetters = mockLetterHistory.filter(
    (l) => l.status === "draft"
  ).length;

  const totalTemplates = mockTemplates.length;
  const activeTemplates = mockTemplates.filter((t) => t.is_active).length;
  const totalUsage = mockTemplates.reduce((sum, t) => sum + t.usage_count, 0);

  return (
    <div className="space-y-6">
      {/* Page-Level Tabs */}
      <Tabs
        value={pageTab}
        onValueChange={(value) => setPageTab(value as "templates" | "history")}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="h-4 w-4" />
            Template Surat
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" />
            History Surat
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab Content */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Template
                    </p>
                    <p className="text-2xl font-semibold">{totalTemplates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <FileEdit className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Template Aktif
                    </p>
                    <p className="text-2xl font-semibold">{activeTemplates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Download className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Penggunaan
                    </p>
                    <p className="text-2xl font-semibold">{totalUsage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari template surat..."
                      className="pl-10 bg-input-background"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="gap-2 bg-primary hover:bg-primary/90"
                    onClick={() => setShowTemplateBuilder(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Buat Template Baru
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const footer = templateFooters.find(
                (f) => f.id === template.footer_id
              );
              return (
                <Card
                  key={template.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      </div>
                      <Badge
                        variant={template.is_active ? "default" : "secondary"}
                      >
                        {template.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Kategori:</span>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Penandatangan:
                      </span>
                      <span className="text-xs font-medium">
                        {footer?.name || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Penggunaan:</span>
                      <span className="font-medium">
                        {template.usage_count}x
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Field Input:
                      </span>
                      <span className="font-medium">
                        {template.variables.length} field
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => handleCreateSurat(template)}
                      >
                        <FileEdit className="h-4 w-4" />
                        Buat Surat
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handlePreviewTemplate(template)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Create Surat Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Buat Surat - {selectedTemplate?.name}
                </DialogTitle>
                <DialogDescription>
                  Isi data yang diperlukan. Data header dan footer otomatis
                  diambil dari pengaturan desa.
                </DialogDescription>
              </DialogHeader>

              {selectedTemplate && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="form">Form Input</TabsTrigger>
                    <TabsTrigger value="preview">Preview Surat</TabsTrigger>
                  </TabsList>

                  <TabsContent value="form" className="space-y-6 mt-4">
                    {/* Informasi Surat */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-base border-b pb-2">
                        Informasi Surat
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Nomor Surat *
                          </label>
                          <Input
                            placeholder="Contoh: 475/039/424.304.2.02/2019"
                            value={formData.NOMOR_SURAT || ""}
                            onChange={(e) =>
                              handleFormChange("NOMOR_SURAT", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Tanggal Surat *
                          </label>
                          <Input
                            placeholder="Contoh: 08 Maret 2019"
                            value={formData.TANGGAL_SURAT || ""}
                            onChange={(e) =>
                              handleFormChange("TANGGAL_SURAT", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Multi-Page Form or Regular Form */}
                    {selectedTemplate.id === 5 ? (
                      // Multi-page form for Surat Pengantar Nikah
                      <MultiPageLetterForm
                        template={SURAT_PENGANTAR_NIKAH_TEMPLATE}
                        formData={formData}
                        onFormDataChange={(data) => {
                          setFormData(data);
                        }}
                      />
                    ) : (
                      // Regular form for other templates
                      <>
                        {/* Data Pemohon/Subject */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-semibold text-base">
                              Data Pemohon
                            </h3>
                            {selectedResident && (
                              <Badge variant="default" className="bg-green-500">
                                Data dari: {selectedResident.name}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedTemplate.variables
                              .filter(
                                (v) =>
                                  ![
                                    "KABUPATEN",
                                    "KECAMATAN",
                                    "DESA",
                                    "PENANDA_TANGAN",
                                  ].includes(v)
                              )
                              .map((variable) => (
                                <div key={variable} className="space-y-2">
                                  <label className="text-sm font-medium">
                                    {variable.replace(/_/g, " ")} *
                                  </label>
                                  {variable === "NAMA" ? (
                                    <AutocompleteResidentInput
                                      value={formData[variable] || ""}
                                      onChange={(value) =>
                                        handleFormChange(variable, value)
                                      }
                                      onResidentSelect={handleResidentSelect}
                                      placeholder="Ketik nama atau NIK warga..."
                                    />
                                  ) : variable === "ALAMAT" ||
                                    variable === "KEPERLUAN" ||
                                    variable.includes("KETERANGAN") ? (
                                    <Textarea
                                      placeholder={`Masukkan ${variable
                                        .toLowerCase()
                                        .replace(/_/g, " ")}`}
                                      value={formData[variable] || ""}
                                      onChange={(e) =>
                                        handleFormChange(
                                          variable,
                                          e.target.value
                                        )
                                      }
                                      rows={3}
                                    />
                                  ) : (
                                    <Input
                                      placeholder={`Masukkan ${variable
                                        .toLowerCase()
                                        .replace(/_/g, " ")}`}
                                      value={formData[variable] || ""}
                                      onChange={(e) =>
                                        handleFormChange(
                                          variable,
                                          e.target.value
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>

                        {/* Data Auto-Fill (Read-only info) */}
                        <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                          <h3 className="font-semibold text-base">
                            Data Otomatis (Dari Pengaturan Desa)
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Kabupaten:
                              </span>
                              <p className="font-medium">
                                {formData.KABUPATEN}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Kecamatan:
                              </span>
                              <p className="font-medium">
                                {formData.KECAMATAN}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Desa:
                              </span>
                              <p className="font-medium">{formData.DESA}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        className="flex-1"
                        onClick={() => setActiveTab("preview")}
                      >
                        Lihat Preview
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Batal
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="preview" className="space-y-4 mt-4">
                    <div className="border rounded-lg p-8 bg-white min-h-175 font-serif">
                      <div
                        dangerouslySetInnerHTML={{ __html: generatePreview() }}
                        style={{
                          fontFamily: "Literata, Times New Roman, serif",
                          lineHeight: "1.8",
                        }}
                      />
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button className="flex-1 gap-2 bg-primary">
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2">
                        <FileText className="h-4 w-4" />
                        Simpan & Cetak
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("form")}
                      >
                        Kembali ke Form
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </DialogContent>
          </Dialog>

          {/* Template Builder Dialog - Multi-Page Support */}
          <MultiPageTemplateBuilder
            open={showTemplateBuilder}
            onOpenChange={(open) => {
              setShowTemplateBuilder(open);
              if (!open) {
                setEditingTemplate(null); // Reset editing state when closing
              }
            }}
            onSave={handleSaveTemplate}
            desaSettings={desaSettings}
            editTemplate={
              editingTemplate
                ? convertToTemplateData(editingTemplate)
                : undefined
            }
          />

          {/* Preview Template Dialog */}
          <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Preview Template - {previewTemplate?.name}
                </DialogTitle>
                <DialogDescription>
                  Preview template surat dengan data dummy.
                </DialogDescription>
              </DialogHeader>

              {previewTemplate && (
                <div className="border rounded-lg p-8 bg-white min-h-175 font-serif">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateTemplatePreview(previewTemplate),
                    }}
                    style={{
                      fontFamily: "Literata, Times New Roman, serif",
                      lineHeight: "1.8",
                    }}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button className="flex-1 gap-2 bg-primary">
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <FileText className="h-4 w-4" />
                  Simpan & Cetak
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewDialog(false)}
                >
                  Tutup
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* History Tab Content */}
        <TabsContent value="history" className="space-y-6 mt-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Surat</p>
                    <p className="text-2xl font-semibold">{totalLetters}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Surat Selesai
                    </p>
                    <p className="text-2xl font-semibold">{completedLetters}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Surat Draft</p>
                    <p className="text-2xl font-semibold">{draftLetters}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1 w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari surat..."
                      className="pl-10 bg-input-background"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Select
                    value={historyStatusFilter}
                    onValueChange={setHistoryStatusFilter}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status Surat">
                        {historyStatusFilter === "all"
                          ? "Semua Status"
                          : historyStatusFilter}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="completed">Selesai</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Arsip</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={historyCategoryFilter}
                    onValueChange={setHistoryCategoryFilter}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Kategori Surat">
                        {historyCategoryFilter === "all"
                          ? "Semua Kategori"
                          : historyCategoryFilter}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {historyCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <div className="flex gap-1 border rounded-lg p-1">
                    <Button
                      variant={historyViewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setHistoryViewMode("grid")}
                      className="gap-2"
                    >
                      <Grid3x3 className="h-4 w-4" />
                      Grid
                    </Button>
                    <Button
                      variant={
                        historyViewMode === "table" ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setHistoryViewMode("table")}
                      className="gap-2"
                    >
                      <List className="h-4 w-4" />
                      Table
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {filteredHistory.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileArchive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">
                  Tidak ada surat ditemukan
                </h3>
                <p className="text-sm text-muted-foreground">
                  Coba ubah filter atau kata kunci pencarian Anda
                </p>
              </CardContent>
            </Card>
          )}

          {/* History Grid View */}
          {historyViewMode === "grid" && filteredHistory.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((letter) => {
                const template = mockTemplates.find(
                  (t) => t.id === letter.template_id
                );

                // Format date
                const date = new Date(letter.created_at);
                const formattedDate = date.toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

                // Status badge variant
                const statusVariant =
                  letter.status === "completed"
                    ? "default"
                    : letter.status === "draft"
                    ? "secondary"
                    : "outline";
                const statusLabel =
                  letter.status === "completed"
                    ? "Selesai"
                    : letter.status === "draft"
                    ? "Draft"
                    : "Arsip";

                return (
                  <Card
                    key={letter.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {letter.template_name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template?.description}
                          </p>
                        </div>
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Nomor:</span>
                          <span className="font-mono text-xs">
                            {letter.letter_number}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Pemohon:
                          </span>
                          <span className="font-medium truncate ml-2">
                            {letter.applicant_name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Kategori:
                          </span>
                          <Badge variant="outline">
                            {letter.template_category}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Tanggal:
                          </span>
                          <span className="text-xs">{formattedDate}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Dibuat oleh:
                          </span>
                          <span className="text-xs">{letter.created_by}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => handlePreviewLetter(letter)}
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => handleDuplicateLetter(letter)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            // Handle download
                            console.log("Download letter:", letter.id);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* History Table View */}
          {historyViewMode === "table" && filteredHistory.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Nomor Surat</TableHead>
                      <TableHead>Jenis Surat</TableHead>
                      <TableHead>Pemohon</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Dibuat Oleh</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map((letter) => {
                      const template = mockTemplates.find(
                        (t) => t.id === letter.template_id
                      );

                      // Format date
                      const date = new Date(letter.created_at);
                      const formattedDate = date.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      // Status badge variant
                      const statusVariant =
                        letter.status === "completed"
                          ? "default"
                          : letter.status === "draft"
                          ? "secondary"
                          : "outline";
                      const statusLabel =
                        letter.status === "completed"
                          ? "Selesai"
                          : letter.status === "draft"
                          ? "Draft"
                          : "Arsip";

                      return (
                        <TableRow key={letter.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">
                            {letter.letter_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {letter.template_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {template?.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {letter.applicant_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {letter.applicant_nik}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {letter.template_category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant}>{statusLabel}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formattedDate}
                          </TableCell>
                          <TableCell className="text-sm">
                            {letter.created_by}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => handlePreviewLetter(letter)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => handleDuplicateLetter(letter)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => {
                                  // Handle download
                                  console.log("Download letter:", letter.id);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Letter Preview Dialog */}
          <Dialog open={showLetterPreview} onOpenChange={setShowLetterPreview}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  Preview Surat - {selectedLetter?.template_name}
                </DialogTitle>
                <DialogDescription>
                  Preview surat dengan data yang telah diisi.
                </DialogDescription>
              </DialogHeader>

              {selectedLetter && (
                <div
                  ref={letterPreviewRef}
                  className="border rounded-lg p-8 bg-white min-h-175 font-serif"
                >
                  {selectedLetter.templateData ? (
                    // Modern template dengan blocks
                    <div
                      style={{
                        fontFamily: "Literata",
                        fontSize: "14px",
                        lineHeight: "1.8",
                      }}
                    >
                      {/* Header */}
                      {TemplateRenderer.renderHeader(
                        selectedLetter.templateData.header ||
                          selectedLetter.templateData.shared_header,
                        selectedLetter.form_data
                      )}

                      {/* Letter Number */}
                      {TemplateRenderer.renderLetterNumber(
                        selectedLetter.templateData.letterNumber,
                        selectedLetter.form_data
                      )}

                      {/* Content Blocks */}
                      <div className="space-y-3">
                        {selectedLetter.templateData.blocks.map((block) =>
                          TemplateRenderer.renderBlock(
                            block,
                            selectedLetter.form_data
                          )
                        )}
                      </div>

                      {/* Footer */}
                      {TemplateRenderer.renderFooter(
                        selectedLetter.templateData.footer ||
                          selectedLetter.templateData.shared_footer,
                        selectedLetter.form_data
                      )}
                    </div>
                  ) : (
                    // Legacy template dengan HTML string
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateLetterPreview(selectedLetter),
                      }}
                      style={{
                        fontFamily: "Literata, Times New Roman, serif",
                        lineHeight: "1.8",
                      }}
                    />
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  className="flex-1 gap-2 bg-primary"
                  onClick={handleDownloadPDF}
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handlePrint}
                >
                  <FileText className="h-4 w-4" />
                  Simpan & Cetak
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowLetterPreview(false)}
                >
                  Tutup
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LayananSurat;
