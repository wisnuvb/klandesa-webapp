/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Search,
  FileText,
  Home,
  Users,
  Briefcase,
  Heart,
  Baby,
  Skull,
  FileCheck,
  ShieldCheck,
  Car,
  Music,
  TrendingUp,
  UserCheck,
  Sparkles,
  CheckCircle2,
  Filter,
  X,
} from "lucide-react";
import {
  TemplateData,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  DEFAULT_LETTER_NUMBER_CONFIG,
} from "./types";
import { coerceTableRowsFromLibrary } from "./tableBlockDefaults";

interface TemplateLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: TemplateData) => void;
}

interface TemplateLibraryBlock {
  id: string;
  type:
    | "paragraph"
    | "data_table"
    | "table"
    | "heading"
    | "list"
    | "separator"
    | "spacer"
    | "text";
  content?:
    | string
    | { items: Array<{ label: string; value: string }> }
    | Array<{ text: string }>;
  alignment?: "left" | "center" | "right" | "justify";
  style?: {
    align?: "left" | "center" | "right" | "justify";
    size?: "small" | "medium" | "large";
    bold?: boolean;
    font?: string;
  };
}

interface TemplateLibraryData extends Omit<TemplateData, "blocks"> {
  blocks: TemplateLibraryBlock[];
}

// Template Library - Ready to use templates
const TEMPLATE_LIBRARY: TemplateLibraryData[] = [
  // 1. Surat Keterangan Domisili
  {
    id: "tpl-domisili",
    name: "Surat Keterangan Domisili",
    description: "Surat keterangan tempat tinggal warga",
    category: "Domisili",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "AGAMA",
      "PEKERJAAN",
      "ALAMAT_LENGKAP",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, dengan ini menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
            { label: "Agama", value: "{AGAMA}" },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Adalah benar warga kami yang berdomisili di wilayah Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}.",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "paragraph",
        content:
          "Surat keterangan domisili ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKD/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 2. Surat Keterangan Tidak Mampu (SKTM)
  {
    id: "tpl-sktm",
    name: "Surat Keterangan Tidak Mampu (SKTM)",
    description: "Surat keterangan kondisi ekonomi tidak mampu",
    category: "Keterangan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "AGAMA",
      "PEKERJAAN",
      "ALAMAT_LENGKAP",
      "KEPERLUAN",
      "PENGHASILAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, dengan ini menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
            { label: "Agama", value: "{AGAMA}" },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Penghasilan", value: "{PENGHASILAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Berdasarkan data dan keterangan yang kami miliki, yang bersangkutan adalah benar-benar termasuk keluarga kurang mampu/miskin.",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "paragraph",
        content: "Surat keterangan ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya, agar dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKTM/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 3. Surat Keterangan Usaha
  {
    id: "tpl-usaha",
    name: "Surat Keterangan Usaha",
    description: "Surat keterangan memiliki usaha",
    category: "Keterangan Usaha",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "PEKERJAAN",
      "ALAMAT_LENGKAP",
      "NAMA_USAHA",
      "JENIS_USAHA",
      "ALAMAT_USAHA",
      "TAHUN_BERDIRI",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, dengan ini menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content: "Adalah benar memiliki usaha dengan data sebagai berikut:",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Usaha", value: "{NAMA_USAHA}" },
            { label: "Jenis Usaha", value: "{JENIS_USAHA}" },
            { label: "Alamat Usaha", value: "{ALAMAT_USAHA}" },
            { label: "Tahun Berdiri", value: "{TAHUN_BERDIRI}" },
          ],
        },
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Surat keterangan usaha ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b6",
        type: "paragraph",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKU/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 4. Surat Pengantar KTP
  {
    id: "tpl-ktp",
    name: "Surat Pengantar Pembuatan KTP",
    description: "Surat pengantar untuk pembuatan KTP baru",
    category: "Pengantar",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "AGAMA",
      "PEKERJAAN",
      "STATUS_KAWIN",
      "ALAMAT_LENGKAP",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, dengan ini menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
            { label: "Agama", value: "{AGAMA}" },
            { label: "Status Perkawinan", value: "{STATUS_KAWIN}" },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Adalah benar penduduk Desa {NAMA_DESA} dan telah terdaftar dalam database kependudukan desa.",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "paragraph",
        content:
          "Surat pengantar ini dibuat untuk keperluan pembuatan KTP di Dinas Kependudukan dan Pencatatan Sipil {NAMA_KABUPATEN}.",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat pengantar ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/PNKT/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 5. Surat Pengantar Kartu Keluarga
  {
    id: "tpl-kk",
    name: "Surat Pengantar Pembuatan Kartu Keluarga",
    description: "Surat pengantar untuk pembuatan/perubahan KK",
    category: "Pengantar",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_KK",
      "NIK_KK",
      "ALAMAT_LENGKAP",
      "KEPERLUAN",
      "JUMLAH_ANGGOTA",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, dengan ini menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Kepala Keluarga", value: "{NAMA_KK}" },
            { label: "NIK", value: "{NIK_KK}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
            {
              label: "Jumlah Anggota Keluarga",
              value: "{JUMLAH_ANGGOTA} orang",
            },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Adalah benar penduduk Desa {NAMA_DESA} dan bermaksud mengurus Kartu Keluarga.",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "paragraph",
        content: "Keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat pengantar ini dibuat untuk dapat dipergunakan di Dinas Kependudukan dan Pencatatan Sipil {NAMA_KABUPATEN}.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/PNKK/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 6. Surat Keterangan Kelahiran
  {
    id: "tpl-kelahiran",
    name: "Surat Keterangan Kelahiran",
    description: "Surat keterangan kelahiran bayi",
    category: "Kependudukan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_BAYI",
      "JENIS_KELAMIN_BAYI",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "WAKTU_LAHIR",
      "NAMA_AYAH",
      "NIK_AYAH",
      "NAMA_IBU",
      "NIK_IBU",
      "ALAMAT_ORANGTUA",
      "PEKERJAAN_AYAH",
      "PEKERJAAN_IBU",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "paragraph",
        content: "Telah lahir seorang bayi dengan data sebagai berikut:",
        alignment: "justify",
      },
      {
        id: "b3",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Bayi", value: "{NAMA_BAYI}" },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN_BAYI}" },
            { label: "Tempat Lahir", value: "{TEMPAT_LAHIR}" },
            { label: "Tanggal Lahir", value: "{TANGGAL_LAHIR}" },
            { label: "Waktu Lahir", value: "{WAKTU_LAHIR}" },
          ],
        },
      },
      {
        id: "b4",
        type: "paragraph",
        content: "Anak dari pasangan suami istri:",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Ayah", value: "{NAMA_AYAH}" },
            { label: "NIK Ayah", value: "{NIK_AYAH}" },
            { label: "Pekerjaan Ayah", value: "{PEKERJAAN_AYAH}" },
            { label: "Nama Ibu", value: "{NAMA_IBU}" },
            { label: "NIK Ibu", value: "{NIK_IBU}" },
            { label: "Pekerjaan Ibu", value: "{PEKERJAAN_IBU}" },
            { label: "Alamat", value: "{ALAMAT_ORANGTUA}" },
          ],
        },
      },
      {
        id: "b6",
        type: "paragraph",
        content:
          "Demikian surat keterangan kelahiran ini dibuat untuk dipergunakan sebagai persyaratan penerbitan Akta Kelahiran.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKLH/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 7. Surat Keterangan Kematian
  {
    id: "tpl-kematian",
    name: "Surat Keterangan Kematian",
    description: "Surat keterangan kematian warga",
    category: "Kependudukan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_ALMARHUM",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "AGAMA",
      "PEKERJAAN",
      "ALAMAT_TERAKHIR",
      "TANGGAL_MENINGGAL",
      "WAKTU_MENINGGAL",
      "TEMPAT_MENINGGAL",
      "SEBAB_MENINGGAL",
      "NAMA_PELAPOR",
      "HUBUNGAN_PELAPOR",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama", value: "{NAMA_ALMARHUM}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
            { label: "Agama", value: "{AGAMA}" },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat Terakhir", value: "{ALAMAT_TERAKHIR}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content: "Telah meninggal dunia pada:",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "data_table",
        content: {
          items: [
            { label: "Hari/Tanggal", value: "{TANGGAL_MENINGGAL}" },
            { label: "Waktu", value: "{WAKTU_MENINGGAL}" },
            { label: "Tempat", value: "{TEMPAT_MENINGGAL}" },
            { label: "Sebab Kematian", value: "{SEBAB_MENINGGAL}" },
          ],
        },
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Surat keterangan ini dibuat berdasarkan laporan dari {NAMA_PELAPOR} ({HUBUNGAN_PELAPOR}) untuk dipergunakan sebagai persyaratan penerbitan Akta Kematian.",
        alignment: "justify",
      },
      {
        id: "b6",
        type: "paragraph",
        content: "Demikian surat keterangan ini dibuat dengan sebenarnya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKM/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 8. Surat Keterangan Ahli Waris
  {
    id: "tpl-ahli-waris",
    name: "Surat Keterangan Ahli Waris",
    description: "Surat keterangan ahli waris dari almarhum",
    category: "Keterangan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_PEWARIS",
      "NIK_PEWARIS",
      "TANGGAL_MENINGGAL",
      "ALAMAT_PEWARIS",
      "NAMA_AHLI_WARIS",
      "NIK_AHLI_WARIS",
      "HUBUNGAN_WARIS",
      "ALAMAT_AHLI_WARIS",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "paragraph",
        content: "Pewaris yang telah meninggal dunia:",
        alignment: "justify",
      },
      {
        id: "b3",
        type: "data_table",
        content: {
          items: [
            { label: "Nama", value: "{NAMA_PEWARIS}" },
            { label: "NIK", value: "{NIK_PEWARIS}" },
            { label: "Tanggal Meninggal", value: "{TANGGAL_MENINGGAL}" },
            { label: "Alamat Terakhir", value: "{ALAMAT_PEWARIS}" },
          ],
        },
      },
      {
        id: "b4",
        type: "paragraph",
        content: "Meninggalkan ahli waris yang sah sebagai berikut:",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Ahli Waris", value: "{NAMA_AHLI_WARIS}" },
            { label: "NIK", value: "{NIK_AHLI_WARIS}" },
            { label: "Hubungan", value: "{HUBUNGAN_WARIS}" },
            { label: "Alamat", value: "{ALAMAT_AHLI_WARIS}" },
          ],
        },
      },
      {
        id: "b6",
        type: "paragraph",
        content:
          "Surat keterangan ahli waris ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b7",
        type: "paragraph",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKAW/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 9. Surat Keterangan Kehilangan
  {
    id: "tpl-kehilangan",
    name: "Surat Keterangan Kehilangan",
    description: "Surat keterangan kehilangan dokumen/barang",
    category: "Keterangan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "PEKERJAAN",
      "ALAMAT_LENGKAP",
      "BARANG_HILANG",
      "TANGGAL_HILANG",
      "TEMPAT_HILANG",
      "KRONOLOGI",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content: "Telah melaporkan kehilangan:",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "data_table",
        content: {
          items: [
            { label: "Barang/Dokumen yang Hilang", value: "{BARANG_HILANG}" },
            { label: "Tanggal Kehilangan", value: "{TANGGAL_HILANG}" },
            { label: "Tempat Kehilangan", value: "{TEMPAT_HILANG}" },
          ],
        },
      },
      {
        id: "b5",
        type: "paragraph",
        content: "Kronologi kejadian: {KRONOLOGI}",
        alignment: "justify",
      },
      {
        id: "b6",
        type: "paragraph",
        content: "Surat keterangan ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b7",
        type: "paragraph",
        content: "Demikian surat keterangan ini dibuat dengan sebenarnya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKK/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 10. Surat Izin Keramaian
  {
    id: "tpl-izin-keramaian",
    name: "Surat Izin Keramaian",
    description: "Surat izin mengadakan acara/keramaian",
    category: "Izin",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_PENANGGUNG_JAWAB",
      "NIK",
      "ALAMAT_LENGKAP",
      "JENIS_ACARA",
      "TANGGAL_ACARA",
      "WAKTU_MULAI",
      "WAKTU_SELESAI",
      "TEMPAT_ACARA",
      "JUMLAH_PESERTA",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, memberikan izin kepada:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            {
              label: "Nama Penanggung Jawab",
              value: "{NAMA_PENANGGUNG_JAWAB}",
            },
            { label: "NIK", value: "{NIK}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Untuk mengadakan kegiatan/acara dengan rincian sebagai berikut:",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "data_table",
        content: {
          items: [
            { label: "Jenis Acara", value: "{JENIS_ACARA}" },
            { label: "Hari/Tanggal", value: "{TANGGAL_ACARA}" },
            { label: "Waktu", value: "{WAKTU_MULAI} - {WAKTU_SELESAI}" },
            { label: "Tempat", value: "{TEMPAT_ACARA}" },
            { label: "Jumlah Peserta", value: "± {JUMLAH_PESERTA} orang" },
          ],
        },
      },
      {
        id: "b5",
        type: "paragraph",
        content: "Dengan syarat dan ketentuan:",
        alignment: "justify",
      },
      {
        id: "b6",
        type: "paragraph",
        content:
          "1. Menjaga keamanan, ketertiban, dan kebersihan lingkungan\n2. Tidak mengganggu ketenangan warga sekitar\n3. Mematuhi protokol kesehatan yang berlaku\n4. Bertanggung jawab penuh atas kegiatan yang dilaksanakan",
        alignment: "left",
      },
      {
        id: "b7",
        type: "paragraph",
        content:
          "Demikian surat izin ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SIK/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 11. Surat Keterangan Penghasilan
  {
    id: "tpl-penghasilan",
    name: "Surat Keterangan Penghasilan",
    description: "Surat keterangan penghasilan warga",
    category: "Keterangan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "PEKERJAAN",
      "ALAMAT_LENGKAP",
      "PENGHASILAN_PERBULAN",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
            {
              label: "Penghasilan per Bulan",
              value: "± Rp {PENGHASILAN_PERBULAN}",
            },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Adalah benar warga kami dengan penghasilan sebagaimana tercantum di atas.",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "paragraph",
        content:
          "Surat keterangan penghasilan ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKP/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 12. Surat Kuasa
  {
    id: "tpl-kuasa",
    name: "Surat Kuasa",
    description: "Surat pemberian kuasa kepada pihak lain",
    category: "Kuasa",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_PEMBERI_KUASA",
      "NIK_PEMBERI",
      "ALAMAT_PEMBERI",
      "NAMA_PENERIMA_KUASA",
      "NIK_PENERIMA",
      "ALAMAT_PENERIMA",
      "KEPERLUAN_KUASA",
      "MASA_BERLAKU",
    ],
    blocks: [
      {
        id: "b1",
        type: "heading",
        content: "SURAT KUASA",
        alignment: "center",
      },
      {
        id: "b2",
        type: "paragraph",
        content: "Yang bertanda tangan di bawah ini:",
        alignment: "justify",
      },
      {
        id: "b3",
        type: "data_table",
        content: {
          items: [
            { label: "Nama", value: "{NAMA_PEMBERI_KUASA}" },
            { label: "NIK", value: "{NIK_PEMBERI}" },
            { label: "Alamat", value: "{ALAMAT_PEMBERI}" },
          ],
        },
      },
      {
        id: "b4",
        type: "paragraph",
        content: "Selanjutnya disebut sebagai PEMBERI KUASA",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content: "Dengan ini memberikan kuasa kepada:",
        alignment: "justify",
      },
      {
        id: "b6",
        type: "data_table",
        content: {
          items: [
            { label: "Nama", value: "{NAMA_PENERIMA_KUASA}" },
            { label: "NIK", value: "{NIK_PENERIMA}" },
            { label: "Alamat", value: "{ALAMAT_PENERIMA}" },
          ],
        },
      },
      {
        id: "b7",
        type: "paragraph",
        content: "Selanjutnya disebut sebagai PENERIMA KUASA",
        alignment: "justify",
      },
      {
        id: "b8",
        type: "paragraph",
        content: "Untuk melakukan hal-hal sebagai berikut: {KEPERLUAN_KUASA}",
        alignment: "justify",
      },
      {
        id: "b9",
        type: "paragraph",
        content:
          "Surat kuasa ini berlaku selama {MASA_BERLAKU} dan dapat dicabut sewaktu-waktu apabila diperlukan.",
        alignment: "justify",
      },
      {
        id: "b10",
        type: "paragraph",
        content:
          "Demikian surat kuasa ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: false },
    footer: { show_signatures: true },
    letterNumber: { enabled: false },
  },

  // 13. Surat Keterangan Belum Menikah
  {
    id: "tpl-belum-menikah",
    name: "Surat Keterangan Belum Menikah",
    description: "Surat keterangan status belum menikah",
    category: "Keterangan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "AGAMA",
      "PEKERJAAN",
      "ALAMAT_LENGKAP",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
            { label: "Agama", value: "{AGAMA}" },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Adalah benar warga kami dan berdasarkan data yang kami miliki, yang bersangkutan sampai dengan saat ini berstatus BELUM MENIKAH.",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "paragraph",
        content: "Surat keterangan ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKBM/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 14. Surat Keterangan Pindah
  {
    id: "tpl-pindah",
    name: "Surat Keterangan Pindah",
    description: "Surat keterangan pindah domisili",
    category: "Kependudukan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_KK",
      "NIK_KK",
      "ALAMAT_ASAL",
      "ALAMAT_TUJUAN",
      "DESA_TUJUAN",
      "KECAMATAN_TUJUAN",
      "KABUPATEN_TUJUAN",
      "ALASAN_PINDAH",
      "JUMLAH_ANGGOTA_PINDAH",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Kepala Keluarga", value: "{NAMA_KK}" },
            { label: "NIK", value: "{NIK_KK}" },
            { label: "Alamat Asal", value: "{ALAMAT_ASAL}" },
            {
              label: "Jumlah yang Pindah",
              value: "{JUMLAH_ANGGOTA_PINDAH} orang",
            },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content: "Akan pindah ke alamat:",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "data_table",
        content: {
          items: [
            { label: "Alamat Tujuan", value: "{ALAMAT_TUJUAN}" },
            { label: "Desa/Kelurahan", value: "{DESA_TUJUAN}" },
            { label: "Kecamatan", value: "{KECAMATAN_TUJUAN}" },
            { label: "Kabupaten/Kota", value: "{KABUPATEN_TUJUAN}" },
            { label: "Alasan Pindah", value: "{ALASAN_PINDAH}" },
          ],
        },
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat keterangan pindah ini dibuat untuk dipergunakan sebagai persyaratan administrasi kependudukan.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKP/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },

  // 15. Surat Keterangan Janda/Duda
  {
    id: "tpl-janda-duda",
    name: "Surat Keterangan Janda/Duda",
    description: "Surat keterangan status janda/duda",
    category: "Keterangan",
    is_multi_page: false,
    is_active: true,
    variables: [
      "NAMA_LENGKAP",
      "NIK",
      "TEMPAT_LAHIR",
      "TANGGAL_LAHIR",
      "JENIS_KELAMIN",
      "AGAMA",
      "PEKERJAAN",
      "ALAMAT_LENGKAP",
      "STATUS",
      "NAMA_PASANGAN_ALMARHUM",
      "TANGGAL_CERAI_MENINGGAL",
      "KEPERLUAN",
    ],
    blocks: [
      {
        id: "b1",
        type: "paragraph",
        content:
          "Yang bertanda tangan di bawah ini Kepala Desa {NAMA_DESA}, Kecamatan {NAMA_KECAMATAN}, {NAMA_KABUPATEN}, menerangkan bahwa:",
        alignment: "justify",
      },
      {
        id: "b2",
        type: "data_table",
        content: {
          items: [
            { label: "Nama Lengkap", value: "{NAMA_LENGKAP}" },
            { label: "NIK", value: "{NIK}" },
            {
              label: "Tempat, Tanggal Lahir",
              value: "{TEMPAT_LAHIR}, {TANGGAL_LAHIR}",
            },
            { label: "Jenis Kelamin", value: "{JENIS_KELAMIN}" },
            { label: "Agama", value: "{AGAMA}" },
            { label: "Pekerjaan", value: "{PEKERJAAN}" },
            { label: "Alamat", value: "{ALAMAT_LENGKAP}" },
          ],
        },
      },
      {
        id: "b3",
        type: "paragraph",
        content:
          "Adalah benar warga kami dan berdasarkan data yang kami miliki, yang bersangkutan berstatus {STATUS} dari {NAMA_PASANGAN_ALMARHUM} sejak {TANGGAL_CERAI_MENINGGAL}.",
        alignment: "justify",
      },
      {
        id: "b4",
        type: "paragraph",
        content: "Surat keterangan ini dibuat untuk keperluan: {KEPERLUAN}",
        alignment: "justify",
      },
      {
        id: "b5",
        type: "paragraph",
        content:
          "Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
        alignment: "justify",
      },
    ],
    header: { show_letterhead: true, show_title: true },
    footer: { show_signatures: true },
    letterNumber: {
      enabled: true,
      format: "{NOMOR_URUT}/SKJD/{BULAN_ROMAWI}/{TAHUN}",
      padding: 3,
      resetPeriod: "yearly",
    },
  },
];

export function TemplateLibraryModal({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Get unique categories
  const categories = [
    "All",
    ...Array.from(new Set(TEMPLATE_LIBRARY.map((t) => t.category))),
  ];

  // Filter templates
  const filteredTemplates = TEMPLATE_LIBRARY.filter((template) => {
    const matchSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory =
      selectedCategory === "All" || template.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Domisili":
        return Home;
      case "Keterangan":
        return FileCheck;
      case "Keterangan Usaha":
        return Briefcase;
      case "Pengantar":
        return FileText;
      case "Kependudukan":
        return Users;
      case "Kuasa":
        return ShieldCheck;
      case "Izin":
        return CheckCircle2;
      default:
        return FileText;
    }
  };

  // Get template icon
  const getTemplateIcon = (templateId: string) => {
    if (templateId.includes("domisili")) return Home;
    if (templateId.includes("sktm")) return Heart;
    if (templateId.includes("usaha")) return Briefcase;
    if (templateId.includes("ktp") || templateId.includes("kk"))
      return UserCheck;
    if (templateId.includes("kelahiran")) return Baby;
    if (templateId.includes("kematian")) return Skull;
    if (templateId.includes("ahli-waris")) return Users;
    if (templateId.includes("kehilangan")) return FileText;
    if (templateId.includes("keramaian")) return Music;
    if (templateId.includes("penghasilan")) return TrendingUp;
    if (templateId.includes("kuasa")) return ShieldCheck;
    if (templateId.includes("menikah")) return Heart;
    if (templateId.includes("pindah")) return Car;
    return FileText;
  };

  const handleSelectTemplate = (template: TemplateLibraryData) => {
    // Convert template blocks from library format to builder format
    const convertedBlocks = template.blocks.map((block) => {
      // Convert block type
      let newType = block.type;
      if (block.type === "paragraph") {
        newType = "text";
      } else if (block.type === "data_table") {
        newType = "table";
      }

      let newContent: unknown = block.content;
      if (newType === "table") {
        newContent = coerceTableRowsFromLibrary(block.content);
      }

      // Convert alignment property to style object
      const newBlock: any = {
        id: block.id || `block-${Date.now()}-${Math.random()}`,
        type: newType,
        content: newContent,
        style: {
          align: block.alignment || "left",
          size: "medium",
          bold: false,
          ...block.style,
        },
      };

      return newBlock;
    });

    // Convert letterNumber config from simple format to full LetterNumberConfig
    let convertedLetterNumber = DEFAULT_LETTER_NUMBER_CONFIG;
    if (template.letterNumber) {
      const libLetterNum = template.letterNumber as any;
      if (libLetterNum.show === true) {
        convertedLetterNumber = {
          ...DEFAULT_LETTER_NUMBER_CONFIG,
          enabled: true,
          number: {
            ...DEFAULT_LETTER_NUMBER_CONFIG.number,
            format:
              libLetterNum.format ||
              DEFAULT_LETTER_NUMBER_CONFIG?.number?.format,
          },
          auto_numbering: {
            ...DEFAULT_LETTER_NUMBER_CONFIG.auto_numbering,
            enabled: true,
            number_format: libLetterNum.padding
              ? "0".repeat(libLetterNum.padding) + "1"
              : "001",
            reset_period: libLetterNum.resetPeriod || "yearly",
          },
        };
      } else if (libLetterNum.show === false) {
        convertedLetterNumber = {
          ...DEFAULT_LETTER_NUMBER_CONFIG,
          enabled: false,
        };
      }
    }

    // Convert footer config from simple format to full FooterConfig
    let convertedFooter = DEFAULT_FOOTER_CONFIG;
    if (template.footer) {
      const libFooter = template.footer as any;
      if (libFooter.show_signatures !== undefined) {
        convertedFooter = {
          ...DEFAULT_FOOTER_CONFIG,
          // Keep default signers if show_signatures is true
        };
      }
    }

    // Create a fresh copy with converted blocks and full configs
    const newTemplate: TemplateData = {
      ...template,
      id: undefined, // Remove ID so it will be generated as new
      blocks: convertedBlocks,
      header: DEFAULT_HEADER_CONFIG, // Use full default header config
      footer: convertedFooter,
      letterNumber: convertedLetterNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSelectTemplate(newTemplate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                Template Library - Siap Pakai
              </DialogTitle>
              <DialogDescription>
                Pilih template surat yang sudah siap pakai dan sesuaikan dengan
                kebutuhan desa Anda
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b bg-muted/30 shrink-0">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Cari template surat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => {
                const IconComponent =
                  category === "All" ? Filter : getCategoryIcon(category);
                return (
                  <Button
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="gap-2 whitespace-nowrap"
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    {category}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                Tidak ada template ditemukan
              </h3>
              <p className="text-sm text-muted-foreground">
                Coba ubah kata kunci pencarian atau filter kategori
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const Icon = getTemplateIcon(template.id || "");
                return (
                  <div
                    key={template.id}
                    className="border-2 border-border rounded-xl p-5 hover:border-teal-500 hover:shadow-lg transition-all cursor-pointer group bg-card"
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-teal-200 transition-colors">
                        <Icon className="h-6 w-6 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-teal-600 transition-colors">
                          {template.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                          {(() => {
                            const CategoryIcon = getCategoryIcon(
                              template.category
                            );
                            return <CategoryIcon className="h-3 w-3" />;
                          })()}
                          {template.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {template.description}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {template.blocks?.length || 0} blok
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {template.variables?.length || 0} var
                        </span>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Menampilkan {filteredTemplates.length} dari{" "}
              {TEMPLATE_LIBRARY.length} template
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-teal-600" />
              Semua template siap pakai dan dapat disesuaikan
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
